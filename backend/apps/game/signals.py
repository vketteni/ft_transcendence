import asyncio
import atexit
from django.db.models.signals import post_migrate
from django.dispatch import receiver
from apps.game.manager import game_manager

@receiver(post_migrate)
def start_game_manager(sender, **kwargs):
    """Start the GameManager after migrations are complete."""
    asyncio.create_task(game_manager.start())

def stop_game_manager():
    """Stop the GameManager gracefully on server shutdown."""
    asyncio.run(game_manager.stop())

atexit.register(stop_game_manager)
