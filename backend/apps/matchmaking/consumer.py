# apps/matchmaking/consumers.py
from channels.generic.websocket import JsonWebsocketConsumer
from asgiref.sync import async_to_sync
from .manager import MatchmakingManager


class MatchmakingConsumer(JsonWebsocketConsumer):
    def connect(self):
        self.accept()
        self.group_name = f"queue_{self.scope['user'].id}"
        async_to_sync(self.channel_layer.group_add)(self.group_name, self.channel_name)
        self.manager = MatchmakingManager()

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
        """Receive server-initiated events and send them to the client."""
        self.send_json(event)

    def handle_ping(self):
        self.send_json({"type": "pong"})
