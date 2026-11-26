import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { updateIdea } from "@/app/actions";
import { IdeaFormPanel } from "@/components/idea-form";
import type { IdeaFormValues } from "@/lib/idea-schema";
import { createClient } from "@/lib/supabase/server";

export default async function EditIdeaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: idea } = await supabase.from("ideas").select("*").eq("id", id).single();
  if (!idea) notFound();
  if (idea.owner_id !== user?.id) redirect(`/ideas/${id}`);

  // 작성자는 상세 영역을 직접 읽을 수 있다(RLS). 열람 기록도 남지 않는다.
  const [{ data: detail }, { data: last }] = await Promise.all([
    supabase.from("idea_details").select("solution, business_model, differentiation").eq("idea_id", id).single(),
    supabase.from("idea_versions").select("version, ai_suggested_fields")
      .eq("idea_id", id).order("version", { ascending: false }).limit(1).maybeSingle(),
  ]);

  const initial: IdeaFormValues = {
    public: { title: idea.title, problem: idea.problem, target_users: idea.target_users, category: idea.category },
    detail: {
      solution: detail?.solution ?? "",
      business_model: detail?.business_model ?? null,
      differentiation: detail?.differentiation ?? null,
    },
    needed_roles: (idea.needed_roles as IdeaFormValues["needed_roles"]).length
      ? (idea.needed_roles as IdeaFormValues["needed_roles"])
      : [{ role: "", skills: [] }],
    provider_offers: idea.provider_offers as string[],
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <Link href={`/ideas/${id}`} className="text-sm text-muted underline">← 아이디어로 돌아가기</Link>
        <span className="text-xs text-subtle">현재 버전 {last?.version ?? 1}</span>
      </div>
      <IdeaFormPanel
        heading="아이디어 수정"
        initial={initial}
        aiFields={(last?.ai_suggested_fields as string[]) ?? []}
        submitLabel="저장하기 (새 버전으로 기록되고, 이전 버전도 증거로 남아요)"
        onSubmit={updateIdea.bind(null, id)}
      />
    </div>
  );
}
