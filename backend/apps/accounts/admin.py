# Register your models here.

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User

@admin.register(User)
class CustomUserAdmin(UserAdmin):
    # Customize the display of the user model in the admin panel
    list_display = ('username', 'email', 'first_name', 'last_name', 'is_staff', 'is_active')
    search_fields = ('username', 'email')
    ordering = ('username',)
