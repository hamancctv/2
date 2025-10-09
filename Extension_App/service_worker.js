// service_worker.js - 최종 통합 및 안정화 버전

// 탭이 유효한지 확인하는 유틸 함수
const isTabValid = async (id) => {
    try {
        const tab = await chrome.tabs.get(id); 
        // 탭 ID가 일치하고, 완전히 닫힌 상태가 아니어야 유효함
        return tab && tab.id === id && tab.status !== 'unloaded'; 
    } catch {
        // 탭이 닫혔거나 존재하지 않으면 예외가 발생함
        return false;
    }
};

// 툴바 아이콘(Action) 클릭 리스너
chrome.action.onClicked.addListener((tab) => {
    // Service Worker가 종료되어 메시지 전송 실패 시 .catch로 조용히 처리합니다.
    chrome.tabs.sendMessage(tab.id, { type: "RUN_CAPTURE_NOW_FROM_ACTION" })
        .catch(error => {
            console.warn("Action click message failed (Content Script not ready or Service Worker terminated):", error.message);
        });
});

// Content Script에서 메시지를 받는 유일한 리스너 (모든 로직 통합)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === "RUN_CAPTURE_NOW" || request.type === "RUN_CAPTURE_NOW_FROM_ACTION") {
        (async () => {
            const tabId = sender.tab.id;
            
            try {
                // 1. 탭 유효성 1차 확인
                if (!(await isTabValid(tabId))) {
                    throw new Error("Target tab is closed or invalid upon start.");
                }

                // 2. 캡처 준비 요청 (UI 제거 및 크롭 정보 획득)
                const prepareResponse = await chrome.tabs.sendMessage(tabId, { type: "PREPARE_CAPTURE" });

                if (!prepareResponse.ok || !prepareResponse.cropRect) {
                    throw new Error(prepareResponse.error || "준비 실패");
                }

                const { cropRect, dpr, filename } = prepareResponse;
                
                // 3. 탭 유효성 재확인 (PREPARE_CAPTURE 응답 대기 중 탭이 닫혔는지 확인)
                if (!(await isTabValid(tabId))) { 
                    throw new Error("Tab closed during preparation phase.");
                }

                // 4. 탭 전체 캡처
const tab = await chrome.tabs.get(tabId);
const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: "png" });
                
                // 5. 탭 유효성 재확인 (캡처 대기 중 탭이 닫혔는지 확인)
                if (!(await isTabValid(tabId))) { 
                    throw new Error("Tab closed during capture phase.");
                }

                // 6. Content Script로 보내 크롭 요청
                const cropResponse = await chrome.tabs.sendMessage(tabId, { 
                    type: "CROP_IN_PAGE", 
                    dataUrl: dataUrl, 
                    rect: cropRect, 
                    dpr: dpr 
                });

                // 7. 다운로드
                if (cropResponse.ok) {
                    chrome.downloads.download({
                        url: cropResponse.dataUrl,
                        filename: filename,
                        saveAs: false
                    });
                } else {
                    throw new Error(cropResponse.error || "크롭 실패");
                }

            } catch (e) {
                // 'No window with id'와 같은 오류는 여기서 안전하게 처리되어 Uncaught Error가 남지 않습니다.
                console.error("Capture Flow Error:", e.message);

                const isTabClosedError = e.message.includes("No window with id") || e.message.includes("closed");

                if (!isTabClosedError && await isTabValid(tabId)) {
                    // 탭이 닫히지 않은 다른 오류일 경우 사용자에게 알립니다.
                    chrome.tabs.sendMessage(tabId, { type: "CAPTURE_ERROR", message: e.message || "알 수 없는 오류" })
                        .catch(err => console.warn("Failed to send final error message:", err.message));
                }
            } finally {
                // 8. UI 복원 요청: 탭이 유효할 경우에만
                // finally 블록에서 발생하는 메시지 전송 실패도 .catch로 조용히 처리합니다.
                if (await isTabValid(tabId)) {
                    chrome.tabs.sendMessage(tabId, { type: "RESTORE_UI" })
                        .catch(err => console.warn("Failed to send RESTORE_UI message:", err.message));
                }
            }
        })();
        return false; // 비동기 응답을 위해 false 반환
    }
});