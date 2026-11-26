import Link from "next/link";
import { decideAccess, decideApplication, updateProfile } from "@/app/actions";
import { createClient } from "@/lib/supabase/server";

const STATUS_KO: Record<string, string> = { pending: "대기", approved: "승인", rejected: "거절", expired: "만료", accepted: "수락" };

export default async function MyPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const [{ data: profile }, { data: myIdeas }, { data: myRequests }, { data: myApps }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user!.id).single(),
    supabase.from("ideas").select("id, title, created_at").eq("owner_id", user!.id).order("created_at", { ascending: false }),
    supabase.from("access_requests").select("id, status, ideas(id, title)").eq("requester_id", user!.id),
    supabase.from("applications").select("id, status, role, ideas(id, title)").eq("applicant_id", user!.id),
  ]);
  // 빈 배열로 in() 조회하면 PostgREST가 오류를 내므로, 없는 UUID로 대체해 빈 결과를 받는다.
  const ideaIds = myIdeas?.length ? myIdeas.map((i) => i.id) : ["00000000-0000-0000-0000-000000000000"];

  // 내 아이디어로 들어온 신청·지원·열람 기록 (RLS가 작성자에게만 보여줌)
  const [{ data: incomingReq }, { data: incomingApps }, { data: views }] = await Promise.all([
    supabase.from("access_requests").select("id, idea_id, status, nda_agreed_at, requester:profiles(display_name)")
      .in("idea_id", ideaIds).eq("status", "pending"),
    supabase.from("applications").select("id, idea_id, role, message, applicant:profiles(display_name, stack, github_url)")
      .in("idea_id", ideaIds).eq("status", "pending"),
    supabase.from("view_logs").select("id, idea_id, viewed_at, viewer:profiles(display_name)")
      .in("idea_id", ideaIds).order("viewed_at", { ascending: false }).limit(30),
  ]);
  const titleOf = (id: string) => myIdeas?.find((i) => i.id === id)?.title ?? "";
  const one = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? v[0] ?? null : v);

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">마이페이지</h1>

      <section className="rounded-xl border bg-surface p-5">
        <h2 className="font-semibold">프로필</h2>
        <form action={updateProfile} className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
          <input name="display_name" defaultValue={profile?.display_name} placeholder="이름" className="rounded border px-3 py-2" />
          <input name="stack" defaultValue={(profile?.stack ?? []).join(", ")} placeholder="기술 스택 (쉼표 구분)" className="rounded border px-3 py-2" />
          <input name="github_url" defaultValue={profile?.github_url ?? ""} placeholder="GitHub URL" className="rounded border px-3 py-2" />
          <button className="rounded bg-primary py-2 text-primary-fg sm:col-span-3">저장</button>
        </form>
        <p className="mt-2 text-xs text-muted">{user?.email} · 학교 이메일 인증됨</p>
      </section>

      <section className="rounded-xl border bg-surface p-5">
        <h2 className="font-semibold">받은 열람 신청</h2>
        <ul className="mt-3 divide-y text-sm">
          {(incomingReq ?? []).map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-2 py-2">
              <span className="flex-1">
                <b>{one(r.requester)?.display_name || "이름 미등록"}</b> → {titleOf(r.idea_id)}
                <span className="ml-2 text-xs text-subtle">비밀유지 동의 {new Date(r.nda_agreed_at).toLocaleString("ko-KR")}</span>
              </span>
              <form action={async () => { "use server"; await decideAccess(r.id, true); }}><button className="rounded bg-primary px-3 py-1 text-primary-fg">승인</button></form>
              <form action={async () => { "use server"; await decideAccess(r.id, false); }}><button className="rounded border px-3 py-1">거절</button></form>
            </li>
          ))}
          {!incomingReq?.length && <li className="py-2 text-muted">새 신청이 없어요.</li>}
        </ul>
      </section>

      <section className="rounded-xl border bg-surface p-5">
        <h2 className="font-semibold">받은 팀 합류 지원</h2>
        <ul className="mt-3 divide-y text-sm">
          {(incomingApps ?? []).map((a) => {
            const p = one(a.applicant);
            return (
              <li key={a.id} className="space-y-1 py-3">
                <p><b>{p?.display_name || "이름 미등록"}</b> · {a.role} → {titleOf(a.idea_id)}</p>
                <p className="text-xs text-muted">{(p?.stack ?? []).join(", ")} {p?.github_url && <a href={p.github_url} className="underline" target="_blank">GitHub</a>}</p>
                <p className="whitespace-pre-wrap">{a.message}</p>
                <div className="flex gap-2">
                  <form action={async () => { "use server"; await decideApplication(a.id, true); }}><button className="rounded bg-primary px-3 py-1 text-primary-fg">수락 (팀 생성)</button></form>
                  <form action={async () => { "use server"; await decideApplication(a.id, false); }}><button className="rounded border px-3 py-1">거절</button></form>
                </div>
              </li>
            );
          })}
          {!incomingApps?.length && <li className="py-2 text-muted">새 지원이 없어요.</li>}
        </ul>
      </section>

      <section className="rounded-xl border bg-surface p-5">
        <h2 className="font-semibold">내 아이디어 상세 열람 기록</h2>
        <ul className="mt-3 divide-y text-sm">
          {(views ?? []).map((v) => (
            <li key={v.id} className="py-2">
              {one(v.viewer)?.display_name || "이름 미등록"} · {titleOf(v.idea_id)}
              <span className="ml-2 text-xs text-subtle">{new Date(v.viewed_at).toLocaleString("ko-KR")}</span>
            </li>
          ))}
          {!views?.length && <li className="py-2 text-muted">아직 열람 기록이 없어요.</li>}
        </ul>
      </section>

      <div className="grid gap-6 sm:grid-cols-2">
        <section className="rounded-xl border bg-surface p-5">
          <h2 className="font-semibold">내가 등록한 아이디어</h2>
          <ul className="mt-3 space-y-1 text-sm">
            {(myIdeas ?? []).map((i) => (
              <li key={i.id} className="flex items-center gap-2">
                <Link href={`/ideas/${i.id}`} className="underline">{i.title}</Link>
                <Link href={`/ideas/${i.id}/edit`} className="ml-auto text-xs text-muted underline">수정</Link>
              </li>
            ))}
            {!myIdeas?.length && <li className="text-muted"><Link href="/ideas/new" className="underline">첫 아이디어 등록하기</Link></li>}
          </ul>
        </section>
        <section className="rounded-xl border bg-surface p-5">
          <h2 className="font-semibold">내 신청·지원 현황</h2>
          <ul className="mt-3 space-y-1 text-sm">
            {(myRequests ?? []).map((r) => { const i = one(r.ideas); return i && (
              <li key={r.id}>열람 · <Link href={`/ideas/${i.id}`} className="underline">{i.title}</Link> · {STATUS_KO[r.status]}</li>); })}
            {(myApps ?? []).map((a) => { const i = one(a.ideas); return i && (
              <li key={a.id}>지원({a.role}) · <Link href={`/ideas/${i.id}`} className="underline">{i.title}</Link> · {STATUS_KO[a.status]}</li>); })}
          </ul>
        </section>
      </div>
    </div>
  );
}
