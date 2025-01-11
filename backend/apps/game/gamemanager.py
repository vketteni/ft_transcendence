import asyncio
import logging
import time
import random
from channels.layers import get_channel_layer
from apps.game.game_loop import GameLoop

logger = logging.getLogger(__name__)

class GameManager:
    TICK_RATE = 60  # 60 updates per second

    def __init__(self):
        self.games = {}  # {room_name: game_state_dict}
        self.running = False
        self.channel_layer = None  # Initialize as None
        self.game_loop = GameLoop(self)

    async def start(self):
        """Start the main game loop."""
        if self.running:
            return
        self.running = True
        logger.info("GameManager started.")
        
        # Initialize channel layer here
        if not self.channel_layer:
            self.channel_layer = get_channel_layer()
        
        await self.game_loop.run()

    def update_all_games(self, dt):
            for room_name, game_state in self.games.items():
                if game_state.get('game_started'):
                    self.update_game_state(game_state, dt)

    def create_or_get_game(self, room_name):
        if room_name not in self.games:
            self.games[room_name] = self.initial_game_state()
            logger.info(f"Created new game state for room: {room_name}")
        return self.games[room_name]

    def remove_game(self, room_name):
        if room_name in self.games:
            del self.games[room_name]
            logger.info(f"Removed game state for room: {room_name}")

    def add_player(self, room_name, channel_name):
        game = self.create_or_get_game(room_name)
        players = game['players']
        side = 'left' if len(players) == 0 else 'right'
        players[channel_name] = {
            'side': side,
            'input': {'up': False, 'down': False},
            'alias': None
        }
        logger.info(f"Player {channel_name} joined room {room_name} as {side}")

    def remove_player(self, room_name, channel_name):
        game = self.games.get(room_name)
        if not game:
            return
        if channel_name in game['players']:
            del game['players'][channel_name]
            logger.info(f"Player {channel_name} left room {room_name}")

        # Optional: If no players left, you can remove the game from memory
        if len(game['players']) == 0:
            self.remove_game(room_name)

    def update_player_input(self, room_name, channel_name, up, down):
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
        canvas_width = 800
        canvas_height = 400
        ball_speed_ratio = 0.005

        return {
            'players': {},
            'ball': {
                'x': canvas_width / 2,
                'y': canvas_height / 2,
                'vx': canvas_width * ball_speed_ratio,
                'vy': canvas_height * ball_speed_ratio,
                'render': True
            },
            'paddles': {
                'left': {'x': 0, 'y': 150, 'score': 0},
                'right': {'x': canvas_width - paddle_width, 'y': 150, 'score': 0},
            },
            'canvas': {'width': canvas_width, 'height': canvas_height},
            'config': {
                'paddle': {'width': paddle_width, 'height': 100},
                'ball': {'diameter': 20},
            },
            'game_started': False,
            'paused': False,
        }

    def set_game_started(self, room_name, started):
        game = self.games.get(room_name)
        if game:
            game['game_started'] = started
            game['paused'] = not started

    def set_game_paused(self, room_name, paused=True):
        game = self.games.get(room_name)
        if game:
            game['paused'] = paused
            # game['ball']['render'] = not paused

    def set_game_resumed(self, room_name):
        self.set_game_paused(room_name, paused=False)

    def set_game_config(self, room_name, canvas, paddle, ball):
        game = self.create_or_get_game(room_name)
        old_canvas = game['canvas']
        width_scale = canvas['width'] / old_canvas['width']
        height_scale = canvas['height'] / old_canvas['height']
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
        ball_state = game['ball']
        ball_state['vx'] *= width_scale
        ball_state['vy'] *= height_scale
        logger.info(f"Game config set for room '{room_name}': canvas={canvas}, paddle={paddle}, ball={ball}")

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

# Export a singleton instance of GameManager
game_manager = GameManager()