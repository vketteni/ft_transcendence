# apps/matchmaking/consumers.py
from channels.generic.websocket import JsonWebsocketConsumer
from asgiref.sync import async_to_sync
from .manager import matchmaking_manager
import logging

logger = logging.getLogger(__name__)



class MatchmakingConsumer(JsonWebsocketConsumer):
    def connect(self):
        self.accept()
        self.group_name = f"queue_{123}"
        # logger.debug(f"{self.group_name}")
        async_to_sync(self.channel_layer.group_add)(self.group_name, self.channel_name)
        self.manager = matchmaking_manager

    def disconnect(self, close_code):
        async_to_sync(self.channel_layer.group_discard)(self.group_name, self.channel_name)

    def receive_json(self, content):
        # Dispatch based on the message type
        message_type = content.get("type")

        if message_type == "join_queue":
            self.handle_join_queue(content)
        elif message_type == "leave_queue":
            self.handle_leave_queue(content)
        elif message_type == "ping":
            self.handle_ping()
        else:
            self.send_json({"type": "error", "message": "Invalid message type"})

    def handle_join_queue(self, content):
        player_id = content.get("data", {}).get("player_id")
        if not player_id:
            self.send_json({"type": "error", "message": "Player ID is required"})
            return

        self.manager.add_player_to_queue(player_id)
        position = self.manager.get_player_position(player_id)

        self.send_json({
            "type": "queue_update",
            "data": {
                "status": "joined",
                "position": position
            }
        })

    def handle_leave_queue(self, content):
        player_id = content.get("data", {}).get("player_id")
        if not player_id:
            self.send_json({"type": "error", "message": "Player ID is required"})
            return

        self.manager.remove_player_from_queue(player_id)

        self.send_json({
            "type": "queue_update",
            "data": {
                "status": "left"
            }
        })
        
    def send_server_event(self, event):
        """
        Receive server-initiated events and send them to the client,
        transforming 'event_type' to 'type' for the frontend.
        """
        self.send_json({
            "type": event["event_type"],  # Use event_type as the frontend's type
            "data": event["data"],        # Pass the rest of the data
        })


    def handle_ping(self):
        self.send_json({"type": "pong"})
