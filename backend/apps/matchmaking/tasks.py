from celery import shared_task
from .manager import matchmaking_manager

import logging

logger = logging.getLogger(__name__)

@shared_task
def run_matchmaking():
    """Check all queues and create matches."""
    logger.info(f"before matchmaking_manager.")
    manager = matchmaking_manager
    logger.info(f"run_matchmaking() called.")

    for queue in manager.QUEUE_KEYS:  # Iterate over all queues
        logger.debug(f"Run matchmaking for {queue}")
        players, room_url = manager.find_match(queue)
        manager.cleanup_stale_entries()
