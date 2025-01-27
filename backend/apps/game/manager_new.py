import logging, asyncio, redis, random
from channels.layers import get_channel_layer
from collections import defaultdict

from apps.game.game_loop_new import GameLoop

logger = logging.getLogger(__name__)

class GameManager:
    def __init__(self, redis_host="redis", redis_port=6379):
        self.games = {}  # {room_id: game_state_dict}
        self.loops = {}  # {room_id: GameLoop}
        self.locks = defaultdict(DebugLock)
        self.CHANNEL_MAP_KEY = "game:channel_map"
        self.channel_layer = get_channel_layer()
        self.tournament_manager = TournamentManager()
        self.redis_client = redis.StrictRedis(host=redis_host, port=redis_port, decode_responses=True)

    async def create_or_get_game(self, **kwargs):
        room_id = kwargs.get("room_id")
        async with self.locks[room_id]:
            if room_id not in self.games:
                initial_state = self.initial_game_state(**kwargs)
                self.games[room_id] = initial_state
                loop = GameLoop(room_id, self, initial_state)
                self.loops[room_id] = loop
                asyncio.create_task(loop.start())
            return self.games[room_id]

    async def send_event_to_game(self, room_id, event):
        """
        Send an event to a specific GameLoop.
        """
        if room_id in self.loops:
            await self.loops[room_id].queue.put(event)

    async def update_player_input(self, room_id, user_id, up, down):
        """
        Send a player input update to the GameLoop.
        """
        event = {"type": "player_input", "user_id": user_id, "input": {"up": up, "down": down}}
        await self.send_event_to_game(room_id, event)

    async def set_game_paused(self, room_id, paused=True):
        """
        Send a pause or resume event to the GameLoop.
        """
        event = {"type": "pause" if paused else "resume"}
        await self.send_event_to_game(room_id, event)

    async def stop_game(self, room_id):
        """
        Stop the GameLoop for a room.
        """
        if room_id in self.loops:
            await self.send_event_to_game(room_id, {"type": "stop"})
            await self.loops[room_id].stop()
            del self.loops[room_id]
            del self.games[room_id]
            
    async def remove_game(self, room_id):
        if room_id not in self.locks:
            logger.debug(f"No lock found for room: {room_id}, skipping removal.")
            return
        
        # Acquire the lock for this room
        async with debug_lock(self.locks[room_id]):
            if room_id in self.games:
                del self.games[room_id]
                logger.debug(f"Removed game state for room: {room_id}")
    
        # Delete the lock after releasing it
        if room_id in self.locks:
            del self.locks[room_id]
            logger.debug(f"Removed lock for room: {room_id}")

    async def add_player(self, **kwargs):
        user_id = kwargs.get('user_id')
        room_id = kwargs.get("room_id")
        game_type = kwargs.get("game_type")
        logger.info(f"add_player() called for room_id={room_id}, game_type={game_type}, user_id={user_id}")
    
        if game_type == "TRNMT":
            # Tournament-specific logic
            next_players = kwargs.get("next_players")
            if not next_players:
                tournament = self.tournament_manager.tournaments.get(kwargs.get('tournament_id'))
                next_players = [player for player, status in tournament.items() if status['is_active'] and not status['is_waiting']]
                
            logger.info(f"Next_players: {next_players}")

            # Create or retrieve the game state for the match
            game = await self.create_or_get_game(**kwargs)
            if game is None:
                raise RuntimeError(f"Could not create or retrieve game for room {room_id}")
            
            logger.info(f"Debug log of gamestate: {game}")

            # Assign player to the current match
            if user_id not in next_players:
                # Add to spectators if both player slots are filled
                game['spectators'][user_id] = {'watching': True}
                logger.info(f"Added {user_id} as a spectator for match {room_id}")
                return  # Spectators don't participate in the match directly
            
    
            # Update players in the game state
            game['players'][user_id] = {
                'side': 'left' if user_id == next_players[0] else 'right',
                'input': {'up': False, 'down': False},
                'alias': user_id,
            }
            logger.debug(f"Player {user_id} joined room {room_id} as {'left' if user_id == next_players[0] else 'right'}")
        
        else:
            # Standard matchmaking logic
            game = await self.create_or_get_game(**kwargs)
            if game is None:
                raise RuntimeError(f"Could not create or retrieve game for room {room_id}")
    
            players = game['players']
            side = 'left' if len(players) == 0 else 'right'
            players[user_id] = {
                'side': side,
                'input': {'up': False, 'down': False},
                'alias': user_id,
            }
            logger.debug(f"Player {user_id} joined room {room_id} as {side}")

    async def remove_player(self, room_id, user_id):
        async with debug_lock(self.locks[room_id]):
            logger.info(f"remove_player() called for room_id={room_id}, user_id={user_id}")
            game = self.games.get(room_id)
            if not game:
                return
            if user_id in game['players']:
                del game['players'][user_id]
                logger.debug(f"Player {user_id} left room {room_id}")
    
            # Optional: If no players left, you can remove the game from memory
            if len(game['players']) == 0:
                logger.info("Before calling remove_game()")
                await self.remove_game(room_id)
                logger.info("After calling remove_game()")

    def add_player_to_channel_map(self, player_id, channel_name):
        logger.info(f"user {player_id} adds channel {channel_name}")
        self.redis_client.hset(self.CHANNEL_MAP_KEY, player_id, channel_name)

    def get_player_channel(self, player_id):
        """Get the WebSocket channel name for a player."""
        logger.info(f"user {player_id} gets channel {self.redis_client.hget(self.CHANNEL_MAP_KEY, player_id)}")
        return self.redis_client.hget(self.CHANNEL_MAP_KEY, player_id)

    def initial_game_state(self, **kwargs):
        logger.info("Called initial_game_state().")
        game_type = kwargs.get('game_type')
        room_id = kwargs.get('room_id')
        tournament_id = kwargs.get('tournament_id')
        users = kwargs.get('users')
        room_size = len(users)

        config = self.config
        ai_controlled = ( game_type == "PVC" )
        return {
            'room_id': room_id,
            'tournament_id': tournament_id,
            'room_size': room_size,
            'game_attributes': {**kwargs},
            'players': {},
            'spectators': {},
            'ai_controlled': ai_controlled,
            'player_ai': {'input': {'up': False, 'down': False}},
            'ball': {
                'x': config['canvas']['width'] / 2,
                'y': config['canvas']['height'] / 2,
                'vx': config['ball']['speed'] * (-1 if random.random() < 0.5 else 1),
                'vy': config['ball']['speed'] * (-1 if random.random() < 0.5 else 1),
                'render': True
            },
            'paddles': {
                'left': {
                    'x': 0,
                    'y': config['canvas']['height'] / 2 - 50,
                    'score': 0,
                },
                'right': {
                    'x': config['canvas']['width'] - config['paddle']['width'],
                    'y': config['canvas']['height'] / 2 - 50,
                    'score': 0,
                },
            },
            'game_started': False,
            'paused': False,
        }



class TournamentManager:
    def __init__(self):
        self.tournaments = {}  # In-memory tournament data

    async def add(self, tournament_id, players):
        # Initialize the tournament with all players active and waiting
        logger.info(f"Tournament with id {tournament_id} has been added.")
        self.tournaments[tournament_id] = {
            str(player): {'is_active': True, 'is_waiting': True} for player in players
        }

    async def advance_next_match(self, tournament_id, loser=None):
        tournament = self.tournaments.get(tournament_id)
        if not tournament:
            raise ValueError(f"Tournament {tournament_id} not found")
        logger.info(f"Called advance_next_match() with tournament id: {tournament_id}")

        # If a loser is provided, mark them as inactive
        if loser:
            if loser in tournament:
                tournament[loser]['is_active'] = False
                tournament[loser]['is_waiting'] = False
            else:
                raise ValueError(f"Loser {loser} not found in tournament {tournament_id}")
        
        # Find all active and waiting players
        waiting_players = [player for player, status in tournament.items() if status['is_active'] and status['is_waiting']]
        active_players = [player for player, status in tournament.items() if status['is_active']]

        if len(waiting_players) >= 2:
            # Select the first two waiting players for the next match
            player1, player2 = waiting_players[:2]
            tournament[player1]['is_waiting'] = False
            tournament[player2]['is_waiting'] = False
            return (player1, player2)  # Return the pair for the next match

        elif len(active_players) == 1:
            # Only one active player remains; they are the winner
            winner = active_players[0]
            return winner

        elif len(waiting_players) == 0 and len(active_players) > 1:
            # End of a round: Reset waiting status for the next round
            for player in active_players:
                tournament[player]['is_waiting'] = True
            return await self.advance_next_match(tournament_id)

        else:
            # No more matches to play
            return "Tournament has concluded or cannot progress"
    
def safe_record_match(player1, player2, score1, score2):
    try:
        record_match(player1, player2, score1, score2)
    except Exception as e:
        logger.error(f"Error recording match: {e}")
    
    
"""
Ana, Vin, Na, Kate
    find_match? select players
		-> Ana Vin is_waiting False
Round 1
	Match 1
	Ana vs Vin
		-> Ana Wins
			-> Vin is_active False
    find match? select players
		-> NA Kate is waiting False
	Match 2
	-> Na Wins
		-> Kate is_active False
    find_match? select players
		-> round ended
			-> is_active?
                Ana Na is_waiting True
Round 2
	find match? select palyers
		-> Ana Na is_waiting False
	Match 3
    Ana vs Na 
		-> Ana Wins
			Na -> is_active False
    find match? select players
		-> all matches played
			-> Ana is tournament winner
"""


game_manager = GameManager()

import traceback
from contextlib import asynccontextmanager
from asyncio import Lock

class DebugLock(Lock):
    def __init__(self):
        super().__init__()
        self.owner = None

    async def acquire(self):
        if self.locked():
            logger.error(f"Lock already held by: {traceback.format_stack()}")
        self.owner = asyncio.current_task()
        return await super().acquire()

    def release(self):
        logger.debug(f"Releasing lock held by: {self.owner}")
        self.owner = None
        return super().release()

@asynccontextmanager
async def debug_lock(lock):
    await lock.acquire()
    try:
        yield
    finally:
        lock.release()