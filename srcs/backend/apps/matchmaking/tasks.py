from celery import shared_task
from .manager import matchmaking_manager
from .models import Match
from apps.accounts.models import Player
from django.contrib.auth import get_user_model
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
        if players:
            try:
                # Process each player
                user1, player1 = get_or_create_user_and_player(players[0])
                user2, player2 = get_or_create_user_and_player(players[1])

                # Create a new Match object
                match = Match.objects.create(
                    player1=player1,
                    player2=player2,
                )

                logger.debug(f"Match created for {queue_name}: {match}")
            except Exception as e:
                logger.error(f"Error during matchmaking for {queue_name}: {e}")
        else:
            logger.debug(f"No matches found in {queue_name} queue.")



def get_or_create_user_and_player(player_name):
    """
    Get or create a User and associated Player based on player_name.

    Args:
        player_name (str): The name of the player.

    Returns:
        tuple: (User, Player) objects.
    """
    User = get_user_model()  # Use the swapped User model

    # Get or create the User
    user, user_created = User.objects.get_or_create(
        username=player_name,  # Use player_name as the username
        defaults={"email": f"{player_name.lower()}@example.com"}  # Provide a default email
    )
    if user_created:
        logger.debug(f"User created: {user}")

    # Get or create the Player associated with the User
    player, player_created = Player.objects.get_or_create(
        user=user,
        defaults={"name": player_name}
    )
    if player_created:
        logger.debug(f"Player created: {player}")

    return user, player
