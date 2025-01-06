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
        broadcast_interval = 0.05
        last_broadcast_time = 0
        while self.running:
            start = time.perf_counter()
            dt = start - next_frame_time + frame_duration

            for room_name, game_state in self.games.items():
                if game_state.get('paused', False):
                    continue

                if game_state.get('game_started'):
                    self.update_game_state(game_state, dt)

            if start - last_broadcast_time >= broadcast_interval:
                await self.broadcast_all_states()
                last_broadcast_time = start

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
        paddle_width = 15
        canvas_width = 800
        canvas_height = 400 

        return {
            'players': {},
            'ball': {'x': canvas_width / 2, 'y': canvas_height / 2, 'vx': 4, 'vy': 4, 'render': True},
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

    def set_game_paused(self, room_name, paused=True):
        game = self.games.get(room_name)
        if game:
            game['paused'] = paused
            # game['ball']['render'] = not paused

    def set_game_resumed(self, room_name):
        self.set_game_paused(room_name, paused=False)

    def update_all_games(self, dt):
        for room_name, game_state in self.games.items():
            if game_state.get('game_started'):
                self.update_game_state(game_state, dt)

    def set_game_config(self, room_name, canvas, paddle, ball):
        game = self.create_or_get_game(room_name)
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
        logger.info(f"Game config set for room '{room_name}': canvas={canvas}, paddle={paddle}, ball={ball}")

    def update_game_state(self, game_state, dt):
        if 'config' not in game_state:
            return
        self.update_ball_position(game_state)
        self.handle_ball_collisions(game_state)
        self.handle_scoring(game_state)
        self.update_paddles(game_state)
        self.update_ai_paddle(game_state)

    def update_paddles(self, game_state):
        paddle_speed = 6
        canvas_height = game_state['canvas']['height']
        paddle_height = game_state['config']['paddle']['height']
        max_paddle_y = canvas_height - paddle_height

        for player_data in game_state['players'].values():
            if player_data['side'] == 'left':
                input_data = player_data['input']
                paddle = game_state['paddles']['left']

                if input_data['up']:
                    paddle['y'] -= paddle_speed
                if input_data['down']:
                    paddle['y'] += paddle_speed

                paddle['y'] = max(0, min(paddle['y'], max_paddle_y))

    def update_ai_paddle(self, game_state):
        ai_speed = 4
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
        canvas = game_state['canvas']
        ball_config = game_state['config'].get('ball', {})
        paddle_config = game_state['config'].get('paddle', {})
        ball_state = game_state['ball']
        left_paddle = game_state['paddles']['left']
        right_paddle = game_state['paddles']['right']
        ball_radius = ball_config['diameter'] / 2

        # Check wall collisions
        if (ball_state['vy'] > 0):
            if ball_state['y'] + ball_radius >= canvas['height']:
                ball_state['vy'] = -ball_state['vy']
        if (ball_state['vy'] < 0):
            if ball_state['y'] - ball_radius <= 0 :
                ball_state['vy'] = -ball_state['vy']
        # Check for collision with the left paddle only if the ball is moving left
        if ball_state['vx'] < 0:
            if self.check_paddle_collision(ball_state, ball_config, left_paddle, paddle_config):
                self.reflect_ball(ball_state, left_paddle, paddle_config)

        # Check for collision with the right paddle only if the ball is moving right
        if ball_state['vx'] > 0:
            if self.check_paddle_collision(ball_state, ball_config, right_paddle, paddle_config):
                self.reflect_ball(ball_state, right_paddle, paddle_config)

    def check_paddle_collision(self, ball_state, ball_config, paddle, paddle_config):
        horizontally_collides = False
        vertically_collides = False
        ball_radius = ball_config['diameter'] / 2

        if paddle['x'] == 0: # Left paddle
            ball_edge_x = ball_state['x'] - ball_radius  # Left edge of the ball
            paddle_edge_x = paddle['x']  # Right edge of the paddle
            if ball_edge_x < paddle_edge_x:
                horizontally_collides = True
        else: # Right paddle
            ball_edge_x = ball_state['x'] + ball_radius  # Right edge of the ball
            paddle_edge_x = paddle['x'] # Left edge of the paddle
            if ball_edge_x > paddle_edge_x:
                horizontally_collides = True

        # Check vertical overlap
        ball_top = ball_state['y']
        ball_bottom = ball_state['y'] + ball_config['diameter']
        paddle_top = paddle['y']
        paddle_bottom = paddle['y'] + paddle_config['height']

        num_samples = 50  # Number of points to sample along the ball's edge
        for i in range(num_samples + 1):
            sampled_y = ball_top + i * (ball_bottom - ball_top) / num_samples
            if paddle_top <= sampled_y <= paddle_bottom:
                vertically_collides = True
                break

        return horizontally_collides and vertically_collides

    def reflect_ball(self, ball, paddle, paddle_config):
            relative_hit = (ball['y'] - (paddle['y'] + paddle_config['height'] / 2)) / (paddle_config['height'] / 2)
            ball['vx'] = -ball['vx'] 
            ball['vy'] = 4 * relative_hit

    def handle_scoring(self, game_state):
        ball_state = game_state['ball']
        canvas = game_state['canvas']

        if ball_state['x'] < 0:
            game_state['paddles']['right']['score'] += 1
            asyncio.create_task(self.reset_ball(ball_state, canvas))
        elif ball_state['x'] > canvas['width']:
            game_state['paddles']['left']['score'] += 1
            asyncio.create_task(self.reset_ball(ball_state, canvas))
            
    async def reset_ball(self, ball, canvas):
        ball['render'] = False
        
        ball['x'] = canvas['width'] // 2
        ball['y'] = canvas['height'] // 2
        ball['vx'] = 4 * (-1 if ball['vx'] > 0 else 1)
        ball['vy'] = 4 * (-1 if ball['vy'] > 0 else 1)

        # Wait for one broadcast cycle (50ms by default)
        await asyncio.sleep(0.05) 
        ball['render'] = True

    async def broadcast_all_states(self):
        for room_name, game_state in self.games.items():
            if not game_state.get('game_started'):
                continue
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