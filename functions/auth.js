// functions/auth.js

export async function onRequestPost(context) {
    const url = new URL(context.request.url);
    
    // 1. 폼 데이터 파싱
    const formData = await context.request.formData();
    const id = formData.get("id");
    const pw = formData.get("pw");

    // 필수 필드 누락 시 처리
    if (!id || !pw) {
        return Response.redirect(`${url.origin}/login?error=missing`, 302);
    }

    // 2. 환경변수에서 ADMIN ID/PW 안전하게 접근
    // **ADMIN_ID와 ADMIN_PW는 반드시 Cloudflare Secrets로 등록되어야 합니다.**
    const env = context.env || {};
    const adminId = env.ADMIN_ID || "";
    const adminPw = env.ADMIN_PW || "";

    // 3. **** 디버깅 코드 ****
    // 이 로그를 Cloudflare 대시보드 Logs 탭에서 확인하세요!
    console.log("--- 로그인 디버그 정보 ---");
    console.log(`입력 ID (길이 ${id.length}): [${id}]`);
    console.log(`설정 ADMIN_ID (길이 ${adminId.length}): [${adminId}]`);
    console.log(`ID 일치 여부: ${id === adminId}`);
    // console.log(`입력 PW (길이 ${pw.length})`); // 보안을 위해 PW 값은 출력하지 않습니다.
    console.log("-----------------------");

    // 4. ID/PW 일치 검사
    if (id === adminId && pw === adminPw) {
        // 로그인 성공: 인증 쿠키 설정 후 메인 페이지로 리다이렉트
        return new Response(null, {
            status: 302,
            headers: {
                "Set-Cookie": "auth=ok123; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=3600",
                "Location": "/", // 메인 페이지로 이동
            },
        });
    }

    // 5. 로그인 실패 시
    return new Response(null, {
        status: 302,
        headers: { 
            "Location": "/login?error=fail" // 로그인 페이지로 리다이렉트
        },
    });
}