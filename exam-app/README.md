# AiCVD 線上模擬考

個人讀書用的模擬考網頁：`exam/index.html`。題庫加密存放，沒有密碼只看得到登入畫面。

## 網址

部署後開 `/exam/`（例如 `https://<你的網域>/exam/`）。頁面設了 `noindex`，`robots.txt` 也擋掉搜尋引擎。

## 功能

- **全真模擬**：依 AiCVD 考試配置分四部分計時（MCQ、申論、影像、組織病理）；每部分有固定試卷，也可以依 Blueprint 權重隨機組卷
- **主題練習**：可依部分、領域、物種、難度、文獻年代（2016 年後／2021 年後）、題目來源（沒做過／錯題／標記）篩選；作答後立刻看解析
- **自我評分**：申論、影像、病理題交卷後對照評分要點勾選得分
- **錯題本**：得分低於 60% 自動加入；間隔複習 1、3、7、14、30 天
- **成績紀錄與模擬放榜**：每部分 ≥50%、四部分平均 ≥65% 才通過；單一部分 ≥65% 可保留
- **弱項分析**：各領域正確率 × Blueprint 權重排序、物種、難度、文獻年代、常錯標籤，附建議讀物
- **筆記、標記、附上自己的照片、加入自己的題目**
- **備份**：設定頁匯出／匯入（合併）作答紀錄，用來換裝置

作答紀錄、筆記、照片只存在該裝置的瀏覽器（localStorage／IndexedDB），不會上傳。

## 檔案

| 路徑 | 內容 | 進 git |
|---|---|---|
| `exam/index.html` | 建置好的網頁（程式＋加密題庫） | 是 |
| `exam-app/*.js, *.css, template.html` | 網頁程式原始碼 | 是 |
| `exam-app/bank.enc.json` | 加密題庫（網頁用） | 是 |
| `exam-app/bank-src.enc.json` | 加密的題目原始檔備份（可還原成 `exam-src/`） | 是 |
| `exam-src/` | 題目明文原始檔、示意圖、`.passphrase` | **否**（`.gitignore`） |

這個 repo 是公開的，所以明文題目絕對不能放進 git，只放加密檔。

## 編輯題目

```bash
# 1. 還原明文（新電腦或新的工作環境）
EXAM_PASS='你的密碼' node exam-app/build.mjs decrypt
echo '你的密碼' > exam-src/.passphrase

# 2. 編輯 exam-src/*.txt（格式見 exam-app/parser.js 開頭說明）
#    示意圖：node exam-src/figures-src/gen.mjs

# 3. 驗證＋加密＋產生網頁
node exam-app/build.mjs build

# 只改程式碼、不動題目時
node exam-app/build.mjs app
```

## 換密碼

```bash
echo '新密碼' > exam-src/.passphrase
node exam-app/build.mjs rekey
```

換密碼後，各裝置上「記住這台裝置」的狀態會失效，需要重新輸入新密碼。

## 安全性說明

- 題庫用 PBKDF2-SHA256（600,000 次）＋ AES-256-GCM 加密；密碼夠長就無法離線暴力破解。
- 「在這台裝置記住」只把不可匯出的解密金鑰存在瀏覽器 IndexedDB；共用電腦請不要勾選，或在設定頁按「忘記這台裝置的解密金鑰」。
- 這是「內容加密」，不是伺服器端權限控管：任何人都能下載這個頁面，但沒有密碼解不開。
