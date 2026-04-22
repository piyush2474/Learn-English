import React, { useState } from 'react';
import { User, Languages, Trash2, X, Maximize2 } from 'lucide-react';

const MessageBubble = ({ message, isSelf, timestamp, type, messageId, onDelete }) => {
  const [isZoomed, setIsZoomed] = useState(false);

  return (
    <div className={`w-full py-6 group ${!isSelf ? 'bg-[#2f2f2f]' : 'bg-transparent hover:bg-white/[0.02]'}`}>
      <div className="max-w-3xl mx-auto px-4 flex gap-4 md:gap-6 relative">
        <div className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 ${
          isSelf ? 'bg-[#3b82f6]' : 'bg-[#10a37f]'
        }`}>
          {isSelf ? (
            <User className="w-5 h-5 text-white" />
          ) : (
            <Languages className="w-5 h-5 text-white" />
          )}
        </div>
        
        <div className="flex-1 flex flex-col pt-0.5">
          <div className="flex items-center justify-between mb-1">
            <div className="font-bold text-gray-100 text-[14px]">
              {isSelf ? 'You' : 'Stranger'}
            </div>
            {isSelf && (
              <button 
                onClick={() => onDelete(messageId)}
                className="p-1.5 bg-red-500/10 text-red-400 hover:text-red-500 rounded-lg transition-all"
                title="Delete for Everyone"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
          
          <div className="text-[15px] leading-relaxed text-gray-200 prose prose-invert max-w-none">
            {type === 'image' ? (
              <div className="relative mt-1 w-32 h-32 sm:w-40 sm:h-40 rounded-xl overflow-hidden border border-white/10 shadow-xl group/img cursor-pointer">
                <img 
                  src={message} 
                  alt="shared" 
                  className="w-full h-full object-cover transition-all duration-300 blur-md group-hover/img:blur-0 group-hover/img:scale-105"
                  onClick={() => setIsZoomed(true)}
                />
                <div 
                  onClick={() => setIsZoomed(true)}
                  className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-100 group-hover/img:opacity-0 transition-opacity"
                >
                  <Maximize2 className="w-5 h-5 text-white/70" />
                </div>
              </div>
            ) : (
              message
            )}
          </div>
          <div className="text-[11px] mt-2 text-gray-500 font-medium opacity-50 uppercase tracking-tight">
            {new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>

      {/* Full Screen Image Modal */}
      {isZoomed && (
        <div className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center p-4 backdrop-blur-sm">
          <button 
            onClick={() => setIsZoomed(false)}
            className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
          >
            <X className="w-8 h-8" />
          </button>
          <img 
            src={message} 
            alt="zoomed" 
            className="max-w-full max-h-full rounded-lg shadow-2xl animate-in zoom-in-95 duration-200"
          />
        </div>
      )}
    </div>
  );
};

export default MessageBubble;
