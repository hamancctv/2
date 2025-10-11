// functions/auth.js

export async function onRequestPost(context) {
    const url = new URL(context.request.url);
    
    const formData = await context.request.formData();
    const id = formData.get("id");
    const pw = formData.get("pw");

    if (!id || !pw) {
        return Response.redirect(`${url.origin}/login?error=missing`, 302);
    }

    const env = context.env || {};
    const adminId = env.ADMIN_ID || "";
    const adminPw = env.ADMIN_PW || "";

    // **** 디버깅 코드 시작 ****
    // 이 줄을 추가하여 실제 비교되는 값들을 Cloudflare 로그에 출력합니다.
    console.log("--- 로그인 디버그 정보 ---");
    console.log(`입력 ID (길이 ${id.length}): [${id}]`);
    console.log(`설정 ADMIN_ID (길이 ${adminId.length}): [${adminId}]`);
    console.log(`입력 PW (길이 ${pw.length}): [${pw}]`);
    console.log(`설정 ADMIN_PW (길이 ${adminPw.length}): [${adminPw}]`);
    console.log(`ID 일치 여부: ${id === adminId}`);
    console.log(`PW 일치 여부: ${pw === adminPw}`);
    console.log("-----------------------");
    // **** 디버깅 코드 끝 ****

    // 기존 로그인 로직:
    if (id === adminId && pw === adminPw) {
        // ... (로그인 성공 시 로직) ...
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
        headers: { 
            "Location": "/login?error=fail" 
        },
    });
}