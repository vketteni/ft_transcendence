def record_match(player1, player2, score1, score2):
    from apps.accounts.models import Match
    import logging
    logger = logging.getLogger(__name__)
    logging.basicConfig(level=logging.INFO)
    """Save match results to database and update profile stats."""
    winner = None

    if score1 > score2:
        logger.info(f"Player1: {player1}, Player2: {player2}, winner: {player1}")
        winner = player1
        player2.losses += 1
        player1.wins += 1

    elif score2 > score1:
        logger.info(f"Player1: {player1}, Player2: {player2}, winner: {player2}")
        winner = player2
        player1.losses += 1
        player2.wins += 1
        logger.info(f"Player1 wins: {player1.wins}, Player1 losses: {player1.losses}")
        logger.info(f"Player2 wins: {player2.wins}, Player2 losses: {player2.losses}")

    try:# Create match record (Handle AI opponent by setting `player2` to None or a placeholder)
        match = Match.objects.create(
            player1=player1, 
            player2=player2,
            winner=winner,
            score_player1=score1,
            score_player2=score2
        )
    except Exception as e:
        logger.info(f"Error creating match record: {e}")
        return None

    try:
            # Save the player profiles to update their wins and losses
        if player1:
            player1.save()
        if player2:
            player2.save()
    except Exception as e:
        logger.info(f"Error updating player profiles: {e}")

    return match
