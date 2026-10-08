# 畢業之後：我的夢想冒險

高中職畢業生的升學 RPG。距離畢業典禮還有 30 天，玩家和同學、學長姐一起探索畢業後的升學道路，最後帶走一張「我的畢業冒險攻略」。

> 未來不是選出來的答案，而是走出來的路。

純 HTML／CSS／JavaScript，不需要後端、登入或 API Key，可直接用 GitHub Pages 部署。遊戲進度存在瀏覽器的 localStorage。

## 檔案結構

```
index.html           遊戲入口
data-check.html      招生資料檢查頁（每年更新資料後打開）
data/
  admissions.js      ★ 招生管道、資格規則、日期、身分題目（每年要更新的檔案）
  departments.js     未來城市：8 個學習世界與正修科系、科系連結（CSU_DEPT_LINK）
  qrcodes.js         各網址的 QR Code（自動產生，不用手改）
tools/
  make_qr.py         新增網址時，重新產生 qrcodes.js
js/
  story.js           劇情文案：NPC 台詞、情報碎片、裝備、結局
  game.js            遊戲引擎（不含任何招生資訊，平常不用改）
css/style.css        樣式
```

## 部署到 GitHub Pages

1. 把整個資料夾的內容上傳到 repository 根目錄（例如 `pursue-dreams1`）。
2. Settings → Pages → Source 選 `Deploy from a branch`，Branch 選 `main`、資料夾選 `/ (root)`。
3. 幾分鐘後即可開啟 `https://<帳號>.github.io/<repository>/`。

## 每年更新招生資訊（只改 data/admissions.js）

1. **學年度**：改 `meta.cycle`（例如 `"117學年度"`）和 `meta.updated`。
2. **日期**：改每條道路 `events` 裡的 `from`／`to`（格式 `YYYY-MM-DD`）。
   - 已對照正式簡章的單一日期，加上 `confirmed: true`。
   - 整條道路都確認完，把 `status` 改成 `"confirmed"`。全部確認後，遊戲裡的「推估」提醒會自動消失。
   - 每條道路請保留一個 `key: true`，代表最重要的時間點（倒數提醒、時間排序小遊戲會用）。
3. **資格有變**：改該道路的 `rules`（判斷規則）以及 `who`／`conditions`（給學生看的文字）。條件寫法在檔案最下方有說明。
4. **文字內容**：`prep`（要準備什麼）、`pitfalls`（可能遇到的問題）、`csu`（正修相關資訊）、`url`（查看完整資訊連結）直接改字即可。
5. 用瀏覽器打開 `data-check.html`：
   - 紅字一定要修（通常是少了逗號、引號或日期格式錯）。
   - 黃字是提醒（例如日期還是推估、日期已全部過期）。
   - 「資格模擬」表格可以檢查規則改完後，各種身分的燈號是否正確。
6. 上傳 GitHub。

**QR Code**：攻略卡（含下載的圖片）與圖鑑會顯示 QR Code。網址固定不變時不用處理；如果新增或更換了網址，`data-check.html` 會提醒，執行 `pip install segno` 後再執行 `python tools/make_qr.py` 即可重新產生。

科系或世界有變動時改 `data/departments.js`；各系 `url` 留空時，「看這個系」會連到 `CSU_DEPT_LINK`（目前是 https://recruit.csu.edu.tw/1111/ ）；想調整台詞、結局文字時改 `js/story.js`。

> 小提醒：在自己電腦直接雙擊 `index.html` 也能玩；資料檔是 `.js` 格式，不需要架伺服器。

## 遊戲流程

| DAY | 事件 |
|---|---|
| 30 | 建立角色：身分（保留原身分判斷）＋現在的心態，產生能力值 |
| 25 | 三年八班班群：5 位 NPC 同學，選一位聊天 |
| 20 | 學長登場、三條岔路（知道去哪／先探索未來城市／看學長姐怎麼選） |
| 15 | 背包檢查（成績、證照、特殊經歷），升學道路依身分亮燈，圖鑑解鎖 |
| 10 | 「之後再說」也不會 Game Over：看見真實報名倒數＋時間排序挑戰 |
| 5 | 重新檢視選擇、願意付出的事、推薦最適合的道路 |
| 1 | 🎒 出發前，你願意帶什麼？選主線與備案 |
| 0 | 畢業典禮、5 種結局、我的畢業冒險攻略（可下載圖片） |
