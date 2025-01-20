from rest_framework import serializers
from rest_framework.validators import UniqueValidator
from django.contrib.auth.models import Group, Permission
from django.contrib.auth.validators import UnicodeUsernameValidator
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils.timezone import now
from django.contrib.auth.password_validation import validate_password
from . import models  

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
    full_name = serializers.SerializerMethodField()

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
            'is_active',
            'is_staff',
            'date_joined',
            'last_login',
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
        password = validated_data.pop('password', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)  # Ensures password is hashed
        instance.save()
        return instance
