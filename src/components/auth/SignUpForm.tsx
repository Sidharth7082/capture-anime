
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { AtSign, Lock, User } from "lucide-react";
import { signUpSchema } from "./schemas";

type SignUpFormValues = z.infer<typeof signUpSchema>;

export const SignUpForm = () => {
  const [loading, setLoading] = useState(false);

  const form = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { email: "", password: "", username: "" },
  });

  /**
   * Check whether a username is already taken. Uses the same lookup the
   * sign-in flow uses; "not found" (401/no email) means it's available.
   * The check is best-effort — the server-side unique constraint is the
   * source of truth, and the signup error below still surfaces if the
   * username gets taken in the meantime.
   */
  const isUsernameTaken = async (username: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.functions.invoke('get-email-from-username', {
        body: { username },
      });
      if (error) return false;
      return Boolean(data?.email);
    } catch {
      return false;
    }
  };

  const handleSignUp = async (values: SignUpFormValues) => {
    setLoading(true);

    if (await isUsernameTaken(values.username)) {
      toast({
        title: "Sign-up failed",
        description: `The username "${values.username}" is already taken. Please choose another.`,
        variant: "destructive",
      });
      form.setError("username", {
        type: "manual",
        message: "This username is already taken.",
      });
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        data: {
          username: values.username,
        },
        emailRedirectTo: `${window.location.origin}/`,
      },
    });

    if (error) {
      const isDuplicate = /already registered|duplicate|already taken/i.test(error.message);
      toast({
        title: "Sign-up failed",
        description: isDuplicate ? "An account with this email or username already exists." : error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Sign-up successful!",
        description: "Please check your email to verify your account.",
      });
    }
    setLoading(false);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSignUp)} className="space-y-6">
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="your_username" {...field} className="pl-10" />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <div className="relative">
                  <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="your@email.com" {...field} className="pl-10" />
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
        <Button type="submit" className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold" disabled={loading}>
          {loading ? "Processing..." : "Sign Up"}
        </Button>
      </form>
    </Form>
  );
};
