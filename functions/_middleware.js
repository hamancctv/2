// functions/_middleware.js

export async function onRequest(context) {
    const { request } = context;
    const url = new URL(request.url);
    const path = url.pathname;

    // 1. 인증이 필요 없는 경로 통과
    if (
        path.startsWith("/auth") || 
        path === "/login" ||      // /login/index.html을 위한 통과
        path.startsWith("/login/") ||
        path.endsWith(".css") ||   
        path.endsWith(".js") ||    
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