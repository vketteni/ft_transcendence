# backend/apps/game/consumers.py
from time import timezone
from .manager import game_manager

import os
import jwt
import json
import logging
from urllib.parse import parse_qs
from channels.generic.websocket import AsyncWebsocketConsumer
from django.conf import settings

logger = logging.getLogger(__name__)

SECRET_KEY = settings.SECRET_KEY

class GameConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        # Parse the token from the query string
        query_string = self.scope['query_string'].decode()
        query_params = parse_qs(query_string)
        token = query_params.get("token", [None])[0]

        if not token:
            logger.error("Missing token in connection query parameters.")
            await self.close()
            return

        try:
            # Decode the JWT token
            self.game_attributes = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
            
            # Ensure mandatory keys exist
            required_keys = ["room_id", "game_type"]
            if self.game_attributes["game_type"] == "TRNMT":
                required_keys += ["tournament"]
                
            for key in required_keys:
                if key not in self.game_attributes:
                    raise ValueError(f"Missing required key: {key} in token payload")

            if self.game_attributes["tournament"]:
                    tournament_id = self.game_attributes["tournament"]["tournament_id"]
                    participants = self.game_attributes["tournament"]["players"]
                    if tournament_id and not game_manager.tournaments.get(tournament_id):
                        game_manager.create_tournament(tournament_id, participants)

            # Generate group name dynamically
            self.room_group_name = f"game_{self.game_attributes['room_id']}"
			
            # Add player to the group
            await self.channel_layer.group_add(self.room_group_name, self.channel_name)
            await self.accept()

            # Add player to the room via GameManager
            await game_manager.add_player(self.channel_name, **self.game_attributes)

            # # Start the game manager if it's not running
            if not game_manager.running:
                await game_manager.start()
                
        except jwt.ExpiredSignatureError:
            logger.error("Token has expired.")
            await self.close()
        except jwt.InvalidTokenError:
            logger.error("Invalid token.")
            await self.close()
        except Exception as e:
            logger.error(f"Unexpected error during connection: {e}")
            await self.close()

    async def disconnect(self, close_code):
        logger.debug(f"WebSocket disconnect: room={self.game_attributes['room_id']}, channel={self.channel_name}, close_code={close_code}")
        game_manager.remove_player(self.game_attributes['room_id'], self.channel_name)
        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def receive(self, text_data):
        logger.debug(f"WebSocket receive: room={self.game_attributes['room_id']}, data={text_data}")
        data = json.loads(text_data)
        action = data.get('action')
        player_alias = data.get('player')

        if action == 'alias':
            if player_alias:
                await game_manager.set_player_alias(self.game_attributes['room_id'], self.channel_name, player_alias)

        elif action == 'input':
            up = data.get('up', False)
            down = data.get('down', False)
            await game_manager.update_player_input(self.game_attributes['room_id'], self.channel_name, up, down)

        elif action == 'player_ready':
            await game_manager.set_game_started(self.game_attributes['room_id'], self.channel_name)

        elif action == 'pause_game':
            logger.debug(f"Pausing game for room: {self.game_attributes['room_id']}")
            await game_manager.set_game_paused(self.game_attributes['room_id'])
        
        elif action == 'resume_game':
            logger.debug(f"Resuming game for room: {self.game_attributes['room_id']}")
            await game_manager.set_game_resumed(self.game_attributes['room_id'])

    async def end_game(self, room_name, winner):
        from matchmaking.models import Match 
        
        try:
            match = Match.objects.get(id=room_name)
            match.end_time = timezone.now()
            match.winner = winner
            match.duration = match.calculate_duration()
            match.save()
        except Match.DoesNotExist:
            logger.error(f"Match with id {room_name} does not exist.")
            
    async def game_message(self, event):
        if event['data']['type'] == "game_over" or event['data']['type'] == "ai_game_over" :
            room_name = self.game_attributes["room_id"]
            self.end_game(room_name, event['data']['type']['winner'])
        # game_state = game_manager.games.get(room_name)
        if self.game_attributes.get("game_type") == "TRNMT":
            logger.info("Game ended calling advance_tournament_match().")
            tournament_id = self.game_attributes.get("tournament").get("tournament_id")
            game_manager.advance_tournament_match(tournament_id)
        # Called by group_send in GameManager
        await self.send(text_data=json.dumps(event['data']))
