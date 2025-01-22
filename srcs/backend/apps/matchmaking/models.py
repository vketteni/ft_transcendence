# matchmaking/models.py
from django.db import models
from apps.accounts.models import User
import uuid

class Match(models.Model):
    # id = models.UUIDField(
    #     primary_key=True,
    #     default=uuid.uuid4,
    #     editable=False
    # )
    player1 = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='player1_matches',
        help_text="First player in the match"
    )
    player2 = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='player2_matches',
        help_text="Second player in the match"
    )
    start_time = models.DateTimeField(auto_now_add=True)
    end_time = models.DateTimeField(null=True, blank=True)
    winner = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='won_matches',
        help_text="Player who won the match"
    )
    score_player1 = models.PositiveIntegerField(default=0)
    score_player2 = models.PositiveIntegerField(default=0)
    duration = models.DurationField(null=True, blank=True)

    def calculate_duration(self):
        if self.start_time and self.end_time:
            return self.end_time - self.start_time
        return None

    def __str__(self):
        return f"Match: {self.player1.name} vs {self.player2.name}"
