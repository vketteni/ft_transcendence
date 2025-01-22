def record_match(player1, player2, score1, score2):
    from apps.accounts.models import Match
    """Save match results to database and update profile stats."""
    winner = None
    if score1 > score2:
        winner = player1
        player1.wins += 1  # Increment wins for player1
        player2.losses += 1  # Increment losses for player2
    elif score2 > score1:
        winner = player2
        player2.wins += 1  # Increment wins for player2
        player1.losses += 1  # Increment losses for player1

    # Create match record
    match = Match.objects.create(
        player1=player1, 
        player2=player2, 
        winner=winner, 
        score_player1=score1, 
        score_player2=score2
    )

    # Save the player profiles to update their wins and losses
    player1.save()  # Save player1 with updated stats
    player2.save()  # Save player2 with updated stats

    return match
