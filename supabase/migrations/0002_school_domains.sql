-- 한 학교가 여러 이메일 도메인을 쓸 수 있게 분리 (예: 학생 g.hongik.ac.kr, 교직원 hongik.ac.kr)
-- 테스트용 example.ac.kr은 실제 DB에 남지 않도록 seed.sql(로컬 전용)로 옮긴다.

create table public.school_domains (
  domain text primary key check (domain = lower(domain)),
  school_id uuid not null references public.schools(id) on delete cascade
);

alter table public.school_domains enable row level security;
create policy "school domains readable" on public.school_domains for select using (true);

insert into public.school_domains (domain, school_id)
select lower(email_domain), id from public.schools;

alter table public.schools drop column email_domain;

-- 테스트 학교 제거 (가입자가 없을 때만)
delete from public.schools s
 where s.name = '우리 학교'
   and not exists (select 1 from public.profiles p where p.school_id = s.id);

-- 1차 파일럿 학교
with s as (insert into public.schools (name) values ('홍익대학교') returning id)
insert into public.school_domains (domain, school_id) select 'g.hongik.ac.kr', id from s;

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
  insert into public.profiles (id, school_id) values (new.id, v_school);
  return new;
end $$;

-- 로그인 화면에서 코드 발송 전에 도메인을 미리 확인하기 위한 함수 (로그인 전에도 호출 가능)
create or replace function public.is_school_email(p_email text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.school_domains where domain = lower(split_part(p_email, '@', 2)))
$$;

grant execute on function public.is_school_email(text) to anon, authenticated;
