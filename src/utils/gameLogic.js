export const isMorningTime = () => {
  const hour = new Date().getHours();
  return hour >= 5 && hour < 8;
};

export const getTitleConfig = (userData) => [
  // { 
  //   name: "筆耕福田", 
  //   requirement: () => (userData?.stats?.抄寫經典 >= 5),
  //   description: "一筆一劃皆是修行，將聖人的智慧刻在心版上，播下福慧種子。",
  //   goal: "累計抄寫經典達5次",
  //   isHidden: false, // 一般成就
  // },
  { 
    name: "聞道不捨", 
    requirement: () => (userData?.stats?.參與研究班 >= 10),
    description: "聞道不捨效聖賢，孜孜不倦向道專；由淺入深來研理，追根究底而溯源。",
    goal: "累計參與研究班達10次",
    isHidden: false, // 一般成就
  },
  {
    name: "草食動物",
    requirement: () => (userData?.stats?.蔬食一餐 >= 7),
    description: "慈悲從餐桌開始。愛護生命，讓身體更清淨，心靈更安詳。",
    goal: "累計蔬食一餐達7次",
    isHidden: false, // 一般成就
  },
  { 
    name: "誠心抱守", 
    requirement: () => (userData?.stats?.一千叩首 >= 7),
    description: "低頭不是軟弱，而是懂得謙卑。叩首是與自性對話，回歸最初的純真。",
    goal: "累計一千叩首達7次",
    isHidden: false, // 一般成就
  },
  { 
    name: "掃塵除垢", 
    requirement: () => (userData?.stats?.整理環境 >= 21),
    description: "掃除外在的塵埃，也洗滌內心的雜念。心淨，則國土淨。",
    goal: "累計整理環境達7次",
    isHidden: false, // 一般成就
  },
  // { 
  //   name: "廣結善緣", 
  //   requirement: () => (userData?.stats?.分享好文 >= 20),
  //   description: "一燈能除千年暗，一智能滅萬年愚。感謝你將智慧的種子播撒給更多人。🕊️",
  //   goal: "累計分享好文達20次",
  //   isHidden: false, // 一般成就
  // },
  { 
    name: "心靈導師", 
    requirement: () => (userData?.stats?.關心成全一個人 >= 20),
    description: "在他人迷惘時點亮一盞指路明燈，引領迷航的靈魂回歸自性本來。",
    goal: "累計關心成全一個人達20次",
    isHidden: false, // 一般成就
  },
  {
    name: "特級廚師",
    requirement: () => (userData?.stats?.開伙幫廚 >= 10),
    description: "莫忘六祖慧能大師亦是從炊事組劈柴舂米、躬身磨練開始。每一道菜餚，皆是成全眾生的慈悲。",
    goal: "累計開伙幫廚達10次",
    isHidden: false, // 一般成就
  },
  { 
    name: "護道使者", 
    requirement: () => (userData?.stats?.壇務工作 >= 10),
    description: "護者皆有不可思議之無量福、無量壽、無量功，成就三界頂天立地之盛名也。",
    goal: "累計壇務工作達10次",
    isHidden: false, // 一般成就
  },
  { 
    name: "淨化環境淨化心", 
    requirement: () => (userData?.stats?.淨灘山志工 >= 3),
    description: "一個個彎下腰，帶走垃圾、廢棄物，真誠堅定的背影，是蔚藍海岸邊最動人的光景。",
    goal: "累計參與淨灘山志工達3次",
    isHidden: false, // 一般成就
  },
  { 
    name: "赤子之心", 
    requirement: () => (userData?.stats?.營隊志工 >= 1),
    description: "在孩子們的純真笑臉中，看見最初的自己。",
    goal: "參與營隊志工1次",
    isHidden: false, // 一般成就
  },
  {
    name: "曙光覺醒者",
    requirement: () => false,
    description: "一日之計在於晨；一歲之計在於春；一生之計在於勤。",
    goal: "在早上5點至8點間誦經",
    isHidden: true, // 隱藏成就
  },
];