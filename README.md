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

## 批次上傳內容

`src/utils/` 下的腳本會讀取同目錄的 txt 檔並寫入 Firestore，需要 Firebase 服務帳戶金鑰
`src/utils/serviceAccount.json`（此檔案不進版控）。

```bash
node src/utils/uploadQuotes.cjs
node src/utils/uploadEvents.cjs
node src/utils/uploadChallenges.cjs
```
