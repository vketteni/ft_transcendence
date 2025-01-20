# backend/apps/game/consumers.py
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
            payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
            self.room_id = payload["room_id"]

            # Generate group name dynamically
            self.room_group_name = f"game_{self.room_id}"

            # Add player to the group
            await self.channel_layer.group_add(self.room_group_name, self.channel_name)
            await self.accept()

            # Add player to the room via GameManager
            await game_manager.add_player(self.room_id, self.channel_name)

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
        logger.debug(f"WebSocket disconnect: room={self.room_id}, channel={self.channel_name}, close_code={close_code}")
        game_manager.remove_player(self.room_id, self.channel_name)
        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def receive(self, text_data):
        logger.debug(f"WebSocket receive: room={self.room_id}, data={text_data}")
        data = json.loads(text_data)
        action = data.get('action')
        player_alias = data.get('player')

        if action == 'alias':
            if player_alias:
                await game_manager.set_player_alias(self.room_id, self.channel_name, player_alias)

        elif action == 'input':
            up = data.get('up', False)
            down = data.get('down', False)
            await game_manager.update_player_input(self.room_id, self.channel_name, up, down)

        elif action == 'player_ready':
            ai_controlled = data.get('ai_controlled', False) 
            await game_manager.set_game_started(self.room_id, self.channel_name, ai_controlled)

        elif action == 'pause_game':
            logger.debug(f"Pausing game for room: {self.room_id}")
            await game_manager.set_game_paused(self.room_id)
        
        elif action == 'resume_game':
            logger.debug(f"Resuming game for room: {self.room_id}")
            await game_manager.set_game_resumed(self.room_id)

    async def game_message(self, event):
        # Called by group_send in GameManager
        await self.send(text_data=json.dumps(event['data']))
