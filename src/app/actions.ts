"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { IdeaForm } from "@/lib/idea-schema";
import { createClient } from "@/lib/supabase/server";

type Result = { error?: string };

export async function submitIdea(
  input: unknown,
  aiFields: string[],
  sessionId: string | null,
  similarCheckId: string | null = null,
): Promise<Result> {
  const parsed = IdeaForm.safeParse(input);
  if (!parsed.success) return { error: "양식을 다시 확인해주세요." };
  const supabase = await createClient();
  const { data: ideaId, error } = await supabase.rpc("submit_idea", {
    p_idea_id: null,
    p: parsed.data,
    p_ai_fields: aiFields,
  });
  if (error) return { error: error.message };
  if (sessionId) {
    await supabase.from("ai_sessions").update({ idea_id: ideaId, status: "closed" }).eq("id", sessionId);
  }
  if (similarCheckId) {
    // 비슷한 아이디어를 안내받고도 등록했다는 기록 (분쟁 판단 근거)
    await supabase
      .from("similar_idea_checks")
      .update({ decision: "registered", idea_id: ideaId, decided_at: new Date().toISOString() })
      .eq("id", similarCheckId);
  }
  redirect(`/ideas/${ideaId}`);
}

// 비슷한 아이디어 안내에서 '합류 지원' 또는 '차별점 보완'을 고른 경우 기록
export async function recordSimilarDecision(checkId: string, decision: "joined" | "revised"): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("similar_idea_checks")
    .update({ decision, decided_at: new Date().toISOString() })
    .eq("id", checkId);
  return error ? { error: error.message } : {};
}

// 내 아이디어 수정: submit_idea가 작성자 확인 + 새 버전 해시 기록까지 처리한다.
export async function updateIdea(ideaId: string, input: unknown): Promise<Result> {
  const parsed = IdeaForm.safeParse(input);
  if (!parsed.success) return { error: "양식을 다시 확인해주세요." };
  const supabase = await createClient();

  // 이전 버전의 AI 제안 표시는 이어간다 (사람이 고쳤는지 알 수 없으므로 보수적으로 유지)
  const { data: prev } = await supabase
    .from("idea_versions")
    .select("ai_suggested_fields")
    .eq("idea_id", ideaId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.rpc("submit_idea", {
    p_idea_id: ideaId,
    p: parsed.data,
    p_ai_fields: prev?.ai_suggested_fields ?? [],
  });
  if (error) return { error: error.message.includes("forbidden") ? "내 아이디어만 수정할 수 있어요." : error.message };
  revalidatePath(`/ideas/${ideaId}`);
  revalidatePath("/ideas");
  redirect(`/ideas/${ideaId}`);
}

export async function toggleLike(ideaId: string, liked: boolean): Promise<Result> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "로그인이 필요해요." };
  const { error } = liked
    ? await supabase.from("idea_likes").delete().eq("idea_id", ideaId).eq("user_id", user.id)
    : await supabase.from("idea_likes").insert({ idea_id: ideaId, user_id: user.id });
  if (error && error.code !== "23505") {
    return { error: error.code === "42501" ? "내 아이디어에는 좋아요를 누를 수 없어요." : error.message };
  }
  revalidatePath(`/ideas/${ideaId}`);
  revalidatePath("/ideas");
  return {};
}

export async function addComment(ideaId: string, body: string): Promise<Result> {
  const text = body.trim();
  if (!text || text.length > 1000) return { error: "댓글은 1~1000자로 써주세요." };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "로그인이 필요해요." };
  const { error } = await supabase.from("idea_comments").insert({ idea_id: ideaId, author_id: user.id, body: text });
  if (error) return { error: error.message };
  revalidatePath(`/ideas/${ideaId}`);
  return {};
}

export async function deleteComment(ideaId: string, commentId: number): Promise<Result> {
  const supabase = await createClient();
  const { error, count } = await supabase.from("idea_comments").delete({ count: "exact" }).eq("id", commentId);
  if (error) return { error: error.message };
  if (!count) return { error: "삭제할 수 없는 댓글이에요." };
  revalidatePath(`/ideas/${ideaId}`);
  return {};
}

export async function requestAccess(ideaId: string, ndaVersionId: number): Promise<Result> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase.from("access_requests").insert({
    idea_id: ideaId,
    requester_id: user?.id,
    nda_version_id: ndaVersionId,
    nda_agreed_at: new Date().toISOString(),
  });
  if (error) return { error: error.code === "23505" ? "이미 신청했어요." : error.message };
  revalidatePath(`/ideas/${ideaId}`);
  return {};
}

export async function decideAccess(requestId: string, approve: boolean): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("decide_access", { p_request_id: requestId, p_approve: approve });
  revalidatePath("/me");
  return error ? { error: error.message } : {};
}

export async function applyToIdea(ideaId: string, role: string, message: string): Promise<Result> {
  if (!role.trim() || !message.trim()) return { error: "역할과 메시지를 입력해주세요." };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase
    .from("applications")
    .insert({ idea_id: ideaId, applicant_id: user?.id, role: role.trim(), message: message.trim() });
  if (error) return { error: error.code === "23505" ? "이미 지원했어요." : error.message };
  revalidatePath(`/ideas/${ideaId}`);
  return {};
}

export async function decideApplication(applicationId: string, accept: boolean): Promise<Result> {
  const supabase = await createClient();
  const { error } = accept
    ? await supabase.rpc("accept_application", { p_application_id: applicationId })
    : await supabase.from("applications").update({ status: "rejected" }).eq("id", applicationId);
  revalidatePath("/me");
  revalidatePath("/projects");
  return error ? { error: error.message } : {};
}

export async function updateProfile(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const stack = String(formData.get("stack") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  await supabase
    .from("profiles")
    .update({
      display_name: String(formData.get("display_name") ?? "").trim(),
      github_url: String(formData.get("github_url") ?? "").trim() || null,
      stack,
    })
    .eq("id", user?.id);
  revalidatePath("/me");
}

function mondayOf(d: Date): string {
  const day = d.getDay() || 7;
  const m = new Date(d);
  m.setDate(d.getDate() - day + 1);
  return m.toISOString().slice(0, 10);
}

export async function submitCheckin(teamId: string, formData: FormData): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  await supabase.from("checkins").insert({
    team_id: teamId,
    week: mondayOf(new Date()),
    status: String(formData.get("status")),
    note: String(formData.get("note") ?? "").trim() || null,
    created_by: user?.id,
  });
  revalidatePath(`/projects/${teamId}`);
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout"); // 상단 메뉴가 로그아웃 상태로 다시 그려지도록
  redirect("/login");
}
