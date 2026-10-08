/* =====================================================================
 *  故事內容：story.js
 *  NPC 台詞、情報碎片、裝備、結局文字都在這裡，改文案不用動 game.js。
 *  （招生管道、資格、日期請改 data/admissions.js）
 * ===================================================================== */
window.STORY = {

  /* 開場教室裡的聲音 */
  openingChatter: [
    { who: "zhe",   text: "欸，你畢業後去哪？" },
    { who: "datou", text: "反正應該有學校可以念吧？" },
    { who: "yu",    text: "我還沒想好……" },
    { who: "an",    text: "你知道你要走哪個升學管道嗎？" }
  ],

  /* NPC 同學 */
  npcs: {
    zhe:   { name: "阿哲", face: "😎", color: "#4EA8FF", type: "早就決定型" },
    datou: { name: "大頭", face: "😆", color: "#FFB547", type: "反正有學校型" },
    yu:    { name: "品妤", face: "🙂", color: "#FF7AA2", type: "家長決定型" },
    an:    { name: "小安", face: "🤔", color: "#5BD17A", type: "有興趣但不知道怎麼走型" },
    mo:    { name: "阿默", face: "😶", color: "#A59CFF", type: "完全迷惘型" },
    senior:{ name: "去年畢業的學長", face: "🧢", color: "#F2F0E6", type: "學長" }
  },

  /* 角色建立：現在的狀態（六種，沒有對錯） */
  mindsets: [
    { id: "A", icon: "📍", label: "我已經知道要讀哪間學校", quote: "目標早就鎖定了。", title: "已鎖定目的地的人",
      stats: { goal: 70, intel: 30, prep: 30, time: 40, explore: 25 } },
    { id: "B", icon: "🧭", label: "有想讀的方向，但不知道怎麼走", quote: "我想讀設計／餐飲／資訊，可是不知道怎麼進。", title: "握著羅盤的旅人",
      stats: { goal: 50, intel: 20, prep: 20, time: 30, explore: 40 } },
    { id: "C", icon: "🛋️", label: "現在不用急吧", quote: "還有很多時間啦。", title: "慢慢來派",
      stats: { goal: 30, intel: 20, prep: 10, time: 10, explore: 30 } },
    { id: "D", icon: "🎲", label: "反正一定有學校可以念", quote: "到時候再看看就好。", title: "隨遇而安派",
      stats: { goal: 20, intel: 20, prep: 10, time: 20, explore: 25 } },
    { id: "E", icon: "🗺️", label: "爸媽已經幫我決定了", quote: "我爸媽叫我讀這間。", title: "拿著別人畫的地圖的人",
      stats: { goal: 45, intel: 20, prep: 20, time: 30, explore: 15 } },
    { id: "F", icon: "☁️", label: "我真的不知道未來要去哪", quote: "我真的不知道。", title: "白紙冒險者",
      stats: { goal: 10, intel: 10, prep: 10, time: 20, explore: 40 } }
  ],

  /* DAY 25 班群：每個 NPC 的訊息，以及你點開回覆後他說的話 */
  groupChat: [
    { who: "zhe",   text: "欸我已經決定了，要讀資工 💻", reply: "我學長說同一個系可以走好幾條路，我在想要先拚哪條。" },
    { who: "datou", text: "蛤？現在就要決定喔？反正先畢業再說啦 🏀", reply: "我是覺得一定有學校念啦……應該吧？" },
    { who: "yu",    text: "我爸叫我去讀那間。", reply: "其實我也不知道我想不想。可是我也說不出我想讀什麼。" },
    { who: "an",    text: "我想讀設計，可是我不知道怎麼進 😵", reply: "聽說要作品集？那要什麼時候交啊……" },
    { who: "mo",    text: "……我真的不知道。", reply: "大家好像都知道自己要幹嘛，只有我沒有。" }
  ],

  /* 情報碎片：收集到 3 片解鎖升學路線圖鑑 */
  fragments: {
    grade:    "升學不只是看成績，還要知道適合自己的管道。",
    identity: "不同身分可以選擇的升學道路可能不同。",
    timing:   "部分升學道路有特定時間與準備要求。",
    manyRoads:"一個科系，通常不只一條路可以到。",
    explore:  "興趣可以先從「世界」開始找，不用一次就決定科系。",
    others:   "別人的路可以參考，但不用照抄。",
    sameEdu:  "沒拿到畢業證書，修滿六學期也有「同等學力」。",
    later:    "前面的路沒上，後面通常還有路。"
  },
  unlockAt: 3,

  /* 岔路：🟨 看看別人怎麼選（學長姐的故事；paths 會解鎖對應道路） */
  seniorStories: [
    { face: "👩‍🍳", who: "高職餐飲科學姊", text: "我高二就去考乙級證照，後來走技優甄審，根本沒考統測。", paths: ["skillrev"] },
    { face: "🧑‍💻", who: "普通科學長", text: "我一直以為普通科不能讀科大，結果學測完就走申請入學進來了。", paths: ["caac"] },
    { face: "🧑‍🔧", who: "先工作的學長", text: "我白天在工廠上班，晚上讀進修部，畢業一樣是學士。", paths: ["night"] },
    { face: "🎨", who: "喜歡畫畫的學姊", text: "我 12 月就用作品集報特殊選才，寒假前就知道結果了。", paths: ["special"] }
  ],

  /* 🎒 出發前，你願意帶什麼？ */
  equipment: [
    { id: "moreRoad",  icon: "🧭", item: "升學地圖",       label: "再了解一個升學管道", stat: { intel: 8, prep: 5 } },
    { id: "dept",      icon: "🔍", item: "科系探索鏡",     label: "查一個想讀的科系", stat: { explore: 8, goal: 5 } },
    { id: "checkMe",   icon: "📜", item: "資格卷軸",       label: "確認自己可以走哪些管道", stat: { intel: 8, prep: 5 } },
    { id: "dates",     icon: "⏰", item: "時間警報器",     label: "了解重要報名時間", stat: { time: 12, prep: 5 } },
    { id: "seniors",   icon: "🧭", item: "學長姐的手繪地圖", label: "參考學長姐經驗", stat: { intel: 6, explore: 4 } },
    { id: "csuDept",   icon: "🔍", item: "正修探索鏡",     label: "了解正修相關科系", stat: { explore: 6, goal: 4 } },
    { id: "visit",     icon: "🎒", item: "參訪通行證",     label: "預約參訪", stat: { prep: 8, explore: 4 } },
    { id: "ask",       icon: "🎒", item: "求助對講機",     label: "詢問老師／學長姐", stat: { prep: 8, intel: 4 } }
  ],

  /* 結局 */
  endings: {
    A: { title: "目標明確的冒險者", line: "你已經知道目的地，現在最重要的是確認正確的道路。" },
    B: { title: "找到方向的探索者", line: "你出發時還看不清方向，現在你知道該往哪個世界走了。" },
    C: { title: "重新選擇的玩家",   line: "你原本以為還有時間，現在你知道真正重要的是：先知道有哪些選擇。" },
    D: { title: "開始探索未來的人", line: "你還沒有決定目的地，但你已經開始探索，這就是你的第一步。" },
    E: { title: "知道自己下一步要做什麼的人", line: "你不只知道路在哪，還知道明天要先做哪一件事。" }
  },

  /* 畢業典禮上，你在 DAY 25 回覆的那位同學會對你說 */
  farewell: {
    zhe:   "欸，一起加油。說不定我們會走不同的路，到同一個地方。",
    datou: "被你嚇到，我回去也要查一下報名時間了啦。",
    yu:    "我決定回家，跟我爸好好聊一次我想讀什麼。",
    an:    "我要開始整理作品集了！你也要加油喔。",
    mo:    "我還是不太知道……但我好像知道要從哪裡開始找了。"
  },

  /* 畢業典禮 */
  finale: [
    "有人已經知道下一站。",
    "有人還在尋找。",
    "有人正在重新選擇。",
    "沒有一條路適合所有人。"
  ],
  finaleStrong: "但從今天開始，你可以開始選擇自己的路。",
  motto: "未來不是選出來的答案，而是走出來的路。"
};
