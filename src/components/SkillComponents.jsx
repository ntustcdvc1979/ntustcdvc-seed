import { theme } from "../styles/theme";

export function Quadrant({ title, motto, icon, colorType, children }) {
  const bgColor = colorType === 'green' ? 'bg-[#bad32d]/5' : 'bg-[#f5be30]/5';

  return (
    <div className={`p-6 rounded-[2.5rem] ${bgColor} relative flex flex-col items-center`}>
      <div className="flex items-center gap-3 mb-6 w-full justify-center">
        <span className="text-3xl">{icon}</span>
        <div className="text-center">
          <h3 className="font-black text-xl leading-none" style={{ color: theme.dark }}>{title}</h3>
          <p className="text-base font-black mt-1 uppercase tracking-widest" style={{ color: '#9ca3af' }}>
            {motto}
          </p>
        </div>
      </div>
      
      <div className="flex flex-wrap gap-x-8 gap-y-10 justify-center w-full">
        {children}
      </div>
    </div>
  );
}

export function SkillCircle({ name, count, onClick, onDecrement, img, colorType }) {
  const shadowColor = colorType === 'green' ? '#a5bc28' : '#d4a017';
  const badgeColor = colorType === 'green' ? 'bg-[#bad32d]' : 'bg-[#f5be30]';
  const labelBaseClass = "absolute w-7 h-7 rounded-full flex items-center justify-center font-black border-2 border-[#1a1a1a] shadow-sm text-xs transition-all duration-200";

  return (
    <div className="flex flex-col items-center gap-3 group">
      <div className="relative">
        {/* 可點擊的圓圈 */}
        <button 
          onClick={onClick} 
          style={{ boxShadow: `6px 6px 0px 0px ${shadowColor}` }}
          className="w-20 h-20 cursor-pointer rounded-full border-4 border-[#1a1a1a] bg-white flex items-center justify-center text-3xl active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all relative z-10"
        >
          {img}
        </button>

        {/* 右上角次數 */}
        <div className={`${labelBaseClass} -top-1 -right-1 ${badgeColor} text-white z-20`} >
          {count || 0}
        </div>

        {/* 左上角負號按鈕 */}
        <button
          onClick={(e) => {
            e.stopPropagation(); 
            onDecrement();
          }}
          className={`
            ${labelBaseClass} -top-1 -left-1 bg-red-500 cursor-pointer text-white z-30 active:scale-75
            ${count > 0 ? 'opacity-100 scale-100' : 'opacity-0 scale-0 pointer-events-none'}
          `}
        >
          －
        </button>
      </div>

      <span 
        className="text-sm font-black leading-tight text-center break-words"
        style={{ 
          maxWidth: '80px', // 配合圓圈寬度加大
          color: theme.dark,
          textShadow: '0.5px 0.5px 0px white' // 稍微增加立體感
        }}
      >
        {name}
      </span>
    </div>
  );
}