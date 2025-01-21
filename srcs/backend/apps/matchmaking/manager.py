# apps/matchmaking/manager.py
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
import redis
import time
import logging
from redis.exceptions import LockError

logger = logging.getLogger(__name__)

MAX_WAIT_TIME = 30
TOURNAMENT_SIZE = 4

class MatchmakingManager:
    QUEUE_KEYS = {
        "PVP": "matchmaking:pvpqueue",
        "PVC": "matchmaking:pvcqueue",
        "TRNMT": "matchmaking:trnmtqueue",
    }
    CHANNEL_MAP_KEY = "matchmaking:channel_map"

    def __init__(self, redis_host="redis", redis_port=6379):
        self.redis_client = redis.StrictRedis(host=redis_host, port=redis_port, decode_responses=True)
        self.channel_layer = get_channel_layer()

    def add_player_to_queue(self, player_id, channel_name, queue_name):
        """Add a player to a specific queue and store their channel name."""
        timestamp = time.time()
        queue_key = self.QUEUE_KEYS[queue_name]
        self.redis_client.zadd(queue_key, {player_id: timestamp})
        self.redis_client.hset(self.CHANNEL_MAP_KEY, player_id, channel_name)

    def remove_player_from_queue(self, player_id, queue_key):
        """Remove a player from a specific queue."""
        self.redis_client.zrem(queue_key, player_id)
        self.redis_client.hdel(self.CHANNEL_MAP_KEY, player_id)

    def get_player_channel(self, player_id):
        """Get the WebSocket channel name for a player."""
        return self.redis_client.hget(self.CHANNEL_MAP_KEY, player_id)

    def cleanup_stale_entries(self, max_wait_time=300):
        """Remove players who have been in the queue too long."""
        cutoff_time = time.time() - max_wait_time
        for queue_name, queue_key in self.QUEUE_KEYS.items():
            stale_players = self.redis_client.zrangebyscore(queue_key, "-inf", cutoff_time)
            for player_id in stale_players:
                self.remove_player_from_queue(player_id, queue_key)
                logger.info(f"Removed stale player {player_id} from {queue_name}")

                
    def find_match(self, queue_name):
        """Find the next pair of players for matchmaking and notify them."""
        players = self.get_top_players(queue_name)
        room_url = None  # Initialize room_url to avoid UnboundLocalError
    
        queue_key = self.QUEUE_KEYS[queue_name]
        logger.info(f"queue key: {queue_key}")
        logger.info(f"players: {players}")
        if ((queue_key == self.QUEUE_KEYS["PVP"]) and (len(players) == 2)) or ((queue_key == self.QUEUE_KEYS["PVC"]) and (len(players) == 1)) or ((queue_key == self.QUEUE_KEYS["TRNMT"]) and (len(players) == TOURNAMENT_SIZE)):
            logger.info(f"passed")
            # Remove matched players atomically
            self.remove_matched_players(queue_name, players)
    
            # Generate match details
            match_id = f"{int(time.time())}"
            game_type = get_key_from_value(self.QUEUE_KEYS, queue_key)
            logger.info(f"Game mode: {game_type}")
            room_url = generate_shared_game_room_url(match_id, game_type)
    
            # Notify players
            for player_id in players:
                channel_name = self.get_player_channel(player_id)
                if not channel_name:
                    logger.error(f"No channel found for player {player_id}")
                    continue  # Skip notifying this player if no channel exists
    
                try:
                    async_to_sync(self.channel_layer.send)(
                        channel_name,
                        {
                            "type": "match_found",
                            "data": {"room_url": room_url},  # Shared room URL
                        }
                    )
                except Exception as e:
                    logger.error(f"Failed to notify player {player_id}: {e}")
        else:
            logger.debug(f"Insufficient players in {queue_name} queue for matchmaking.")
    
        # Always return a tuple with players and room_url
        return players, room_url



    def get_top_players(self, queue_name):
        queue_key = self.QUEUE_KEYS[queue_name]
        if queue_key == self.QUEUE_KEYS["PVP"]:
            return self.redis_client.zrange(queue_key, 0, 1)
        if queue_key == self.QUEUE_KEYS["PVC"]:
            return self.redis_client.zrange(queue_key, 0, 0)
        if queue_key == self.QUEUE_KEYS["TRNMT"]:
            return self.redis_client.zrange(queue_key, 0, TOURNAMENT_SIZE)
			
    def remove_matched_players(self, queue_name, players):
        queue_key = self.QUEUE_KEYS[queue_name]
        self.redis_client.zrem(queue_key, *players)

matchmaking_manager = MatchmakingManager()

""" Helper functions """
import jwt
from django.conf import settings

SECRET_KEY = settings.SECRET_KEY

def generate_shared_game_room_url(room_id, game_type):
    """Generate a shared secure URL for the game room."""
    token = jwt.encode(
        {"room_id": room_id, "game_type": game_type, "exp": time.time() + 3600},
        SECRET_KEY,
        algorithm="HS256"
    )
    return f"ws/game/join?token={token}"

def validate_game_room_token(token):
    """Validate the game room token."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        return payload
    except jwt.ExpiredSignatureError:
        raise ValueError("Token expired")
    except jwt.InvalidTokenError:
        raise ValueError("Invalid token")

def get_key_from_value(dictionary, target_value):
    for key, value in dictionary.items():
        if value == target_value:
            return key
    return None  # Return None if the value is not found