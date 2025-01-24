# apps/matchmaking/consumers.py
from channels.generic.websocket import JsonWebsocketConsumer
from asgiref.sync import async_to_sync
from .manager import matchmaking_manager
from urllib.parse import parse_qs
import logging
from apps.accounts.models import User
import uuid

from django.contrib.auth import get_user_model
import random


logger = logging.getLogger(__name__)


User = get_user_model() 

class MatchmakingConsumer(JsonWebsocketConsumer):

    def userExists(self, user_id):
        user_exists = User.objects.filter(id=user_id).exists()
        if not user_exists:
            User.objects.create(
                id=user_id,
                username=f"{user_id}"  # Ensures a unique username
            )
            logger.info(f" New User Created: {user_id} with numeric_id: {user_id}")
        else:
            logger.info(f" User {user_id} (numeric_id: {user_id}) already exists.")

    def computerExists(self):
        computer_exists = User.objects.filter(username="Computer").exists()
        logger.info(f"Computer Exists: {computer_exists}")
        if not computer_exists:
            ai_user_id = random.randint(1000001, 2000000)  # Generate a unique numeric ID
            User.objects.create(
                id=ai_user_id,
                username="Computer"
            )
            logger.info(f" AI User 'Computer' created.")

    def connect(self):
        logger.info("MatchmakingConsumer().connect() called.")
        # Parse query parameters to determine the queue type
        query_params = parse_qs(self.scope['query_string'].decode())
        self.queue_name = query_params.get('queue_name', [None])[0]
        self.player_id = query_params.get('player_id', [None])[0]
        # Assign the group name based on the queue
        self.group_name = f"queue_{self.queue_name}"
        
        if not self.player_id:
            logger.error("Player ID is missing from the WebSocket request.")
            return
        if not self.player_id.isdigit():
            logger.error(f"Invalid player ID format: {self.player_id}")
            return

        self.userExists(self.player_id)
        self.computerExists()

        logger.info(f"Player {self.player_id} connected to {self.queue_name} queue.")

        # Validate queue_name and player_id
        if self.queue_name not in matchmaking_manager.QUEUE_KEYS or not self.player_id:
            self.close()
            return


        # Add player to the group and accept the connection
        async_to_sync(self.channel_layer.group_add)(self.group_name, self.channel_name)
        self.accept()
        


        # Register the player in the queue
        logger.info(f"Calling add_player_to_queue() with player_id: {self.player_id} queue: {self.queue_name}")
        matchmaking_manager.add_player_to_queue(
            self.player_id, self.channel_name, self.queue_name
        )
        logger.info(f"Player {self.player_id} joined {self.queue_name} queue.")

    def disconnect(self, close_code):
        # Remove player from the queue and group
        queue_key = matchmaking_manager.QUEUE_KEYS.get(self.queue_name)
        if queue_key and self.player_id:
            matchmaking_manager.remove_player_from_queue(self.player_id, queue_key)

        async_to_sync(self.channel_layer.group_discard)(self.group_name, self.channel_name)
        logger.info(f"Player {self.player_id} left {self.queue_name} queue.")

    def receive_json(self, content):
        # Dispatch based on the message type
        message_type = content.get("type")

        if message_type == "ping":
            self.handle_ping()
        else:
            self.send_json({"type": "error", "message": "Invalid message type"})

    def handle_ping(self):
        self.send_json({"type": "pong"})

    def match_found(self, event):
        """
        Notify the client of a match.
        This method is called by the MatchmakingManager when a match is found.
        """
        self.send_json({
            "type": "match_found",
            "data": event["data"]
        })
