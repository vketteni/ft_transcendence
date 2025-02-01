import logging
import asyncio
logger = logging.getLogger(__name__)


class GameLoop:
    def __init__(self, room_id, manager, initial_game_state):
        self.room_id = room_id
        self.manager = manager
        self.queue = asyncio.Queue()
        self.game_state = initial_game_state
        self.running = False

    async def start(self):
        """
        Main loop that processes events and updates the game state.
        """
        self.running = True
        logger.info(f"Game loop started for room {self.room_id}")
        
        # Main game loop
        while self.running:
            try:
                # Process events from the queue
                try:
                    event = self.queue.get_nowait()
                    await self.handle_event(event)
                except asyncio.QueueEmpty:
                    pass

                # Update game state
                dt = 1.0 / 60  # Assume 60 FPS
                await self.update_game_state(self.manager.config, self.game_state, dt)

                # Broadcast game state periodically
                await self.manager.broadcast_state(self.room_id, self.game_state)

                # Sleep until next tick
                await asyncio.sleep(dt)
            except Exception as e:
                logger.error(f"Error in game loop for room {self.room_id}: {e}")

    async def stop(self):
        self.running = False
        logger.info(f"Game loop stopped for room {self.room_id}")

    async def handle_event(self, event):
        """
        Handle events sent from the GameManager (e.g., player input, pause, resume).
        """
        event_type = event["type"]
        if event_type == "player_input":
            user_id = event["user_id"]
            input_data = event["input"]
            self.update_player_input(user_id, input_data)
        elif event_type == "pause":
            self.game_state["paused"] = True
        elif event_type == "resume":
            self.game_state["paused"] = False
        elif event_type == "stop":
            await self.stop()
        # Handle other events as needed

    async def update_game_state(self, config, game_state, dt):
        if game_state['ball']['render']:
            self.update_ball_position(game_state, dt)
            self.handle_ball_collisions(config, game_state)
            await self.handle_scoring(config, game_state)
    
        self.update_paddles(config, game_state, dt)
        if game_state['ai_controlled']:
            self.update_ai_paddle(config, game_state, dt)

    def update_player_input(self, user_id, input_data):
        """
        Update a player's input in the game state.
        """
        if user_id in self.game_state["players"]:
            self.game_state["players"][user_id]["input"] = input_data


    def update_paddles(self, config, game_state, dt):
        paddle_speed = 550 * dt
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
        ai_speed = 550 * dt
        ball = game_state['ball']
        paddle_height = config['paddle']['height']
        canvas_height = config['canvas']['height']
        ai_player = game_state['player_ai']

        if not ai_player:
            logger.error("AI player not found in game_state.")
            return
    
        right_paddle = game_state['paddles']['right']
        paddle_center = right_paddle['y'] + paddle_height / 2
        
        current_time = time.perf_counter()
        if game_state['room_id'] not in self.ai_last_update:
            self.ai_last_update[game_state['room_id']] = 0
            self.ai_predicted_y[game_state['room_id']] = ball['y'] 
        
        if current_time - self.ai_last_update.get(game_state['room_id'], 0) >= 1:
            self.ai_last_update[game_state['room_id']] = current_time
            self.ai_predicted_y[game_state['room_id']] = self.predict_ball_position(ball, canvas_height, right_paddle['x'])
        
        predicted_y = self.ai_predicted_y[game_state['room_id']]

        ai_input = ai_player['input']
        ai_input['up'] = False
        ai_input['down'] = False

        if abs(paddle_center - predicted_y) > 15:
            if paddle_center < predicted_y:
                ai_input['down'] = True
                right_paddle['y'] += ai_speed
            elif paddle_center > predicted_y:
                ai_input['up'] = True
                right_paddle['y'] -= ai_speed
        
        # Clamp AI paddle movement to stay within the canvas
        max_paddle_y = canvas_height - paddle_height
        right_paddle['y'] = max(0, min(right_paddle['y'], max_paddle_y))

    def predict_ball_position(self, ball, canvas_height, paddle_x):
        predicted_y = ball['y']
        ball_x = ball['x']
        velocity_y = ball['vy']
        velocity_x = ball['vx']

        if velocity_x <= 0:  # Ball moving left, AI doesn't need to predict
            return canvas_height / 2
        
        if velocity_y == 0:  # Prevent division by zero
            return predicted_y

        iterations = 0  # Prevent infinite loop
        max_iterations = 50

        while iterations < max_iterations:
            if ball_x >= paddle_x:
                break

            # Time to reach the next wall (top or bottom)
            if velocity_y > 0:
                time_to_wall = (canvas_height - predicted_y) / velocity_y
            else:
                time_to_wall = -predicted_y / velocity_y

            # Time to reach the paddle
            time_to_paddle = (paddle_x - ball_x) / velocity_x if velocity_x > 0 else float('inf')

            # Take the minimum valid time step
            time_step = min(time_to_wall, time_to_paddle)

            if time_step < 0:
                break

            # Advance the ball position
            ball_x += velocity_x * time_step
            predicted_y += velocity_y * time_step

            # Handle wall bounces
            if predicted_y <= 0 or predicted_y >= canvas_height:
                velocity_y = -velocity_y  # Reflect vertical direction
                predicted_y = max(0, min(predicted_y, canvas_height))  # Keep within bounds

            iterations += 1

        if random.random() > 0.4:
            offset = random.uniform(-100, 100)  # Add a slight error to prediction
            predicted_y += offset
   
        return predicted_y
    
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
        speedup_factor = 1.05

        # Check wall collisions
        if (ball_state['vy'] > 0):
            if ball_state['y'] + ball_radius >= canvas['height']:
                ball_state['vy'] = -ball_state['vy'] * speedup_factor
                ball_state['vx'] *= speedup_factor
        if (ball_state['vy'] < 0):
            if ball_state['y'] - ball_radius <= 0 :
                ball_state['vy'] = -ball_state['vy'] * speedup_factor
                ball_state['vx'] *= speedup_factor
        # Check for collision with the left paddle only if the ball is moving left
        if ball_state['vx'] < 0:
            if self.check_paddle_collision(ball_state, ball_config, left_paddle, paddle_config):
                self.reflect_ball(ball_state, left_paddle, paddle_config)
                ball_state['vx'] *= speedup_factor
                ball_state['vy'] *= speedup_factor
        # Check for collision with the right paddle only if the ball is moving right
        if ball_state['vx'] > 0:
            if self.check_paddle_collision(ball_state, ball_config, right_paddle, paddle_config):
                self.reflect_ball(ball_state, right_paddle, paddle_config)
                ball_state['vx'] *= speedup_factor
                ball_state['vy'] *= speedup_factor
                
    def check_paddle_collision(self, ball_state, ball_config, paddle, paddle_config):
        horizontally_collides = False
        vertically_collides = False
        ball_radius = ball_config['diameter'] / 2

        if paddle['x'] == 0: # Left paddle
            ball_edge_x = ball_state['x']  # Left edge of the ball
            paddle_edge_x = paddle['x'] + paddle_config['width'] # Right edge of the paddle
            if ball_edge_x < paddle_edge_x:
                horizontally_collides = True
        else: # Right paddle
            ball_edge_x = ball_state['x'] # Right edge of the ball
            paddle_edge_x = paddle['x'] # Left edge of the paddle
            if ball_edge_x > paddle_edge_x:
                horizontally_collides = True

        # Check vertical overlap
        ball_top = ball_state['y'] - ball_radius
        ball_bottom = ball_state['y'] + ball_radius
        paddle_top = paddle['y']
        paddle_bottom = paddle['y'] + paddle_config['height']

        if paddle_top <= ball_top <= paddle_bottom or paddle_top <= ball_bottom <= paddle_bottom:
            vertically_collides = True

        return horizontally_collides and vertically_collides

    def reflect_ball(self, ball, paddle, paddle_config):
            relative_hit = (ball['y'] - (paddle['y'] + paddle_config['height'] / 2)) / (paddle_config['height'] / 2)
            ball['vx'] = -ball['vx']
            ball['vy'] = 600 * relative_hit

    async def handle_scoring(self):
        """
        Check if a goal was scored and update the game state.
        If the game is over, notify the GameManager.
        """
        ball_state = self.game_state['ball']
        canvas = self.manager.config['canvas']

        if ball_state['x'] < 0:  # Left side (point for right paddle)
            self.game_state['paddles']['right']['score'] += 1
            await self.manager.notify_score(self.room_id, "right", self.game_state)
            await self.reset_ball('right')

        elif ball_state['x'] > canvas['width']:  # Right side (point for left paddle)
            self.game_state['paddles']['left']['score'] += 1
            await self.manager.notify_score(self.room_id, "left", self.game_state)
            await self.reset_ball('left')

    async def reset_ball(self, lost_side):
        """
        Reset the ball after a score, pausing briefly before resuming.
        """
        ball = self.game_state['ball']
        canvas = self.manager.config['canvas']
        config = self.manager.config

        # Hide ball during reset
        ball['render'] = False
        ball['x'] = canvas['width'] / 2
        ball['y'] = canvas['height'] / 2
        ball['vx'] = config['ball']['speed'] if lost_side == 'left' else -config['ball']['speed']
        ball['vy'] = config['ball']['speed'] * (-1 if random.random() < 0.5 else 1)

        # Small delay before ball becomes active again
        await asyncio.sleep(1)
        ball['render'] = True
