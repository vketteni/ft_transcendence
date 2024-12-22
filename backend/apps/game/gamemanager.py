import asyncio
import logging
import time
from channels.layers import get_channel_layer

logger = logging.getLogger(__name__)

class GameManager:
    TICK_RATE = 60  # 60 updates per second

    def __init__(self):
        self.games = {}  # {room_name: game_state_dict}
        self.running = False
        self.channel_layer = None  # Initialize as None

    async def start(self):
        """Start the main game loop."""
        if self.running:
            return
        self.running = True
        logger.info("GameManager started.")
        
        # Initialize channel layer here
        if not self.channel_layer:
            self.channel_layer = get_channel_layer()
        
        await self.game_loop()

    async def game_loop(self):
        """Run a central loop that updates all active games."""
        next_frame_time = time.perf_counter()
        frame_duration = 1.0 / self.TICK_RATE
        broadcast_interval = 0.1  # 100ms
        last_broadcast_time = 0

        while self.running:
            # Compute delta time (if needed)
            start = time.perf_counter()
            dt = start - next_frame_time + frame_duration

            # Update all games
            self.update_all_games(dt)

			# Broadcast states
            if start - last_broadcast_time >= broadcast_interval:
                await self.broadcast_all_states()
                last_broadcast_time = start

            # Compute remaining time to maintain stable tick rate
            next_frame_time += frame_duration
            sleep_duration = next_frame_time - time.perf_counter()
            if sleep_duration > 0:
                await asyncio.sleep(sleep_duration)

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
        paddle_height = 100  # Default height
        return {
            'players': {},
            'ball': {'x': 400, 'y': 150, 'vx': 4, 'vy': 4},
            'paddles': {
                'left': {'y': 150, 'score': 0, 'height': paddle_height},
                'right': {'y': 150, 'score': 0, 'height': paddle_height},
            },
            'canvas': {'width': 800, 'height': 400},
            'config': {
                'paddle': {'width': 15, 'height': paddle_height},
                'ball': {'diameter': 20},
            },
            'game_started': False,
        }


    def set_game_started(self, room_name, started):
        """Set the game_started flag for the room."""
        game = self.games.get(room_name)
        if game:
            game['game_started'] = started
            logger.info(f"Game in room '{room_name}' started: {started}")

    def update_all_games(self, dt):
        for room_name, game_state in self.games.items():
            if game_state.get('game_started'):  # Only update if the game has started
                self.update_game_state(game_state, dt)

    def set_game_config(self, room_name, canvas, paddle, ball):
        """Set canvas, paddle, and ball sizes for a specific room."""
        game = self.create_or_get_game(room_name)
        game['canvas'] = canvas
        game['config'] = {
            'paddle': paddle,
            'ball': ball
        }
        game['paddles']['left']['height'] = paddle['height']
        game['paddles']['right']['height'] = paddle['height']
        logger.info(f"Game config set for room '{room_name}': canvas={canvas}, paddle={paddle}, ball={ball}")

    def update_game_state(self, game_state, dt):
        if 'config' not in game_state:
            return
        self.update_paddles(game_state)
        self.update_ai_paddle(game_state)
        self.update_ball_position(game_state)
        self.handle_ball_collisions(game_state)
        self.handle_scoring(game_state)

    def update_paddles(self, game_state):

        paddle_speed = 6
        canvas_height = game_state['canvas']['height']
        paddle_height = game_state['config']['paddle']['height']
        max_paddle_y = canvas_height - paddle_height

        for player_data in game_state['players'].values():
            if player_data['side'] == 'left':  # Only update the player's paddle
                input_data = player_data['input']
                paddle = game_state['paddles']['left']

                if input_data['up']:
                    paddle['y'] -= paddle_speed
                if input_data['down']:
                    paddle['y'] += paddle_speed

                # Clamp paddle within canvas bounds
                paddle['y'] = max(0, min(paddle['y'], max_paddle_y))

    def update_ai_paddle(self, game_state):
        ai_speed = 5
        canvas_height = game_state['canvas']['height']
        paddle_height = game_state['config']['paddle']['height']
        ball_y = game_state['ball']['y']

        right_paddle = game_state['paddles']['right']
        paddle_center = right_paddle['y'] + paddle_height / 2

        # Move AI paddle toward the ball
        if paddle_center < ball_y - 10:
            right_paddle['y'] += ai_speed
        elif paddle_center > ball_y + 10:
            right_paddle['y'] -= ai_speed

        # Clamp AI paddle within canvas bounds
        right_paddle['y'] = max(0, min(right_paddle['y'], canvas_height - paddle_height))

    def update_ball_position(self, game_state):
        ball_state = game_state['ball']
        ball_state['x'] += ball_state['vx']
        ball_state['y'] += ball_state['vy']

    def handle_ball_collisions(self, game_state):
        canvas = game_state.get('canvas', {})
        ball = game_state.get('config', {}).get('ball', {})
        paddle = game_state.get('config', {}).get('paddle', {})
        ball_state = game_state.get('ball', {})

        if 'height' not in paddle or 'diameter' not in ball:
            logger.error("Paddle height or ball diameter missing from game config.")
            return

        # Collisions with top and bottom walls
        if ball_state['y'] <= 0 or ball_state['y'] >= canvas['height'] - ball['diameter']:
            ball_state['vy'] = -ball_state['vy']

        # Collisions with paddles
        left_paddle = game_state['paddles']['left']
        right_paddle = game_state['paddles']['right']

        if self.check_paddle_collision(ball_state, left_paddle, paddle['width']):
            self.reflect_ball(ball_state, left_paddle, paddle)

        if self.check_paddle_collision(ball_state, right_paddle, canvas['width'] - paddle['width'] - ball['diameter']):
            self.reflect_ball(ball_state, right_paddle, paddle)

    def check_paddle_collision(self, ball, paddle, paddle_x):
        return paddle_x <= ball['x'] <= paddle_x + 10 and paddle['y'] <= ball['y'] <= paddle['y'] + paddle['height']

    def reflect_ball(self, ball, paddle, paddle_config):
        relative_hit = (ball['y'] - (paddle['y'] + paddle_config['height'] / 2)) / (paddle_config['height'] / 2)
        ball['vx'] = -ball['vx']  # Reverse horizontal direction
        ball['vy'] = 4 * relative_hit  # Adjust vertical velocity based on collision point

    def handle_scoring(self, game_state):
        ball_state = game_state['ball']
        canvas = game_state['canvas']
        ball_config = game_state['config']['ball']

        if ball_state['x'] < 0:  # Left side
            game_state['paddles']['right']['score'] += 1
            self.reset_ball(ball_state, canvas, ball_config)
        elif ball_state['x'] > canvas['width']:  # Right side
            game_state['paddles']['left']['score'] += 1
            self.reset_ball(ball_state, canvas, ball_config)

    def reset_ball(self, ball, canvas, ball_config):
        """Reset ball position to the center of the canvas."""
        logger.info(f"Resetting ball: previous_position={ball}")
        ball['x'] = canvas['width'] // 2
        ball['y'] = canvas['height'] // 2
        ball['vx'] = 4 * (-1 if ball['vx'] > 0 else 1)
        ball['vy'] = 4 * (-1 if ball['vy'] > 0 else 1)

    async def broadcast_all_states(self):
        for room_name, game_state in self.games.items():
            message = {
                'type': 'state_update',
                'ball': game_state['ball'],  # Ball position
                'paddles': game_state['paddles'],  # Paddle positions
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