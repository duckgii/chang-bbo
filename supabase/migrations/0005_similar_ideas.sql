-- 비슷한 아이디어 안내
-- · 등록 전에 같은 학교의 비슷한 아이디어(공개 영역만)를 찾아 보여준다. 막지는 않는다.
-- · "누가 언제 어떤 아이디어를 비슷한 것으로 안내받았는지"를 기록해 분쟁 판단 근거로 쓴다.

create extension if not exists pg_trgm with schema extensions;

create index ideas_title_problem_trgm on public.ideas
  using gin ((title || ' ' || problem) extensions.gin_trgm_ops);

-- security invoker: 호출한 사용자의 RLS가 그대로 적용되어, 볼 수 있는 아이디어(같은 학교·공개 중)만 후보가 된다.
-- 공개 영역(제목·문제 정의)만 돌려준다. 상세 영역은 절대 포함하지 않는다.
create or replace function public.find_similar_ideas(p_title text, p_problem text, p_limit int default 5)
returns table (id uuid, title text, problem text, is_mine boolean, score real)
language sql stable security invoker set search_path = public, extensions as $$
  select i.id, i.title, i.problem, i.owner_id = auth.uid(),
         greatest(similarity(i.title, p_title),
                  similarity(i.title || ' ' || i.problem, p_title || ' ' || p_problem)) as score
    from public.ideas i
   where i.status = 'open' or i.owner_id = auth.uid()
   order by score desc
   limit p_limit
$$;

-- 안내 기록 (추가만, 결과 연결용 컬럼만 수정 가능)
create table public.similar_idea_checks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) default auth.uid(),
  checked_at timestamptz not null default now(),
  submitted jsonb not null,          -- 확인 시점의 새 아이디어 공개 영역
  candidates jsonb not null,         -- 안내한 아이디어 [{idea_id, title, is_mine, score, reason}]
  decision text check (decision in ('registered', 'joined', 'revised')),
  idea_id uuid references public.ideas(id),  -- 결국 등록한 경우 그 아이디어
  decided_at timestamptz
);

alter table public.similar_idea_checks enable row level security;

create policy "checks own read" on public.similar_idea_checks for select using (user_id = auth.uid());
create policy "checks own create" on public.similar_idea_checks for insert with check (user_id = auth.uid());
create policy "checks own decide" on public.similar_idea_checks for update
  using (user_id = auth.uid() and decision is null)
  with check (user_id = auth.uid());

-- 안내 내용(submitted, candidates)은 바꿀 수 없고, 결정 결과만 한 번 기록할 수 있다.
revoke update, delete on public.similar_idea_checks from anon, authenticated;
grant update (decision, idea_id, decided_at) on public.similar_idea_checks to authenticated;
