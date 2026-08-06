
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { KeyRound, CheckCircle } from "lucide-react"
import { Session } from "@supabase/supabase-js"

const profileFormSchema = z.object({
  fullName: z.string().min(2, { message: "Name must be at least 2 characters." }).max(50, { message: "Name must not be longer than 50 characters." }),
})

type ProfileFormValues = z.infer<typeof profileFormSchema>

interface ProfileFormProps {
  session: Session;
  form: ReturnType<typeof useForm<ProfileFormValues>>;
  onSubmit: (data: ProfileFormValues) => void;
  isSaving: boolean;
  handlePasswordReset: () => void;
}

const ProfileForm = ({ session, form, onSubmit, isSaving, handlePasswordReset }: ProfileFormProps) => {
  const user = session.user;

  return (
    <Card className="bg-[#211F2D] border-none">
      <CardContent className="p-8">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white text-xs uppercase">Your Name</FormLabel>
                  <FormControl>
                    <Input id="fullName" className="bg-[#181520] border-gray-700 text-white" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormItem>
              <FormLabel className="text-white text-xs uppercase">Email Address</FormLabel>
              <div className="flex items-center gap-4">
                <Input className="bg-[#181520] border-gray-700 text-white" value={user.email} readOnly />
                {user.email_confirmed_at && (
                  <span className="flex items-center gap-2 text-sm text-pink-400 border border-pink-400 rounded-full px-3 py-1 whitespace-nowrap">
                    <CheckCircle className="w-4 h-4" />
                    Verified
                  </span>
                )}
              </div>
            </FormItem>

            <FormItem>
              <FormLabel className="text-white text-xs uppercase">Joined</FormLabel>
              <Input className="bg-[#181520] border-gray-700 text-white" value={new Date(user.created_at).toLocaleDateString()} readOnly />
            </FormItem>

            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4">
              <Button type="button" variant="link" className="text-white hover:text-gray-300 p-0" onClick={handlePasswordReset}>
                <KeyRound className="mr-2 h-4 w-4" />
                Change password
              </Button>
              <Button type="submit" disabled={isSaving} className="bg-pink-500 hover:bg-pink-600 text-white w-full sm:w-auto">
                {isSaving ? "Saving..." : "Save"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}

export default ProfileForm;
