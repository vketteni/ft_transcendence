# apps/matchmaking/manager.py
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
import redis
import time
import logging
from redis.exceptions import LockError
import uuid


logger = logging.getLogger(__name__)

MAX_WAIT_TIME = 30
TOURNAMENT_SIZE = 3

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
        """
        Find the next pair of players for matchmaking and notify them.
        
        Args:
            queue_name (str): The name of the matchmaking queue.
    
        Returns:
            tuple: Matched players and the generated room URL, or (None, None) if no match is found.
        """
        players = self.get_top_players(queue_name)
        room_url = None  # Initialize room_url to avoid UnboundLocalError
    
        queue_key = self.QUEUE_KEYS[queue_name]
        logger.info(f"Queue key: {queue_key}")
        logger.info(f"Players: {players}")
    
        # Determine if the current queue has enough players for a match
        if self._has_sufficient_players(queue_key, players):
            logger.info("Sufficient players found for matchmaking.")
    
            # Remove matched players atomically
            self.remove_matched_players(queue_name, players)
    
            # Generate match details
            data = {}
            data.update({'match_id' : str(uuid.uuid4())})
            data.update({'game_type' : self._get_game_type(queue_key)})
            
            
            if self._get_game_type(queue_key) == "TRNMT":
                data.update({
                    'tournament' : {
                        'tournament_id' : str(uuid.uuid4()),
                        'players' : players
					},
                })
            
            # Notify players of the match
            self._notify_players(players, **data)
        else:
            logger.debug(f"Insufficient players in {queue_name} queue for matchmaking.")
            return None, None
        # Always return a tuple with players and room_url
        return players, room_url


    def _has_sufficient_players(self, queue_key, players):
        """
        Check if the queue has enough players for a match.
    
        Args:
            queue_key (str): The queue type key.
            players (list): List of players in the queue.
    
        Returns:
            bool: True if sufficient players are present, False otherwise.
        """
        required_sizes = {
            self.QUEUE_KEYS["PVP"]: 2,
            self.QUEUE_KEYS["PVC"]: 1,
            self.QUEUE_KEYS["TRNMT"]: TOURNAMENT_SIZE,
        }
        return len(players) == required_sizes.get(queue_key, float('inf'))

    def _get_game_type(self, queue_key):
        """
        Retrieve the game type from the queue key.
    
        Args:
            queue_key (str): The queue type key.
    
        Returns:
            str: The corresponding game type.
        """
        return get_key_from_value(self.QUEUE_KEYS, queue_key)

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

    def _notify_players(self, players, **data):
        """
        Notify players of the match and send them the room URL.
    
        Args:
            players (list): List of player IDs.
            room_url (str): The generated room URL.
    
        Logs errors for any players that cannot be notified.
        """
        for player_id in players:
            data.update({
                'player_id': player_id
                })
            room_url = generate_shared_game_room_url(**data)
            channel_name = self.get_player_channel(player_id)
            if not channel_name:
                logger.error(f"No channel found for player {player_id}")
                continue
    
            try:
                async_to_sync(self.channel_layer.send)(
                    channel_name,
                    {
                        "type": "match_found",
                        "data": {"room_url": room_url},
                    }
                )
            except Exception as e:
                logger.error(f"Failed to notify player {player_id}: {e}")

matchmaking_manager = MatchmakingManager()

""" Helper functions """
import jwt
from django.conf import settings

SECRET_KEY = settings.SECRET_KEY

def generate_shared_game_room_url(**kwargs):
    payload = {
        "exp": time.time() + 3600
    }
    payload.update(kwargs)
    """Generate a shared secure URL for the game room."""
    token = jwt.encode(payload, SECRET_KEY, algorithm="HS256")
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
 