import React, { useState, useEffect, useRef } from 'react';
import { User, Languages, Trash2, X, Maximize2, Download, Check, CheckCheck, Pencil, Save } from 'lucide-react';

const MessageBubble = ({ 
  message, 
  isSelf, 
  timestamp, 
  type, 
  messageId, 
  onDelete, 
  onEdit,
  partnerName, 
  status, 
  onZoom, 
  isUploading,
  isEdited: initialIsEdited 
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message);
  const [isRevealed, setIsRevealed] = useState(isSelf);
  const editInputRef = useRef(null);

  useEffect(() => {
    if (isEditing && editInputRef.current) {
      editInputRef.current.focus();
    }
  }, [isEditing]);

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

  const handleSaveEdit = () => {
    if (editText.trim() && editText !== message) {
      onEdit(messageId, editText);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditText(message);
    }
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
          ${isEditing ? 'w-full min-w-[200px]' : ''}
        `}>
          {/* Actions for Self Messages */}
          {isSelf && !isUploading && (
            <div className="absolute -top-3 -left-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
              {type === 'text' && !isEditing && (
                <button 
                  onClick={() => setIsEditing(true)}
                  className="p-1.5 bg-blue-500 text-white rounded-full shadow-lg hover:scale-110 active:scale-95 transition-all"
                  title="Edit Message"
                >
                  <Pencil className="w-3 h-3" />
                </button>
              )}
              <button 
                onClick={() => onDelete(messageId)}
                className="p-1.5 bg-red-500 text-white rounded-full shadow-lg hover:scale-110 active:scale-95 transition-all"
                title="Delete for Everyone"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
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
            ) : isEditing ? (
              <div className="flex flex-col gap-2 py-1">
                <textarea
                  ref={editInputRef}
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="w-full bg-black/20 border border-white/10 rounded-lg px-2 py-1.5 text-white text-[14px] focus:outline-none focus:border-white/30 resize-none min-h-[60px]"
                />
                <div className="flex justify-end gap-2">
                  <button 
                    onClick={() => { setIsEditing(false); setEditText(message); }}
                    className="px-3 py-1 rounded-lg text-[11px] font-bold bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleSaveEdit}
                    className="px-3 py-1 rounded-lg text-[11px] font-bold bg-white text-black hover:bg-gray-200 transition-colors flex items-center gap-1"
                  >
                    <Save className="w-3 h-3" /> Save
                  </button>
                </div>
              </div>
            ) : (
              <span className="whitespace-pre-wrap">{message}</span>
            )}
          </div>

          {/* Timestamp, Status and Edited tag */}
          <div className={`flex items-center justify-end gap-1.5 mt-1 ${isSelf ? 'text-white/40' : 'text-gray-500'}`}>
            {initialIsEdited && (
              <span className="text-[9px] font-black italic uppercase tracking-tighter opacity-60">
                Edited
              </span>
            )}
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

