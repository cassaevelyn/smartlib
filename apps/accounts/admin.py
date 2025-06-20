from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.html import format_html
from . import models


@admin.register(models.User)
class UserAdmin(BaseUserAdmin):
    list_display = [
        'email', 'full_name', 'crn', 'role', 'is_approved', 'is_verified',
        'is_active', 'login_count', 'created_at'
    ]
    list_filter = [
        'role', 'is_approved', 'is_verified', 'is_active', 'is_staff', 
        'created_at', 'last_login'
    ]
    search_fields = ['email', 'username', 'first_name', 'last_name', 'crn', 'student_id']
    readonly_fields = ['student_id', 'created_at', 'updated_at', 'login_count']
    ordering = ['-created_at']
    
    fieldsets = (
        (None, {
            'fields': ('username', 'email', 'password')
        }),
        ('Personal Info', {
            'fields': (
                'first_name', 'last_name', 'phone_number', 'date_of_birth',
                'gender', 'address', 'city', 'avatar', 'bio'
            )
        }),
        ('ICAP CA Info', {
            'fields': ('crn', 'student_id')
        }),
        ('Role & Status', {
            'fields': (
                'role', 'is_approved', 'is_verified', 'approval_date', 'approved_by',
                'is_active', 'is_staff', 'is_superuser'
            )
        }),
        ('Preferences', {
            'fields': ('preferred_language', 'notification_preferences'),
            'classes': ('collapse',)
        }),
        ('Tracking', {
            'fields': ('last_login', 'last_login_ip', 'login_count', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
        ('Permissions', {
            'fields': ('groups', 'user_permissions'),
            'classes': ('collapse',)
        }),
    )
    
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': (
                'username', 'email', 'password1', 'password2',
                'first_name', 'last_name', 'crn', 'role'
            ),
        }),
    )
    
    def full_name(self, obj):
        return obj.get_full_name()
    full_name.short_description = 'Full Name'
    
    actions = ['approve_users', 'deactivate_users', 'activate_users', 'verify_users']
    
    def approve_users(self, request, queryset):
        from django.utils import timezone
        updated = queryset.update(
            is_approved=True,
            approval_date=timezone.now(),
            approved_by=request.user
        )
        self.message_user(request, f'{updated} users approved successfully.')
    approve_users.short_description = 'Approve selected users'
    
    def deactivate_users(self, request, queryset):
        updated = queryset.update(is_active=False)
        self.message_user(request, f'{updated} users deactivated successfully.')
    deactivate_users.short_description = 'Deactivate selected users'
    
    def activate_users(self, request, queryset):
        updated = queryset.update(is_active=True)
        self.message_user(request, f'{updated} users activated successfully.')
    activate_users.short_description = 'Activate selected users'
    
    def verify_users(self, request, queryset):
        updated = queryset.update(is_verified=True)
        self.message_user(request, f'{updated} users verified successfully.')
    verify_users.short_description = 'Verify selected users'


@admin.register(models.UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = [
        'user', 'education_level', 'enrollment_year', 'loyalty_points',
        'total_study_hours', 'books_read', 'events_attended'
    ]
    list_filter = ['education_level', 'enrollment_year', 'preferred_study_time']
    search_fields = ['user__email', 'user__first_name', 'user__last_name']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('User', {
            'fields': ('user',)
        }),
        ('Academic Info', {
            'fields': (
                'education_level', 'enrollment_year', 'expected_completion_year',
                'study_subjects'
            )
        }),
        ('Emergency Contact', {
            'fields': (
                'emergency_contact_name', 'emergency_contact_phone',
                'emergency_contact_relation'
            )
        }),
        ('Preferences', {
            'fields': ('preferred_study_time', 'preferred_seat_type')
        }),
        ('Statistics', {
            'fields': (
                'loyalty_points', 'total_study_hours', 'books_read', 'events_attended'
            )
        }),
    )


@admin.register(models.LoyaltyTransaction)
class LoyaltyTransactionAdmin(admin.ModelAdmin):
    list_display = [
        'user', 'points', 'transaction_type', 'description', 'created_at'
    ]
    list_filter = ['transaction_type', 'created_at']
    search_fields = ['user__email', 'user__first_name', 'user__last_name', 'description']
    readonly_fields = ['created_at', 'updated_at']
    date_hierarchy = 'created_at'
    
    def has_add_permission(self, request):
        return False
    
    def has_change_permission(self, request, obj=None):
        return False


@admin.register(models.UserSession)
class UserSessionAdmin(admin.ModelAdmin):
    list_display = [
        'user', 'ip_address', 'is_active', 'created_at', 'last_activity', 'logout_time'
    ]
    list_filter = ['is_active', 'created_at', 'last_activity']
    search_fields = ['user__email', 'ip_address']
    readonly_fields = ['created_at', 'updated_at']
    date_hierarchy = 'created_at'
    
    def has_add_permission(self, request):
        return False


@admin.register(models.UserVerification)
class UserVerificationAdmin(admin.ModelAdmin):
    list_display = [
        'user', 'verification_type', 'is_verified', 'attempts',
        'expires_at', 'created_at', 'last_resend_attempt'
    ]
    list_filter = ['verification_type', 'is_verified', 'created_at']
    search_fields = ['user__email', 'token']
    readonly_fields = ['token', 'created_at', 'updated_at']
    
    def has_add_permission(self, request):
        return False


@admin.register(models.UserPreference)
class UserPreferenceAdmin(admin.ModelAdmin):
    list_display = ['user', 'category', 'key', 'created_at']
    list_filter = ['category', 'created_at']
    search_fields = ['user__email', 'key']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(models.UserLibraryAccess)
class UserLibraryAccessAdmin(admin.ModelAdmin):
    list_display = [
        'user', 'library', 'access_type', 'is_active',
        'granted_by', 'granted_at', 'expires_at'
    ]
    list_filter = ['access_type', 'is_active', 'granted_at']
    search_fields = ['user__email', 'library__name', 'notes']
    readonly_fields = ['granted_at', 'created_at', 'updated_at']
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('user', 'library', 'granted_by')


@admin.register(models.AdminProfile)
class AdminProfileAdmin(admin.ModelAdmin):
    list_display = [
        'user', 'managed_library', 'can_approve_users',
        'can_manage_events', 'can_manage_books', 'can_view_analytics'
    ]
    list_filter = [
        'can_approve_users', 'can_manage_events', 
        'can_manage_books', 'can_view_analytics'
    ]
    search_fields = ['user__email', 'managed_library__name']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Admin User', {
            'fields': ('user', 'managed_library')
        }),
        ('Permissions', {
            'fields': (
                'can_approve_users', 'can_manage_events',
                'can_manage_books', 'can_view_analytics', 'permissions'
            )
        }),
    )