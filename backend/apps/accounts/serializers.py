from rest_framework import serializers
from rest_framework.validators import UniqueValidator
from django.contrib.auth.models import Group, Permission
from django.contrib.auth.validators import UnicodeUsernameValidator
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils.timezone import now
from django.contrib.auth.password_validation import validate_password
from .models import Match
from . import models
import logging
from django.conf import settings
logger = logging.getLogger(__name__)

class MatchSerializer(serializers.ModelSerializer):
    """Serialize match details."""
    player1_username = serializers.CharField(source="player1.username", read_only=True)
    player2_username = serializers.CharField(source="player2.username", read_only=True)
    winner_username = serializers.CharField(source="winner.username", read_only=True, allow_null=True)

    class Meta:
        model = Match
        fields = ['id', 'player1_username', 'player2_username', 'winner_username', 'date_played', 'score_player1', 'score_player2']
        read_only_fields = ['id', 'date_played']

class UserSerializer(serializers.ModelSerializer):
    """
    Serializer for the User model with custom validation and fields.
    """
    email = serializers.EmailField(
        required=True,
        validators=[
            UniqueValidator(queryset=models.User.objects.all(), message="A user with this email already exists.")
        ]
    )
    username = serializers.CharField(
        required=True,
        validators=[UnicodeUsernameValidator(), ],
        help_text="Required. 150 characters or fewer. Letters, digits and @/./+/-/_ only."
    )
    password = serializers.CharField(
        write_only=True,  # Prevents password from being included in the response
        required=True,
        style={'input_type': 'password'},
        validators=[validate_password],
        help_text="The user's password. Must meet system password requirements."
    )
    skill_level = serializers.IntegerField(
        required=False,
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        help_text="User's skill level, must be between 0 and 100."
    )
    avatar = serializers.ImageField(
        required=False,
        allow_null=True,
        help_text="User's profile avatar. Optional."
    )
    avatar_url = serializers.SerializerMethodField()
    full_name = serializers.SerializerMethodField()
    
    friends = serializers.SerializerMethodField()
    # is_active = serializers.SerializerMethodField()
    is_authenticated = serializers.SerializerMethodField()

    wins = serializers.IntegerField(read_only=True) 
    losses = serializers.IntegerField(read_only=True) 
    match_history = MatchSerializer(source="matches_as_player1", many=True, read_only=True)

    class Meta:
        model = models.User
        fields = [
            'id',
            'username',
            'email',
            'first_name',
            'last_name',
            'full_name',
            'password',
            'skill_level',
            'avatar',
            'wins',
            'losses',
            'match_history',
            'is_active',
            'is_staff',
            'date_joined',
            'last_login',
            'avatar_url',
            'avatar',
            'friends',
            'is_authenticated',
        ]
        read_only_fields = ['id', 'date_joined', 'last_login', 'is_staff']
        extra_kwargs = {
            'first_name': {'required': False},
            'last_name': {'required': False},
        }

    def get_full_name(self, obj):
        """
        Concatenates first_name and last_name for the full name.
        """
        return f"{obj.first_name} {obj.last_name}".strip()
    
    def get_friends(self, obj):
        # Return a list of friends with their online status
        friends = obj.friends.all()
        return [{
            'id': friend.id,
            'username': friend.username,
            'is_active': friend.is_active,
            'avatar_url': self.context['request'].build_absolute_uri(friend.avatar.url) if friend.avatar else None
        } for friend in friends]

    def get_is_authenticated(self, obj):
        """
        Returns whether the user is authenticated.
        """
        request = self.context.get('request')
        if request:
            return request.user == obj and request.user.is_authenticated
        return False

    # def get_avatar_url(self, obj):
    #     """
    #     Returns the full URL for the avatar field, or None if no avatar exists.
    #     """
    #     request = self.context.get('request')
    #     if obj.avatar:
    #         logger.info(f"Avatar file URL: {obj.avatar.url}")
    #         return request.build_absolute_uri(obj.avatar.url)
    #     return request.build_absolute_uri(settings.MEDIA_URL + 'avatars/default-avatar.jpg')

    def get_avatar_url(self, obj):
        """
        Returns the full URL for the avatar field, or None if no avatar exists.
        """
        try:
            # Log the start of the function
            logger.info("Entered get_avatar_url function")

            # Log the object being processed
            logger.info(f"Processing object: {obj}")

            # Log the context to ensure request is included
            if 'request' not in self.context:
                logger.error("Request is not present in the serializer context!")
                return None

            request = self.context.get('request')
            logger.info(f"Request object: {request}")

            # Check if avatar exists
            if obj.avatar:
                logger.info(f"Avatar file path: {obj.avatar.path}")
                logger.info(f"Avatar file URL: {obj.avatar.url}")
                full_url = request.build_absolute_uri(obj.avatar.url)
                logger.info(f"Generated full avatar URL: {full_url}")
                return full_url

            # If no avatar, return default avatar URL
            default_avatar_path = settings.MEDIA_URL + 'avatars/default-avatar.jpg'
            full_default_url = request.build_absolute_uri(default_avatar_path)
            logger.info(f"Using default avatar. URL: {full_default_url}")
            return full_default_url

        except Exception as e:
            # Log any exceptions that occur
            logger.error(f"Error in get_avatar_url: {str(e)}", exc_info=True)
            return None

    

    def create(self, validated_data):
        """
        Handles user creation. Ensures the password is hashed.
        """
        password = validated_data.pop('password', None)
        user = super().create(validated_data)
        if password:
            user.set_password(password)  # Ensures password is hashed
            user.save()
        return user

    def update(self, instance, validated_data):
        """
        Handles user updates. Ensures the password is hashed if provided.
        """
        # Remove 'avatar' from validated_data to prevent double-saving
        validated_data.pop('avatar', None)

        password = validated_data.pop('password', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)  # Ensures password is hashed
        instance.save()
        return instance
    
