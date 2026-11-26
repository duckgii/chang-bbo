-- 상세 열람: 작성자 승인 없이, 비밀유지 항목에 모두 동의하면 바로 열람.
-- · 동의는 항목별로 받고, 동의 기록(nda_agreements)은 추가만 가능하다 (분쟁 시 증거).
-- · 기존 access_requests(승인 방식)로 승인된 열람 권한은 그대로 인정한다.

alter table public.nda_versions add column title text;
alter table public.nda_versions add column items jsonb;   -- [{ "title": "...", "body": "..." }]

insert into public.nda_versions (title, body, items) values (
  '아이디어 상세 열람 비밀유지 동의',
  '아래 항목에 모두 동의해야 아이디어 상세 영역을 열람할 수 있습니다. (v2 · 법률 검토 전 초안)',
  $json$[
    {"title": "비밀정보의 범위",
     "body": "이 아이디어의 상세 영역(해결 방식, 수익 모델, 차별점)과, 열람 이후 작성자와의 대화·팀 활동에서 알게 된 비공개 정보를 '비밀정보'로 봅니다."},
    {"title": "제3자 공개 금지",
     "body": "작성자의 동의 없이 비밀정보를 다른 사람에게 말하거나, 캡처·복사·녹화해 전달하거나, SNS·커뮤니티 등에 게시하지 않습니다."},
    {"title": "무단 사용 금지",
     "body": "작성자의 동의 없이 비밀정보를 이용해 같거나 비슷한 서비스를 개발·창업하거나, 과제·공모전·투자 유치 자료에 쓰지 않습니다."},
    {"title": "비밀유지 대상이 아닌 정보",
     "body": "공개 영역(제목, 문제 정의, 타깃 사용자 등), 열람 전에 이미 공개되어 있던 정보, 열람 전부터 본인이 알고 있었거나 비밀정보 없이 독자적으로 만든 것(입증 가능한 경우), 법령에 따라 공개해야 하는 정보는 제외됩니다."},
    {"title": "유지 기간",
     "body": "이 의무는 동의한 날부터 2년간, 또는 작성자가 해당 내용을 스스로 공개할 때까지 유지됩니다."},
    {"title": "기록과 작성자 확인",
     "body": "동의 시각, 동의한 문구의 버전, 상세 열람 시각이 기록되며, 아이디어 작성자는 누가 언제 동의하고 열람했는지 확인할 수 있습니다. 이 기록은 분쟁이 생기면 증거로 쓰일 수 있습니다."},
    {"title": "위반 시 조치",
     "body": "위반이 확인되면 서비스 이용이 제한될 수 있고, 작성자는 부정경쟁방지법 등 관련 법령에 따라 손해배상 등 법적 조치를 취할 수 있습니다."}
  ]$json$::jsonb
);

create table public.nda_agreements (
  id bigserial primary key,
  idea_id uuid not null references public.ideas(id) on delete cascade,
  user_id uuid not null references public.profiles(id) default auth.uid(),
  nda_version_id int not null references public.nda_versions(id),
  agreed_items int not null,          -- 체크한 항목 수 (= 해당 버전 항목 수)
  agreed_at timestamptz not null default now()
);
create index nda_agreements_idea_idx on public.nda_agreements (idea_id, user_id);

alter table public.nda_agreements enable row level security;
-- 본인 동의 기록, 또는 내 아이디어에 대한 동의 기록만 조회
create policy "agreements visible" on public.nda_agreements for select using (
  user_id = auth.uid()
  or exists (select 1 from public.ideas i where i.id = idea_id and i.owner_id = auth.uid())
);
-- 쓰기는 agree_nda() 함수로만
revoke insert, update, delete on public.nda_agreements from anon, authenticated;

-- 최신 버전의 모든 항목에 동의했는지 확인하고 기록한다
create or replace function public.agree_nda(p_idea_id uuid, p_nda_version_id int, p_agreed_items int)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_latest int;
  v_count int;
begin
  if auth.uid() is null then raise exception 'unauthenticated'; end if;
  if not exists (select 1 from ideas where id = p_idea_id and status = 'open' and owner_id <> auth.uid()) then
    raise exception 'forbidden';
  end if;
  select id, coalesce(jsonb_array_length(items), 0) into v_latest, v_count
    from nda_versions order by id desc limit 1;
  if p_nda_version_id <> v_latest then raise exception 'outdated nda version'; end if;
  if p_agreed_items <> v_count then raise exception 'all items required'; end if;
  insert into nda_agreements (idea_id, user_id, nda_version_id, agreed_items)
  values (p_idea_id, auth.uid(), p_nda_version_id, p_agreed_items);
end $$;

-- 상세 열람 권한: 작성자 / 비밀유지 동의 / (기존 방식) 승인된 신청 / 팀원
create or replace function public.get_idea_detail(p_idea_id uuid)
returns setof public.idea_details language plpgsql security definer set search_path = public as $$
declare
  v_owner boolean := exists (select 1 from ideas where id = p_idea_id and owner_id = auth.uid());
begin
  if not v_owner
     and not exists (select 1 from nda_agreements where idea_id = p_idea_id and user_id = auth.uid())
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
