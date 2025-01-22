from django.db import models
from django.apps import apps


class GameRoom(models.Model):
    name = models.CharField(max_length=255, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True, help_text="Indicates if the game room is active")
    max_players = models.PositiveIntegerField(default=2, help_text="Maximum number of players allowed in the room")
    
    # Use string reference for '17' and 'Player'
    match = models.OneToOneField(
        'matchmaking.Match',  # Reference Match by app name and model name
        on_delete=models.CASCADE,
        related_name='game_room',
        help_text="The match associated with this game room"
    )
    host = models.ForeignKey(
        'accounts.Player',  # Reference Player by app name and model name
        on_delete=models.CASCADE,
        related_name="hosted_rooms",
        help_text="Player hosting the room"
    )
    players = models.ManyToManyField(
        'accounts.Player',  # Reference Player by app name and model name
        related_name="game_rooms",
        help_text="Players currently in the room"
    )
    channel_layer_key = models.CharField(
        max_length=255, blank=True, null=True, 
        help_text="Key to identify the room in Redis/Channels"
    )

    def __str__(self):
        return f"GameRoom: {self.name}"

    class Meta:
        ordering = ['-created_at']

