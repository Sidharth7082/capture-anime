import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SignInForm } from "@/components/auth/SignInForm";
import { SignUpForm } from "@/components/auth/SignUpForm";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";
import { UpdatePasswordForm } from "@/components/auth/UpdatePasswordForm";
import { X } from "lucide-react";

const AuthPage = () => {
  const [loading, setLoading] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);
  const [showResetView, setShowResetView] = useState(false);
  const [showUpdatePassword, setShowUpdatePassword] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setShowUpdatePassword(true);
        // Reset the URL to avoid showing the recovery token
        navigate('/auth', { replace: true });
      } else if (event === 'SIGNED_IN' && session) {
        navigate('/');
      } else if (
        event === 'INITIAL_SESSION' &&
        session &&
        // Never bounce an existing session away from /auth while a password
        // recovery link may still be pending (known Supabase race where
        // INITIAL_SESSION fires before PASSWORD_RECOVERY).
        !window.location.hash.includes('type=recovery')
      ) {
        navigate('/');
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [navigate]);

  const handleGuestLogin = async () => {
    setGuestLoading(true);
    
    try {
      console.log('Creating guest user...');
      
      // Call our edge function to create a guest user
      const { data, error } = await supabase.functions.invoke('guest-auth', {
        body: { action: 'create_guest' }
      });

      if (error) {
        console.error('Guest creation error:', error);
        throw error;
      }

      if (!data?.credentials?.email || !data?.credentials?.password) {
        throw new Error('Guest sign-in response was invalid. Please try again.');
      }

      console.log('Guest user created, signing in...');

      // Sign in with the temporary credentials
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: data.credentials.email,
        password: data.credentials.password,
      });

      if (signInError) {
        console.error('Guest sign in error:', signInError);
        throw signInError;
      }

      toast({ 
        title: "Welcome, Guest!", 
        description: "You're now signed in as a guest user. Your session will expire in 7 days."
      });
      
      navigate("/");
      
    } catch (error) {
      console.error('Guest login failed:', error);
      toast({
        title: "Guest login failed",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
    }
    
    setGuestLoading(false);
  };

  const handleClose = () => {
    navigate("/");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#e0e0ff]/60 via-[#f8f4fa]/60 to-[#faf6fb]/90 p-4">
      {showUpdatePassword ? <UpdatePasswordForm setShowUpdatePassword={setShowUpdatePassword} /> : (
        <Card className="w-full max-w-md shadow-2xl border-purple-100 relative">
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-2 h-8 w-8 rounded-full hover:bg-purple-100 z-10"
            onClick={handleClose}
          >
            <X className="h-4 w-4" />
          </Button>
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold text-purple-700 tracking-tight">
              captureordie
            </CardTitle>
          </CardHeader>
          <CardContent>
            {showResetView ? (
               <ResetPasswordForm setShowResetView={setShowResetView} />
            ) : (
              <Tabs defaultValue="signin" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="signin">Sign In</TabsTrigger>
                  <TabsTrigger value="signup">Sign Up</TabsTrigger>
                </TabsList>
                <TabsContent value="signin" className="pt-6">
                  <SignInForm setShowResetView={setShowResetView} />
                </TabsContent>
                <TabsContent value="signup" className="pt-6">
                  <SignUpForm />
                </TabsContent>
              </Tabs>
            )}
            
            {!showResetView && (
              <>
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">
                      Or
                    </span>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  onClick={handleGuestLogin} 
                  disabled={guestLoading || loading} 
                  className="w-full"
                >
                  {guestLoading ? "Creating Guest Account..." : "Continue as Guest"}
                </Button>
                {!showResetView && (
                  <p className="text-xs text-center text-muted-foreground mt-2">
                    Guest sessions expire after 7 days
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AuthPage;
