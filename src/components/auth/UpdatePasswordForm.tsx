
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock } from "lucide-react";
import { updatePasswordSchema } from "./schemas";

type UpdatePasswordFormValues = z.infer<typeof updatePasswordSchema>;

interface UpdatePasswordFormProps {
  setShowUpdatePassword: (show: boolean) => void;
}

export const UpdatePasswordForm = ({ setShowUpdatePassword }: UpdatePasswordFormProps) => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const form = useForm<UpdatePasswordFormValues>({
    resolver: zodResolver(updatePasswordSchema),
    defaultValues: { password: "" },
  });

  const handleUpdatePassword = async (values: UpdatePasswordFormValues) => {
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: values.password });
    setLoading(false);
    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Password updated successfully",
        description: "You can now sign in with your new password.",
      });
      setShowUpdatePassword(false);
      await supabase.auth.signOut();
      navigate('/auth');
    }
  };
  
  return (
    <Card className="w-full max-w-md shadow-2xl border-purple-100">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-center text-purple-700">Update Password</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleUpdatePassword)} className="space-y-6">
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New Password</FormLabel>
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
              {loading ? "Updating..." : "Update Password"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};
