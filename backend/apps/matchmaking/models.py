from django.db import models

# matchmaking/models.py
from django.conf import settings  # Use settings.AUTH_USER_MODEL for compatibility

class MatchmakingQueue(models.Model):
    player = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    timestamp = models.DateTimeField(auto_now_add=True)

class Match(models.Model):
    player1 = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='player1_matches')
    player2 = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='player2_matches')
    start_time = models.DateTimeField(auto_now_add=True)
