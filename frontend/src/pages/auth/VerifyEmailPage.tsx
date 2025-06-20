import React, { useState, useEffect } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { api } from '@/lib/api';

// Define the form schema with Zod
const verifySchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  otp: z.string().length(6, 'OTP must be 6 digits'),
});

type VerifyFormValues = z.infer<typeof verifySchema>;

const VerifyEmailPage: React.FC = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<'pending' | 'success' | 'failed' | 'processing'>('pending');
  const [statusMessage, setStatusMessage] = useState('');
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const token = params.token;
  
  const { register, handleSubmit, setValue, formState: { errors } } = useForm<VerifyFormValues>({
    resolver: zodResolver(verifySchema),
  });

  // Set email from location state if available
  useEffect(() => {
    const email = location.state?.email;
    if (email) {
      setValue('email', email);
    }
    
    // Check URL parameters for success/failure status
    const searchParams = new URLSearchParams(location.search);
    const reason = searchParams.get('reason');
    
    if (location.pathname.includes('/success')) {
      setVerificationStatus('success');
      setStatusMessage('Your email has been successfully verified! You can now log in to your account.');
    } else if (location.pathname.includes('/failed')) {
      setVerificationStatus('failed');
      setStatusMessage(reason === 'expired' 
        ? 'Your verification link has expired. Please request a new one below.'
        : 'Invalid verification link. Please try again or request a new verification code.');
    }
  }, [location, setValue]);

  // Handle direct verification via token in URL
  useEffect(() => {
    if (token && verificationStatus === 'pending') {
      setVerificationStatus('processing');
      // The backend handles the verification and redirects to success/failed
    }
  }, [token, verificationStatus]);

  const onSubmit: SubmitHandler<VerifyFormValues> = async (data) => {
    setIsSubmitting(true);
    try {
      const response = await api.post('/auth/verify-otp/', data);
      setVerificationStatus('success');
      setStatusMessage('Your email has been successfully verified! You can now log in to your account.');
      toast({
        title: "Email verified!",
        description: "Your account has been activated successfully.",
        variant: "success",
      });
      
      // Redirect to login after a short delay
      setTimeout(() => {
        navigate('/auth/login');
      }, 3000);
    } catch (error: any) {
      console.error('Verification error:', error);
      toast({
        title: "Verification failed",
        description: error.response?.data?.message || "Invalid verification code. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendCode = async () => {
    const email = location.state?.email || '';
    if (!email) {
      toast({
        title: "Email required",
        description: "Please enter your email address to resend the verification code.",
        variant: "warning",
      });
      return;
    }
    
    setIsSubmitting(true);
    try {
      await api.post('/auth/send-otp/', { email });
      toast({
        title: "Verification email sent",
        description: "Please check your inbox for the verification link and code.",
        variant: "success",
      });
    } catch (error: any) {
      console.error('Resend verification error:', error);
      toast({
        title: "Failed to resend verification",
        description: error.response?.data?.message || "An error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Email Verification</CardTitle>
          <CardDescription>
            {verificationStatus === 'pending' && 'Verify your email address to activate your account'}
            {verificationStatus === 'processing' && 'Processing your verification...'}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {verificationStatus === 'processing' && (
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
              <p className="text-center">Verifying your email address...</p>
            </div>
          )}
          
          {verificationStatus === 'success' && (
            <Alert variant="success" className="mb-4">
              <CheckCircle className="h-4 w-4" />
              <AlertTitle>Success!</AlertTitle>
              <AlertDescription>{statusMessage}</AlertDescription>
            </Alert>
          )}
          
          {verificationStatus === 'failed' && (
            <Alert variant="destructive" className="mb-4">
              <XCircle className="h-4 w-4" />
              <AlertTitle>Verification Failed</AlertTitle>
              <AlertDescription>{statusMessage}</AlertDescription>
            </Alert>
          )}
          
          {(verificationStatus === 'pending' || verificationStatus === 'failed') && (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" {...register('email')} />
                {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="otp">Verification Code</Label>
                <Input id="otp" {...register('otp')} placeholder="Enter 6-digit code" />
                {errors.otp && <p className="text-sm text-red-500">{errors.otp.message}</p>}
              </div>
              
              <Alert variant="info">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Verification Instructions</AlertTitle>
                <AlertDescription>
                  Please enter the 6-digit verification code sent to your email address. 
                  If you haven't received the code, check your spam folder or click the resend button below.
                </AlertDescription>
              </Alert>
              
              <div className="flex justify-between">
                <Button type="button" variant="outline" onClick={handleResendCode} disabled={isSubmitting}>
                  {isSubmitting ? 'Sending...' : 'Resend Code'}
                </Button>
                
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    'Verify Email'
                  )}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
        
        <CardFooter className="flex justify-center">
          {(verificationStatus === 'success' || verificationStatus === 'failed') && (
            <Button variant="link" onClick={() => navigate('/auth/login')}>
              Return to Login
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
};

export default VerifyEmailPage;