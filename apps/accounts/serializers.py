"""
Serializers for accounts app
"""
from rest_framework import serializers
from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.utils import timezone
from apps.core.serializers import BaseModelSerializer
from apps.core.utils import validate_crn, generate_secure_token, generate_numeric_otp
from .models import (
    User, UserProfile, LoyaltyTransaction, UserSession,
    UserVerification, UserPreference, UserLibraryAccess, AdminProfile
)


class UserRegistrationSerializer(serializers.ModelSerializer):
    """Serializer for user registration"""
    password = serializers.CharField(write_only=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True)
    id = serializers.UUIDField(required=False)  # Optional field to update existing user
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'password', 'password_confirm',
            'first_name', 'last_name', 'crn', 'phone_number',
            'date_of_birth', 'gender', 'address', 'city'
        ]
    
    def validate_crn(self, value):
        """Validate CRN format"""
        if not validate_crn(value):
            raise serializers.ValidationError(
                "Invalid CRN format. Use: ICAP-CA-YYYY-####"
            )
        return value
    
    def validate(self, attrs):
        """Validate password confirmation"""
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError("Passwords don't match")
        return attrs
    
    def create(self, validated_data):
        """Create new user or update existing temporary user"""
        validated_data.pop('password_confirm')
        password = validated_data.pop('password')
        
        # Check if we're updating an existing user (from OTP verification)
        user_id = validated_data.pop('id', None)
        
        if user_id:
            # Update existing user - if user doesn't exist, this will raise User.DoesNotExist
            # which will be caught by the view and returned as a 404
            user = User.objects.get(id=user_id)
            
            # Update user fields
            for attr, value in validated_data.items():
                setattr(user, attr, value)
            
            user.set_password(password)
            user.is_active = True  # Activate the user now that registration is complete
            user.save()
            
            return user
        
        # Create new user
        user = User.objects.create_user(
            password=password,
            **validated_data
        )
        
        # UserProfile is now created by the post_save signal in signals.py
        
        return user


class UserLoginSerializer(serializers.Serializer):
    """Serializer for user login"""
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
    
    def validate(self, attrs):
        """Validate login credentials"""
        email = attrs.get('email')
        password = attrs.get('password')
        
        if email and password:
            user = authenticate(
                request=self.context.get('request'),
                username=email,
                password=password
            )
            
            if not user:
                raise serializers.ValidationError('Invalid credentials')
            
            if not user.is_active:
                raise serializers.ValidationError('Account is deactivated')
            
            # Removed the is_verified check to allow login for unverified users
            
            attrs['user'] = user
            return attrs
        
        raise serializers.ValidationError('Email and password are required')


class SendOtpSerializer(serializers.Serializer):
    """Serializer for sending OTP"""
    email = serializers.EmailField()
    
    def validate_email(self, value):
        """Validate email exists or create temporary user"""
        try:
            # Try to find an existing user
            user = User.objects.get(email=value)
            
            # If user is already verified, raise an error
            if user.is_verified:
                raise serializers.ValidationError('An account with this email already exists and is verified. Please login instead.')
            
            # If user exists but is not verified, we'll use this user for OTP
            self.context['user'] = user
            
        except User.DoesNotExist:
            # Create a temporary user for OTP verification
            import uuid
            temp_username = f"temp_{uuid.uuid4().hex[:8]}"
            
            user = User.objects.create(
                username=temp_username,
                email=value,
                is_active=False,  # Ensure the user is not active until registration is complete
                is_verified=False,
                # Set a random password that won't be used
                password=f"pbkdf2_sha256${uuid.uuid4().hex}"
            )
            
            self.context['user'] = user
            
        # Check for existing OTP verification
        try:
            verification = UserVerification.objects.get(
                user=user,
                verification_type='OTP',
                is_verified=False
            )
            
            # Check rate limiting
            if not verification.can_resend():
                # Check if last attempt was within the last hour
                one_hour_ago = timezone.now() - timezone.timedelta(hours=1)
                if verification.last_resend_attempt and verification.last_resend_attempt > one_hour_ago and verification.attempts >= 5:
                    raise serializers.ValidationError('Too many OTP attempts. Please try again after 1 hour.')
            
            self.context['verification'] = verification
        except UserVerification.DoesNotExist:
            # Will create a new verification in the view
            pass
        
        return value


class VerifyOtpSerializer(serializers.Serializer):
    """Serializer for verifying OTP"""
    email = serializers.EmailField()
    otp = serializers.CharField(min_length=6, max_length=6)
    
    def validate(self, attrs):
        """Validate OTP"""
        email = attrs.get('email')
        otp = attrs.get('otp')
        
        try:
            user = User.objects.get(email=email)
            
            try:
                verification = UserVerification.objects.get(
                    user=user,
                    verification_type='OTP',
                    code=otp,
                    is_verified=False
                )
                
                if verification.is_expired():
                    raise serializers.ValidationError('OTP has expired. Please request a new one.')
                
                if not verification.can_attempt():
                    raise serializers.ValidationError('Maximum OTP attempts exceeded. Please request a new OTP.')
                
                self.context['user'] = user
                self.context['verification'] = verification
                return attrs
                
            except UserVerification.DoesNotExist:
                # Increment attempts for any existing OTP verification
                try:
                    existing_verification = UserVerification.objects.get(
                        user=user,
                        verification_type='OTP',
                        is_verified=False
                    )
                    existing_verification.attempts += 1
                    existing_verification.save()
                    
                    if not existing_verification.can_attempt():
                        raise serializers.ValidationError('Maximum OTP attempts exceeded. Please request a new OTP.')
                except UserVerification.DoesNotExist:
                    pass
                
                raise serializers.ValidationError('Invalid OTP. Please try again.')
                
        except User.DoesNotExist:
            raise serializers.ValidationError('No account found with this email')


class UserSerializer(serializers.ModelSerializer):
    """Serializer for user details"""
    full_name = serializers.ReadOnlyField()
    is_student = serializers.ReadOnlyField()
    is_admin = serializers.ReadOnlyField()
    is_super_admin = serializers.ReadOnlyField()
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name', 'full_name',
            'crn', 'student_id', 'phone_number', 'date_of_birth', 'gender',
            'address', 'city', 'role', 'is_approved', 'is_verified', 'avatar', 'bio',
            'preferred_language', 'is_student', 'is_admin', 'is_super_admin',
            'last_login', 'created_at'
        ]
        read_only_fields = [
            'id', 'student_id', 'role', 'is_approved', 'is_verified', 'last_login', 'created_at'
        ]


class UserProfileSerializer(BaseModelSerializer):
    """Serializer for user profile"""
    user_display = serializers.CharField(source='user.full_name', read_only=True)
    
    class Meta:
        model = UserProfile
        fields = [
            'id', 'user', 'user_display', 'education_level', 'enrollment_year',
            'expected_completion_year', 'emergency_contact_name',
            'emergency_contact_phone', 'emergency_contact_relation',
            'preferred_study_time', 'preferred_seat_type', 'study_subjects',
            'total_study_hours', 'books_read', 'events_attended',
            'loyalty_points', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'total_study_hours', 'books_read', 'events_attended',
            'loyalty_points', 'created_at', 'updated_at'
        ]


class LoyaltyTransactionSerializer(BaseModelSerializer):
    """Serializer for loyalty transactions"""
    user_display = serializers.CharField(source='user.get_full_name', read_only=True)
    transaction_type_display = serializers.CharField(
        source='get_transaction_type_display', read_only=True
    )
    
    class Meta:
        model = LoyaltyTransaction
        fields = [
            'id', 'user', 'user_display', 'points', 'transaction_type',
            'transaction_type_display', 'description', 'reference_id',
            'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class UserSessionSerializer(serializers.ModelSerializer):
    """Serializer for user sessions"""
    user_display = serializers.CharField(source='user.get_full_name', read_only=True)
    
    class Meta:
        model = UserSession
        fields = [
            'id', 'user', 'user_display', 'session_key', 'ip_address',
            'user_agent', 'device_info', 'is_active', 'created_at',
            'last_activity', 'logout_time'
        ]
        read_only_fields = ['id', 'created_at', 'last_activity']


class UserVerificationSerializer(serializers.ModelSerializer):
    """Serializer for user verification"""
    user_display = serializers.CharField(source='user.get_full_name', read_only=True)
    verification_type_display = serializers.CharField(
        source='get_verification_type_display', read_only=True
    )
    
    class Meta:
        model = UserVerification
        fields = [
            'id', 'user', 'user_display', 'verification_type',
            'verification_type_display', 'is_verified', 'expires_at',
            'verified_at', 'attempts', 'max_attempts', 'created_at',
            'last_resend_attempt'
        ]
        read_only_fields = [
            'id', 'token', 'code', 'is_verified', 'verified_at', 'attempts', 'created_at',
            'last_resend_attempt'
        ]


class UserPreferenceSerializer(BaseModelSerializer):
    """Serializer for user preferences"""
    user_display = serializers.CharField(source='user.get_full_name', read_only=True)
    category_display = serializers.CharField(
        source='get_category_display', read_only=True
    )
    
    class Meta:
        model = UserPreference
        fields = [
            'id', 'user', 'user_display', 'category', 'category_display',
            'key', 'value', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class UserLibraryAccessSerializer(BaseModelSerializer):
    """Serializer for user library access"""
    user_display = serializers.CharField(source='user.get_full_name', read_only=True)
    library_display = serializers.CharField(source='library.name', read_only=True)
    granted_by_display = serializers.CharField(source='granted_by.full_name', read_only=True)
    access_type_display = serializers.CharField(
        source='get_access_type_display', read_only=True
    )
    
    class Meta:
        model = UserLibraryAccess
        fields = [
            'id', 'user', 'user_display', 'library', 'library_display',
            'access_type', 'access_type_display', 'granted_by',
            'granted_by_display', 'granted_at', 'expires_at', 'is_active',
            'notes', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'granted_by', 'granted_at', 'created_at', 'updated_at'
        ]


class LibraryApplicationSerializer(serializers.ModelSerializer):
    """Serializer for library access application"""
    notes = serializers.CharField(required=False, allow_blank=True)
    
    class Meta:
        model = UserLibraryAccess
        fields = ['library', 'notes']
    
    def create(self, validated_data):
        user = self.context['request'].user
        validated_data['user'] = user
        validated_data['created_by'] = user
        validated_data['is_active'] = False  # Pending approval
        validated_data['access_type'] = 'STANDARD'
        return super().create(validated_data)


class AdminProfileSerializer(BaseModelSerializer):
    """Serializer for admin profile"""
    user_display = serializers.CharField(source='user.get_full_name', read_only=True)
    managed_library_display = serializers.CharField(
        source='managed_library.name', read_only=True
    )
    
    class Meta:
        model = AdminProfile
        fields = [
            'id', 'user', 'user_display', 'managed_library',
            'managed_library_display', 'permissions', 'can_approve_users',
            'can_manage_events', 'can_manage_books', 'can_view_analytics',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class PasswordChangeSerializer(serializers.Serializer):
    """Serializer for password change"""
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, validators=[validate_password])
    new_password_confirm = serializers.CharField(write_only=True)
    
    def validate_old_password(self, value):
        """Validate old password"""
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError('Old password is incorrect')
        return value
    
    def validate(self, attrs):
        """Validate new password confirmation"""
        if attrs['new_password'] != attrs['new_password_confirm']:
            raise serializers.ValidationError("New passwords don't match")
        return attrs
    
    def save(self):
        """Change user password"""
        user = self.context['request'].user
        user.set_password(self.validated_data['new_password'])
        user.save()
        return user


class PasswordResetSerializer(serializers.Serializer):
    """Serializer for password reset request"""
    email = serializers.EmailField()
    
    def validate_email(self, value):
        """Validate email exists"""
        try:
            user = User.objects.get(email=value, is_active=True)
            self.user = user
            return value
        except User.DoesNotExist:
            raise serializers.ValidationError('No active account found with this email')


class PasswordResetConfirmSerializer(serializers.Serializer):
    """Serializer for password reset confirmation"""
    token = serializers.CharField()
    new_password = serializers.CharField(write_only=True, validators=[validate_password])
    new_password_confirm = serializers.CharField(write_only=True)
    
    def validate(self, attrs):
        """Validate token and password confirmation"""
        if attrs['new_password'] != attrs['new_password_confirm']:
            raise serializers.ValidationError("Passwords don't match")
        
        # Validate token
        try:
            verification = UserVerification.objects.get(
                token=attrs['token'],
                verification_type='PASSWORD_RESET',
                is_verified=False
            )
            if verification.is_expired() or not verification.can_attempt():
                raise serializers.ValidationError('Token is expired or invalid')
            
            attrs['verification'] = verification
            return attrs
        except UserVerification.DoesNotExist:
            raise serializers.ValidationError('Invalid token')
    
    def save(self):
        """Reset user password"""
        verification = self.validated_data['verification']
        user = verification.user
        user.set_password(self.validated_data['new_password'])
        user.save()
        
        # Mark verification as used
        verification.verify()
        
        return user
