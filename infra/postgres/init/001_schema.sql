create extension if not exists "pgcrypto";

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text not null,
  display_name text not null,
  created_at timestamptz not null default now()
);

create table if not exists player_stats (
  user_id uuid primary key references users(id) on delete cascade,
  matches_played integer not null default 0,
  wins integer not null default 0,
  kills integer not null default 0,
  damage_dealt integer not null default 0,
  updated_at timestamptz not null default now()
);
