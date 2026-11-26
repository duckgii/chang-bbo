import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AccessRequestForm, ApplyForm, CommentForm, DeleteCommentButton, LikeButton } from "./forms";

type Role = { role: string; skills: string[] };

export default async function IdeaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: idea } = await supabase.from("ideas").select("*").eq("id", id).single();
  if (!idea) notFound();

  const isOwner = idea.owner_id === user?.id;
  const { data: request } = await supabase
    .from("access_requests")
    .select("status, expires_at")
    .eq("idea_id", id)
    .eq("requester_id", user?.id)
    .maybeSingle();

  // 상세 영역은 get_idea_detail()로만 읽는다. 권한이 없으면 오류, 있으면 열람 기록이 남는다.
  const canView = isOwner || request?.status === "approved";
  const { data: detailRows } = canView ? await supabase.rpc("get_idea_detail", { p_idea_id: id }) : { data: null };
  const detail = detailRows?.[0] as { solution: string; business_model: string | null; differentiation: string | null } | undefined;

  const { data: nda } = await supabase.from("nda_versions").select("id, body").order("id", { ascending: false }).limit(1).single();
  const { data: application } = await supabase
    .from("applications").select("status").eq("idea_id", id).eq("applicant_id", user?.id).maybeSingle();

  const [{ count: likeCount }, { data: myLike }, { data: comments }] = await Promise.all([
    supabase.from("idea_likes").select("user_id", { count: "exact", head: true }).eq("idea_id", id),
    supabase.from("idea_likes").select("user_id").eq("idea_id", id).eq("user_id", user?.id).maybeSingle(),
    supabase
      .from("idea_comments")
      .select("id, body, created_at, author_id, author:profiles(display_name)")
      .eq("idea_id", id)
      .order("id"),
  ]);
  const authorName = (a: unknown) =>
    ((Array.isArray(a) ? a[0] : a) as { display_name?: string } | null)?.display_name || "이름 미등록";

  return (
    <article className="space-y-6">
      <header>
        <span className="text-sm text-muted">{idea.category}</span>
        <h1 className="mt-1 text-2xl font-bold">{idea.title}</h1>
        <p className="mt-1 text-xs text-subtle">
          등록 {new Date(idea.created_at).toLocaleString("ko-KR")}
          {idea.updated_at !== idea.created_at && ` · 수정 ${new Date(idea.updated_at).toLocaleString("ko-KR")}`}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <LikeButton ideaId={id} liked={!!myLike} count={likeCount ?? 0} disabled={isOwner} />
          {isOwner && (
            <Link href={`/ideas/${id}/edit`} className="rounded border px-3 py-1.5 text-sm hover:bg-surface-2">
              수정하기
            </Link>
          )}
        </div>
      </header>

      <section className="rounded-xl border bg-surface p-5">
        <h2 className="text-sm font-semibold text-muted">공개 영역</h2>
        <dl className="mt-3 space-y-4 text-sm">
          <div><dt className="font-medium">문제 정의</dt><dd className="mt-1 whitespace-pre-wrap">{idea.problem}</dd></div>
          <div><dt className="font-medium">타깃 사용자</dt><dd className="mt-1 whitespace-pre-wrap">{idea.target_users}</dd></div>
          <div>
            <dt className="font-medium">필요한 역할</dt>
            <dd className="mt-1 flex flex-wrap gap-1">
              {(idea.needed_roles as Role[]).map((r) => <span key={r.role} className="rounded bg-surface-2 px-2 py-0.5">{r.role}</span>)}
            </dd>
          </div>
          <div><dt className="font-medium">작성자가 제공할 것</dt><dd className="mt-1">{(idea.provider_offers as string[]).join(", ") || "-"}</dd></div>
        </dl>
      </section>

      <section className="rounded-xl border bg-surface p-5">
        <h2 className="text-sm font-semibold text-muted">상세 영역</h2>
        {detail ? (
          <dl className="mt-3 space-y-4 text-sm">
            <div><dt className="font-medium">해결 방식</dt><dd className="mt-1 whitespace-pre-wrap">{detail.solution}</dd></div>
            <div><dt className="font-medium">수익 모델</dt><dd className="mt-1 whitespace-pre-wrap">{detail.business_model ?? "미정"}</dd></div>
            <div><dt className="font-medium">차별점</dt><dd className="mt-1 whitespace-pre-wrap">{detail.differentiation ?? "-"}</dd></div>
            {!isOwner && <p className="text-xs text-subtle">이 열람은 기록되며 작성자가 확인할 수 있어요.</p>}
          </dl>
        ) : request?.status === "pending" ? (
          <p className="mt-3 text-sm">열람 신청을 보냈어요. 작성자가 승인하면 볼 수 있어요. (만료 {new Date(request.expires_at).toLocaleDateString("ko-KR")})</p>
        ) : request?.status === "rejected" || request?.status === "expired" ? (
          <p className="mt-3 text-sm text-muted">열람 신청이 승인되지 않았어요.</p>
        ) : nda ? (
          <AccessRequestForm ideaId={id} ndaId={nda.id} ndaBody={nda.body} />
        ) : null}
      </section>

      {!isOwner && (
        <section className="rounded-xl border bg-surface p-5">
          <h2 className="text-sm font-semibold text-muted">팀 합류 지원</h2>
          {application ? (
            <p className="mt-3 text-sm">지원 상태: {{ pending: "검토 중", accepted: "수락됨 · 프로젝트 채팅에서 확인하세요", rejected: "거절됨" }[application.status as string]}</p>
          ) : (
            <ApplyForm ideaId={id} roles={(idea.needed_roles as Role[]).map((r) => r.role)} />
          )}
        </section>
      )}

      <section className="rounded-xl border bg-surface p-5">
        <h2 className="text-sm font-semibold text-muted">댓글 {comments?.length ?? 0}</h2>
        <ul className="mt-3 divide-y text-sm">
          {(comments ?? []).map((c) => (
            <li key={c.id} className="py-3">
              <div className="flex items-center gap-2 text-xs text-subtle">
                <span className="font-medium text-fg">{authorName(c.author)}</span>
                {c.author_id === idea.owner_id && <span className="rounded bg-surface-2 px-1.5 py-0.5">작성자</span>}
                <span>{new Date(c.created_at).toLocaleString("ko-KR")}</span>
                {(c.author_id === user?.id || isOwner) && (
                  <DeleteCommentButton ideaId={id} commentId={c.id} />
                )}
              </div>
              <p className="mt-1 whitespace-pre-wrap">{c.body}</p>
            </li>
          ))}
          {!comments?.length && <li className="py-2 text-muted">첫 댓글을 남겨보세요.</li>}
        </ul>
        <CommentForm ideaId={id} />
      </section>
    </article>
  );
}
