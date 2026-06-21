-- ==========================================
-- MITTISEVA SUPABASE DATABASE SCHEMA
-- Run this in your Supabase SQL Editor
-- ==========================================

-- 1. Create Profiles Table (extends auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  phone text unique not null,
  full_name text,
  village text,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- 2. Create Soil Tests Table
create table public.soil_tests (
  id uuid default gen_random_uuid() primary key,
  farmer_id uuid references public.profiles(id) on delete cascade not null,
  ph numeric not null check (ph >= 0 and ph <= 14),
  n integer not null check (n >= 0),
  p integer not null check (p >= 0),
  k integer not null check (k >= 0),
  moisture integer not null check (moisture >= 0 and moisture <= 100),
  oc numeric not null check (oc >= 0),
  score integer not null check (score >= 0 and score <= 100),
  test_date timestamp with time zone default timezone('utc'::text, now())
);

-- 3. Create Chat Messages Table
create table public.chat_messages (
  id uuid default gen_random_uuid() primary key,
  farmer_id uuid references public.profiles(id) on delete cascade not null,
  message text not null,
  sender text not null check (sender in ('user', 'ai')),
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- ==========================================
-- ROW LEVEL SECURITY (RLS)
-- ==========================================

alter table public.profiles enable row level security;
alter table public.soil_tests enable row level security;
alter table public.chat_messages enable row level security;

-- Profiles Policies
create policy "Allow users to read own profile" on public.profiles
  for select using (auth.uid() = id);

create policy "Allow users to update own profile" on public.profiles
  for update using (auth.uid() = id);

create policy "Allow users to insert own profile" on public.profiles
  for insert with check (auth.uid() = id);

-- Soil Tests Policies
create policy "Allow users to read own soil tests" on public.soil_tests
  for select using (auth.uid() = farmer_id);

create policy "Allow users to insert own soil tests" on public.soil_tests
  for insert with check (auth.uid() = farmer_id);

create policy "Allow users to update own soil tests" on public.soil_tests
  for update using (auth.uid() = farmer_id);

create policy "Allow users to delete own soil tests" on public.soil_tests
  for delete using (auth.uid() = farmer_id);

-- Chat Messages Policies
create policy "Allow users to read own chat history" on public.chat_messages
  for select using (auth.uid() = farmer_id);

create policy "Allow users to insert own chat history" on public.chat_messages
  for insert with check (auth.uid() = farmer_id);

-- ==========================================
-- TRIGGERS
-- ==========================================

-- Trigger function to automatically create a profile when a user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, phone, full_name, village)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'phone', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'village', '')
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger execution bind
create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
