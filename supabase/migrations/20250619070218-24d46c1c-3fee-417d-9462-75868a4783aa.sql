
-- Create a table to track guest users with automatic cleanup
CREATE TABLE public.guest_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days')
);

-- Enable RLS on guest_users table
ALTER TABLE public.guest_users ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to view their own guest record
CREATE POLICY "Users can view their own guest record" 
  ON public.guest_users 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Policy to allow inserting guest records
CREATE POLICY "Allow inserting guest records" 
  ON public.guest_users 
  FOR INSERT 
  WITH CHECK (true);

-- Function to clean up expired guest users
CREATE OR REPLACE FUNCTION public.cleanup_expired_guests()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete expired guest user records
  DELETE FROM public.guest_users 
  WHERE expires_at < NOW();
  
  -- Note: We can't directly delete from auth.users, but we can mark them for cleanup
  -- The actual user deletion will be handled by the edge function
END;
$$;

-- Create a function to handle guest user creation
CREATE OR REPLACE FUNCTION public.create_guest_user(user_email TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  guest_id UUID;
BEGIN
  -- Insert guest user record
  INSERT INTO public.guest_users (user_id)
  SELECT id FROM auth.users WHERE email = user_email
  RETURNING id INTO guest_id;
  
  RETURN guest_id;
END;
$$;
