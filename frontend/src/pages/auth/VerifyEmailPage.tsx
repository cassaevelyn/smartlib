import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  Box,
  Typography,
  Button,
  Alert,
  CircularProgress,
  Paper,
} from '@mui/material'
import { CheckCircle, Error as ErrorIcon } from '@mui/icons-material'
import { motion } from 'framer-motion'
import { authService } from '../../services/authService'

export function VerifyEmailPage() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(true)
  const [isVerified, setIsVerified] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
      } catch (error: any) {
        setError(error.message || 'Failed to verify email')
        setIsVerified(false)
      } finally {
        setIsLoading(false)
      }
    }

    verifyEmail()
  }, [token])

  const handleResendVerification = async () => {
    // This would be implemented if we had the user's email available here
    // Since we don't have it in this context, we'll redirect to login page
    // where they can use the resend functionality
    navigate('/auth/login')
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
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button
                  variant="outlined"
                  onClick={() => navigate('/auth/login')}
                >
                  Go to Login
                </Button>
                <Button
                  variant="contained"
                  onClick={handleResendVerification}
                >
                  Request New Verification
                </Button>
              </Box>
            </Box>
          </motion.div>
        )}
      </Box>
    </motion.div>
  )
}