import asyncio
import logging
import time
import random
from channels.layers import get_channel_layer

logger = logging.getLogger(__name__)

class GameLoop:

    def __init__(self, game_manager):
        self.game_manager = game_manager

    async def run(self):
            """Run a central loop that updates all active games."""
            next_frame_time = time.perf_counter()
            frame_duration = 1.0 / self.game_manager.TICK_RATE
            broadcast_interval = 0.05
            last_broadcast_time = 0
            logger.info('Starting game loop')
            while self.game_manager.running:
                logger.debug('Game loop iteration')
                start = time.perf_counter()
                dt = start - next_frame_time + frame_duration

                for room_name, game_state in self.game_manager.games.items():
                    if game_state.get('paused', False):
                        continue

                    if game_state.get('game_started'):
                        self.update_game_state(game_state, dt)

                if start - last_broadcast_time >= broadcast_interval:
                    await self.game_manager.broadcast_all_states()
                    last_broadcast_time = start

                next_frame_time += frame_duration
                sleep_duration = next_frame_time - time.perf_counter()
                if sleep_duration > 0:
                    await asyncio.sleep(sleep_duration)

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
        ball_y = game_state['ball']['y']
        paddle_height = game_state['config']['paddle']['height']
        canvas_height = game_state['canvas']['height']

        right_paddle = game_state['paddles']['right']
        paddle_center = right_paddle['y'] + paddle_height / 2

        # Add randomness to AI movement
        if paddle_center < ball_y - 10:
            right_paddle['y'] += ai_speed + random.uniform(-1, 1)
        elif paddle_center > ball_y + 10:
            right_paddle['y'] -= ai_speed + random.uniform(-1, 1)

        # Clamp paddle within bounds
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
        await asyncio.sleep(0.1) 
        ball['render'] = True
