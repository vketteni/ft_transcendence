from celery import shared_task
from .manager import MatchmakingManager

@shared_task
def run_matchmaking():
    """Periodically check the queue and create matches."""
    manager = MatchmakingManager()
    while True:
        players, match_id = manager.find_match()
        if not players:
            break
