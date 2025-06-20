"""
Signals for accounts app
"""
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from django.contrib.auth.signals import user_logged_in, user_logged_out
from apps.core.models import ActivityLog
from apps.core.utils import get_user_ip
from .models import User, UserProfile, AdminProfile, UserLibraryAccess


@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    """Create user profile when user is created"""
    if created:
        UserProfile.objects.get_or_create(user=instance)
        
        # Create admin profile for admin users
        if instance.role in ['ADMIN', 'SUPER_ADMIN']:
            AdminProfile.objects.get_or_create(user=instance)


@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    """Save user profile when user is saved"""
    if hasattr(instance, 'profile'):
        instance.profile.save()


@receiver(user_logged_in)
def log_user_login(sender, request, user, **kwargs):
    """Log user login activity"""
    ActivityLog.objects.create(
        user=user,
        activity_type='LOGIN',
        description=f'User logged in from {get_user_ip(request)}',
        ip_address=get_user_ip(request),
        user_agent=request.META.get('HTTP_USER_AGENT', ''),
        metadata={
            'login_method': 'web',
            'user_agent': request.META.get('HTTP_USER_AGENT', ''),
        }
    )


@receiver(user_logged_out)
def log_user_logout(sender, request, user, **kwargs):
    """Log user logout activity"""
    if user:
        ActivityLog.objects.create(
            user=user,
            activity_type='LOGOUT',
            description=f'User logged out from {get_user_ip(request)}',
            ip_address=get_user_ip(request),
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
            metadata={
                'logout_method': 'web',
            }
        )


@receiver(pre_save, sender=User)
def track_user_approval(sender, instance, **kwargs):
    """Track when user gets approved"""
    if instance.pk:
        try:
            old_instance = User.objects.get(pk=instance.pk)
            if not old_instance.is_approved and instance.is_approved:
                # User was just approved
                ActivityLog.objects.create(
                    user=instance,
                    activity_type='PROFILE_UPDATE',
                    description='User account approved',
                    metadata={
                        'approved_by': instance.approved_by.full_name if instance.approved_by else 'System',
                        'approval_date': instance.approval_date.isoformat() if instance.approval_date else None,
                    }
                )
        except User.DoesNotExist:
            pass


@receiver(post_save, sender=UserLibraryAccess)
def update_user_approval_status(sender, instance, created, **kwargs):
    """Update user approval status when library access changes"""
    user = instance.user
    
    # Check if user has any active library access
    has_active_access = UserLibraryAccess.objects.filter(
        user=user,
        is_active=True
    ).exists()
    
    # Update user approval status
    if has_active_access and not user.is_approved:
        user.is_approved = True
        user.save()
    elif not has_active_access and user.is_approved and user.role == 'STUDENT':
        # Only update students, not admins
        user.is_approved = False
        user.save()
    
    # Log activity if this is a new approval
    if created and instance.is_active:
        ActivityLog.objects.create(
            user=user,
            activity_type='PROFILE_UPDATE',
            description=f'Granted access to library: {instance.library.name}',
            metadata={
                'library_id': str(instance.library.id),
                'library_name': instance.library.name,
                'granted_by': instance.granted_by.full_name if instance.granted_by else 'System',
            }
        )