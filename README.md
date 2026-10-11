# 🌱 崇德心靈種子

台科大崇德志工社的心靈修持養成小遊戲。使用者用 Google 帳號登入後，每天領取一則「仙佛慈語」為種子澆水，
並在「學／修／講／辦」四大面向累積修持次數，達成條件即可解鎖成就勳章。

線上版本：<https://ntustcdvc1979.github.io/ntustcdvc-seed>

## 技術架構

| 項目 | 使用技術 |
| --- | --- |
| 前端 | React 19 + Vite |
| 樣式 | Tailwind CSS v4 |
| 動畫 | framer-motion |
| 登入 | Firebase Authentication（Google） |
| 資料庫 | Cloud Firestore |
| 部署 | GitHub Pages（`gh-pages` 套件） |
| 後端 | Cloud Functions（AI 小助手，`functions/`） |
| AI | Gemini API（RAG：`gemini-embedding-2` + `gemini-3.8-flash`） |

## 目錄結構

```
src/
├── App.jsx                  # 主畫面與所有狀態管理（登入、澆水、技能、成就）
├── firebase-config.js       # Firebase 初始化（未進版控，需自行建立）
├── main.jsx                 # React 進入點
├── index.css                # Tailwind 匯入與全域樣式
├── assets/
│   └── AssetManager.js      # 勳章圖與 Logo 的集中管理
├── components/              # 各個彈窗與 UI 元件
├── styles/theme.js          # 主題色
└── utils/
    ├── gameLogic.js         # 成就條件設定、日期判斷
    ├── browserEnv.js        # App 內建瀏覽器偵測與跳轉
    ├── upload*.cjs          # 用 firebase-admin 把 txt 內容批次上傳到 Firestore
    └── *.txt                # 慈語 / 活動 / 考驗題目來源（未進版控）
```

## Firestore 資料結構

| Collection | 說明 |
| --- | --- |
| `users` | 每位使用者一筆，欄位：`name`、`email`、`exp`、`stats`、`badges`、`collection`、`favorite`、`following`、`lastCheckIn`、`shortId`、`isTaoQin` |
| `daily_quotes` | 仙佛慈語，欄位：`content`、`author`、`type` |
| `challenges` | 智慧考驗題目，欄位：`content` |
| `events` | 活動公告，欄位：`title`、`description`、`posterUrl`、`endDate` |
| `quote_embeddings` | AI 小助手用的慈語向量（只有 Cloud Function 能讀寫） |
| `ai_usage` | 每位使用者當天的 AI 提問次數（只有 Cloud Function 能讀寫） |

## 本機開發

1. 安裝套件

   ```bash
   npm install
   ```

2. 在專案根目錄建立 `.env`（此檔案不進版控）

   ```
   VITE_FIREBASE_API_KEY=...
   VITE_FIREBASE_AUTH_DOMAIN=...
   VITE_FIREBASE_PROJECT_ID=...
   VITE_FIREBASE_STORAGE_BUCKET=...
   VITE_FIREBASE_MESSAGING_SENDER_ID=...
   VITE_FIREBASE_APP_ID=...
   ```

3. 啟動開發伺服器

   ```bash
   npm run dev
   ```

## 常用指令

```bash
npm run dev      # 本機開發
npm run lint     # ESLint 檢查
npm run build    # 打包到 dist/
npm run deploy   # 打包後部署到 GitHub Pages
```

## 在 LINE 裡點開連結

LINE、Facebook、Instagram 的「App 內建瀏覽器」會被 Google 登入直接擋下
（Google 政策：不接受 embedded WebView 的 OAuth 請求），
所以網頁會偵測這些環境並自動導向系統瀏覽器；若自動跳轉失敗，畫面上會提供手動操作說明與複製連結按鈕。

分享連結時，直接在網址後面加上 `?openExternalBrowser=1`，LINE 就會用系統瀏覽器開啟：

```
https://ntustcdvc1979.github.io/ntustcdvc-seed/?openExternalBrowser=1
```

在一般電腦瀏覽器加上 `?inAppTest=line`（或 `facebook`、`instagram`）可以預覽該引導畫面。

## 管理後台

網址：<https://ntustcdvc1979.github.io/ntustcdvc-seed/#/admin>（管理員登入後，也可以從「⚙️ 設定」裡的「🛠 管理後台」進入）

- 依名字或 Email 搜尋使用者，切換「道親 / 非道親」（`isTaoQin`）
- 前端只負責決定要不要顯示介面（`src/config/admin.js`，存的是管理員 Email 的 SHA-256）；
  真正阻擋非管理員修改的是 Firestore 規則
- Firestore 規則放在專案根目錄的 `firestore.rules`。因為含有管理員 Email，**此檔不進版控**，
  修改後請到 Firebase Console → Firestore Database → 規則，貼上整份內容並發布

新增管理員：在 `src/config/admin.js` 加入對方 Email 的 hash，並在 `firestore.rules` 的 `isAdmin()` 加上對方 Email。

## AI 慈語小助手

主畫面右下角的 ✨AI 按鈕。使用者描述煩惱，系統用 RAG 從資料庫找出最相關的仙佛慈語回覆。

```
使用者提問 ──▶ Cloud Function askQuotes（asia-east1）
                 ├─ 把問題轉成向量（gemini-embedding-2）
                 ├─ 與 quote_embeddings 比對相似度，取前 8 則候選（非道親只會比對一般慈語）
                 └─ Gemini 從候選中挑 1~3 則並寫一句引言
            ◀── 慈語原文直接取自 Firestore，一字不改
```

- **慈語不會被改寫**：Gemini 只回傳候選的「編號」，慈語文字一律由資料庫原文呈現
- **金鑰不外流**：Gemini API 金鑰存在 Firebase Secret Manager，不在前端、也不在 git
- 每位使用者每天最多問 10 次（`functions/index.js` 的 `DAILY_LIMIT_PER_USER`）
- 開放範圍由 `src/config/admin.js` 的 `AI_ROLLOUT` 控制：`'admin'` 只有管理員看得到，`'all'` 全部開放

### 第一次部署

需要 Firebase 的 **Blaze（用量計費）方案**才能使用 Cloud Functions；小社團的用量在免費額度內。

```bash
cd functions
npm install
npx firebase-tools@latest login
npx firebase-tools@latest functions:secrets:set GEMINI_API_KEY
npx firebase-tools@latest deploy --only functions
```

`secrets:set` 會要求你貼上金鑰，金鑰只會存進 Secret Manager。
（電腦全域安裝的舊版 `firebase` 指令在 Node 25 會壞掉，請用上面的 `npx firebase-tools@latest`。）

### 建立慈語索引

第一次啟用，或一次上傳超過 20 則新慈語之後要跑一次（少量新增時 Cloud Function 會自己補）。
免費額度每分鐘只能處理 100 則，500 則大約要 5~6 分鐘。PowerShell：

```powershell
cd functions
$env:GEMINI_API_KEY="你的金鑰"; npm run build-index
```

## 批次上傳內容

`src/utils/` 下的腳本會讀取同目錄的 txt 檔並寫入 Firestore，需要 Firebase 服務帳戶金鑰
`src/utils/serviceAccount.json`（此檔案不進版控）。

```bash
node src/utils/uploadQuotes.cjs
node src/utils/uploadEvents.cjs
node src/utils/uploadChallenges.cjs
```
