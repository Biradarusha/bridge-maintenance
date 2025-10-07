from django.urls import path
from . import views

urlpatterns = [
    path('', views.index, name='index'),
   
    path('map-viewer/', views.map_viewer, name='map_viewer'),
    
]
