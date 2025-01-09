# apps/matchmaking/manager.py
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
import redis
import time
import logging

logger = logging.getLogger(__name__)

class MatchmakingManager:
    QUEUE_KEY = "matchmaking:queue"

    def __init__(self, redis_host="redis", redis_port=6379):
        self.redis_client = redis.StrictRedis(host=redis_host, port=redis_port, decode_responses=True)

    def add_player_to_queue(self, player_id):
        """Add a player to the matchmaking queue."""
        timestamp = time.time()
        self.redis_client.zadd(self.QUEUE_KEY, {player_id: timestamp})

    def remove_player_from_queue(self, player_id):
        """Remove a player from the matchmaking queue."""
        self.redis_client.zrem(self.QUEUE_KEY, player_id)

    def get_player_position(self, player_id):
        """Get the player's position in the queue."""
        rank = self.redis_client.zrank(self.QUEUE_KEY, player_id)
        if rank is not None:
            return rank + 1
        return None

    def cleanup_stale_entries(self, max_wait_time=300):
        """Remove players who have been in the queue too long."""
        cutoff_time = time.time() - max_wait_time
        self.redis_client.zremrangebyscore(self.QUEUE_KEY, "-inf", cutoff_time)

    def find_match(self):
        """Find the next pair of players for matchmaking."""
        logger.info("find match called")
        players = self.redis_client.zrange(self.QUEUE_KEY, 0, 1)
        if len(players) == 2:
            # Remove matched players atomically
            self.redis_client.zrem(self.QUEUE_KEY, *players)

            # Notify players about the match
            match_id = f"{int(time.time())}"
            match_url = f"/game/{match_id}"
            notify_match_found(players[0], players[1], match_url)

            return players, match_url
        return None, None

def notify_match_found(player1_id, player2_id, match_url):
    channel_layer = get_channel_layer()
    match_event = {
        "type": "send_server_event",
        "event_type": "match_found",
        "data": {
            "player1": player1_id,
            "player2": player2_id,
            "game_room_url": match_url,
        },
    }
    async_to_sync(channel_layer.group_send)(f"queue_{123}", match_event)
    async_to_sync(channel_layer.group_send)(f"queue_{123}", match_event)

matchmaking_manager = MatchmakingManager()