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
        logger.info("GameConsumer().connect() called.")
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
            logger.info(f"Game Attributes: {self.game_attributes}")

            # Ensure mandatory keys exist
            required_keys = ["room_id", "game_type", "user_id", "users"]
            if self.game_attributes["game_type"] == "TRNMT":
                required_keys += ["tournament_id"]
                
            for key in required_keys:
                if key not in self.game_attributes:
                    raise ValueError(f"Missing required key: {key} in token payload")

            tournament_id = self.game_attributes["tournament_id"]
            players = self.game_attributes["users"]
            
            if tournament_id and game_manager.tournaments.get(tournament_id) == None:
                await game_manager.create_tournament(tournament_id, players)

            # Generate group name dynamically
            self.room_group_name = f"game_{self.game_attributes['room_id']}"
			
            # Add player to the group
            await self.channel_layer.group_add(self.room_group_name, self.channel_name)
            await self.accept()

            # Add player to the room via GameManager
            await game_manager.add_player(**self.game_attributes)

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
        if (self.room_group_name):
            await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def receive(self, text_data):
        logger.debug(f"WebSocket receive: room={self.game_attributes['room_id']}, data={text_data}")
        data = json.loads(text_data)
        action = data.get('action')
        player_alias = data.get('player')
        room_id = self.game_attributes['room_id']
        user_id = self.game_attributes['user_id']

        if action == 'alias':
            if player_alias:
                await game_manager.set_player_alias(room_id, user_id, player_alias)

        elif action == 'input':
            up = data.get('up', False)
            down = data.get('down', False)
            await game_manager.update_player_input(room_id, user_id, up, down)

        elif action == 'player_ready':
            await game_manager.set_game_started(room_id, user_id)

        elif action == 'pause_game':
            logger.debug(f"Pausing game for room: {room_id}")
            await game_manager.set_game_paused(room_id)
        
        elif action == 'resume_game':
            logger.debug(f"Resuming game for room: {room_id}")
            await game_manager.set_game_resumed(room_id)

    
    async def game_message(self, event):
    
        # Called by group_send in GameManager
        await self.send(text_data=json.dumps(event['data']))