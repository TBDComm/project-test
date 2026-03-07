-- =============================================
-- MOMENTO Supabase 스키마
-- Supabase 대시보드 > SQL Editor에서 실행하세요
-- =============================================

-- users 테이블 (auth.users 확장)
create table public.users (
  id              uuid references auth.users(id) on delete cascade primary key,
  plan            text        not null default 'free',
  monthly_usage   integer     not null default 0,
  usage_month     text        not null default to_char(now(), 'YYYY-MM'),
  subscription_end timestamptz,
  created_at      timestamptz not null default now()
);

-- Row Level Security 활성화
alter table public.users enable row level security;

-- 본인 데이터만 읽기/쓰기 가능
create policy "users: select own" on public.users
  for select using (auth.uid() = id);

create policy "users: insert own" on public.users
  for insert with check (auth.uid() = id);

create policy "users: update own" on public.users
  for update using (auth.uid() = id);

-- 신규 회원가입 시 users 레코드 자동 생성 트리거
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id)
  values (new.id)
  on conflict do nothing;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
