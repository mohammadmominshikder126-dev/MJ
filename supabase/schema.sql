-- MJ LAB Portfolio & Admin Control Center — Supabase PostgreSQL Schema
-- Run this SQL once in your Supabase Dashboard -> SQL Editor

create table if not exists public.site_config (
  id text primary key,
  brand_name text not null,
  brand_subtitle text not null,
  logo_url text not null default '',
  hire_button_text text not null,
  availability_text text not null,
  banner_greeting text not null,
  banner_highlight text not null,
  banner_subtitle text not null,
  banner_description text not null,
  banner_image_url text not null,
  portfolio_cta_text text not null,
  contact_cta_text text not null,
  skills_heading text not null,
  portfolio_heading text not null,
  portfolio_subheading text not null,
  about_title text not null,
  about_description text not null,
  about_image_url text not null,
  quick_card1_title text not null,
  quick_card1_subtitle text not null,
  quick_card2_title text not null,
  quick_card2_subtitle text not null,
  quick_card3_title text not null,
  quick_card3_subtitle text not null,
  whatsapp_number text not null,
  whatsapp_greeting text not null,
  telegram_group_url text not null default '',
  facebook_url text not null default '',
  youtube_url text not null default '',
  github_url text not null default '',
  linkedin_url text not null default '',
  footer_rights_text text not null,
  footer_credit_text text not null,
  privacy_policy_text text not null,
  terms_text text not null,
  updated_by text not null default '',
  updated_at timestamptz default now()
);

create table if not exists public.skills (
  id text primary key,
  name text not null,
  role text not null,
  icon_key text not null,
  "order" integer not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.projects (
  id text primary key,
  title text not null,
  category text not null,
  category_label text not null,
  description text not null,
  long_description text not null,
  year text not null,
  tech_stack jsonb not null default '[]'::jsonb,
  highlights jsonb not null default '[]'::jsonb,
  preview_type text not null default 'custom',
  live_url text not null default '',
  thumbnail_url text not null default '',
  status text not null default 'Published',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.analytics_daily (
  date_key text primary key,
  visitors integer not null default 0,
  contact_clicks integer not null default 0,
  updated_at timestamptz default now()
);

create table if not exists public.analytics_summary (
  id text primary key,
  total_visitors integer not null default 0,
  total_contact_clicks integer not null default 0,
  updated_at timestamptz default now()
);

create table if not exists public.admin_credentials (
  id text primary key,
  password_hash text not null,
  created_at timestamptz default now()
);

-- Enable Row Level Security (server accesses via service role key)
alter table public.site_config enable row level security;
alter table public.skills enable row level security;
alter table public.projects enable row level security;
alter table public.analytics_daily enable row level security;
alter table public.analytics_summary enable row level security;
alter table public.admin_credentials enable row level security;

-- Public read policies for portfolio content
drop policy if exists "Public read site_config" on public.site_config;
create policy "Public read site_config" on public.site_config for select using (true);

drop policy if exists "Public read skills" on public.skills;
create policy "Public read skills" on public.skills for select using (true);

drop policy if exists "Public read projects" on public.projects;
create policy "Public read projects" on public.projects for select using (true);
