// functions/auth.js (오타 수정 및 테스트 로직 포함)

export async function onRequestPost(context) {
    const url = new URL(context.request.url);
    
    // 1. 폼 데이터 파싱
    const formData = await context.request.formData();
    const id = formData.get("id");
    const pw = formData.get("pw");

    if (!id || !pw) {
        return Response.redirect(`${url.origin}/login?error=missing`, 302);
    }

    // 2. 환경변수에서 ADMIN ID/PW 접근
    const env = context.env || {};
    const adminId = env.ADMIN_ID || "";
    const adminPw = env.ADMIN_PW || "";
    
    // 3. **** 테스트용 만능 ID/PW 설정 ****
    const testId = "master"; 
    const testPw = "master1234"; 
    
    // 4. 디버깅 로그 (기존 유지)
    console.log("--- 로그인 디버그 정보 ---");
    console.log(`입력 ID (길이 ${id.length}): [${id}]`);
    console.log(`설정 ADMIN_ID (길이 ${adminId.length}): [${adminId}]`);
    console.log(`ID 일치 여부: ${id === adminId}`);
    console.log("-----------------------");

    // 5. **** 인증 검사 로직 (수정 완료) ****
    if (
        (id === adminId && pw === adminPw) ||  // <-- **여기! pw === adminPw로 수정했습니다.**
        (id === testId && pw === testPw)     
    ) {
        // 로그인 성공: 인증 쿠키 설정 후 메인 페이지로 리다이렉트 (Max-Age=0 유지)
        return new Response(null, {
            status: 302,
            headers: {
                "Set-Cookie": "auth=ok123; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0",
                "Location": "/", 
            },
        });
    }

    // 6. 로그인 실패 시
    return new Response(null, {
        status: 302,
        headers: { 
            "Location": "/login?error=fail" 
        },
    });
}