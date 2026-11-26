"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { IdeaForm } from "@/lib/idea-schema";
import { createClient } from "@/lib/supabase/server";

type Result = { error?: string };

export async function submitIdea(input: unknown, aiFields: string[], sessionId: string | null): Promise<Result> {
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
  redirect(`/ideas/${ideaId}`);
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
  redirect("/login");
}
