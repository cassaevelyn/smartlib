import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom'
import {
  Box,
  Typography,
  Button,
  Alert,
  Paper,
  TextField,
  InputAdornment,
  CircularProgress,
  Grid,
} from '@mui/material'
import { CheckCircle, Error as ErrorIcon, Email, ArrowBack } from '@mui/icons-material'
import { motion } from 'framer-motion'
import { authService } from '../../services/authService'
import { useToast } from '../../hooks/use-toast'

export function VerifyEmailPage() {
  const { token } = useParams<{ token: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  
  const [isLoading, setIsLoading] = useState(false)
  const [isVerified, setIsVerified] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [email, setEmail] = useState<string>('')
  const [isResending, setIsResending] = useState(false)
  const [otp, setOtp] = useState<string>('')
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false)
  
  // Check if we're in success or failure mode from URL path
  const isSuccess = window.location.pathname.includes('/success')
  const isFailure = window.location.pathname.includes('/failed')
  const failureReason = searchParams.get('reason')

  useEffect(() => {
    // If we're in success or failure mode, set the appropriate state
    if (isSuccess) {
      setIsVerified(true)
      setError(null)
      setIsLoading(false)
    } else if (isFailure) {
      setIsVerified(false)
      setError(
        failureReason === 'expired' 
          ? 'Your verification link has expired. Please request a new one.'
          : 'Invalid verification link. Please request a new one.'
      )
      setIsLoading(false)
    }
    // If we have a token in the URL, verify it
    else if (token) {
      verifyEmail()
    } 
    // Otherwise, we're in manual verification mode
    else {
      setIsLoading(false)
    }
  }, [token, isSuccess, isFailure, failureReason])

  const verifyEmail = async () => {
    try {
      setIsLoading(true)
      const response = await authService.verifyEmail(token!)
      setIsVerified(true)
      setError(null)
      
      toast({
        title: "Email Verified",
        description: "Your email has been verified successfully.",
        variant: "default",
      })
    } catch (error: any) {
      setError(error.message || 'Failed to verify email. The token may be invalid or expired.')
      setIsVerified(false)
      
      toast({
        title: "Verification Failed",
        description: error.message || 'Failed to verify email',
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendVerification = async () => {
    if (!email) {
      toast({
        title: "Email Required",
        description: "Please enter your email address",
        variant: "destructive",
      })
      return
    }
    
    try {
      setIsResending(true)
      const response = await authService.sendOtp(email)
      
      toast({
        title: "Verification Email Sent",
        description: "A new verification code has been sent to your email",
        variant: "default",
      })
      
      // Show OTP input field after sending
      setError(null)
    } catch (error: any) {
      toast({
        title: "Failed to Send Verification",
        description: error.message || 'Failed to send verification email',
        variant: "destructive",
      })
    } finally {
      setIsResending(false)
    }
  }

  const handleVerifyOtp = async () => {
    if (!email || !otp) {
      toast({
        title: "Information Required",
        description: "Please enter both email and verification code",
        variant: "destructive",
      })
      return
    }
    
    try {
      setIsVerifyingOtp(true)
      const response = await authService.verifyOtp(email, otp)
      
      setIsVerified(true)
      setError(null)
      
      toast({
        title: "Email Verified",
        description: "Your email has been verified successfully.",
        variant: "default",
      })
      
      // Redirect to login page with a message
      setTimeout(() => {
        navigate('/auth/login', { 
          state: { 
            message: 'Email verification successful! You can now log in.' 
          } 
        })
      }, 2000)
    } catch (error: any) {
      toast({
        title: "Verification Failed",
        description: error.message || 'Failed to verify email',
        variant: "destructive",
      })
    } finally {
      setIsVerifyingOtp(false)
    }
  }

  // Determine what to render based on the current state
  const renderContent = () => {
    // Loading state
    if (isLoading) {
      return (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 4 }}>
          <CircularProgress size={60} thickness={4} />
          <Typography variant="body1" sx={{ mt: 2 }}>
            Verifying your email address...
          </Typography>
        </Box>
      )
    }
    
    // Success state
    if (isVerified) {
      return (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <Box sx={{ mt: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <CheckCircle color="success" sx={{ fontSize: 80, mb: 2 }} />
            <Typography variant="h5" gutterBottom>
              Email Verified Successfully!
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              Your email has been verified. You can now log in to your account.
            </Typography>
            <Button
              variant="contained"
              size="large"
              onClick={() => navigate('/auth/login')}
              sx={{ mt: 2 }}
            >
              Go to Login
            </Button>
          </Box>
        </motion.div>
      )
    }
    
    // Error/Manual verification state
    return (
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <Box sx={{ mt: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {error && (
            <>
              <ErrorIcon color="error" sx={{ fontSize: 80, mb: 2 }} />
              <Typography variant="h5" gutterBottom>
                Verification Failed
              </Typography>
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
            </>
          )}
          
          <Typography variant="body1" paragraph>
            {error 
              ? 'Please try again or request a new verification email.'
              : 'Enter your email and verification code to verify your account.'}
          </Typography>
          
          <Paper elevation={3} sx={{ p: 3, width: '100%', maxWidth: 400, mt: 2 }}>
            <Typography variant="h6" gutterBottom>
              {error ? 'Request New Verification' : 'Verify Your Email'}
            </Typography>
            <TextField
              fullWidth
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              margin="normal"
              required
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Email color="action" />
                  </InputAdornment>
                ),
              }}
            />
            
            {otp ? (
              <TextField
                fullWidth
                label="Verification Code"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                margin="normal"
                required
                placeholder="Enter 6-digit code"
              />
            ) : null}
            
            <Grid container spacing={2} sx={{ mt: 2 }}>
              <Grid item xs={12} sm={6}>
                <Button
                  variant="outlined"
                  fullWidth
                  onClick={() => navigate('/auth/login')}
                  startIcon={<ArrowBack />}
                >
                  Back to Login
                </Button>
              </Grid>
              <Grid item xs={12} sm={6}>
                {otp ? (
                  <Button
                    variant="contained"
                    fullWidth
                    onClick={handleVerifyOtp}
                    disabled={isVerifyingOtp || !email || otp.length !== 6}
                  >
                    {isVerifyingOtp ? <CircularProgress size={24} /> : 'Verify Code'}
                  </Button>
                ) : (
                  <Button
                    variant="contained"
                    fullWidth
                    onClick={handleResendVerification}
                    disabled={isResending || !email}
                  >
                    {isResending ? <CircularProgress size={24} /> : 'Send Verification'}
                  </Button>
                )}
              </Grid>
            </Grid>
            
            {otp && (
              <Button
                variant="text"
                onClick={() => setOtp('')}
                sx={{ mt: 1 }}
              >
                Back to Email Entry
              </Button>
            )}
          </Paper>
        </Box>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Box sx={{ textAlign: 'center' }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Email Verification
        </Typography>

        {renderContent()}
      </Box>
    </motion.div>
  )
}