import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  InputAdornment,
  IconButton,
  Grid,
  MenuItem,
  Stepper,
  Step,
  StepLabel,
  Chip,
} from '@mui/material'
import {
  Visibility,
  VisibilityOff,
  Email,
  Person,
  Badge,
  Phone,
  Home,
  LocationCity,
  Cake,
  LockOutlined,
  VerifiedUser,
} from '@mui/icons-material'
import { motion } from 'framer-motion'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuthStore } from '../../stores/authStore'
import { authService } from '../../services/authService'
import { LoadingSpinner } from '../../components/ui/loading-spinner'
import { isValidCRN } from '../../lib/utils'

const registerSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  email: z.string().email('Please enter a valid email address'),
  otp: z.string().length(6, 'OTP must be 6 digits'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  password_confirm: z.string(),
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  crn: z.string().refine(isValidCRN, {
    message: 'CRN must be in format ICAP-CA-YYYY-####',
  }),
  phone_number: z.string().optional(),
  date_of_birth: z.string().optional(),
  gender: z.enum(['M', 'F', 'O']).optional(),
  address: z.string().optional(),
  city: z.string().optional(),
}).refine((data) => data.password === data.password_confirm, {
  message: "Passwords don't match",
  path: ['password_confirm'],
})

type RegisterForm = z.infer<typeof registerSchema>

const steps = ['Account Information', 'Email Verification', 'Personal Details', 'ICAP Information']

export function RegisterPage() {
  const navigate = useNavigate()
  const { register: registerUser, isLoading, error, clearError } = useAuthStore()
  const [showPassword, setShowPassword] = useState(false)
  const [activeStep, setActiveStep] = useState(0)
  
  // OTP related states
  const [otpSent, setOtpSent] = useState(false)
  const [otpVerified, setOtpVerified] = useState(false)
  const [sendingOtp, setSendingOtp] = useState(false)
  const [verifyingOtp, setVerifyingOtp] = useState(false)
  const [otpError, setOtpError] = useState<string | null>(null)
  const [otpSuccess, setOtpSuccess] = useState<string | null>(null)
  const [cooldownTime, setCooldownTime] = useState(0)
  const [cooldownInterval, setCooldownInterval] = useState<NodeJS.Timeout | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  
  // OTP input fields
  const [otpDigits, setOtpDigits] = useState<string[]>(Array(6).fill(''))
  const [otpRefs, setOtpRefs] = useState<(HTMLInputElement | null)[]>(Array(6).fill(null))

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isValid },
    trigger,
    watch,
    getValues,
    setValue,
    reset,
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    mode: 'onChange',
    defaultValues: {
      username: '',
      email: '',
      otp: '',
      password: '',
      password_confirm: '',
      first_name: '',
      last_name: '',
      crn: '',
      phone_number: '',
      date_of_birth: '',
      gender: 'M',
      address: '',
      city: '',
    },
  })

  const watchEmail = watch('email')

  const handleNext = async () => {
    let fieldsToValidate: (keyof RegisterForm)[] = []
    
    if (activeStep === 0) {
      fieldsToValidate = ['username', 'email', 'password', 'password_confirm']
    } else if (activeStep === 1) {
      fieldsToValidate = ['otp']
      
      // Don't proceed if OTP is not verified
      if (!otpVerified) {
        setOtpError('Please verify your email with the OTP')
        return
      }
    } else if (activeStep === 2) {
      fieldsToValidate = ['first_name', 'last_name', 'phone_number', 'date_of_birth', 'gender']
    }
    
    const isStepValid = await trigger(fieldsToValidate)
    
    if (isStepValid) {
      setActiveStep((prevStep) => prevStep + 1)
    }
  }

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1)
  }

  const onSubmit = async (data: RegisterForm) => {
    try {
      clearError()
      
      // Remove OTP from registration data
      const { otp, ...registrationData } = data
      
      // Include the user ID if we have it from OTP verification
      if (userId) {
        registrationData.id = userId
      }
      
      await registerUser(registrationData)
      navigate('/auth/login', { 
        state: { 
          message: 'Registration successful! You can now log in.' 
        } 
      })
    } catch (error) {
      // Error is handled by the store
    }
  }

  const handleSendOtp = async () => {
    try {
      setSendingOtp(true)
      setOtpError(null)
      setOtpSuccess(null)
      
      const email = getValues('email')
      const response = await authService.sendOtp(email)
      
      setOtpSent(true)
      setOtpSuccess('OTP sent to your email. Please check your inbox.')
      
      // Store the user ID returned from the backend
      if (response.user_id) {
        setUserId(response.user_id)
      }
      
      // Start cooldown timer
      const cooldownMinutes = response.cooldown_minutes || 1
      setCooldownTime(cooldownMinutes * 60)
      
      if (cooldownInterval) {
        clearInterval(cooldownInterval)
      }
      
      const interval = setInterval(() => {
        setCooldownTime(prev => {
          if (prev <= 1) {
            clearInterval(interval)
            return 0
          }
          return prev - 1
        })
      }, 1000)
      
      setCooldownInterval(interval)
    } catch (error: any) {
      setOtpError(error.message || 'Failed to send OTP')
    } finally {
      setSendingOtp(false)
    }
  }

  const handleVerifyOtp = async () => {
    try {
      setVerifyingOtp(true)
      setOtpError(null)
      setOtpSuccess(null)
      
      const email = getValues('email')
      const otp = getValues('otp')
      
      const response = await authService.verifyOtp(email, otp)
      
      setOtpVerified(true)
      setOtpSuccess('Email verified successfully!')
      
      // Store the user ID returned from the backend
      if (response.user_id) {
        setUserId(response.user_id)
      }
      
      // Automatically proceed to next step
      setTimeout(() => {
        handleNext()
      }, 1000)
    } catch (error: any) {
      setOtpError(error.message || 'Invalid OTP')
      setValue('otp', '')  // Clear OTP field on error
      
      // Clear all OTP input fields
      setOtpDigits(Array(6).fill(''))
      
      // Focus on the first OTP input field
      if (otpRefs[0]) {
        otpRefs[0].focus()
      }
    } finally {
      setVerifyingOtp(false)
    }
  }

  // Handle OTP input change
  const handleOtpChange = (index: number, value: string) => {
    // Only allow digits
    if (!/^\d*$/.test(value)) return;
    
    // Update the digit at the current index
    const newOtpDigits = [...otpDigits];
    newOtpDigits[index] = value.slice(-1); // Only take the last character if multiple are pasted
    setOtpDigits(newOtpDigits);
    
    // Combine all digits and update the form
    const combinedOtp = newOtpDigits.join('');
    setValue('otp', combinedOtp);
    
    // Move focus to the next input if a digit was entered
    if (value && index < 5 && otpRefs[index + 1]) {
      otpRefs[index + 1].focus();
    }
    
    // If all digits are filled, verify OTP
    if (newOtpDigits.every(digit => digit) && newOtpDigits.join('').length === 6) {
      handleVerifyOtp();
    }
  };

  // Handle key press in OTP input
  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    // Move to previous input on backspace if current input is empty
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0 && otpRefs[index - 1]) {
      otpRefs[index - 1].focus();
    }
  };

  // Handle paste event for OTP
  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text');
    
    // Check if pasted data contains only digits
    if (!/^\d+$/.test(pastedData)) return;
    
    // Fill the OTP fields with the pasted digits
    const digits = pastedData.slice(0, 6).split('');
    const newOtpDigits = [...otpDigits];
    
    digits.forEach((digit, index) => {
      if (index < 6) {
        newOtpDigits[index] = digit;
      }
    });
    
    setOtpDigits(newOtpDigits);
    
    // Update the form with the combined OTP
    const combinedOtp = newOtpDigits.join('');
    setValue('otp', combinedOtp);
    
    // Focus the next empty field or the last field if all are filled
    const nextEmptyIndex = newOtpDigits.findIndex(digit => !digit);
    if (nextEmptyIndex !== -1 && otpRefs[nextEmptyIndex]) {
      otpRefs[nextEmptyIndex].focus();
    } else if (otpRefs[5]) {
      otpRefs[5].focus();
    }
    
    // If all digits are filled, verify OTP
    if (newOtpDigits.every(digit => digit) && combinedOtp.length === 6) {
      handleVerifyOtp();
    }
  };

  // Clean up interval on unmount
  useEffect(() => {
    return () => {
      if (cooldownInterval) {
        clearInterval(cooldownInterval)
      }
    }
  }, [cooldownInterval])

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <Typography variant="h4" component="h1" gutterBottom textAlign="center">
          Create Account
        </Typography>
        <Typography variant="body1" color="text.secondary" textAlign="center" sx={{ mb: 3 }}>
          Join Smart Lib to access all features
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {activeStep === 0 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            <TextField
              {...register('username')}
              fullWidth
              label="Username"
              autoComplete="username"
              error={!!errors.username}
              helperText={errors.username?.message}
              sx={{ mb: 2 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Person color="action" />
                  </InputAdornment>
                ),
              }}
            />

            <TextField
              {...register('email')}
              fullWidth
              label="Email Address"
              type="email"
              autoComplete="email"
              error={!!errors.email}
              helperText={errors.email?.message}
              sx={{ mb: 2 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Email color="action" />
                  </InputAdornment>
                ),
              }}
            />

            <TextField
              {...register('password')}
              fullWidth
              label="Password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              error={!!errors.password}
              helperText={errors.password?.message}
              sx={{ mb: 2 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockOutlined color="action" />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <TextField
              {...register('password_confirm')}
              fullWidth
              label="Confirm Password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              error={!!errors.password_confirm}
              helperText={errors.password_confirm?.message}
              sx={{ mb: 3 }}
            />
          </motion.div>
        )}

        {activeStep === 1 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Alert severity="info" sx={{ mb: 3 }}>
              We need to verify your email address. Please enter the 6-digit OTP sent to your email.
            </Alert>

            <Box sx={{ mb: 3 }}>
              <Typography variant="body1" gutterBottom>
                Email: {watchEmail}
              </Typography>
              
              {!otpVerified && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 2 }}>
                  <Button
                    variant="outlined"
                    onClick={handleSendOtp}
                    disabled={!watchEmail || sendingOtp || cooldownTime > 0 || otpVerified}
                    startIcon={sendingOtp ? <LoadingSpinner size="sm" /> : <Email />}
                  >
                    {otpSent 
                      ? cooldownTime > 0 
                        ? `Resend OTP (${Math.floor(cooldownTime / 60)}:${(cooldownTime % 60).toString().padStart(2, '0')})` 
                        : 'Resend OTP' 
                      : 'Send OTP'}
                  </Button>
                </Box>
              )}
              
              {otpVerified && (
                <Chip 
                  icon={<VerifiedUser />} 
                  label="Email Verified" 
                  color="success" 
                  variant="outlined" 
                  sx={{ mt: 2 }}
                />
              )}
            </Box>

            {(otpError || otpSuccess) && (
              <Alert severity={otpError ? "error" : "success"} sx={{ mb: 3 }}>
                {otpError || otpSuccess}
              </Alert>
            )}

            {/* Hidden field for form validation */}
            <input
              type="hidden"
              {...register('otp')}
            />

            {!otpVerified && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="body2" gutterBottom>
                  Enter 6-digit OTP:
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
                  {Array(6).fill(0).map((_, index) => (
                    <TextField
                      key={index}
                      inputRef={(el) => {
                        otpRefs[index] = el;
                      }}
                      value={otpDigits[index]}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(index, e)}
                      onPaste={index === 0 ? handleOtpPaste : undefined}
                      variant="outlined"
                      inputProps={{
                        maxLength: 1,
                        style: { 
                          textAlign: 'center',
                          fontSize: '1.5rem',
                          padding: '8px',
                          width: '40px',
                          height: '40px'
                        }
                      }}
                      disabled={otpVerified || !otpSent}
                      sx={{ width: '60px' }}
                    />
                  ))}
                </Box>
              </Box>
            )}
          </motion.div>
        )}

        {activeStep === 2 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  {...register('first_name')}
                  fullWidth
                  label="First Name"
                  autoComplete="given-name"
                  error={!!errors.first_name}
                  helperText={errors.first_name?.message}
                  sx={{ mb: 2 }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Person color="action" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  {...register('last_name')}
                  fullWidth
                  label="Last Name"
                  autoComplete="family-name"
                  error={!!errors.last_name}
                  helperText={errors.last_name?.message}
                  sx={{ mb: 2 }}
                />
              </Grid>
            </Grid>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  {...register('phone_number')}
                  fullWidth
                  label="Phone Number"
                  autoComplete="tel"
                  error={!!errors.phone_number}
                  helperText={errors.phone_number?.message}
                  sx={{ mb: 2 }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Phone color="action" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  {...register('date_of_birth')}
                  fullWidth
                  label="Date of Birth"
                  type="date"
                  InputLabelProps={{ shrink: true }}
                  error={!!errors.date_of_birth}
                  helperText={errors.date_of_birth?.message}
                  sx={{ mb: 2 }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Cake color="action" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
            </Grid>

            <Controller
              name="gender"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  select
                  fullWidth
                  label="Gender"
                  error={!!errors.gender}
                  helperText={errors.gender?.message}
                  sx={{ mb: 2 }}
                >
                  <MenuItem value="M">Male</MenuItem>
                  <MenuItem value="F">Female</MenuItem>
                  <MenuItem value="O">Other</MenuItem>
                </TextField>
              )}
            />

            <TextField
              {...register('address')}
              fullWidth
              label="Address"
              autoComplete="street-address"
              error={!!errors.address}
              helperText={errors.address?.message}
              sx={{ mb: 2 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Home color="action" />
                  </InputAdornment>
                ),
              }}
            />

            <TextField
              {...register('city')}
              fullWidth
              label="City"
              autoComplete="address-level2"
              error={!!errors.city}
              helperText={errors.city?.message}
              sx={{ mb: 3 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LocationCity color="action" />
                  </InputAdornment>
                ),
              }}
            />
          </motion.div>
        )}

        {activeStep === 3 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Alert severity="info" sx={{ mb: 3 }}>
              Please enter your ICAP CA Registration Number (CRN) in the format ICAP-CA-YYYY-####
            </Alert>

            <TextField
              {...register('crn')}
              fullWidth
              label="ICAP CA Registration Number (CRN)"
              placeholder="ICAP-CA-2023-1234"
              error={!!errors.crn}
              helperText={errors.crn?.message}
              sx={{ mb: 3 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Badge color="action" />
                  </InputAdornment>
                ),
              }}
            />

            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              By registering, you agree to the Smart Lib Terms of Service and Privacy Policy.
            </Typography>
          </motion.div>
        )}

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
          <Button
            disabled={activeStep === 0}
            onClick={handleBack}
            variant="outlined"
          >
            Back
          </Button>
          
          {activeStep === steps.length - 1 ? (
            <Button
              type="submit"
              variant="contained"
              disabled={isLoading}
            >
              {isLoading ? <LoadingSpinner size="sm" /> : 'Register'}
            </Button>
          ) : (
            <Button
              variant="contained"
              onClick={handleNext}
              disabled={
                (activeStep === 0 && !watchEmail) || 
                (activeStep === 1 && !otpVerified)
              }
            >
              Next
            </Button>
          )}
        </Box>

        <Box sx={{ textAlign: 'center', mt: 3 }}>
          <Typography variant="body2" color="text.secondary">
            Already have an account?{' '}
            <Link
              to="/auth/login"
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              <Typography component="span" color="primary" sx={{ font: 'inherit' }}>
                Sign in
              </Typography>
            </Link>
          </Typography>
        </Box>
      </Box>
    </motion.div>
  )
}