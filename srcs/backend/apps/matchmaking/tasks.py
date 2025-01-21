from celery import shared_task
from .manager import matchmaking_manager

import logging

logger = logging.getLogger(__name__)

@shared_task
def run_matchmaking():
    """Check all queues and create matches."""
    manager = matchmaking_manager
    logger.info(f"run_matchmaking() called.")

    for queue_name in manager.QUEUE_KEYS.keys():  # Iterate over all queues
        players, room_url = manager.find_match(queue_name)
        logger.debug(f"Run matchmaking for {queue_name}: {players}")
