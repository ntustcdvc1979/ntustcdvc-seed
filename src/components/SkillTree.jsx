import React from 'react';
import { Quadrant, SkillCircle } from './SkillComponents';

export default function SkillTree({ userData, incrementSkill, decrementSkill }) {
  return (
    <div className="space-y-10">
      <Quadrant title="智慧增長 (學)" motto="學道越學越和氣" icon="📖" colorType="green">
        <SkillCircle name="頌經" count={userData?.stats?.頌經} onClick={() => incrementSkill('頌經')} onDecrement={() => decrementSkill('頌經')} img="📿" colorType="green" />
        <SkillCircle name="抄寫經典" count={userData?.stats?.抄寫經典} onClick={() => incrementSkill('抄寫經典')} onDecrement={() => decrementSkill('抄寫經典')} img="✍️" colorType="green" />
        <SkillCircle name="參與研究班" count={userData?.stats?.參與研究班} onClick={() => incrementSkill('參與研究班')} onDecrement={() => decrementSkill('參與研究班')} img="🏫" colorType="green" />
        <SkillCircle name="研讀聖訓經典" count={userData?.stats?.研讀聖訓經典} onClick={() => incrementSkill('研讀聖訓經典')} onDecrement={() => decrementSkill('研讀聖訓經典')} img="📜" colorType="green" />
      </Quadrant>

      <Quadrant title="心靈平靜 (修)" motto="修道越修越歡喜" icon="🧘" colorType="green">
        <SkillCircle name="蔬食一餐" count={userData?.stats?.蔬食一餐} onClick={() => incrementSkill('蔬食一餐')} onDecrement={() => decrementSkill('蔬食一餐')} img="🥗" colorType="green" />
        <SkillCircle name="覺察情緒" count={userData?.stats?.覺察情緒} onClick={() => incrementSkill('覺察情緒')} onDecrement={() => decrementSkill('覺察情緒')} img="🌊" colorType="green" />
        <SkillCircle name="每日反省" count={userData?.stats?.每日反省} onClick={() => incrementSkill('每日反省')} onDecrement={() => decrementSkill('每日反省')} img="📝" colorType="green" />
        <SkillCircle name="一千叩首" count={userData?.stats?.一千叩首} onClick={() => incrementSkill('一千叩首')} onDecrement={() => decrementSkill('一千叩首')} img="🙇" colorType="green" />
        <SkillCircle name="每日用三寶" count={userData?.stats?.每日用三寶} onClick={() => incrementSkill('每日用三寶')} onDecrement={() => decrementSkill('每日用三寶')} img="🧘" colorType="green" />
        <SkillCircle name="整理環境" count={userData?.stats?.整理環境} onClick={() => incrementSkill('整理環境')} onDecrement={() => decrementSkill('整理環境')} img="🧹" colorType="green" />
        <SkillCircle name="轉念" count={userData?.stats?.轉念} onClick={() => incrementSkill('轉念')} onDecrement={() => decrementSkill('轉念')} img="🔄" colorType="green" />
        <SkillCircle name="佈施" count={userData?.stats?.佈施} onClick={() => incrementSkill('佈施')} onDecrement={() => decrementSkill('佈施')} img="🤲" colorType="green" />
        <SkillCircle name="忍辱" count={userData?.stats?.忍辱} onClick={() => incrementSkill('忍辱')} onDecrement={() => decrementSkill('忍辱')} img="💎" colorType="green" />
      </Quadrant>

      <Quadrant title="正向溝通 (講)" motto="講道越講入性理" icon="🗣️" colorType="yellow">
        <SkillCircle name="推薦朋友" count={userData?.stats?.推薦朋友} onClick={() => incrementSkill('推薦朋友')} onDecrement={() => decrementSkill('推薦朋友')} img="🤝" colorType="yellow" />
        <SkillCircle name="分享好文" count={userData?.stats?.分享好文} onClick={() => incrementSkill('分享好文')} onDecrement={() => decrementSkill('分享好文')} img="📱" colorType="yellow" />
        <SkillCircle name="關心成全一個人" count={userData?.stats?.關心成全一個人} onClick={() => incrementSkill('關心成全一個人')} onDecrement={() => decrementSkill('關心成全一個人')} img="💖" colorType="yellow" />
        <SkillCircle name="分享道在日常" count={userData?.stats?.分享道在日常} onClick={() => incrementSkill('分享道在日常')} onDecrement={() => decrementSkill('分享道在日常')} img="☀️" colorType="yellow" />
      </Quadrant>

      <Quadrant title="行動服務 (辦)" motto="辦道越辦越契機" icon="👼" colorType="yellow">
        <SkillCircle name="開伙幫廚" count={userData?.stats?.開伙幫廚} onClick={() => incrementSkill('開伙幫廚')} onDecrement={() => decrementSkill('開伙幫廚')} img="🍳" colorType="yellow" />
        <SkillCircle name="壇務工作" count={userData?.stats?.壇務工作} onClick={() => incrementSkill('壇務工作')} onDecrement={() => decrementSkill('壇務工作')} img="🕯️" colorType="yellow" />
        <SkillCircle name="淨灘/山志工" count={userData?.stats?.淨灘山志工} onClick={() => incrementSkill('淨灘山志工')} onDecrement={() => decrementSkill('淨灘山志工')} img="🌊" colorType="yellow" />
        <SkillCircle name="營隊志工" count={userData?.stats?.營隊志工} onClick={() => incrementSkill('營隊志工')} onDecrement={() => decrementSkill('營隊志工')} img="🎈" colorType="yellow" />
        <SkillCircle name="初一十五獻供" count={userData?.stats?.初一十五獻供} onClick={() => incrementSkill('初一十五獻供')} onDecrement={() => decrementSkill('初一十五獻供')} img="🍎" colorType="yellow" />
        <SkillCircle name="法會實務" count={userData?.stats?.法會實務} onClick={() => incrementSkill('法會實務')} onDecrement={() => decrementSkill('法會實務')} img="🏗️" colorType="yellow" />
        <SkillCircle name="渡人求道" count={userData?.stats?.渡人求道} onClick={() => incrementSkill('渡人求道')} onDecrement={() => decrementSkill('渡人求道')} img="⛵" colorType="yellow" />
      </Quadrant>
    </div>
  );
}