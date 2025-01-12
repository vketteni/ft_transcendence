# backend/apps/game/consumers.py
import asyncio
import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from .manager import game_manager

logger = logging.getLogger(__name__)



class GameConsumer(AsyncWebsocketConsumer):

    async def connect(self):
        self.room_name = self.scope['url_route']['kwargs']['room_name']
        self.room_group_name = f"game_{self.room_name}"

        try:
            logger.debug("About to call group_add")
            await self.channel_layer.group_add(self.room_group_name, self.channel_name)
            logger.debug("group_add called successfully")
        except Exception as e:
            logger.error(f"Error during group_add: {e}")

        try:
            logger.debug("About to call accept")
            await self.accept()
            logger.debug("accept called successfully")
        except Exception as e:
            logger.error(f"Error during accept: {e}")

        # Add player to the room via the GameManager
        logger.debug(f"await game_manager.add_player() is called next.")
        await game_manager.add_player(self.room_name, self.channel_name)
        logger.debug(f"game_manager.running = {game_manager.running}")
        if game_manager.running != True:
            await game_manager.start()
        
    async def disconnect(self, close_code):
        logger.debug(f"WebSocket disconnect: room={self.room_name}, channel={self.channel_name}, close_code={close_code}")
        game_manager.remove_player(self.room_name, self.channel_name)
        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def receive(self, text_data):
        logger.debug(f"WebSocket receive: room={self.room_name}, data={text_data}")
        data = json.loads(text_data)
        action = data.get('action')
        player_alias = data.get('player')

        if action == 'alias':
            if player_alias:
                await game_manager.set_player_alias(self.room_name, self.channel_name, player_alias)

        elif action == 'canvas_and_game_config':
            canvas = data.get('canvas')
            paddle = data.get('paddle')
            ball = data.get('ball')
            # logger.debug(f"Received canvas and game config: canvas={canvas}, paddle={paddle}, ball={ball}")
            await game_manager.set_game_config(self.room_name, canvas, paddle, ball)

        elif action == 'input':
            up = data.get('up', False)
            down = data.get('down', False)
            # logger.debug(f"Received input: up:{up} down:{down}")
            await game_manager.update_player_input(self.room_name, self.channel_name, up, down)

        elif action == 'start_game':
            logger.debug(f"Starting game for room: {self.room_name}")
            await game_manager.set_game_started(self.room_name, True)  # Start the game
        
        elif action == 'pause_game':
            logger.debug(f"Pausing game for room: {self.room_name}")
            await game_manager.set_game_paused(self.room_name)
        
        elif action == 'resume_game':
            logger.debug(f"Resuming game for room: {self.room_name}")
            await game_manager.set_game_resumed(self.room_name)

    async def game_message(self, event):
        # Called by group_send in GameManager
        await self.send(text_data=json.dumps(event['data']))
