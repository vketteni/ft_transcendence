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

    def update_player_input(self, user_id, input_data):
        """
        Update a player's input in the game state.
        """
        if user_id in self.game_state["players"]:
            self.game_state["players"][user_id]["input"] = input_data
