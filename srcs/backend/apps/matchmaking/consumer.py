# apps/matchmaking/consumers.py
from channels.generic.websocket import JsonWebsocketConsumer
from asgiref.sync import async_to_sync
from .manager import matchmaking_manager
from urllib.parse import parse_qs
import logging
from apps.accounts.models import User
import uuid


logger = logging.getLogger(__name__)

class MatchmakingConsumer(JsonWebsocketConsumer):
    def connect(self):
        logger.info("MatchmakingConsumer().connect() called.")
        # Parse query parameters to determine the queue type
        query_params = parse_qs(self.scope['query_string'].decode())
        self.queue_name = query_params.get('queue_name', [None])[0]
        unknown_id = query_params.get('player_id', [None])[0]
        
        if unknown_id is not None and not unknown_id.isdigit():
            logger.info(f"unknown_id is not None and not unknown_id.isdigit: {unknown_id}")
            user = user = User.objects.create(username=str(uuid.uuid4()))
            self.player_id = str(user.id)
        else:
            self.player_id = str(unknown_id)
        
        # Validate queue_name and player_id
        if self.queue_name not in matchmaking_manager.QUEUE_KEYS or not self.player_id:
            self.close()
            return

        # Assign the group name based on the queue
        self.group_name = f"queue_{self.queue_name}"

        # Add player to the group and accept the connection
        async_to_sync(self.channel_layer.group_add)(self.group_name, self.channel_name)
        self.accept()
        


        # Register the player in the queue
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
