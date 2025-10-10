export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);

  // 로그인/인증 경로 및 정적 리소스는 통과
  if (
    url.pathname.startsWith("/auth") ||
    url.pathname.startsWith("/login") ||
    url.pathname.endsWith(".css") ||
    url.pathname.endsWith(".js") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".jpg") ||
    url.pathname.endsWith(".ico")
  ) {
    return;
  }

  const cookie = request.headers.get("cookie") || "";
  const isAuth = cookie.includes("auth=ok123");

  if (!isAuth) {
    // 로그인 안 된 경우 → /login 으로 리디렉션
    return Response.redirect(`${url.origin}/login`, 302);
  }
}
