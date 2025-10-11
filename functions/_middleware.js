// functions/_middleware.js

/**
 * Cloudflare Pages Functions 미들웨어
 * 인증되지 않은 사용자의 접근을 차단하고 /login으로 리다이렉트합니다.
 */
export async function onRequest(context) {
    const { request } = context;
    const url = new URL(request.url);
    const path = url.pathname;

    // 1. 인증이 필요 없는 경로 통과
    // /auth, /login 경로 및 정적 파일을 통과시킵니다.
    if (
        path.startsWith("/auth") || // 로그인 POST 요청 처리 경로 통과
        path === "/login" ||       // 로그인 페이지 기본 경로 통과
        path.startsWith("/login/") || // /login/index.html 경로 통과
        path.endsWith(".css") ||   // CSS 파일 통과
        path.endsWith(".js") ||    // JS 파일 통과
        path.endsWith(".png") ||
        path.endsWith(".jpg") ||
        path.endsWith(".ico")
    ) {
        return context.next();
    }
    
    // 2. 인증 쿠키 확인
    const cookie = request.headers.get("cookie") || "";
    const isAuth = cookie.includes("auth=ok123");

    // 3. 인증되지 않았다면 /login으로 리다이렉트
    if (!isAuth) {
        return Response.redirect(`${url.origin}/login`, 302);
    }

    // 4. 인증 성공 시 요청 통과
    return context.next(); 
}