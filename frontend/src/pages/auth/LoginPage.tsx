  import { useState } from 'react'
  import { Link, useNavigate, useLocation } from 'react-router-dom'
  import {
    Box,
    TextField,
    Button,
    Typography,
    Alert,
    InputAdornment,
    IconButton,
    FormControlLabel,
    Checkbox,
    Divider,
  } from '@mui/material'
  import { Visibility, VisibilityOff, Email, Lock } from '@mui/icons-material'
  import { motion } from 'framer-motion'
  import { useForm } from 'react-hook-form'
  import { zodResolver } from '@hookform/resolvers/zod'
  import { z } from 'zod'
  import { useAuthStore } from '../../stores/authStore'
  import { LoadingSpinner } from '../../components/ui/loading-spinner'
  import { useToast } from '../../hooks/use-toast'
  
  const loginSchema = z.object({
    email: z.string().email('Please enter a valid email address'),
    password: z.string().min(1, 'Password is required'),
    rememberMe: z.boolean().optional(),
  })
  
  type LoginForm = z.infer<typeof loginSchema>
  
  export function LoginPage() {
    const navigate = useNavigate()
    const location = useLocation()
    const { toast } = useToast()
    const { login, isLoading, error, clearError } = useAuthStore()
    const [showPassword, setShowPassword] = useState(false)
  
    const from = location.state?.from?.pathname || '/'
  
    const {
      register,
      handleSubmit,
      formState: { errors },
    } = useForm<LoginForm>({
      resolver: zodResolver(loginSchema),
      defaultValues: {
        email: '',
        password: '',
        rememberMe: false,
      },
    })
  
    const onSubmit = async (data: LoginForm) => {
      try {
        clearError()
        
        await login({ email: data.email, password: data.password })
        
        toast({
          title: "Login Successful",
          description: "Welcome back to Smart Lib!",
          variant: "default",
        })
        
        navigate(from, { replace: true })
      } catch (error: any) {
        toast({
          title: "Login Failed",
          description: error.message || "Invalid credentials. Please try again.",
          variant: "destructive",
        })
      }
    }
  
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
          <Typography variant="h4" component="h1" gutterBottom textAlign="center">
            Welcome Back
          </Typography>
          <Typography variant="body1" color="text.secondary" textAlign="center" sx={{ mb: 3 }}>
            Sign in to your Smart Lib account
          </Typography>
  
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}
  
          {location.state?.message && (
            <Alert severity="success" sx={{ mb: 3 }}>
              {location.state.message}
            </Alert>
          )}
  
          <TextField
            {...register('email')}
            fullWidth
            label="Email Address"
            type="email"
            autoComplete="email"
            autoFocus
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
            autoComplete="current-password"
            error={!!errors.password}
            helperText={errors.password?.message}
            sx={{ mb: 2 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Lock color="action" />
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
  
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <FormControlLabel
              control={<Checkbox {...register('rememberMe')} />}
              label="Remember me"
            />
            <Link
              to="/auth/forgot-password"
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              <Typography variant="body2" color="primary">
                Forgot password?
              </Typography>
            </Link>
          </Box>
  
          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="large"
            disabled={isLoading}
            sx={{ mb: 2, py: 1.5 }}
          >
            {isLoading ? <LoadingSpinner size="sm" /> : 'Sign In'}
          </Button>
  
          <Divider sx={{ my: 2 }}>
            <Typography variant="body2" color="text.secondary">
              OR
            </Typography>
          </Divider>
  
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Don't have an account?{' '}
              <Link
                to="/auth/register"
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                <Typography component="span" color="primary" sx={{ font: 'inherit' }}>
                  Sign up
                </Typography>
              </Link>
            </Typography>
          </Box>
        </Box>
      </motion.div>
    )
  }