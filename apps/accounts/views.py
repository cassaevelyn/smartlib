"""
Views for accounts app
"""
from rest_framework import generics, status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import login, logout
from django.utils import timezone
from django.db import transaction
from django.shortcuts import redirect
from django.conf import settings
from apps.core.permissions import IsOwnerOrReadOnly, IsAdminUser, IsSuperAdminUser
from apps.core.utils import get_user_ip, send_notification_email, generate_secure_token, generate_numeric_otp
from apps.core.models import ActivityLog
from .models import (
    User, UserProfile, LoyaltyTransaction, UserSession,
    UserVerification, UserPreference, UserLibraryAccess, AdminProfile
)
from .serializers import (
    UserRegistrationSerializer, UserLoginSerializer, UserSerializer,
    UserProfileSerializer, LoyaltyTransactionSerializer, UserSessionSerializer,
    UserVerificationSerializer, UserPreferenceSerializer, UserLibraryAccessSerializer,
    AdminProfileSerializer, PasswordChangeSerializer, PasswordResetSerializer,
    PasswordResetConfirmSerializer, LibraryApplicationSerializer, 
    SendOtpSerializer, VerifyOtpSerializer
)
from datetime import timedelta
from .tasks import send_welcome_email, send_account_activation_email


class UserRegistrationView(generics.CreateAPIView):
    """User registration endpoint"""
    queryset = User.objects.all()
    serializer_class = UserRegistrationSerializer
    permission_classes = [permissions.AllowAny]
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        with transaction.atomic():
            user = serializer.save()
            
            # Create verification token and code
            token = generate_secure_token()
            code = generate_numeric_otp(6)
            
            # Create verification record
            verification = UserVerification.objects.create(
                user=user,
                verification_type='ACCOUNT_ACTIVATION',
                token=token,
                code=code,
                expires_at=timezone.now() + timedelta(hours=24),
                attempts=0
            )
            
            # Send activation email
            send_account_activation_email.delay(
                str(user.id), 
                token, 
                code
            )
            
            # Log activity
            ActivityLog.objects.create(
                user=user,
                activity_type='PROFILE_UPDATE',
                description='User registered and verification email sent',
                metadata={
                    'verification_type': 'ACCOUNT_ACTIVATION',
                }
            )
        
        return Response({
            'message': 'Registration successful. Please check your email to verify your account.',
            'user_id': user.id
        }, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def login_view(request):
    """User login endpoint"""
    serializer = UserLoginSerializer(data=request.data, context={'request': request})
    
    try:
        serializer.is_valid(raise_exception=True)
    except serializers.ValidationError as e:
        # Check if this is the special 'account_not_active' error
        if e.get_codes() == {'non_field_errors': ['account_not_active']}:
            # Get the user by email
            try:
                user = User.objects.get(email=request.data.get('email'))
                
                # Generate a new verification token and code
                token = generate_secure_token()
                code = generate_numeric_otp(6)
                
                # Create or update verification record
                verification, created = UserVerification.objects.get_or_create(
                    user=user,
                    verification_type='ACCOUNT_ACTIVATION',
                    is_verified=False,
                    defaults={
                        'token': token,
                        'code': code,
                        'expires_at': timezone.now() + timedelta(hours=24),
                        'attempts': 0
                    }
                )
                
                if not created:
                    # Update existing verification
                    verification.token = token
                    verification.code = code
                    verification.expires_at = timezone.now() + timedelta(hours=24)
                    verification.attempts = 0
                    verification.save()
                
                # Send activation email
                send_account_activation_email.delay(
                    str(user.id), 
                    token, 
                    code
                )
                
                # Log activity
                ActivityLog.objects.create(
                    user=user,
                    activity_type='PROFILE_UPDATE',
                    description='Account activation email resent during login attempt',
                    metadata={
                        'verification_type': 'ACCOUNT_ACTIVATION',
                    }
                )
                
                return Response({
                    'message': 'Your account is not active. A verification email has been sent to your email address.',
                    'code': 'account_not_active'
                }, status=status.HTTP_400_BAD_REQUEST)
                
            except User.DoesNotExist:
                pass
        
        # For other validation errors, just raise them
        raise e
    
    user = serializer.validated_data['user']
    
    # Update login tracking
    user.login_count += 1
    user.last_login_ip = get_user_ip(request)
    user.save()
    
    # Create user session
    session = UserSession.objects.create(
        user=user,
        session_key=request.session.session_key or generate_secure_token()[:40],
        ip_address=get_user_ip(request),
        user_agent=request.META.get('HTTP_USER_AGENT', ''),
        device_info={
            'user_agent': request.META.get('HTTP_USER_AGENT', ''),
            'accept_language': request.META.get('HTTP_ACCEPT_LANGUAGE', ''),
        }
    )
    
    # Generate JWT tokens
    refresh = RefreshToken.for_user(user)
    access_token = refresh.access_token
    
    # Add custom claims
    access_token['role'] = user.role
    access_token['is_approved'] = user.is_approved
    access_token['student_id'] = user.student_id
    
    return Response({
        'access_token': str(access_token),
        'refresh_token': str(refresh),
        'user': UserSerializer(user).data,
        'session_id': session.id
    })


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def logout_view(request):
    """User logout endpoint"""
    try:
        # End user session
        session_key = request.data.get('session_id')
        if session_key:
            try:
                session = UserSession.objects.get(id=session_key, user=request.user)
                session.end_session()
            except UserSession.DoesNotExist:
                pass
        
        # Blacklist refresh token if provided
        refresh_token = request.data.get('refresh_token')
        if refresh_token:
            try:
                token = RefreshToken(refresh_token)
                token.blacklist()
            except Exception:
                pass
        
        return Response({'message': 'Logout successful'})
    except Exception as e:
        return Response(
            {'error': 'Logout failed'},
            status=status.HTTP_400_BAD_REQUEST
        )


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def send_otp_view(request):
    """Send OTP for account activation"""
    serializer = SendOtpSerializer(data=request.data, context={'request': request})
    serializer.is_valid(raise_exception=True)
    
    user = serializer.context.get('user')
    verification = serializer.context.get('verification')
    
    # If verification doesn't exist, create a new one
    if not verification:
        # Generate a token and 6-digit OTP
        token = generate_secure_token()
        otp_code = generate_numeric_otp(6)
        
        verification = UserVerification.objects.create(
            user=user,
            verification_type='ACCOUNT_ACTIVATION',
            token=token,
            code=otp_code,
            expires_at=timezone.now() + timedelta(hours=24),  # Expires in 24 hours
            attempts=0
        )
    else:
        # Generate a new token and OTP code
        token = generate_secure_token()
        otp_code = generate_numeric_otp(6)
        verification.token = token
        verification.code = otp_code
        verification.expires_at = timezone.now() + timedelta(hours=24)
        verification.save()
    
    # Update verification attempts and last resend time
    verification.attempts += 1
    verification.last_resend_attempt = timezone.now()
    verification.save()
    
    # Send activation email
    send_account_activation_email.delay(str(user.id), token, otp_code)
    
    # Calculate cooldown for next attempt
    cooldown = 1  # Default 1 minute
    if verification.attempts > 1:
        cooldown = min(verification.attempts * 2, 60)  # Increase cooldown with each attempt, max 60 minutes
    
    return Response({
        'message': 'Verification email sent. Please check your inbox and spam folders.',
        'attempts_remaining': max(0, 5 - verification.attempts),
        'cooldown_minutes': cooldown,
        'user_id': str(user.id)  # Return the user ID to the frontend
    })


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def verify_otp_view(request):
    """Verify OTP for account activation"""
    serializer = VerifyOtpSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    
    verification = serializer.context.get('verification')
    user = serializer.context.get('user')
    
    # Mark verification as verified
    verification.verify()
    
    # Update user status
    user.is_verified = True
    user.is_active = True  # Activate the user
    user.save()
    
    # Log activity
    ActivityLog.objects.create(
        user=user,
        activity_type='PROFILE_UPDATE',
        description='Email verified and account activated',
        metadata={
            'verification_type': 'ACCOUNT_ACTIVATION',
        }
    )
    
    return Response({
        'message': 'Email verified successfully. You can now log in.',
        'user_id': str(user.id)
    })


class EmailVerificationConfirmView(APIView):
    """View to handle email verification from link"""
    permission_classes = [permissions.AllowAny]
    
    def get(self, request, token):
        try:
            # Find the verification record
            verification = UserVerification.objects.get(
                token=token,
                verification_type='ACCOUNT_ACTIVATION',
                is_verified=False
            )
            
            # Check if token is expired
            if verification.is_expired():
                # Redirect to frontend with error message
                return redirect(f"{settings.FRONTEND_URL}/auth/verify-email/failed?reason=expired")
            
            # Mark verification as verified
            verification.verify()
            
            # Update user status
            user = verification.user
            user.is_verified = True
            user.is_active = True  # Activate the user
            user.save()
            
            # Log activity
            ActivityLog.objects.create(
                user=user,
                activity_type='PROFILE_UPDATE',
                description='Email verified and account activated via link',
                metadata={
                    'verification_type': 'ACCOUNT_ACTIVATION',
                }
            )
            
            # Redirect to frontend with success message
            return redirect(f"{settings.FRONTEND_URL}/auth/verify-email/success")
            
        except UserVerification.DoesNotExist:
            # Redirect to frontend with error message
            return redirect(f"{settings.FRONTEND_URL}/auth/verify-email/failed?reason=invalid")


class UserProfileView(generics.RetrieveUpdateAPIView):
    """User profile view"""
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_object(self):
        return self.request.user


class UserProfileDetailView(generics.RetrieveUpdateAPIView):
    """User profile detail view"""
    serializer_class = UserProfileSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_object(self):
        profile, created = UserProfile.objects.get_or_create(user=self.request.user)
        return profile


class UserActivityListView(generics.ListAPIView):
    """List user activities"""
    serializer_class = ActivityLog
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return ActivityLog.objects.filter(
            user=self.request.user
        ).order_by('-created_at')
    
    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        page = self.paginate_queryset(queryset)
        
        # Transform the data to match the frontend expected format
        transformed_data = []
        
        activity_type_mapping = {
            'LOGIN': 'ACCOUNT',
            'LOGOUT': 'ACCOUNT',
            'SEAT_BOOK': 'SEAT_BOOKING',
            'SEAT_CHECKIN': 'SEAT_BOOKING',
            'SEAT_CHECKOUT': 'SEAT_BOOKING',
            'BOOK_RESERVE': 'BOOK_RESERVATION',
            'BOOK_PICKUP': 'BOOK_RESERVATION',
            'BOOK_RETURN': 'BOOK_RESERVATION',
            'EVENT_REGISTER': 'EVENT_REGISTRATION',
            'EVENT_ATTEND': 'EVENT_REGISTRATION',
            'PROFILE_UPDATE': 'ACCOUNT',
            'PASSWORD_CHANGE': 'ACCOUNT',
        }
        
        for activity in page:
            activity_type = activity.activity_type
            mapped_type = activity_type_mapping.get(activity_type, 'ACCOUNT')
            
            # Create a title based on activity type
            title_mapping = {
                'LOGIN': 'Account Login',
                'LOGOUT': 'Account Logout',
                'SEAT_BOOK': 'Seat Booking',
                'SEAT_CHECKIN': 'Seat Check-in',
                'SEAT_CHECKOUT': 'Seat Check-out',
                'BOOK_RESERVE': 'Book Reservation',
                'BOOK_PICKUP': 'Book Pickup',
                'BOOK_RETURN': 'Book Return',
                'EVENT_REGISTER': 'Event Registration',
                'EVENT_ATTEND': 'Event Attendance',
                'PROFILE_UPDATE': 'Profile Update',
                'PASSWORD_CHANGE': 'Password Change',
            }
            
            title = title_mapping.get(activity_type, activity_type.replace('_', ' ').title())
            
            # Extract status from metadata if available
            status = 'COMPLETED'
            if activity.metadata and 'status' in activity.metadata:
                status = activity.metadata['status']
            
            transformed_data.append({
                'id': str(activity.id),
                'type': mapped_type,
                'title': title,
                'description': activity.description,
                'timestamp': activity.created_at.isoformat(),
                'status': status,
            })
        
        return self.get_paginated_response(transformed_data)


class LoyaltyTransactionListView(generics.ListAPIView):
    """List user loyalty transactions"""
    serializer_class = LoyaltyTransactionSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return LoyaltyTransaction.objects.filter(
            user=self.request.user
        ).select_related('user')


class UserSessionListView(generics.ListAPIView):
    """List user sessions"""
    serializer_class = UserSessionSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return UserSession.objects.filter(
            user=self.request.user
        ).select_related('user')


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def end_session_view(request, session_id):
    """End a specific user session"""
    try:
        session = UserSession.objects.get(id=session_id, user=request.user)
        session.end_session()
        return Response({'message': 'Session ended successfully'})
    except UserSession.DoesNotExist:
        return Response(
            {'error': 'Session not found'},
            status=status.HTTP_404_NOT_FOUND
        )


class UserPreferenceListCreateView(generics.ListCreateAPIView):
    """List and create user preferences"""
    serializer_class = UserPreferenceSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return UserPreference.objects.filter(user=self.request.user)
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user, created_by=self.request.user)


class UserPreferenceDetailView(generics.RetrieveUpdateDestroyAPIView):
    """User preference detail view"""
    serializer_class = UserPreferenceSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrReadOnly]
    
    def get_queryset(self):
        return UserPreference.objects.filter(user=self.request.user)


class LibraryApplicationView(generics.CreateAPIView):
    """Apply for library access"""
    serializer_class = LibraryApplicationSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def perform_create(self, serializer):
        serializer.save()
        
        # Log activity
        ActivityLog.objects.create(
            user=self.request.user,
            activity_type='PROFILE_UPDATE',
            description=f'Applied for library access: {serializer.validated_data["library"].name}',
            metadata={
                'library_id': str(serializer.validated_data["library"].id),
                'library_name': serializer.validated_data["library"].name,
            }
        )


class UserLibraryAccessListView(generics.ListAPIView):
    """List user's library access applications"""
    serializer_class = UserLibraryAccessSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return UserLibraryAccess.objects.filter(
            user=self.request.user
        ).select_related('library', 'granted_by')


class PasswordChangeView(generics.GenericAPIView):
    """Change user password"""
    serializer_class = PasswordChangeSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        
        return Response({'message': 'Password changed successfully'})


class PasswordResetView(generics.GenericAPIView):
    """Request password reset"""
    serializer_class = PasswordResetSerializer
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        user = serializer.user
        
        # Create password reset verification
        verification = UserVerification.objects.create(
            user=user,
            verification_type='PASSWORD_RESET',
            token=generate_secure_token(),
            expires_at=timezone.now() + timedelta(hours=2)
        )
        
        # Send reset email
        send_notification_email(
            to_email=user.email,
            subject='Smart Lib - Password Reset',
            message=f'Use this token to reset your password: {verification.token}',
            html_message=f'''
            <h2>Password Reset Request</h2>
            <p>You requested a password reset for your Smart Lib account.</p>
            <p>Use the following token to reset your password:</p>
            <p><strong>{verification.token}</strong></p>
            <p>This token will expire in 2 hours.</p>
            <p>If you didn't request this, please ignore this email.</p>
            '''
        )
        
        return Response({'message': 'Password reset email sent'})


class PasswordResetConfirmView(generics.GenericAPIView):
    """Confirm password reset"""
    serializer_class = PasswordResetConfirmSerializer
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        
        return Response({'message': 'Password reset successful'})


# Admin Views
class UserListView(generics.ListAPIView):
    """List all users (Admin only)"""
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]
    filterset_fields = ['role', 'is_approved', 'is_active', 'is_verified']
    search_fields = ['email', 'first_name', 'last_name', 'crn', 'student_id']
    ordering_fields = ['created_at', 'last_login', 'login_count']
    ordering = ['-created_at']
    
    def get_queryset(self):
        if self.request.user.is_super_admin:
            return User.objects.all()
        elif self.request.user.role == 'ADMIN':
            # Library admin can only see users with access to their library
            admin_profile = getattr(self.request.user, 'admin_profile', None)
            if admin_profile and admin_profile.managed_library:
                return User.objects.filter(
                    library_access__library=admin_profile.managed_library
                ).distinct()
        return User.objects.none()


class UserApprovalView(generics.GenericAPIView):
    """Approve/reject user registration"""
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]
    
    def post(self, request, user_id):
        try:
            user = User.objects.get(id=user_id)
            action = request.data.get('action')  # 'approve' or 'reject'
            
            if action == 'approve':
                user.is_approved = True
                user.approval_date = timezone.now()
                user.approved_by = request.user
                user.save()
                
                # Send approval email
                send_notification_email(
                    to_email=user.email,
                    subject='Smart Lib - Account Approved',
                    message='Your Smart Lib account has been approved. You can now log in.',
                    html_message='''
                    <h2>Account Approved!</h2>
                    <p>Your Smart Lib account has been approved.</p>
                    <p>You can now log in and start using the platform.</p>
                    '''
                )
                
                return Response({'message': 'User approved successfully'})
                
            elif action == 'reject':
                user.is_active = False
                user.save()
                
                # Send rejection email
                send_notification_email(
                    to_email=user.email,
                    subject='Smart Lib - Account Registration',
                    message='Your Smart Lib account registration was not approved.',
                    html_message='''
                    <h2>Account Registration Update</h2>
                    <p>Unfortunately, your Smart Lib account registration was not approved.</p>
                    <p>Please contact support for more information.</p>
                    '''
                )
                
                return Response({'message': 'User rejected successfully'})
            
            else:
                return Response(
                    {'error': 'Invalid action. Use "approve" or "reject"'},
                    status=status.HTTP_400_BAD_REQUEST
                )
                
        except User.DoesNotExist:
            return Response(
                {'error': 'User not found'},
                status=status.HTTP_404_NOT_FOUND
            )


class UserLibraryAccessListCreateView(generics.ListCreateAPIView):
    """Manage user library access"""
    serializer_class = UserLibraryAccessSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]
    
    def get_queryset(self):
        if self.request.user.is_super_admin:
            return UserLibraryAccess.objects.all().select_related(
                'user', 'library', 'granted_by'
            )
        elif self.request.user.role == 'ADMIN':
            admin_profile = getattr(self.request.user, 'admin_profile', None)
            if admin_profile and admin_profile.managed_library:
                return UserLibraryAccess.objects.filter(
                    library=admin_profile.managed_library
                ).select_related('user', 'library', 'granted_by')
        return UserLibraryAccess.objects.none()
    
    def perform_create(self, serializer):
        serializer.save(
            granted_by=self.request.user,
            created_by=self.request.user
        )


class AdminProfileListView(generics.ListAPIView):
    """List admin profiles (Super Admin only)"""
    serializer_class = AdminProfileSerializer
    permission_classes = [permissions.IsAuthenticated, IsSuperAdminUser]
    
    def get_queryset(self):
        return AdminProfile.objects.all().select_related('user', 'managed_library')