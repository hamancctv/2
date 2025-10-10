export async function onRequest(context) {
  const url = new URL(context.request.url);
  const id = url.searchParams.get("id");
  const pw = url.searchParams.get("pw");

  if (id === "admin" && pw === "1234") {
    return new Response(
      `<h3 style="font-family:sans-serif;text-align:center;margin-top:3em">
        ✅ 로그인 성공<br><br>
        <a href="/" style="color:#007aff">메인으로 이동</a>
      </h3>`,
      {
        headers: {
          "Set-Cookie": "auth=ok123; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=3600",
          "content-type": "text/html; charset=utf-8",
        },
      }
    );
  }

  return new Response(
    `<h3 style="font-family:sans-serif;text-align:center;margin-top:3em">
      ❌ 로그인 실패<br><a href="/">다시 시도</a>
    </h3>`,
    { status: 401, headers: { "content-type": "text/html; charset=utf-8" } }
  );
}
