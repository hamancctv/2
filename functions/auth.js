export async function onRequestPost(context) {
  const formData = await context.request.formData();
  const id = formData.get("id");
  const pw = formData.get("pw");

  const adminId = context.env.ADMIN_ID;
  const adminPw = context.env.ADMIN_PW;

  if (id === adminId && pw === adminPw) {
    return new Response(null, {
      status: 302,
      headers: {
        "Set-Cookie": "auth=ok123; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=3600",
        "Location": "/",
      },
    });
  }

  // 로그인 실패 → 다시 /login 으로
  return new Response(null, {
    status: 302,
    headers: { "Location": "/login" },
  });
}
