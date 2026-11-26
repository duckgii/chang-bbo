-- 가입 제한 해제: 학교 계정이 아니어도 가입·로그인 가능.
-- · 학교는 막는 용도가 아니라 "학교 인증" 표시로만 쓴다 (학교 도메인 메일이면 school_id가 채워짐).
-- · 아이디어 공개 영역은 로그인한 모든 사용자에게 보인다. 상세 영역은 기존처럼 승인 + 비밀유지 동의 후 열람.

alter table public.profiles alter column school_id drop not null;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, school_id, display_name)
  values (
    new.id,
    (select school_id from public.school_domains where domain = lower(split_part(new.email, '@', 2))),
    coalesce(nullif(new.raw_user_meta_data->>'full_name', ''), nullif(new.raw_user_meta_data->>'name', ''), '')
  );
  return new;
end $$;

-- 프로필: 로그인한 사용자끼리 서로 볼 수 있다 (댓글·지원자 이름 등)
drop policy "profiles same school" on public.profiles;
create policy "profiles readable" on public.profiles for select using (auth.uid() is not null);

-- 아이디어 공개 영역: 로그인한 모든 사용자 (scope 값은 나중에 범위를 다시 나눌 때를 위해 남겨둔다)
drop policy "ideas visible by scope" on public.ideas;
create policy "ideas visible" on public.ideas for select using (
  owner_id = auth.uid() or (status = 'open' and auth.uid() is not null)
);
update public.ideas set scope = 'public';

-- 새 아이디어는 public으로 등록 (submit_idea의 scope 부분만 변경)
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
    values (auth.uid(), 'public',
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
