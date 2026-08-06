
-- Create a table for public profiles
create table public.profiles (
  id uuid not null primary key references auth.users on delete cascade,
  username text unique,
  updated_at timestamp with time zone default now()
);

-- Add a constraint for username length
alter table public.profiles add constraint username_length check (char_length(username) >= 3);

-- Set up Row Level Security
alter table public.profiles enable row level security;

-- Allow public read access to profiles
create policy "Public profiles are viewable by everyone." on public.profiles for select using (true);

-- Allow users to update their own profile
create policy "Users can update their own profile." on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

-- Function to create a profile for a new user
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username)
  values (new.id, new.raw_user_meta_data->>'username');
  return new;
end;
$$;

-- Trigger to execute the function on new user creation
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
