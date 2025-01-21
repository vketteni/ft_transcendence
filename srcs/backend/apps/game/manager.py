import asyncio
from asyncio import Lock
import logging
import random
from channels.layers import get_channel_layer
from .models import TournamentNode

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

import traceback
from contextlib import asynccontextmanager
from apps.matchmaking.models import Match
from apps.accounts.models import Player
from django.contrib.auth import get_user_model

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


class GameManager:

    def __init__(self):
        self.games = {}  # {room_name: game_state_dict}
        self.tournaments = {}
        self.running = False
        self.channel_layer = get_channel_layer()
        self.locks = defaultdict(DebugLock)
        self.game_loop = GameLoop(self)

        self.config = {
            'canvas': {'width': 800, 'height': 600},
            'paddle': {
                'height': 100,
                'width': 15
            },
            'ball': {
                'diameter': 20,
                'speed': 350
            }
        }
        
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
 
    async def create_or_get_game(self, room_name, game_type, **kwargs):
        logger.debug(f"create_or_get_game() called for room_name={room_name}")
        room_lock = self.locks[room_name]

        while room_lock.locked():
            logger.warning(f"Lock for room_name={room_name} is held. Waiting...")
            await asyncio.sleep(0.1)  # Wait for the lock to be released

        async with room_lock:
            logger.debug(f"Acquired lock for room_name={room_name}")
            if room_name not in self.games:
                self.games[room_name] = self.initial_game_state(room_name, game_type, **kwargs)
                logger.debug(f"Created new game state for room: {room_name}")
                
            return self.games[room_name]

    async def remove_game(self, room_name):
        async with debug_lock(self.locks[room_name]):
            if room_name in self.games:
                del self.games[room_name]
                logger.debug(f"Removed game state for room: {room_name}")

    async def add_player(self, channel_name, **kwargs):
        """
        Add a player to a game room or tournament match.
    
        Args:
            channel_name (str): The player's communication channel.
            **kwargs: Additional game attributes, such as "room_id", "game_type", etc.
        """
        room_name = kwargs.get("room_id")
        game_type = kwargs.get("game_type")
        logger.info(f"add_player() called for room_name={room_name}, game_type={game_type}, channel_name={channel_name}")
    
        if game_type == "TRNMT":
            # Tournament-specific logic
            tournament_id = kwargs.get("tournament_id")
            tournament = self.tournaments.get(tournament_id)
            if not tournament:
                raise ValueError(f"Tournament {tournament_id} not found.")
            
            current_match = tournament['current_match']
            if not current_match:
                raise ValueError(f"No active match found for tournament {tournament_id}.")

            # Create or retrieve the game state for the match
            game = await self.create_or_get_game(room_name, game_type, **kwargs)
            if game is None:
                raise RuntimeError(f"Could not create or retrieve game for room {room_name}")
            
            # Assign player to the current match
            if not current_match.player1:
                current_match.player1 = channel_name
                logger.info(f"Assigned {channel_name} as player1 for match {room_name}")
            elif not current_match.player2:
                current_match.player2 = channel_name
                logger.info(f"Assigned {channel_name} as player2 for match {room_name}")
            else:
                # Add to spectators if both player slots are filled
                game['spectators'] += [channel_name]
                logger.info(f"Added {channel_name} as a spectator for match {room_name}")
                return  # Spectators don't participate in the match directly
            
    
            # Update players in the game state
            game['players'][channel_name] = {
                'side': 'left' if channel_name == current_match.player1 else 'right',
                'input': {'up': False, 'down': False},
                'alias': channel_name,
            }
            logger.debug(f"Player {channel_name} joined room {room_name} as {'left' if channel_name == current_match.player1 else 'right'}")
        
        else:
            # Standard matchmaking logic
            game = await self.create_or_get_game(room_name, game_type, **kwargs)
            if game is None:
                raise RuntimeError(f"Could not create or retrieve game for room {room_name}")
    
            players = game['players']
            side = 'left' if len(players) == 0 else 'right'
            players[channel_name] = {
                'side': side,
                'input': {'up': False, 'down': False},
                'alias': channel_name,
            }
            logger.debug(f"Player {channel_name} joined room {room_name} as {side}")


    async def remove_player(self, room_name, channel_name):
        async with debug_lock(self.locks[room_name]):
            game = self.games.get(room_name)
            if not game:
                return
            if channel_name in game['players']:
                del game['players'][channel_name]
                logger.debug(f"Player {channel_name} left room {room_name}")
    
            # Optional: If no players left, you can remove the game from memory
            if len(game['players']) == 0:
                logger.debug("Before calling remove_game()")
                await self.remove_game(room_name)
                logger.debug("After calling remove_game()")
            
    async def update_player_input(self, room_name, channel_name, up, down):
        async with debug_lock(self.locks[room_name]):
            game = self.games.get(room_name)
            if game and channel_name in game['players']:
                game['players'][channel_name]['input']['up'] = up
                game['players'][channel_name]['input']['down'] = down

    def set_player_alias(self, room_name, channel_name, alias):
        game = self.games.get(room_name)
        if game and channel_name in game['players']:
            game['players'][channel_name]['alias'] = alias

    def initial_game_state(self, room_name, game_type, **kwargs):
        config = self.config
        ai_controlled = ( game_type == "PVC" )
        logger.info(ai_controlled)
        return {
            'room_name': room_name,
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

    async def set_game_started(self, room_name, channel_name):
        async with debug_lock(self.locks[room_name]):
            game = self.games.get(room_name)
            if not game:
                logger.warning(f"Game not found for room {room_name}")
                return

            if channel_name in game['players']:
                game['players'][channel_name]['ready'] = True

            logger.info(game['players'].values())
            # Check if BOTH players are ready (human vs human) or AI match is set
            players = game['players'].values()
            if all(p.get('ready', False) for p in players and len(players) == 2):


                user1, player1 = get_or_create_user_and_player(players[0])
                user1, player2 = get_or_create_user_and_player(players[1])
                    
                # Create a new Match object
                Match.objects.create(
                    id=room_name,
                    player1=player1,
                    player2=player2,
                )
                
                game['game_started'] = True
                logger.info(f"Game in room '{room_name}'.")
                
    async def set_game_paused(self, room_name, paused=True):
        async with debug_lock(self.locks[room_name]):
            game = self.games.get(room_name)
            if game:
                game['paused'] = paused
                # game['ball']['render'] = not paused

    async def set_game_resumed(self, room_name):
        await self.set_game_paused(room_name, paused=False)

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

    async def broadcast_all_states(self):
        for room_name, game_state in self.games.items():
            if not game_state.get('game_started') and not game_state.get('paused'):
                continue
            
            # Check if game is over
            if game_state['paddles']['right']['score'] >= 10 or game_state['paddles']['left']['score'] >= 10:
                winner = "Right Player" if game_state['paddles']['right']['score'] >= 5 else "Left Player"
                
                if game_state['ai_controlled']:
                    await self.channel_layer.group_send(
                    f"game_{room_name}",
                    {
                        'type': 'game_message',
                        'data': {
                            'type': 'ai_game_over',
                            'message': f"Game Over! {winner} wins!",
                            'winner': winner
                        },
                    }
                )
                else:
                    await self.channel_layer.group_send(
                        f"game_{room_name}",
                        {
                            'type': 'game_message',
                            'data': {
                                'type': 'game_over',
                                'message': f"Game Over! {winner} wins!",
                                'winner': winner
                            },
                        }
                    )

                self.reset_game(game_state)
                continue

            # Normalize state
            norm_state = self.normalize_state(game_state)
            await self.channel_layer.group_send(
                f"game_{room_name}",
                {
                    'type': 'game_message',
                    'data': {
                        'type': 'state_update',
                        'ball': norm_state['ball'],
                        'paddles': norm_state['paddles'],
                    },
                }
            )

    def build_tournament_tree(self, participants):
        """
        Build a binary tree representing the tournament.

        Args:
            participants (list): A list of participant identifiers (e.g., player names or IDs).

        Returns:
            TournamentNode: The root of the tournament binary tree.
        """
        # Add byes if the number of participants is not a power of 2
        num_participants = len(participants)
        next_power_of_two = 1 << (num_participants - 1).bit_length()
        byes = next_power_of_two - num_participants

        # Add None as placeholders for byes
        participants.extend([None] * byes)

        # Create the leaf nodes for the tree (initial matches)
        nodes = [TournamentNode(player1=p1, player2=p2)
                 for p1, p2 in zip(participants[::2], participants[1::2])]

        # Build the tree by combining matches
        while len(nodes) > 1:
            next_round = []
            for i in range(0, len(nodes), 2):
                left = nodes[i]
                right = nodes[i+1] if i+1 < len(nodes) else None
                parent = TournamentNode()
                parent.left = left
                parent.right = right
                next_round.append(parent)
            nodes = next_round

        # Root of the tree
        return nodes[0] if nodes else None
      
    async def create_tournament(self, tournament_id, participants):
        root = self.build_tournament_tree(participants)
        self.tournaments[tournament_id] = {
            'tree': root,
            'current_match': root,
            'spectators': set(),
            'participants': participants,
        }

    async def advance_tournament_match(self, tournament_id):
        tournament = self.tournaments[tournament_id]
        current_node = tournament['current_match']
        if not current_node:
            logger.info(f"Tournament {tournament_id} has concluded.")
            return
        
        winner = current_node.winner
        parent = self.find_parent(tournament['tree'], current_node)
        if parent:
            if parent.left == current_node:
                parent.player1 = winner
            else:
                parent.player2 = winner
            tournament['current_match'] = parent
        else:
            logger.info(f"Tournament {tournament_id} winner is {winner}.")
            tournament['current_match'] = None

def get_or_create_user_and_player(player_name):
    """
    Get or create a User and associated Player based on player_name.

    Args:
        player_name (str): The name of the player.

    Returns:
        tuple: (User, Player) objects.
    """
    User = get_user_model()  # Use the swapped User model

    # Get or create the User
    user, user_created = User.objects.get_or_create(
        username=player_name,  # Use player_name as the username
        defaults={"email": f"{player_name.lower()}@example.com"}  # Provide a default email
    )
    if user_created:
        logger.debug(f"User created: {user}")

    # Get or create the Player associated with the User
    player, player_created = Player.objects.get_or_create(
        user=user,
        defaults={"name": player_name}
    )
    if player_created:
        logger.debug(f"Player created: {player}")

    return user, player


game_manager = GameManager()