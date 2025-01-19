import asyncio
import logging
import time
import random
import asyncio

from channels.layers import get_channel_layer

logger = logging.getLogger(__name__)

class GameLoop:

    def __init__(self, manager):
        self.manager = manager
        self.lock = asyncio.Lock()

    async def run(self):
        TICK_RATE = 30
        next_frame_time = time.perf_counter()
        frame_duration = 1.0 / TICK_RATE
        broadcast_interval = 0.05
        last_broadcast_time = 0
        try:
            while self.manager.running:
    
                start = time.perf_counter()
                dt = start - next_frame_time + frame_duration
    
                for room_name, game_state in self.manager.games.items():
                    if game_state.get('paused', False):
                        continue

                    if game_state.get('game_started'):
                        try:
                            await self.update_game_state(self.manager.config, game_state, dt)
                        except Exception as e:
                            logger.error(f"Error updating game state for room {room_name}: {e}")
    
                if start - last_broadcast_time >= broadcast_interval:
                    await self.manager.broadcast_all_states()
                    last_broadcast_time = start
    
                next_frame_time += frame_duration
                sleep_duration = next_frame_time - time.perf_counter()
                if sleep_duration > 0:
                    await asyncio.sleep(sleep_duration)

        except Exception as e:
            logger.error(f"Error in game loop: {e}")

        finally:
            logger.debug("Exiting game loop. Cleaning up.")
            self.manager.running = False

    async def update_game_state(self, config, game_state, dt):
        if game_state['ball']['render']:
            self.update_ball_position(game_state, dt)
            self.handle_ball_collisions(config, game_state)
            await self.handle_scoring(config, game_state)
    
        self.update_paddles(config, game_state, dt)
        if game_state['ai_controlled']:
            self.update_ai_paddle(config, game_state, dt)

    def update_paddles(self, config, game_state, dt):
        paddle_speed = 150 * dt
        canvas_height = config['canvas']['height']
        paddle_height = config['paddle']['height']

        for player_data in game_state['players'].values():
            input_data = player_data['input']
            paddle = game_state['paddles'][player_data['side']]

            if input_data['up']:
                paddle['y'] -= paddle_speed
            if input_data['down']:
                paddle['y'] += paddle_speed

            # Clamp paddle movement to stay within the canvas
            max_paddle_y = canvas_height - paddle_height
            paddle['y'] = max(0, min(paddle['y'], max_paddle_y))

    def update_ai_paddle(self, config, game_state, dt):
        ai_speed = 50 * dt
        ball_y = game_state['ball']['y']
        paddle_height = config['paddle']['height']
        canvas_height = config['canvas']['height']

        right_paddle = game_state['paddles']['right']
        paddle_center = right_paddle['y'] + paddle_height / 2

        # Move only when the ball is significantly away from the AI paddle
        if abs(paddle_center - ball_y) > 15:  
            if paddle_center < ball_y:
                right_paddle['y'] += ai_speed
            elif paddle_center > ball_y:
                right_paddle['y'] -= ai_speed

        # Clamp paddle within bounds
        right_paddle['y'] = max(0, min(right_paddle['y'], canvas_height - paddle_height))

    def update_ball_position(self, game_state, dt):
        ball_state = game_state['ball']
        ball_state['x'] += ball_state['vx'] * dt
        ball_state['y'] += ball_state['vy'] * dt


    def handle_ball_collisions(self, config, game_state):
        canvas = config['canvas']
        ball_config = config['ball']
        paddle_config = config['paddle']
        ball_state = game_state['ball']
        left_paddle = game_state['paddles']['left']
        right_paddle = game_state['paddles']['right']
        ball_radius = config['ball']['diameter'] / 2

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

    async def handle_scoring(self, config, game_state):
        ball_state = game_state['ball']
        canvas = config['canvas']

        if ball_state['x'] < 0:
            game_state['paddles']['right']['score'] += 1
            asyncio.create_task(self.reset_ball(config, ball_state, canvas, 'right'))
        elif ball_state['x'] > canvas['width']:
            game_state['paddles']['left']['score'] += 1
            asyncio.create_task(self.reset_ball(config, ball_state, canvas, 'left'))

    async def reset_ball(self, config, ball, canvas, lost_side):
        try:
            async with self.lock:  # Prevent race conditions
                ball['render'] = False
        
                ball['x'] = canvas['width'] / 2  # Ensure it's a float, not int
                ball['y'] = canvas['height'] / 2

                if lost_side == 'left':
                    ball['vx'] = config['ball']['speed']
                else:
                    ball['vx'] = -config['ball']['speed']
                ball['vy'] = config['ball']['speed'] * (-1 if random.random() < 0.5 else 1)

                await asyncio.sleep(1)
                
                ball['render'] = True

        except Exception as e:
            logger.error(f"Error resetting ball: {e}")