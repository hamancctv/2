export async function onRequest(context) {
    const { request } = context;
    const url = new URL(request.url);

    // 1. 인증 불필요한 경로 및 정적 파일 통과
    // Note: /auth/*, /login/* 경로와 정적 파일은 바로 context.next()를 호출하여 통과시킵니다.
    if (
        url.pathname.startsWith("/auth") ||
        url.pathname.startsWith("/login") ||
        url.pathname.endsWith(".css") ||
        url.pathname.endsWith(".js") ||
        url.pathname.endsWith(".png") ||
        url.pathname.endsWith(".jpg") ||
        url.pathname.endsWith(".ico")
    ) {
        // context.next()를 반환하여 Cloudflare Pages가 요청을 처리하도록 합니다.
        return context.next();
    }

    // 2. 인증 쿠키 확인
    const cookie = request.headers.get("cookie") || "";
    const isAuth = cookie.includes("auth=ok123");

    // 3. 인증되지 않았다면 /login으로 리다이렉트
    if (!isAuth) {
        return Response.redirect(`${url.origin}/login`, 302);
    }

    // 4. 인증에 성공했다면 요청을 통과
    // 인증에 성공한 모든 요청은 Pages가 정적 파일을 제공하도록 통과시킵니다.
    return context.next(); 
}