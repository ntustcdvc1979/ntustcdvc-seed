export const isMorningTime = () => {
  const hour = new Date().getHours();
  return hour >= 5 && hour < 8;
};

export const getTitleConfig = (userData) => [
  { 
    name: "掃塵除垢", 
    requirement: () => (userData?.stats?.整理環境 >= 21),
    description: "掃除外在的塵埃，也洗滌內心的雜念。心淨，則國土淨。"
  },
  { 
    name: "筆耕福田", 
    requirement: () => (userData?.stats?.抄寫經典 >= 5),
    description: "一筆一劃皆是修行，將聖人的智慧刻在心版上，播下福慧種子。"
  },
  { 
    name: "誠心抱守", 
    requirement: () => (userData?.stats?.一千叩首 >= 7),
    description: "低頭不是軟弱，而是懂得謙卑。叩首是與自性對話，回歸最初的純真。"
  },
  { 
    name: "廣結善緣", 
    requirement: () => (userData?.stats?.分享好文 >= 20) 
  },
  { 
    name: "心靈導師", 
    requirement: () => (userData?.stats?.關心成全一個人 >= 20),
    description: "燈傳燈，心印心。在他人迷惘時點亮一盞指路明燈，引領迷航的靈魂回歸覺性的故鄉。"
  },
  { 
    name: "聞法知音", 
    requirement: () => (userData?.stats?.參與研究班 >= 10),
    description: "收攝心神，靜聽妙理。聖人的教誨如甘露法雨，滋潤枯槁的心靈，讓智慧的種子悄然萌芽。"
  },
  {
    name: "曙光覺醒者",
    requirement: () => (isMorningTime() && userData?.stats?.頌經 > 0),
    description: "在清晨的靜謐中喚醒自性。一日之計在於晨，一生之計在於醒。"
  },
  {
    name: "草食動物",
    requirement: () => (userData?.stats?.蔬食一餐 >= 7),
    description: "慈悲從餐桌開始。愛護生命，讓身體更清淨，心靈更安詳。"
  },
  {
    name: "特級廚師",
    requirement: () => (userData?.stats?.開伙幫廚 >= 3)
  },
  { 
    name: "護道使者", 
    requirement: () => (userData?.stats?.壇務工作 >= 10),
    description: "守護道場的莊嚴，成就眾生的精進。隱身在幕後的默默付出，是修道者最堅實的護法心願。"
  },
  { 
    name: "淨化環境淨化心", 
    requirement: () => (userData?.stats?.淨灘山志工 >= 3),
    description: "彎下腰撿起垃圾，也拾起那顆遺落已久的慈悲心。淨化大地環境，就是在淨化自性的靈山。"
  },
  { 
    name: "赤子之心", 
    requirement: () => (userData?.stats?.參與營隊志工 >= 1),
    description: "在孩子們的純真笑臉中，照見最初的自己。守護那份純潔不染的心，讓道苗在幼小的心靈中扎根。"
  }
];