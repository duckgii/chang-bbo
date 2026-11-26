// 로컬 Supabase의 주소·키를 .env.local에 써 넣는다. (make init / make env 에서 사용)
import { execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const file = process.argv[2] ?? ".env.local";
const status = execSync("npx supabase status -o env", { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
const get = (key) => status.match(new RegExp(`^${key}="?([^"\\n]*)"?`, "m"))?.[1];

const values = {
  NEXT_PUBLIC_SUPABASE_URL: get("API_URL"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: get("ANON_KEY"),
  DOCKER_SUPABASE_URL: "http://host.docker.internal:54321",
};
if (!values.NEXT_PUBLIC_SUPABASE_URL || !values.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  console.error("로컬 Supabase 정보를 읽지 못했어요. `make db-start`가 성공했는지 확인해주세요.");
  process.exit(1);
}

let text = existsSync(file) ? readFileSync(file, "utf8") : "";
for (const [key, value] of Object.entries(values)) {
  const line = `${key}=${value}`;
  text = new RegExp(`^${key}=.*$`, "m").test(text)
    ? text.replace(new RegExp(`^${key}=.*$`, "m"), line)
    : `${text.trimEnd()}\n${line}\n`;
}
writeFileSync(file, text);
console.log(`→ ${file}에 로컬 Supabase 주소·키를 채웠어요.`);

if (!/^ANTHROPIC_API_KEY=\S+/m.test(text)) {
  console.log(`⚠ ANTHROPIC_API_KEY가 비어 있어요. AI 상담을 쓰려면 ${file}에 직접 넣어주세요.`);
}
