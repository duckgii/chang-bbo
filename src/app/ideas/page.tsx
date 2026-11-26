import Link from "next/link";
import { CATEGORIES } from "@/lib/idea-schema";
import { createClient } from "@/lib/supabase/server";

type Role = { role: string; skills: string[] };

export default async function IdeasPage({ searchParams }: { searchParams: Promise<{ category?: string; role?: string }> }) {
  const { category, role } = await searchParams;
  const supabase = await createClient();

  // 공개 영역만 조회. 상세 영역(idea_details)은 이 쿼리에 절대 포함하지 않는다.
  let q = supabase
    .from("ideas")
    .select("id, title, problem, target_users, category, needed_roles, created_at")
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .limit(50);
  if (category) q = q.eq("category", category);
  const { data: ideas } = await q;

  const filtered = (ideas ?? []).filter(
    (i) => !role || (i.needed_roles as Role[]).some((r) => r.role.includes(role)),
  );

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl font-bold">아이디어 둘러보기</h1>
        <form className="flex gap-2 text-sm">
          <select name="category" defaultValue={category ?? ""} className="rounded border px-2 py-1.5">
            <option value="">전체 분야</option>
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
          <input name="role" defaultValue={role ?? ""} placeholder="필요 역할 (예: 백엔드)" className="rounded border px-2 py-1.5" />
          <button className="rounded bg-zinc-900 px-3 text-white">필터</button>
        </form>
      </div>

      <ul className="mt-6 grid gap-4 sm:grid-cols-2">
        {filtered.map((i) => (
          <li key={i.id}>
            <Link href={`/ideas/${i.id}`} className="block h-full rounded-xl border bg-white p-5 hover:border-zinc-400">
              <span className="text-xs text-zinc-500">{i.category}</span>
              <h2 className="mt-1 font-semibold">{i.title}</h2>
              <p className="mt-2 line-clamp-3 text-sm text-zinc-600">{i.problem}</p>
              <div className="mt-3 flex flex-wrap gap-1">
                {(i.needed_roles as Role[]).map((r) => (
                  <span key={r.role} className="rounded bg-zinc-100 px-2 py-0.5 text-xs">{r.role}</span>
                ))}
              </div>
            </Link>
          </li>
        ))}
      </ul>
      {filtered.length === 0 && <p className="mt-10 text-center text-zinc-500">조건에 맞는 아이디어가 아직 없어요.</p>}
    </div>
  );
}
