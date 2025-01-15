import asyncio
from asyncio import Lock
import logging
import random
from channels.layers import get_channel_layer

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

import traceback
from asyncio import Lock
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
        self.channel_layer = self.channel_layer = get_channel_layer()
        self.locks = defaultdict(DebugLock)
        self.game_loop = GameLoop(self)
        
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
                self.games[room_name] = self.initial_game_state()
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

    def initial_game_state(self):
        paddle_width = 15
        paddle_height = 100
        canvas_width = 800
        canvas_height = 400

        return {
            'players': {},
            'ball': {'x': canvas_width / 2, 'y': canvas_height / 2, 'vx': 4, 'vy': 4, 'render': True},
            'paddles': {
                'left': {
                    'x': 0,
                    'y': canvas_height / 2 - 50,
                    'width': paddle_width,
                    'score': 0,
                },
                'right': {
                    'x': canvas_width - paddle_width,
                    'y': canvas_height / 2 - 50,
                    'width': paddle_width,
                    'score': 0,
                },
            },
            'canvas': {'width': canvas_width, 'height': canvas_height},
            'config': {
                'paddle': {
                    'height': paddle_height,
                    'width': paddle_width,
                },
                'ball': {'diameter': 20},
            },
            'game_started': False,
            'paused': False,
        }

    async def set_game_started(self, room_name, started):
        logger.debug(f"set_game_started() started")
        async with debug_lock(self.locks[room_name]):
            game = self.games.get(room_name)
            logger.debug(f"Attempting to start game: {game}")
            if game:
                game['game_started'] = started
                logger.debug(f"Game in room '{room_name}' started: {started}")

    async def set_game_paused(self, room_name, paused=True):
        async with debug_lock(self.locks[room_name]):
            game = self.games.get(room_name)
            if game:
                game['paused'] = paused
                # game['ball']['render'] = not paused

    async def set_game_resumed(self, room_name):
        await self.set_game_paused(room_name, paused=False)

    async def set_game_config(self, room_name, canvas, paddle, ball):
        logger.debug("Before calling create_or_get_game()")
        game = await self.create_or_get_game(room_name)
        logger.debug("After calling create_or_get_game()")
        if not game:
            logger.warning(f"Game not found for room {room_name}")
            return
        game['canvas'] = canvas
        game['config'] = {
                'paddle': paddle,
                'ball': ball
            }
        game['paddles']['left'] = {
            'x': 0,
            'y': canvas['height'] / 2 - paddle['height'] / 2,
            'score': game['paddles'].get('left', {}).get('score', 0)
            }
        game['paddles']['right'] = {
            'x': canvas['width'],
            'y': canvas['height'] / 2 - paddle['height'] / 2,
            'score': game['paddles'].get('right', {}).get('score', 0)
        }
        logger.debug(f"Game config set for room '{room_name}': canvas={canvas}, paddle={paddle}, ball={ball}")
    
    def reset_game(self, game_state):
        canvas = game_state['canvas']
        paddle_config = game_state['config']['paddle']

        # Reset scores
        game_state['paddles']['left']['score'] = 0
        game_state['paddles']['right']['score'] = 0

        # Reset paddle positions
        game_state['paddles']['left']['y'] = canvas['height'] / 2 - paddle_config['height'] / 2
        game_state['paddles']['right']['y'] = canvas['height'] / 2 - paddle_config['height'] / 2

        # Reset ball position and velocity
        game_state['ball']['x'] = canvas['width'] / 2
        game_state['ball']['y'] = canvas['height'] / 2
        speed_ratio = 0.005  # Ball speed as a fraction of canvas dimensions
        game_state['ball']['vx'] = canvas['width'] * speed_ratio * (-1 if random.random() < 0.5 else 1)
        game_state['ball']['vy'] = canvas['height'] * speed_ratio * (-1 if random.random() < 0.5 else 1)

        # Reset game state flags
        game_state['game_started'] = False
        game_state['paused'] = True

    async def broadcast_all_states(self):
        for room_name, game_state in self.games.items():
            if not game_state.get('game_started') and not game_state.get('paused'):
                continue

            # Check for game over condition
            if game_state['paddles']['right']['score'] >= 5 or game_state['paddles']['left']['score'] >= 5:
                winner = "Right Player" if game_state['paddles']['right']['score'] >= 5 else "Left Player"

                # Send Game Over Message
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
                # Reset game state
                self.reset_game(game_state)
                continue

            # Regular game state broadcast
            message = {
                'type': 'state_update',
                'ball': game_state['ball'],
                'paddles': {
                    'left': {
                        'y': game_state['paddles']['left']['y'],
                        'score': game_state['paddles']['left']['score'],
                    },
                        'right': {
                        'y': game_state['paddles']['right']['y'],
                        'score': game_state['paddles']['right']['score'],
                    },
                },
            }
            await self.channel_layer.group_send(
                f"game_{room_name}",
                {
                    'type': 'game_message',
                    'data': message,
                }
            )

game_manager = GameManager()