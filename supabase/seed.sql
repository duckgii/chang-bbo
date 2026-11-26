-- 로컬 개발용 시드. `make db-reset` 때 마이그레이션 다음에 실행된다. (실제 배포 DB에는 들어가지 않음)
-- 로컬에서는 아무개@example.ac.kr 로도 가입할 수 있다.
-- 메일은 실제로 발송되지 않고 http://localhost:54324 (메일 확인 화면)에서 볼 수 있다.
with s as (insert into public.schools (name) values ('테스트 학교') returning id)
insert into public.school_domains (domain, school_id) select 'example.ac.kr', id from s;
