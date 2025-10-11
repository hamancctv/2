// functions/auth.js

/**
 * Cloudflare Pages Functions POST 핸들러
 * 폼 데이터(ID/PW)를 받아 로그인 인증을 처리합니다.
 *
 * @param {EventContext} context
 * @returns {Response}
 */
export async function onRequestPost(context) {
    const url = new URL(context.request.url);
    
    // 1. 폼 데이터 파싱
    const formData = await context.request.formData();
    const id = formData.get("id");
    const pw = formData.get("pw");

    // 필수 필드 누락 시 에러 처리
    if (!id || !pw) {
        return Response.redirect(`${url.origin}/login?error=missing`, 302);
    }

    // 2. 환경변수에서 ADMIN ID/PW 안전하게 접근
    // 이 변수들은 Cloudflare 대시보드에 Secrets로 등록되어 있어야 합니다.
    const env = context.env || {};
    const adminId = env.ADMIN_ID || "";
    const adminPw = env.ADMIN_PW || "";

    // 3. ID/PW 일치 검사
    if (id === adminId && pw === adminPw) {
        // 로그인 성공: 인증 쿠키 설정 후 메인 페이지로 리다이렉트
        // Note: 'auth=ok123'은 간단한 예시입니다. 실제 운영에서는 보안 토큰을 사용해야 합니다.
        return new Response(null, {
            status: 302,
            headers: {
                // HttpOnly: JavaScript 접근 방지
                // Secure: HTTPS에서만 전송
                // SameSite=Strict: CSRF 방지
                "Set-Cookie": "auth=ok123; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=3600",
                "Location": "/", // 메인 페이지로 이동
            },
        });
    }

    // 4. 로그인 실패 시
    return new Response(null, {
        status: 302,
        headers: { 
            "Location": "/login?error=fail" // 로그인 페이지로 리다이렉트하며 실패 표시
        },
    });
}