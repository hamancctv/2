export async function onRequestPost(context) {
  const formData = await context.request.formData();
  const id = formData.get("id");
  const pw = formData.get("pw");

  // 환경변수로부터 가져오기 (코드에 노출되지 않음)
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

  return new Response(null, {
    status: 302,
    headers: { "Location": "/login.html" },
  });
}
