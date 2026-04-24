import React, { useState } from 'react';
import { User, Languages, Trash2, X, Maximize2, Download, Check, CheckCheck } from 'lucide-react';

const MessageBubble = ({ message, isSelf, timestamp, type, messageId, onDelete, partnerName, status, onZoom, isUploading }) => {
  const [isZoomed, setIsZoomed] = useState(false);

  const handleDownload = (e) => {
    e.stopPropagation();
    const link = document.createElement('a');
    link.href = message;
    link.download = `shared_image_${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
          relative px-4 py-2.5 rounded-2xl shadow-sm
          ${isSelf 
            ? 'bg-[#444654] text-white rounded-tr-sm' 
            : 'bg-[#2f2f2f] text-gray-100 rounded-tl-sm border border-white/5'
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
              <div className="relative mt-1 w-48 h-48 sm:w-60 sm:h-60 rounded-xl overflow-hidden border border-white/10 shadow-inner group/img cursor-pointer">
                <img 
                  src={message} 
                  alt="shared" 
                  className={`w-full h-full object-cover transition-all duration-300 group-hover/img:scale-105 ${isUploading ? 'blur-md scale-110' : ''}`}
                  onClick={() => !isUploading && onZoom(message)}
                />
                
                {isUploading && (
                  <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex flex-col items-center justify-center gap-3">
                    <div className="w-8 h-8 border-3 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
                    <span className="text-[10px] font-bold text-white tracking-widest uppercase">Sending...</span>
                  </div>
                )}

                {!isUploading && (
                  <button 
                    onClick={handleDownload}
                    className="absolute bottom-2 right-2 p-2 bg-black/60 hover:bg-black/80 text-white rounded-lg opacity-0 group-hover/img:opacity-100 transition-all transform translate-y-2 group-hover/img:translate-y-0"
                    title="Download Image"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                )}
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
