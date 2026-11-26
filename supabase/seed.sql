-- 로컬 개발용 시드. `make db-reset` 때 마이그레이션 다음에 실행된다. (실제 배포 DB에는 들어가지 않음)
-- 로컬에서는 아무개@example.ac.kr 로도 가입할 수 있고, 홍익대학교 소속으로 처리된다.
-- (아이디어는 같은 학교 안에서만 보이므로, 가짜 계정으로 내 아이디어를 보려면 같은 학교여야 함)
-- 메일은 실제로 발송되지 않고 http://localhost:54324 (메일 확인 화면)에서 볼 수 있다.
insert into public.school_domains (domain, school_id)
select 'example.ac.kr', id from public.schools where name = '홍익대학교';
