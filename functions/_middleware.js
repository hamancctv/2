export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);

  // auth.js나 정적 리소스는 통과
  if (
    url.pathname.startsWith("/auth") ||
    url.pathname.endsWith(".css") ||
    url.pathname.endsWith(".js") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".jpg") ||
    url.pathname.endsWith(".ico")
  ) {
    return;
  }

  // 쿠키 검사
  const cookie = request.headers.get("cookie") || "";
  const isAuth = cookie.includes("auth=ok123");

  if (!isAuth) {
    return new Response(
      `<h2 style="font-family:sans-serif;text-align:center;margin-top:3em">
        🔒 로그인 필요<br><br>
        <a href="/auth?id=admin&pw=1234"
           style="display:inline-block;padding:8px 16px;background:#007aff;
                  color:#fff;text-decoration:none;border-radius:8px">
           테스트 로그인
        </a>
      </h2>`,
      { status: 403, headers: { "content-type": "text/html; charset=utf-8" } }
    );
  }
}
