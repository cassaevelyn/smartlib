import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  Box,
  Typography,
  Button,
  Alert,
  Paper,
  TextField,
  CircularProgress,
} from '@mui/material'
import { CheckCircle, Error as ErrorIcon, Email } from '@mui/icons-material'
import { motion } from 'framer-motion'
import { authService } from '../../services/authService'
import { useToast } from '../../hooks/use-toast'

export function VerifyEmailPage() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [isVerified, setIsVerified] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [email, setEmail] = useState<string>('')
  const [isResending, setIsResending] = useState(false)

  useEffect(() => {
    if (!token) {
      setError('No verification token provided')
      setIsLoading(false)
      return
    }

    const verifyEmail = async () => {
      try {
        setIsLoading(true)
        const response = await authService.verifyEmail(token)
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

    verifyEmail()
  }, [token, toast])

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
      
      // Redirect to login page with a message
      navigate('/auth/login', { 
        state: { 
          message: 'A new verification code has been sent to your email. Please check your inbox and spam folders.' 
        } 
      })
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

        {isLoading ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 4 }}>
            <CircularProgress size={60} thickness={4} />
            <Typography variant="body1" sx={{ mt: 2 }}>
              Verifying your email address...
            </Typography>
          </Box>
        ) : isVerified ? (
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
        ) : (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <Box sx={{ mt: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <ErrorIcon color="error" sx={{ fontSize: 80, mb: 2 }} />
              <Typography variant="h5" gutterBottom>
                Verification Failed
              </Typography>
              <Alert severity="error" sx={{ mb: 3 }}>
                {error || 'Failed to verify your email. The token may be invalid or expired.'}
              </Alert>
              <Typography variant="body1" paragraph>
                Please try again or request a new verification email.
              </Typography>
              
              <Paper elevation={3} sx={{ p: 3, width: '100%', maxWidth: 400, mt: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Request New Verification
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
                <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                  <Button
                    variant="outlined"
                    onClick={() => navigate('/auth/login')}
                    fullWidth
                  >
                    Go to Login
                  </Button>
                  <Button
                    variant="contained"
                    onClick={handleResendVerification}
                    disabled={isResending || !email}
                    fullWidth
                    startIcon={isResending ? <CircularProgress size={20} /> : null}
                  >
                    {isResending ? 'Sending...' : 'Send Verification'}
                  </Button>
                </Box>
              </Paper>
            </Box>
          </motion.div>
        )}
      </Box>
    </motion.div>
  )
}