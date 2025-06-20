"""
URL patterns for library app
"""
from django.urls import path
from . import views

app_name = 'library'

urlpatterns = [
    # Public Library Views
    path('', views.LibraryListView.as_view(), name='library-list'),
    path('search/', views.search_libraries, name='library-search'),
    path('<uuid:id>/', views.LibraryDetailView.as_view(), name='library-detail'),
    
    # Library Structure
    path('<uuid:library_id>/floors/', views.LibraryFloorListView.as_view(), name='library-floors'),
    path('floors/<uuid:floor_id>/sections/', views.LibrarySectionListView.as_view(), name='floor-sections'),
    
    # Reviews
    path('<uuid:library_id>/reviews/', views.LibraryReviewListCreateView.as_view(), name='library-reviews'),
    
    # Notifications
    path('<uuid:library_id>/notifications/', views.LibraryNotificationListView.as_view(), name='library-notifications'),
    path('notifications/<uuid:notification_id>/view/', views.mark_notification_viewed, name='mark-notification-viewed'),
    path('notifications/<uuid:notification_id>/acknowledge/', views.acknowledge_notification, name='acknowledge-notification'),
    
    # Admin Views
    path('admin/manage/', views.LibraryManagementView.as_view(), name='admin-library-management'),
    path('admin/<uuid:library_id>/statistics/', views.LibraryStatisticsView.as_view(), name='library-statistics'),
    path('admin/<uuid:library_id>/configuration/', views.LibraryConfigurationView.as_view(), name='library-configuration'),
]