import asyncio
from asyncio import Lock
import logging
import random
from channels.layers import get_channel_layer
from django.contrib.auth import get_user_model
from asgiref.sync import sync_to_async
import hashlib
from apps.matchmaking.manager import generate_shared_game_room_url
import redis 
import time

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

import traceback
from contextlib import asynccontextmanager
SCORE_TO_WIN = 3
User = get_user_model() 

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

from collections import defaultdict
from apps.game.game_loop import GameLoop
from apps.accounts.services import record_match 

class GameManager:

    def __init__(self, redis_host="redis", redis_port=6379):
        self.games = {}  # {room_id: game_state_dict}
        self.tournament_manager = TournamentManager()
        self.running = False
        self.channel_layer = get_channel_layer()
        self.locks = defaultdict(DebugLock)
        self.game_loop = GameLoop(self)
        self.user_id_map = {} 
        self.redis_client = redis.StrictRedis(host=redis_host, port=redis_port, decode_responses=True)
        self.CHANNEL_MAP_KEY = "game:channel_map"

        self.config = {
            'canvas': {'width': 800, 'height': 600},
            'paddle': {
                'height': int(600 * 0.2),
                'width': int(800 * 0.02)
            },
            'ball': {
                'diameter': int(800 * 0.03),
                'speed': 350
            }
        }

    def add_channel_to_player_map(self, player_id, channel_name):
        logger.info(f"user {player_id} adds channel {channel_name}")
        self.redis_client.hset(self.CHANNEL_MAP_KEY, player_id, channel_name)

    def get_player_channel(self, player_id):
        """Get the WebSocket channel name for a player."""
        logger.info(f"user {player_id} gets channel {self.redis_client.hget(self.CHANNEL_MAP_KEY, player_id)}")
        return self.redis_client.hget(self.CHANNEL_MAP_KEY, player_id)
    
    async def start(self):
        try:
            if self.running:
                logger.warning("GameManager is already running.")
                return
            if not self.games:
                logger.warning("No games to manage. Delaying server_loop start.")
                return
            self.running = True
            logger.info("Starting GameManager loop.")

            asyncio.create_task(self.game_loop.run())

        except Exception as e:
            logger.error(f"Error in GameManager start: {e}")

    async def stop(self):
        self.running = False
        logger.debug("GameManager stopped.")
 
    async def create_or_get_game(self, **kwargs):
        logger.info(f"Called create_or_get_game()")
        room_id = kwargs.get('room_id')
        
        logger.debug(f"create_or_get_game() called for room_id={room_id}")
        room_lock = self.locks[room_id]

        while room_lock.locked():
            logger.warning(f"Lock for room_id={room_id} is held. Waiting...")
            await asyncio.sleep(0.1)  # Wait for the lock to be released

        async with room_lock:
            logger.debug(f"Acquired lock for room_id={room_id}")

            if room_id not in self.games or not self.games[room_id]:
                self.games[room_id] = self.initial_game_state(**kwargs)

            return self.games[room_id]


    async def remove_game(self, room_id):
        async with debug_lock(self.locks[room_id]):
            if room_id in self.games:
                del self.games[room_id]
                logger.debug(f"Removed game state for room: {room_id}")

    async def add_player(self, **kwargs):
        """
        Add a player to a game room or tournament match.
    
        Args:
            user_id (str): The player's identifier.
            **kwargs: Additional game attributes, such as 'room_id', "game_type", etc.
        """
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
            
    async def update_player_input(self, room_id, user_id, up, down):
        async with debug_lock(self.locks[room_id]):
            game = self.games.get(room_id)
            if game and user_id in game['players']:
                game['players'][user_id]['input']['up'] = up
                game['players'][user_id]['input']['down'] = down

    def set_player_alias(self, room_id, user_id, alias):
        game = self.games.get(room_id)
        if game and user_id in game['players']:
            game['players'][user_id]['alias'] = alias

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

    async def set_game_started(self, room_id, user_id):
        logger.info(f"Called set_game_started(). User id: {user_id}")
        async with debug_lock(self.locks[room_id]):
            game = self.games.get(room_id)
            if not game:
                logger.warning(f"Game not found for room {room_id}")
                return

            if user_id in game['players']:
                game['players'][user_id]['ready'] = True
            if user_id in game['spectators']:
                game['spectators'][user_id]['ready'] = True

            players = list(game['players'].values())
            spectators = list(game['spectators'].values())
            total_players = len(players) + len(spectators)
            all_players_ready = all(p.get('ready', False) for p in players)
            all_spectators_ready = all(s.get('ready', False) for s in spectators)

            logger.info(f"Players in room {room_id}: {players}")
            logger.info(f"Total players (num): {total_players} 'all_players_ready': {all_players_ready}: 'all_spectators_ready'{all_spectators_ready}")

            if total_players == game['room_size'] and all_players_ready and all_spectators_ready:
                game['game_started'] = True
                logger.info(f"Game in room '{room_id}' has started.")
            else:
                logger.info(f"Waiting for both players to be ready in room {room_id}...")

                
    async def set_game_paused(self, room_id, paused=True):
        async with debug_lock(self.locks[room_id]):
            game = self.games.get(room_id)
            if game:
                game['paused'] = paused
                # game['ball']['render'] = not paused

    async def set_game_resumed(self, room_id):
        await self.set_game_paused(room_id, paused=False)

    def normalize_state(self, game_state):
        """ Converts absolute positions into relative values (0 to 1). """
        config = self.config
        canvas_width = config['canvas']['width']
        canvas_height = config['canvas']['height']

        return {
            'type': 'state_update',
            'ball': {
                'x': game_state['ball']['x'] / canvas_width,
                'y': game_state['ball']['y'] / canvas_height,
                'vx': game_state['ball']['vx'] / canvas_width,
                'vy': game_state['ball']['vy'] / canvas_height,
                'render': game_state['ball']['render'],
            },
            'paddles': {
                'left': {
                    'x': game_state['paddles']['left']['x'] / canvas_width,
                    'y': game_state['paddles']['left']['y'] / canvas_height,
                    'score': game_state['paddles']['left']['score'],
                },
                'right': {
                    'x': game_state['paddles']['right']['x'] / canvas_width,
                    'y': game_state['paddles']['right']['y'] / canvas_height,
                    'score': game_state['paddles']['right']['score'],
                },
            }
        }
    
    def reset_game(self, game_state):

        config = self.config
        # Reset scores
        game_state['paddles']['left']['score'] = 0
        game_state['paddles']['right']['score'] = 0

        # Reset paddle positions
        game_state['paddles']['left']['y'] = config['canvas']['height'] / 2 - 50
        game_state['paddles']['right']['y'] = config['canvas']['height'] / 2 - 50
        game_state['paddles']['left']['x'] = 0  # Keep at left edge
        game_state['paddles']['right']['x'] = config['canvas']['width'] - config['paddle']['width']

        # Reset ball position and velocity
        game_state['ball']['x'] = config['canvas']['width'] / 2
        game_state['ball']['y'] = config['canvas']['height'] / 2
        game_state['ball']['vx'] = config['ball']['speed'] * (-1 if random.random() < 0.5 else 1)
        game_state['ball']['vy'] = config['ball']['speed'] * (-1 if random.random() < 0.5 else 1)

        # Reset game state flags
        game_state['game_started'] = False
        game_state['paused'] = True

        game_state.clear()

    async def get_user(self, identifier):
        """Fetches user object by ID (if integer) or by username otherwise."""
        try:
            if identifier == "Computer":
                return await sync_to_async(User.objects.get)(username="Computer")  # ✅ Fetch AI user
            
            if identifier.isdigit():
                return await sync_to_async(User.objects.get)(id=int(identifier))
            
            return await sync_to_async(User.objects.get)(username=identifier) 
        
        except User.DoesNotExist:
            logger.error(f"User {identifier} not found.")
            return None


    async def broadcast_all_states(self):
        for room_id, game_state in self.games.items():
            if not game_state.get('game_started') and not game_state.get('paused'):
                continue

            left_score = game_state['paddles']['left']['score']
            right_score = game_state['paddles']['right']['score']

            # Check if game is over
            if left_score >= SCORE_TO_WIN or right_score >= SCORE_TO_WIN:
                player1_id = next(
                    (player['alias'] for player in game_state['players'].values() if player['side'] == 'left'),
                    None
                )
                player2_id = "Computer" if game_state['ai_controlled'] else next(
                    (player['alias'] for player in game_state['players'].values() if player['side'] == 'right'),
                    None
                )

                # Fetch User objects
                player1 = await self.get_user(player1_id) 
                player2 = await self.get_user(player2_id)

                winner = player1.username if left_score >= SCORE_TO_WIN else player2.username
                looser = player1.username if left_score < SCORE_TO_WIN else player2.username
                
                logger.info(f"🏆 The winner is: {winner}")

                tournament_id = game_state.get('tournament_id')
                if tournament_id:
                    tournament_result = await self.tournament_manager.advance_next_match(tournament_id, looser)
                    logger.info(f"Tournament result: {tournament_result}")
                    if len(tournament_result) == 2:
                        logger.info(f"Tournament match finished, next up {tournament_result}")
                        data = game_state['game_attributes']
                        data.update({'next_players': [tournament_result[0], tournament_result[1]]})
                        for user_id in data.get('users'):
                            logger.info(f"Inside broadcast and tournaments: user in game attributes: {user_id}")
                            data.update({'user_id': user_id})
                            url = generate_shared_game_room_url(**data)
                            player_channel = self.get_player_channel(user_id)
                            await self.channel_layer.send(
                                player_channel,
                                {
                                    'type': 'game_message',
                                    'data': {
                                        'type': 'tournament',
                                        'winner': str(winner),
                                        'next' : {
                                            'players': [tournament_result[0], tournament_result[1]],
                                            'url': url
                                        }
                                    },
                                }
                            )
                    elif len(tournament_result) > 2 and tournament_result.isdigit():
                        logger.info(f"Tournament finished, winner is {winner}")
                        await self.channel_layer.group_send(
                            f"game_{room_id}",
                            {
                                'type': 'game_message',
                                'data': {
                                    'type': 'tournament',
                                    'winner': str(winner),
                                },
                            }
                        )
                    else:
                        logger.info("Something happend but I don't know whyat")



                else:
                    try:
                        if game_state['ai_controlled']:
                            logger.info(f"AI Game Over! {winner} wins!")
                            await self.channel_layer.group_send(
                                f"game_{room_id}",
                                {
                                    'type': 'game_message',
                                    'data': {
                                        'type': 'ai_game_over',
                                        'message': f"Game Over! {winner} wins!",
                                        'winner': str(winner)
                                    },
                                }
                            )
                        else:
                            await self.channel_layer.group_send(
                                f"game_{room_id}",
                                {
                                    'type': 'game_message',
                                    'data': {
                                        'type': 'game_over',
                                        'message': f"Game Over! {winner} wins!",
                                        'winner': str(winner)
                                    },
                                }
                            )
                    except Exception as e:
                        logger.info(f"Error broadcasting game over message: {e}")
                try:
                    await sync_to_async(record_match)(player1, player2, left_score, right_score)

                except Exception as e:
                    logger.error(f"Error recording match: {e}")

                logger.info("Before reset_game().")
                self.reset_game(game_state)
                logger.info("After reset_game().")

                continue

            # Normalize state
            norm_state = self.normalize_state(game_state)
            await self.channel_layer.group_send(
                f"game_{room_id}",
                {
                    'type': 'game_message',
                    'data': {
                        'type': 'state_update',
                        'ball': norm_state['ball'],
                        'paddles': norm_state['paddles'],
                        'players': game_state['players'],
                        'spectators': game_state['spectators'],
                    },
                }
            )

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