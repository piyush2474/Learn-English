import React, { useState } from 'react';
import { User, Languages, Trash2, X, Maximize2 } from 'lucide-react';

const MessageBubble = ({ message, isSelf, timestamp, type, messageId, onDelete, partnerName }) => {
  const [isZoomed, setIsZoomed] = useState(false);

  return (
    <div className={`w-full px-4 py-2 flex ${isSelf ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
      <div className={`max-w-[85%] md:max-w-[70%] relative group ${isSelf ? 'items-end' : 'items-start'} flex flex-col`}>
        {/* Sender Name (only for partner) */}
        {!isSelf && (
          <span className="text-[12px] font-bold text-blue-400 ml-1 mb-1 opacity-80">
            {partnerName || 'Stranger'}
          </span>
        )}

        {/* Bubble Container */}
        <div className={`
          relative px-4 py-2.5 rounded-2xl shadow-sm
          ${isSelf 
            ? 'bg-[#3b82f6] text-white rounded-tr-sm' 
            : 'bg-[#2f2f2f] text-gray-100 rounded-tl-sm'
          }
        `}>
          {/* Delete Button for Self Images */}
          {isSelf && type === 'image' && (
            <button 
              onClick={() => onDelete(messageId)}
              className="absolute -top-2 -left-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10 shadow-lg"
              title="Delete for Everyone"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}

          {/* Message Content */}
          <div className="text-[15px] leading-relaxed break-words">
            {type === 'image' ? (
              <div className="relative mt-1 w-48 h-48 sm:w-60 sm:h-60 rounded-xl overflow-hidden border border-white/10 shadow-inner group/img cursor-pointer">
                <img 
                  src={message} 
                  alt="shared" 
                  className="w-full h-full object-cover transition-all duration-300 group-hover/img:scale-105"
                  onClick={() => setIsZoomed(true)}
                />
              </div>
            ) : (
              <span className="whitespace-pre-wrap">{message}</span>
            )}
          </div>

          {/* Timestamp and Status */}
          <div className={`flex items-center justify-end gap-1 mt-1 ${isSelf ? 'text-white/40' : 'text-gray-500'}`}>
            <span className="text-[10px] font-medium">
              {new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
            </span>
          </div>
        </div>
      </div>

      {/* Full Screen Image Modal */}
      {isZoomed && (
        <div className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setIsZoomed(false)}>
          <button className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors">
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
