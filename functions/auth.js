export async function onRequestPost(context) {
  const formData = await context.request.formData();
  const id = formData.get("id");
  const pw = formData.get("pw");

  // 안전하게 env 접근
  const env = context.env || {};
  const adminId = env.ADMIN_ID || "";
  const adminPw = env.ADMIN_PW || "";

  if (id === adminId && pw === adminPw) {
    return new Response(null, {
      status: 302,
      headers: {
        "Set-Cookie": "auth=ok123; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=3600",
        "Location": "/",
      },
    });
  }

  // 로그인 실패 시
  return new Response(null, {
    status: 302,
    headers: { "Location": "/login" },
  });
}
