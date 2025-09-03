
"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, Loader2 } from 'lucide-react';
import Image from 'next/image';

export default function LoginPage() {
  const [mobileNumber, setMobileNumber] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      router.push('/');
    }
  }, [user, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      // The password is now hardcoded in the auth context
      await login(mobileNumber);
      router.push('/');
    } catch (err: any) {
      let errorMessage = 'An unexpected error occurred.';
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        errorMessage = 'Invalid PIN. Please try again.';
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };
  
  if (user) {
    return null; // Don't render the login form if the user is already logged in and redirecting
  }

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background p-4 sm:p-6">
       <div 
        className="absolute inset-0 -z-10 h-full w-full bg-background 
                   bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px]"
      >
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-primary/20 opacity-20 blur-[100px]"></div>
      </div>
      
       <div className="flex flex-col items-center justify-center mb-8 animate-in fade-in slide-in-from-bottom-8 duration-1000 ease-in-out">
        <Image src="/trash-basket.png" alt="WeightWise Logo" width={64} height={64} className="animate-pulse" data-ai-hint="logo basket" />
        <h1 className="text-5xl font-bold font-heading text-foreground mt-4">
          WeightWise
        </h1>
      </div>

      <Card className="w-full max-w-sm bg-card/80 backdrop-blur-sm border-primary/20 animate-in fade-in slide-in-from-bottom-4 duration-1000 ease-in-out delay-200">
        <CardHeader>
          <CardTitle className="text-2xl font-heading text-center text-foreground">Welcome Back</CardTitle>
          <CardDescription className="text-center text-muted-foreground">
            Enter your mobile number to access your dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
             {error && (
              <Alert variant="destructive" className="bg-destructive/10">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Login Failed</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="mobile">Mobile Number</Label>
              <Input
                id="mobile"
                type="tel"
                maxLength={10}
                placeholder="Enter your 10-digit PIN"
                value={mobileNumber}
                onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, ''))}
                required
                disabled={loading}
                className="bg-input/50"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Login'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
