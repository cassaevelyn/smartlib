import React, { useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Stepper, Step } from '@/components/ui/stepper';
import { api } from '@/lib/api';
import { Loader2 } from 'lucide-react';

// Define the form schema with Zod
const registerSchema = z.object({
  // Account Information
  username: z.string().min(3, 'Username must be at least 3 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  password_confirm: z.string(),
  
  // Personal Details
  first_name: z.string().min(2, 'First name must be at least 2 characters'),
  last_name: z.string().min(2, 'Last name must be at least 2 characters'),
  phone_number: z.string().optional(),
  date_of_birth: z.string().optional(),
  gender: z.enum(['M', 'F', 'O']).optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  
  // ICAP Information
  crn: z.string().regex(/^ICAP-CA-\d{4}-\d{4}$/, 'CRN must be in format ICAP-CA-YYYY-NNNN'),
}).refine(data => data.password === data.password_confirm, {
  message: "Passwords don't match",
  path: ["password_confirm"],
});

type RegisterFormValues = z.infer<typeof registerSchema>;

const RegisterPage: React.FC = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const { register, handleSubmit, formState: { errors }, trigger, getValues } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    mode: 'onChange',
  });

  const steps = [
    { title: 'Account Information', fields: ['username', 'email', 'password', 'password_confirm'] },
    { title: 'Personal Details', fields: ['first_name', 'last_name', 'phone_number', 'date_of_birth', 'gender', 'address', 'city'] },
    { title: 'ICAP Information', fields: ['crn'] },
  ];

  const handleNext = async () => {
    const currentStepFields = steps[activeStep].fields;
    const isValid = await trigger(currentStepFields as any);
    
    if (isValid) {
      setActiveStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    setActiveStep(prev => prev - 1);
  };

  const onSubmit: SubmitHandler<RegisterFormValues> = async (data) => {
    setIsSubmitting(true);
    try {
      const response = await api.post('/auth/register/', data);
      toast({
        title: "Registration successful!",
        description: "Please check your email to verify your account.",
        variant: "success",
      });
      navigate('/auth/verify-email');
    } catch (error: any) {
      console.error('Registration error:', error);
      toast({
        title: "Registration failed",
        description: error.response?.data?.message || "An error occurred during registration. Please try again.",
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
          <CardTitle>Create an Account</CardTitle>
          <CardDescription>Join Smart Lib to access our services</CardDescription>
          <Stepper activeStep={activeStep} className="mt-4">
            {steps.map((step, index) => (
              <Step key={index} title={step.title} />
            ))}
          </Stepper>
        </CardHeader>
        
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            {/* Account Information */}
            <div style={{ display: activeStep === 0 ? 'block' : 'none' }}>
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input id="username" {...register('username')} />
                {errors.username && <p className="text-sm text-red-500">{errors.username.message}</p>}
              </div>
              
              <div className="space-y-2 mt-4">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" {...register('email')} />
                {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
              </div>
              
              <div className="space-y-2 mt-4">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" {...register('password')} />
                {errors.password && <p className="text-sm text-red-500">{errors.password.message}</p>}
              </div>
              
              <div className="space-y-2 mt-4">
                <Label htmlFor="password_confirm">Confirm Password</Label>
                <Input id="password_confirm" type="password" {...register('password_confirm')} />
                {errors.password_confirm && <p className="text-sm text-red-500">{errors.password_confirm.message}</p>}
              </div>
            </div>
            
            {/* Personal Details */}
            <div style={{ display: activeStep === 1 ? 'block' : 'none' }}>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name">First Name</Label>
                  <Input id="first_name" {...register('first_name')} />
                  {errors.first_name && <p className="text-sm text-red-500">{errors.first_name.message}</p>}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="last_name">Last Name</Label>
                  <Input id="last_name" {...register('last_name')} />
                  {errors.last_name && <p className="text-sm text-red-500">{errors.last_name.message}</p>}
                </div>
              </div>
              
              <div className="space-y-2 mt-4">
                <Label htmlFor="phone_number">Phone Number</Label>
                <Input id="phone_number" {...register('phone_number')} placeholder="+923001234567" />
                {errors.phone_number && <p className="text-sm text-red-500">{errors.phone_number.message}</p>}
              </div>
              
              <div className="space-y-2 mt-4">
                <Label htmlFor="date_of_birth">Date of Birth</Label>
                <Input id="date_of_birth" type="date" {...register('date_of_birth')} />
                {errors.date_of_birth && <p className="text-sm text-red-500">{errors.date_of_birth.message}</p>}
              </div>
              
              <div className="space-y-2 mt-4">
                <Label htmlFor="gender">Gender</Label>
                <Select onValueChange={(value) => register('gender').onChange({ target: { value } })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="M">Male</SelectItem>
                    <SelectItem value="F">Female</SelectItem>
                    <SelectItem value="O">Other</SelectItem>
                  </SelectContent>
                </Select>
                {errors.gender && <p className="text-sm text-red-500">{errors.gender.message}</p>}
              </div>
              
              <div className="space-y-2 mt-4">
                <Label htmlFor="address">Address</Label>
                <Input id="address" {...register('address')} />
                {errors.address && <p className="text-sm text-red-500">{errors.address.message}</p>}
              </div>
              
              <div className="space-y-2 mt-4">
                <Label htmlFor="city">City</Label>
                <Input id="city" {...register('city')} />
                {errors.city && <p className="text-sm text-red-500">{errors.city.message}</p>}
              </div>
            </div>
            
            {/* ICAP Information */}
            <div style={{ display: activeStep === 2 ? 'block' : 'none' }}>
              <div className="space-y-2">
                <Label htmlFor="crn">ICAP CA Registration Number</Label>
                <Input id="crn" {...register('crn')} placeholder="ICAP-CA-YYYY-NNNN" />
                {errors.crn && <p className="text-sm text-red-500">{errors.crn.message}</p>}
              </div>
              
              <div className="mt-4 p-4 bg-blue-50 rounded-md">
                <p className="text-sm text-blue-700">
                  By creating an account, you agree to our Terms of Service and Privacy Policy. 
                  After registration, you'll receive an email with a verification link to activate your account.
                </p>
              </div>
            </div>
          </CardContent>
          
          <CardFooter className="flex justify-between">
            {activeStep > 0 && (
              <Button type="button" variant="outline" onClick={handleBack}>
                Back
              </Button>
            )}
            
            {activeStep < steps.length - 1 ? (
              <Button type="button" onClick={handleNext} className="ml-auto">
                Next
              </Button>
            ) : (
              <Button type="submit" disabled={isSubmitting} className="ml-auto">
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  'Create Account'
                )}
              </Button>
            )}
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default RegisterPage;