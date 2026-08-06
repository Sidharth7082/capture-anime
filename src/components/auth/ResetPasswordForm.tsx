
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { AtSign } from "lucide-react";
import { resetPasswordSchema } from "./schemas";

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

interface ResetPasswordFormProps {
  setShowResetView: (show: boolean) => void;
}

export const ResetPasswordForm = ({ setShowResetView }: ResetPasswordFormProps) => {
  const [loading, setLoading] = useState(false);

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { email: "" },
  });

  const handlePasswordReset = async (values: ResetPasswordFormValues) => {
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
      redirectTo: `${window.location.origin}/auth`,
    });
    setLoading(false);
    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Password reset email sent",
        description: "Please check your email for a link to reset your password.",
      });
      setShowResetView(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handlePasswordReset)} className="space-y-6">
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
        <Button type="submit" className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold" disabled={loading}>
          {loading ? "Sending..." : "Send Reset Link"}
        </Button>
        <Button variant="link" onClick={() => setShowResetView(false)} className="w-full text-purple-600">
          Back to Sign In
        </Button>
      </form>
    </Form>
  );
};
