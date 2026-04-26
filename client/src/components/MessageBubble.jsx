import React, { useState } from 'react';
import { User, Languages, Trash2, X, Maximize2, Download, Check, CheckCheck } from 'lucide-react';

const MessageBubble = ({ message, isSelf, timestamp, type, messageId, onDelete, partnerName, status, onZoom, isUploading }) => {
  const [isZoomed, setIsZoomed] = useState(false);
  const [isRevealed, setIsRevealed] = useState(isSelf); // Auto-reveal own messages

  const handleDownload = (e) => {
    e.stopPropagation();
    const link = document.createElement('a');
    link.href = message;
    link.download = `shared_image_${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImageClick = () => {
    if (isUploading) return;
    onZoom(message);
  };

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
          relative px-4 py-2.5 rounded-2xl shadow-lg transition-all duration-300
          ${isSelf 
            ? 'gradient-primary text-white rounded-tr-none shadow-primary/20' 
            : 'glass-panel text-gray-100 rounded-tl-none border border-white/10'
          }
        `}>
          {/* Delete Button for Self Images */}
          {isSelf && type === 'image' && !isUploading && (
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
              <div 
                onClick={handleImageClick}
                className="relative mt-1 w-44 h-14 rounded-xl overflow-hidden border border-white/10 shadow-inner group/img cursor-pointer flex items-center px-3 gap-3 bg-black/20 hover:bg-black/40 transition-all"
              >
                {/* Tiny blurred preview in the pill */}
                <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 relative">
                  <img 
                    src={message} 
                    alt="shared" 
                    className="w-full h-full object-cover blur-md scale-150"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                    {isUploading ? (
                      <div className="w-4 h-4 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
                    ) : (
                      <Languages className="w-4 h-4 text-white/70" />
                    )}
                  </div>
                </div>

                <div className="flex flex-col flex-1 min-w-0">
                  <span className="text-[13px] font-bold text-white/90 truncate uppercase tracking-wider">
                    {isUploading ? 'Sending...' : 'Photo Received'}
                  </span>
                  <span className="text-[10px] text-white/40 font-medium">Click to view full</span>
                </div>

                <Maximize2 className="w-4 h-4 text-white/20 group-hover/img:text-white/60 transition-colors" />
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
            {isSelf && (
              <span className="ml-1">
                {status === 'seen' ? (
                  <CheckCheck className="w-3.5 h-3.5 text-blue-400" />
                ) : (
                  <Check className="w-3.5 h-3.5 text-white/40" />
                )}
              </span>
            )}
          </div>
        </div>
      </div>

    </div>
  );
};

export default MessageBubble;
