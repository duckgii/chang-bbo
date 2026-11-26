"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Msg = { id: number; sender_id: string; body: string; created_at: string };

export function Chat({ teamId, me, names, initial }: { teamId: string; me: string; names: Record<string, string>; initial: Msg[] }) {
  const [messages, setMessages] = useState<Msg[]>(initial);
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const supabase = useRef(createClient()).current;

  useEffect(() => {
    // RLS가 적용된 실시간 구독: 팀원에게만 새 메시지가 전달된다.
    const channel = supabase
      .channel(`team:${teamId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `team_id=eq.${teamId}` },
        (payload) => setMessages((m) => (m.some((x) => x.id === payload.new.id) ? m : [...m, payload.new as Msg])))
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [supabase, teamId]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body) return;
    setText("");
    const { data } = await supabase.from("messages").insert({ team_id: teamId, sender_id: me, body }).select().single();
    if (data) setMessages((m) => (m.some((x) => x.id === data.id) ? m : [...m, data as Msg]));
  }

  return (
    <div className="flex h-[65vh] flex-col">
      <div className="flex-1 space-y-2 overflow-y-auto p-4">
        {messages.map((m) => (
          <div key={m.id} className={m.sender_id === me ? "text-right" : ""}>
            {m.sender_id !== me && <p className="text-xs text-zinc-500">{names[m.sender_id] ?? "팀원"}</p>}
            <div className={`inline-block max-w-[80%] whitespace-pre-wrap rounded-lg px-3 py-2 text-left text-sm ${
              m.sender_id === me ? "bg-zinc-900 text-white" : "bg-zinc-100"}`}>{m.body}</div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={send} className="flex gap-2 border-t p-3">
        <input value={text} onChange={(e) => setText(e.target.value)} maxLength={4000}
          placeholder="메시지 입력 (대화 기록은 분쟁 시 증거로 보관돼요)" className="flex-1 rounded border px-3 py-2 text-sm" />
        <button className="rounded bg-zinc-900 px-4 text-sm text-white">보내기</button>
      </form>
    </div>
  );
}
