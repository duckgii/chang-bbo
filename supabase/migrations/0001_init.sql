-- 아이디어 공유·팀 빌딩 플랫폼 초기 스키마
-- 원칙: 권한은 화면이 아니라 DB(RLS + security definer 함수)에서 강제한다.

create extension if not exists pgcrypto with schema extensions;

-- ───────────────────────── 학교 / 프로필 ─────────────────────────
create table public.schools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email_domain text not null unique          -- 예: 'university.ac.kr'
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  school_id uuid not null references public.schools(id),
  display_name text not null default '',
  stack text[] not null default '{}',
  github_url text,
  created_at timestamptz not null default now()
);

-- 가입 시 학교 이메일 도메인 확인. 등록되지 않은 도메인이면 가입 자체를 막는다.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_school uuid;
begin
  select id into v_school from public.schools
   where email_domain = lower(split_part(new.email, '@', 2));
  if v_school is null then
    raise exception '학교 이메일만 가입할 수 있습니다.';
  end if;
  insert into public.profiles (id, school_id) values (new.id, v_school);
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.my_school_id()
returns uuid language sql stable security definer set search_path = public as $$
  select school_id from public.profiles where id = auth.uid()
$$;

-- ───────────────────────── 아이디어 ─────────────────────────
-- 공개 영역
create table public.ideas (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id),
  scope text not null,                       -- 'school:<uuid>' | 'multi_school' | 'public'
  title text not null,
  problem text not null,
  target_users text not null,
  category text not null,
  needed_roles jsonb not null default '[]',  -- [{role, skills[]}]
  provider_offers text[] not null default '{}',
  status text not null default 'open' check (status in ('open', 'closed', 'hidden')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 상세 영역: 목록 조회에서 절대 같이 나오지 않도록 테이블을 분리한다.
create table public.idea_details (
  idea_id uuid primary key references public.ideas(id) on delete cascade,
  solution text not null,
  business_model text,
  differentiation text,
  updated_at timestamptz not null default now()
);

-- 버전별 해시 체인 (선행 증거). 추가만 가능.
create table public.idea_versions (
  id bigserial primary key,
  idea_id uuid not null references public.ideas(id) on delete cascade,
  version int not null,
  content jsonb not null,                    -- 공개 + 상세 전체 스냅샷
  ai_suggested_fields text[] not null default '{}',
  prev_hash text,
  hash text not null,
  created_at timestamptz not null default now(),
  unique (idea_id, version)
);

-- 하루 한 번 최신 해시들을 묶어 외부(GitHub 커밋, OpenTimestamps)에 공개한 기록
create table public.daily_anchors (
  anchor_date date primary key,
  root_hash text not null,
  proof_url text,
  created_at timestamptz not null default now()
);

-- ───────────────────────── 열람 신청 / 비밀유지 / 열람 기록 ─────────────────────────
create table public.nda_versions (
  id serial primary key,
  body text not null,
  created_at timestamptz not null default now()
);

create table public.access_requests (
  id uuid primary key default gen_random_uuid(),
  idea_id uuid not null references public.ideas(id) on delete cascade,
  requester_id uuid not null references public.profiles(id),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'expired')),
  nda_version_id int not null references public.nda_versions(id),
  nda_agreed_at timestamptz not null,
  decided_at timestamptz,
  expires_at timestamptz not null default now() + interval '7 days',
  created_at timestamptz not null default now(),
  unique (idea_id, requester_id)
);

create table public.view_logs (
  id bigserial primary key,
  idea_id uuid not null references public.ideas(id) on delete cascade,
  viewer_id uuid not null references public.profiles(id),
  viewed_at timestamptz not null default now()
);

-- ───────────────────────── 지원 / 팀 / 채팅 / 체크인 ─────────────────────────
create table public.applications (
  id uuid primary key default gen_random_uuid(),
  idea_id uuid not null references public.ideas(id) on delete cascade,
  applicant_id uuid not null references public.profiles(id),
  role text not null,
  message text not null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  created_at timestamptz not null default now(),
  unique (idea_id, applicant_id)
);

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  idea_id uuid not null unique references public.ideas(id),
  created_at timestamptz not null default now()
);

create table public.team_members (
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references public.profiles(id),
  role text not null,
  joined_at timestamptz not null default now(),
  primary key (team_id, user_id)
);

create table public.messages (
  id bigserial primary key,
  team_id uuid not null references public.teams(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) default auth.uid(),
  body text not null check (length(body) between 1 and 4000),
  created_at timestamptz not null default now()
);

-- 핵심 지표(결성 4주 후 진행률) 측정용
create table public.checkins (
  team_id uuid not null references public.teams(id) on delete cascade,
  week date not null,                        -- 해당 주 월요일
  status text not null check (status in ('progress', 'blocked', 'stopped')),
  note text,
  created_by uuid not null references public.profiles(id) default auth.uid(),
  created_at timestamptz not null default now(),
  primary key (team_id, week)
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) default auth.uid(),
  target_type text not null check (target_type in ('idea', 'user', 'message')),
  target_id text not null,
  reason text not null,
  status text not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  created_at timestamptz not null default now()
);

-- ───────────────────────── AI 상담 ─────────────────────────
create table public.ai_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) default auth.uid(),
  idea_id uuid references public.ideas(id),
  status text not null default 'active' check (status in ('active', 'drafted', 'closed')),
  created_at timestamptz not null default now()
);

create table public.ai_messages (
  id bigserial primary key,
  session_id uuid not null references public.ai_sessions(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  prev_hash text,
  hash text,
  created_at timestamptz not null default now()
);

-- AI 상담 기록도 해시 체인에 포함 (세션 단위)
create or replace function public.chain_ai_message()
returns trigger language plpgsql as $$
begin
  select hash into new.prev_hash from public.ai_messages
   where session_id = new.session_id order by id desc limit 1;
  new.hash := encode(extensions.digest(
    coalesce(new.prev_hash, '') || new.role || new.content || new.created_at::text, 'sha256'), 'hex');
  return new;
end $$;

create trigger ai_messages_chain before insert on public.ai_messages
  for each row execute function public.chain_ai_message();

-- ───────────────────────── 함수 (권한 검사 + 기록을 한 곳에서) ─────────────────────────

-- 아이디어 등록/수정: 공개·상세·버전 해시를 한 트랜잭션으로 기록한다.
create or replace function public.submit_idea(p_idea_id uuid, p jsonb, p_ai_fields text[] default '{}')
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_id uuid := p_idea_id;
  v_prev text;
  v_ver int;
begin
  if auth.uid() is null then raise exception 'unauthenticated'; end if;

  if v_id is null then
    insert into ideas (owner_id, scope, title, problem, target_users, category, needed_roles, provider_offers)
    values (auth.uid(), 'school:' || my_school_id(),
            p->'public'->>'title', p->'public'->>'problem', p->'public'->>'target_users', p->'public'->>'category',
            coalesce(p->'needed_roles', '[]'),
            array(select jsonb_array_elements_text(coalesce(p->'provider_offers', '[]'))))
    returning id into v_id;
    insert into idea_details (idea_id, solution, business_model, differentiation)
    values (v_id, p->'detail'->>'solution', p->'detail'->>'business_model', p->'detail'->>'differentiation');
  else
    update ideas set title = p->'public'->>'title', problem = p->'public'->>'problem',
      target_users = p->'public'->>'target_users', category = p->'public'->>'category',
      needed_roles = coalesce(p->'needed_roles', '[]'),
      provider_offers = array(select jsonb_array_elements_text(coalesce(p->'provider_offers', '[]'))),
      updated_at = now()
    where id = v_id and owner_id = auth.uid();
    if not found then raise exception 'forbidden'; end if;
    update idea_details set solution = p->'detail'->>'solution', business_model = p->'detail'->>'business_model',
      differentiation = p->'detail'->>'differentiation', updated_at = now()
    where idea_id = v_id;
  end if;

  select hash, version into v_prev, v_ver from idea_versions
   where idea_id = v_id order by version desc limit 1;

  insert into idea_versions (idea_id, version, content, ai_suggested_fields, prev_hash, hash)
  values (v_id, coalesce(v_ver, 0) + 1, p, p_ai_fields, v_prev,
          encode(extensions.digest(coalesce(v_prev, '') || p::text || now()::text, 'sha256'), 'hex'));
  return v_id;
end $$;

-- 상세 열람: 권한 확인 + 열람 기록을 반드시 함께 수행한다. 상세 영역을 읽는 유일한 경로.
create or replace function public.get_idea_detail(p_idea_id uuid)
returns setof public.idea_details language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from ideas where id = p_idea_id and owner_id = auth.uid())
     and not exists (select 1 from access_requests
                      where idea_id = p_idea_id and requester_id = auth.uid() and status = 'approved')
     and not exists (select 1 from teams t join team_members m on m.team_id = t.id
                      where t.idea_id = p_idea_id and m.user_id = auth.uid()) then
    raise exception 'forbidden';
  end if;
  insert into view_logs (idea_id, viewer_id) values (p_idea_id, auth.uid());
  return query select * from idea_details where idea_id = p_idea_id;
end $$;

-- 열람 신청 승인/거절 (작성자만, 만료 전만)
create or replace function public.decide_access(p_request_id uuid, p_approve boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  update access_requests r set status = case when p_approve then 'approved' else 'rejected' end, decided_at = now()
   where r.id = p_request_id and r.status = 'pending' and r.expires_at > now()
     and exists (select 1 from ideas i where i.id = r.idea_id and i.owner_id = auth.uid());
  if not found then raise exception 'forbidden or expired'; end if;
end $$;

-- 지원 수락: 팀이 없으면 만들고 작성자와 지원자를 팀원으로 넣는다.
create or replace function public.accept_application(p_application_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  a applications%rowtype;
  v_team uuid;
begin
  select * into a from applications where id = p_application_id and status = 'pending';
  if not found or not exists (select 1 from ideas where id = a.idea_id and owner_id = auth.uid()) then
    raise exception 'forbidden';
  end if;
  insert into teams (idea_id) values (a.idea_id) on conflict (idea_id) do nothing;
  select id into v_team from teams where idea_id = a.idea_id;
  insert into team_members (team_id, user_id, role) values (v_team, auth.uid(), 'owner') on conflict do nothing;
  insert into team_members (team_id, user_id, role) values (v_team, a.applicant_id, a.role) on conflict do nothing;
  update applications set status = 'accepted' where id = a.id;
  return v_team;
end $$;

create or replace function public.is_team_member(p_team uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from team_members where team_id = p_team and user_id = auth.uid())
$$;

-- ───────────────────────── RLS ─────────────────────────
alter table public.schools enable row level security;
alter table public.profiles enable row level security;
alter table public.ideas enable row level security;
alter table public.idea_details enable row level security;
alter table public.idea_versions enable row level security;
alter table public.daily_anchors enable row level security;
alter table public.nda_versions enable row level security;
alter table public.access_requests enable row level security;
alter table public.view_logs enable row level security;
alter table public.applications enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.messages enable row level security;
alter table public.checkins enable row level security;
alter table public.reports enable row level security;
alter table public.ai_sessions enable row level security;
alter table public.ai_messages enable row level security;

create policy "schools readable" on public.schools for select using (true);
create policy "nda readable" on public.nda_versions for select using (true);
create policy "anchors readable" on public.daily_anchors for select using (true);

create policy "profiles same school" on public.profiles for select using (school_id = public.my_school_id());
create policy "profiles self update" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

-- 공개 영역: 같은 학교 scope 또는 public
create policy "ideas visible by scope" on public.ideas for select using (
  owner_id = auth.uid()
  or (status = 'open' and (scope = 'public' or scope = 'school:' || public.my_school_id()))
);
-- insert/update는 submit_idea 함수로만

-- 상세 영역: 직접 select는 작성자만. 그 외에는 get_idea_detail()로만 (열람 기록 강제)
create policy "details owner only" on public.idea_details for select using (
  exists (select 1 from public.ideas i where i.id = idea_id and i.owner_id = auth.uid())
);

create policy "versions owner only" on public.idea_versions for select using (
  exists (select 1 from public.ideas i where i.id = idea_id and i.owner_id = auth.uid())
);

create policy "requests visible" on public.access_requests for select using (
  requester_id = auth.uid()
  or exists (select 1 from public.ideas i where i.id = idea_id and i.owner_id = auth.uid())
);
create policy "requests create with nda" on public.access_requests for insert with check (
  requester_id = auth.uid() and status = 'pending'
  and exists (select 1 from public.ideas i where i.id = idea_id and i.owner_id <> auth.uid())
);

-- 열람 기록: 작성자만 조회, 쓰기는 get_idea_detail()만
create policy "view logs owner" on public.view_logs for select using (
  exists (select 1 from public.ideas i where i.id = idea_id and i.owner_id = auth.uid())
);

create policy "applications visible" on public.applications for select using (
  applicant_id = auth.uid()
  or exists (select 1 from public.ideas i where i.id = idea_id and i.owner_id = auth.uid())
);
create policy "applications create" on public.applications for insert with check (
  applicant_id = auth.uid() and status = 'pending'
);
create policy "applications reject by owner" on public.applications for update using (
  exists (select 1 from public.ideas i where i.id = idea_id and i.owner_id = auth.uid())
) with check (status = 'rejected');

create policy "teams members" on public.teams for select using (public.is_team_member(id));
create policy "team_members members" on public.team_members for select using (public.is_team_member(team_id));

create policy "messages read" on public.messages for select using (public.is_team_member(team_id));
create policy "messages write" on public.messages for insert with check (
  public.is_team_member(team_id) and sender_id = auth.uid()
);

create policy "checkins read" on public.checkins for select using (public.is_team_member(team_id));
create policy "checkins write" on public.checkins for insert with check (
  public.is_team_member(team_id) and created_by = auth.uid()
);

create policy "reports create" on public.reports for insert with check (reporter_id = auth.uid());
create policy "reports own" on public.reports for select using (reporter_id = auth.uid());

create policy "ai sessions own" on public.ai_sessions for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "ai messages own" on public.ai_messages for all using (
  exists (select 1 from public.ai_sessions s where s.id = session_id and s.user_id = auth.uid())
) with check (
  exists (select 1 from public.ai_sessions s where s.id = session_id and s.user_id = auth.uid())
);

-- 증거성 테이블은 수정·삭제 불가 (추가만)
revoke update, delete on public.idea_versions, public.view_logs, public.ai_messages, public.messages
  from anon, authenticated;

-- 채팅 실시간 구독
alter publication supabase_realtime add table public.messages;

-- 초기 데이터 (도메인은 실제 학교 것으로 교체)
insert into public.schools (name, email_domain) values ('우리 학교', 'example.ac.kr');
insert into public.nda_versions (body) values (
  '본인은 이 아이디어의 상세 영역(해결 방식, 수익 모델, 차별점)에 담긴 구체적 내용을 작성자의 동의 없이 '
  || '제3자에게 공개하거나 독자적으로 사업화하지 않습니다. 공개 영역의 일반적인 문제 정의와 '
  || '본인이 열람 전부터 구상하던 내용은 이 동의의 대상이 아닙니다. (초안 · 법률 검토 전)'
);
