export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);

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
    return Response.redirect(`${url.origin}/login`, 302);
  }
}
