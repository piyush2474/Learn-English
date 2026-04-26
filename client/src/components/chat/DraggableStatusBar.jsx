import React from 'react';
import { GripVertical, Mic, Volume2, Volume1, PhoneOff } from 'lucide-react';

const DraggableStatusBar = ({
  statusBarY,
  onDragStart,
  isSpeaking,
  callAccepted,
  isSpeakerMode,
  setIsSpeakerMode,
  onEndCall
}) => {
  return (
    <div 
      style={{ top: `${statusBarY}px` }}
      onMouseDown={onDragStart}
      onTouchStart={onDragStart}
      className={`fixed left-1/2 -translate-x-1/2 z-[80] bg-black/60 backdrop-blur-xl border px-4 py-2 rounded-full shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex items-center gap-3 transition-all cursor-move select-none active:scale-[0.98] ${
        isSpeaking ? 'border-green-500 shadow-[0_0_30px_rgba(34,197,94,0.3)]' : 'border-white/10'
      }`}
    >
      {/* Drag Handle */}
      <div className="p-1 text-gray-600 hover:text-gray-400 transition-colors">
        <GripVertical className="w-4 h-4" />
      </div>

      <div className="flex items-center gap-2 pr-1">
        <div className={`w-2.5 h-2.5 rounded-full relative ${isSpeaking ? 'bg-green-500' : 'bg-gray-600'}`}>
          {isSpeaking && <div className="absolute inset-0 bg-green-500 rounded-full animate-ping opacity-75"></div>}
        </div>
        <span className="text-[13px] font-bold text-white tracking-tight whitespace-nowrap">
          {callAccepted ? "On Call" : "Calling..."}
        </span>
        {isSpeaking && <Mic className="w-3.5 h-3.5 text-green-500 animate-pulse" />}
      </div>

      <div className="h-5 w-[1px] bg-white/10 mx-1" />

      <div className="flex items-center gap-1.5">
        <button 
          onClick={(e) => { e.stopPropagation(); setIsSpeakerMode(!isSpeakerMode); }}
          title={isSpeakerMode ? "Switch to Ear Mode" : "Switch to Speaker Mode"}
          className={`p-2 rounded-xl transition-all ${
            isSpeakerMode ? 'bg-green-500 text-black shadow-lg shadow-green-500/20' : 'hover:bg-white/5 text-gray-400'
          }`}
        >
          {isSpeakerMode ? <Volume2 className="w-4 h-4" /> : <Volume1 className="w-4 h-4" />}
        </button>

        <button 
          onClick={(e) => { e.stopPropagation(); onEndCall(); }}
          title="End Call"
          className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-500 rounded-xl transition-all border border-red-500/20"
        >
          <PhoneOff className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default DraggableStatusBar;
