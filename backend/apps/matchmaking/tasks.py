from celery import shared_task
from .manager import matchmaking_manager
from .models import Match
from apps.accounts.models import Player
from django.contrib.auth import get_user_model
import logging

logger = logging.getLogger(__name__)

@shared_task
def run_matchmaking():
    """Check the queue and create matches."""
    manager = matchmaking_manager
    players, match_id = manager.find_match()

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

            logger.debug(f"Match created: {match}")
        except Exception as e:
            logger.error(f"Error during matchmaking: {e}")
    else:
        logger.debug("No matches found.")


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
