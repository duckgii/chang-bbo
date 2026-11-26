// 브라우저는 NEXT_PUBLIC_SUPABASE_URL(예: http://localhost:54321)로 접속하지만,
// Docker 컨테이너 안의 서버는 localhost가 자기 자신이라 host.docker.internal로 접속해야 한다.
// SUPABASE_URL이 있으면 서버에서는 그 주소를 쓴다.
export const browserSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
export const serverSupabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
export const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// 쿠키 이름은 기본적으로 URL 호스트명에서 만들어지므로, 브라우저와 서버가 다른 주소를 쓰면
// 서로의 로그인 쿠키를 못 읽는다. 이름을 고정해 둔다.
export const cookieOptions = { name: "sb-changbbo-auth" };
