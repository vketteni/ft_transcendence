from django.urls import path
from . import views  # Ensure you don't have circular imports here

urlpatterns = [
    # Example URL patterns
    path('', views.some_view, name='some_view'),
    path('another/', views.another_view, name='another_view'),
]
