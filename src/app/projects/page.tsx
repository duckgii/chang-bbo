import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function ProjectsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: memberships } = await supabase
    .from("team_members")
    .select("role, teams(id, created_at, ideas(title))")
    .eq("user_id", user!.id);

  type Team = { id: string; created_at: string; ideas: { title: string } | { title: string }[] | null };
  const teams = (memberships ?? []).map((m) => ({ role: m.role, team: (Array.isArray(m.teams) ? m.teams[0] : m.teams) as Team | null }));

  return (
    <div>
      <h1 className="text-2xl font-bold">프로젝트 채팅</h1>
      <ul className="mt-6 space-y-3">
        {teams.map(({ role, team }) => team && (
          <li key={team.id}>
            <Link href={`/projects/${team.id}`} className="block rounded-xl border bg-white p-4 hover:border-zinc-400">
              <p className="font-semibold">{(Array.isArray(team.ideas) ? team.ideas[0] : team.ideas)?.title}</p>
              <p className="text-xs text-zinc-500">내 역할: {role} · 결성 {new Date(team.created_at).toLocaleDateString("ko-KR")}</p>
            </Link>
          </li>
        ))}
      </ul>
      {!teams.length && <p className="mt-10 text-center text-zinc-500">아직 참여 중인 프로젝트가 없어요.</p>}
    </div>
  );
}
