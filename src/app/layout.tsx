import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "./actions";

export const metadata: Metadata = {
  title: "창업 아이디어 팀 빌딩",
  description: "아이디어를 올리고, 함께 만들 팀을 찾는 교내 플랫폼",
};

const NAV = [
  { href: "/ideas", label: "아이디어 둘러보기" },
  { href: "/ideas/new", label: "아이디어 등록" },
  { href: "/projects", label: "프로젝트 채팅" },
  { href: "/me", label: "마이페이지" },
];

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <html lang="ko">
      <body className="min-h-screen bg-bg text-fg antialiased">
        {user && (
          <header className="border-b bg-surface">
            <nav className="mx-auto flex max-w-5xl items-center gap-1 overflow-x-auto px-4 py-3 text-sm">
              <Link href="/ideas" className="mr-4 shrink-0 font-bold">창뿌</Link>
              {NAV.map((n) => (
                <Link key={n.href} href={n.href} className="shrink-0 rounded px-3 py-1.5 hover:bg-surface-2">
                  {n.label}
                </Link>
              ))}
              <form action={signOut} className="ml-auto shrink-0">
                <button className="rounded px-3 py-1.5 text-muted hover:bg-surface-2">로그아웃</button>
              </form>
            </nav>
          </header>
        )}
        <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
