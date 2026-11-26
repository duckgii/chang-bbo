-- 좋아요·댓글, 작성자 본인 열람은 열람 기록에서 제외

-- ───────────── 좋아요 ─────────────
create table public.idea_likes (
  idea_id uuid not null references public.ideas(id) on delete cascade,
  user_id uuid not null references public.profiles(id) default auth.uid(),
  created_at timestamptz not null default now(),
  primary key (idea_id, user_id)
);
create index idea_likes_user_idx on public.idea_likes (user_id);

alter table public.idea_likes enable row level security;

-- 아이디어를 볼 수 있는 사람만 (ideas RLS가 서브쿼리에도 적용됨)
create policy "likes visible" on public.idea_likes for select using (
  exists (select 1 from public.ideas i where i.id = idea_id)
);
-- 남의 아이디어에만, 본인 이름으로만
create policy "likes create" on public.idea_likes for insert with check (
  user_id = auth.uid()
  and exists (select 1 from public.ideas i where i.id = idea_id and i.owner_id <> auth.uid())
);
create policy "likes delete own" on public.idea_likes for delete using (user_id = auth.uid());

-- ───────────── 댓글 (공개 영역) ─────────────
create table public.idea_comments (
  id bigserial primary key,
  idea_id uuid not null references public.ideas(id) on delete cascade,
  author_id uuid not null references public.profiles(id) default auth.uid(),
  body text not null check (length(trim(body)) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index idea_comments_idea_idx on public.idea_comments (idea_id, id);

alter table public.idea_comments enable row level security;

create policy "comments visible" on public.idea_comments for select using (
  exists (select 1 from public.ideas i where i.id = idea_id)
);
create policy "comments create" on public.idea_comments for insert with check (
  author_id = auth.uid()
  and exists (select 1 from public.ideas i where i.id = idea_id)
);
-- 본인 댓글, 또는 내 아이디어에 달린 댓글은 삭제 가능
create policy "comments delete" on public.idea_comments for delete using (
  author_id = auth.uid()
  or exists (select 1 from public.ideas i where i.id = idea_id and i.owner_id = auth.uid())
);
revoke update on public.idea_comments from anon, authenticated;

-- ───────────── 상세 열람: 작성자 본인 열람은 기록하지 않음 ─────────────
create or replace function public.get_idea_detail(p_idea_id uuid)
returns setof public.idea_details language plpgsql security definer set search_path = public as $$
declare
  v_owner boolean := exists (select 1 from ideas where id = p_idea_id and owner_id = auth.uid());
begin
  if not v_owner
     and not exists (select 1 from access_requests
                      where idea_id = p_idea_id and requester_id = auth.uid() and status = 'approved')
     and not exists (select 1 from teams t join team_members m on m.team_id = t.id
                      where t.idea_id = p_idea_id and m.user_id = auth.uid()) then
    raise exception 'forbidden';
  end if;
  if not v_owner then
    insert into view_logs (idea_id, viewer_id) values (p_idea_id, auth.uid());
  end if;
  return query select * from idea_details where idea_id = p_idea_id;
end $$;

-- 기존에 쌓인 작성자 본인 열람 기록 정리 (view_logs는 앱 사용자에게 삭제 권한이 없고, 마이그레이션에서만 정리)
delete from public.view_logs v
 using public.ideas i
 where v.idea_id = i.id and v.viewer_id = i.owner_id;
