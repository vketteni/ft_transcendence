import asyncio
from asyncio import Lock
import logging
import random
from channels.layers import get_channel_layer

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

import traceback
from contextlib import asynccontextmanager

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
 
    async def create_or_get_game(self, room_name):
        logger.debug(f"create_or_get_game() called for room_name={room_name}")
        room_lock = self.locks[room_name]

        while room_lock.locked():
            logger.warning(f"Lock for room_name={room_name} is held. Waiting...")
            await asyncio.sleep(0.1)  # Wait for the lock to be released

        async with room_lock:
            logger.debug(f"Acquired lock for room_name={room_name}")
            if room_name not in self.games:
                self.games[room_name] = self.initial_game_state(room_name)
                logger.debug(f"Created new game state for room: {room_name}")
                
            return self.games[room_name]

    async def remove_game(self, room_name):
        async with debug_lock(self.locks[room_name]):
            if room_name in self.games:
                del self.games[room_name]
                logger.debug(f"Removed game state for room: {room_name}")

    async def add_player(self, room_name, channel_name):
        logger.debug(f"add_player() called for room_name={room_name}, channel_name={channel_name}")
        game = await self.create_or_get_game(room_name)

        if game is None:
            logger.error(f"Failed to retrieve or create game for room_name={room_name}.")
            raise RuntimeError(f"Could not create or retrieve game for room {room_name}")

        players = game['players']
        side = 'left' if len(players) == 0 else 'right'
        players[channel_name] = {
            'side': side,
            'input': {'up': False, 'down': False},
            'alias': None
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

    def initial_game_state(self, room_name, ai_controlled=False):
        config = self.config
        return {
            'room_name': room_name,
            'players': {},
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

    async def set_game_started(self, room_name, channel_name, ai_controlled=False):
        async with debug_lock(self.locks[room_name]):
            game = self.games.get(room_name)
            if not game:
                logger.warning(f"Game not found for room {room_name}")
                return

            if ai_controlled:
                game['ai_controlled'] = True

            if channel_name in game['players']:
                game['players'][channel_name]['ready'] = True

            # Check if BOTH players are ready (human vs human) or AI match is set
            if ai_controlled or (len(game['players']) == 2 and all(p.get('ready', False) for p in game['players'].values())):
                game['game_started'] = True
                logger.info(f"Game in room '{room_name}' started (AI: {ai_controlled}).")
                
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

game_manager = GameManager()