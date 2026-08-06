
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { AtSign, Lock } from "lucide-react";
import { signInSchema } from "./schemas";

type SignInFormValues = z.infer<typeof signInSchema>;

interface SignInFormProps {
  setShowResetView: (show: boolean) => void;
}

export const SignInForm = ({ setShowResetView }: SignInFormProps) => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const form = useForm<SignInFormValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  });

  const handleSignIn = async (values: SignInFormValues) => {
    setLoading(true);
    const isEmail = values.email.includes('@');
    let emailToSignIn = values.email;

    if (!isEmail) {
      try {
        const { data, error: invokeError } = await supabase.functions.invoke('get-email-from-username', {
          body: { username: values.email },
        });

        if (invokeError) {
            console.error('Edge function invocation error:', invokeError);
            throw new Error("Invalid credentials");
        }
        
        if (!data || !data.email) {
            throw new Error("Invalid credentials");
        }
        
        emailToSignIn = data.email;
      } catch (e) {
          toast({
            title: "Sign-in failed",
            description: "Invalid username or password.",
            variant: "destructive",
          });
          setLoading(false);
          return;
      }
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: emailToSignIn,
      password: values.password,
    });

    if (error) {
      toast({
        title: "Sign-in failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Signed in successfully!" });
      navigate("/");
    }
    setLoading(false);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSignIn)} className="space-y-6">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email or Username</FormLabel>
              <FormControl>
                <div className="relative">
                  <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="email or username" {...field} className="pl-10" />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input type="password" placeholder="••••••••" {...field} className="pl-10" />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end -mt-2">
            <Button
              type="button"
              variant="link"
              className="px-0 h-auto text-sm font-normal text-purple-600 hover:text-purple-800"
              onClick={() => setShowResetView(true)}
            >
              Forgot your password?
            </Button>
        </div>
        <Button type="submit" className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold" disabled={loading}>
          {loading ? "Processing..." : "Sign In"}
        </Button>
      </form>
    </Form>
  );
};
