// server.js — v2025-10-09 AUTO-DOWNLOAD-ONCE
import express from "express";
import fetch from "node-fetch";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = 3000;

app.get("/capture", async (req, res) => {
  try {
    const { lat, lng, level, type, addr } = req.query;
    const key = "5f253bed8a8966a66fc9076b662663fd";
    const apiURL = `https://dapi.kakao.com/v2/maps/staticmap?center=${lng},${lat}&level=${level}&w=1024&h=768&type=${type}`;

    const r = await fetch(apiURL, {
      headers: { Authorization: `KakaoAK ${key}` },
    });

    if (!r.ok) throw new Error("Kakao API 요청 실패");

    const arrayBuffer = await r.arrayBuffer();
    const filename = `지도_${addr || "현재위치"}.png`;
    const filePath = path.join(__dirname, filename);

    fs.writeFileSync(filePath, Buffer.from(arrayBuffer));

    res.download(filePath, filename, () => {
      fs.unlink(filePath, () => {});
      console.log("✅ 다운로드 완료, 서버 자동 종료 예정...");
      setTimeout(() => process.exit(0), 1000);
    });
  } catch (e) {
    console.error("❌ 오류:", e);
    res.status(500).send("캡처 실패");
  }
});

app.listen(PORT, () => console.log(`✅ 캡처 서버 실행됨 (포트: ${PORT})`));
