-- 구글 로그인: 가입 시 구글 계정 이름을 프로필 이름으로. 학교 도메인 검사는 그대로 유지.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_school uuid;
begin
  select school_id into v_school from public.school_domains
   where domain = lower(split_part(new.email, '@', 2));
  if v_school is null then
    raise exception '학교 이메일만 가입할 수 있습니다.';
  end if;
  insert into public.profiles (id, school_id, display_name)
  values (
    new.id,
    v_school,
    coalesce(nullif(new.raw_user_meta_data->>'full_name', ''), nullif(new.raw_user_meta_data->>'name', ''), '')
  );
  return new;
end $$;
