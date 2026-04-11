import { theme } from "../styles/theme";

export function Quadrant({ title, motto, icon, colorType, children }) {
  const borderColor = colorType === 'green' ? 'border-[#bad32d]' : 'border-[#f5be30]';
  const bgColor = colorType === 'green' ? 'bg-[#bad32d]/5' : 'bg-[#f5be30]/5';

  return (
    <div className={`p-6 rounded-[2.5rem] border-4 ${borderColor} ${bgColor} relative`}>
      <div className="flex items-center gap-2 mb-4">
        <span className="text-2xl">{icon}</span>
        <div>
          <h3 className="font-black text-lg leading-none" style={{ color: theme.dark }}>{title}</h3>
          <p className="text-sm font-black mt-1 uppercase tracking-tight" style={{ color: '#9ca3af' }}>
            {motto}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-6 pl-2">{children}</div>
    </div>
  );
}

export function SkillCircle({ name, count, onClick, onDecrement, img, colorType }) {
  const shadowColor = colorType === 'green' ? '#a5bc28' : '#d4a017';
  const badgeColor = colorType === 'green' ? 'bg-[#bad32d]' : 'bg-[#f5be30]';
  const labelBaseClass = "absolute w-6 h-6 rounded-full flex items-center justify-center font-black border-2 border-[#1a1a1a] shadow-sm text-[10px] transition-all duration-200";

  return (
    <div className="flex flex-col items-center gap-2 group">
      <div className="relative">
        <button 
          onClick={onClick} 
          style={{ boxShadow: `4px 4px 0px 0px ${shadowColor}` }}
          className="w-16 h-16 rounded-full border-4 border-[#1a1a1a] bg-white flex items-center justify-center text-2xl active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all relative"
        >
          {img}
        </button>

        {/* 右上角次數 */}
        <div className={`${labelBaseClass} -top-2 -right-2 ${badgeColor} text-white`} >
          {count || 0}
        </div>

        {/* 左上角負號按鈕 (小紅圈) */}
        <button
          onClick={(e) => {
            e.stopPropagation(); 
            onDecrement();
          }}
          className={`
            ${labelBaseClass} -top-2 -left-2 bg-red-500 text-white z-20 active:scale-75
            ${count > 0 ? 'opacity-100 scale-100' : 'opacity-0 scale-0 pointer-events-none'}
          `}
        >
          －
        </button>

        <span 
          className="text-[11px] font-black leading-tight text-center break-words"
          style={{ 
            maxWidth: '64px', // 約 5 個中文字的寬度
            wordBreak: 'break-all' 
          }}
        >
          {name}
        </span>
      </div>
    </div>
  );
}