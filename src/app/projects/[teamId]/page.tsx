import { notFound } from "next/navigation";
import { submitCheckin } from "@/app/actions";
import { createClient } from "@/lib/supabase/server";
import { Chat } from "./chat";

const CHECKIN_KO: Record<string, string> = { progress: "진행 중", blocked: "막힘", stopped: "중단" };

export default async function TeamPage({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // RLS: 팀원이 아니면 아무것도 조회되지 않는다.
  const { data: team } = await supabase.from("teams").select("id, ideas(id, title)").eq("id", teamId).single();
  if (!team) notFound();
  const idea = Array.isArray(team.ideas) ? team.ideas[0] : team.ideas;

  const [{ data: members }, { data: messages }, { data: checkins }] = await Promise.all([
    supabase.from("team_members").select("user_id, role, profiles(display_name)").eq("team_id", teamId),
    supabase.from("messages").select("id, sender_id, body, created_at").eq("team_id", teamId).order("id").limit(200),
    supabase.from("checkins").select("week, status, note").eq("team_id", teamId).order("week", { ascending: false }).limit(8),
  ]);
  const names = Object.fromEntries(
    (members ?? []).map((m) => [m.user_id, (Array.isArray(m.profiles) ? m.profiles[0] : m.profiles)?.display_name || "팀원"]),
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
      <section className="rounded-xl border bg-surface">
        <header className="border-b px-4 py-3">
          <h1 className="font-semibold">{idea?.title}</h1>
        </header>
        <Chat teamId={teamId} me={user!.id} names={names} initial={messages ?? []} />
      </section>

      <aside className="space-y-4">
        <div className="rounded-xl border bg-surface p-4 text-sm">
          <h2 className="font-semibold">팀원</h2>
          <ul className="mt-2 space-y-1">
            {(members ?? []).map((m) => <li key={m.user_id}>{names[m.user_id]} · <span className="text-muted">{m.role}</span></li>)}
          </ul>
        </div>
        <div className="rounded-xl border bg-surface p-4 text-sm">
          <h2 className="font-semibold">이번 주 체크인</h2>
          <form action={submitCheckin.bind(null, teamId)} className="mt-2 space-y-2">
            <select name="status" className="w-full rounded border px-2 py-1.5">
              <option value="progress">진행 중</option>
              <option value="blocked">막힘</option>
              <option value="stopped">중단</option>
            </select>
            <input name="note" placeholder="한 줄 메모 (선택)" className="w-full rounded border px-2 py-1.5" />
            <button className="w-full rounded bg-primary py-1.5 text-primary-fg">기록</button>
          </form>
          <ul className="mt-3 space-y-1 text-xs text-muted">
            {(checkins ?? []).map((c) => <li key={c.week}>{c.week} · {CHECKIN_KO[c.status]}{c.note ? ` · ${c.note}` : ""}</li>)}
          </ul>
        </div>
      </aside>
    </div>
  );
}
