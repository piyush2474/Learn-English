import React, { useState, useEffect, useRef } from 'react';
import { User, Languages, Trash2, X, Maximize2, Download, Check, CheckCheck, Pencil, Save, Reply } from 'lucide-react';

const MessageBubble = ({ 
  message, 
  isSelf, 
  timestamp, 
  type, 
  messageId, 
  onDelete, 
  onEdit,
  onReply,
  onReact,
  reactions = [],
  replyTo,
  partnerName, 
  status, 
  onZoom, 
  isUploading,
  isEdited: initialIsEdited 
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [showMobileActions, setShowMobileActions] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [editText, setEditText] = useState(message);
  const editInputRef = useRef(null);
  const longPressTimer = useRef(null);

  const romanticEmojis = ['❤️', '😘', '🥰', '💋', '👍', '🔥'];

  const handleLongPress = () => {
    setShowEmojiPicker(true);
    setShowMobileActions(true);
  };

  const onTouchStart = () => {
    longPressTimer.current = setTimeout(handleLongPress, 600);
  };

  const onTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
  };

  const onTouchMove = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
  };

  useEffect(() => {
    if (isEditing && editInputRef.current) {
      editInputRef.current.focus();
    }
  }, [isEditing]);

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

  // Group reactions by emoji
  const reactionGroups = reactions.reduce((acc, curr) => {
    acc[curr.emoji] = (acc[curr.emoji] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className={`w-full px-4 py-2 flex ${isSelf ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
      <div 
        className={`max-w-[85%] md:max-w-[70%] relative group ${isSelf ? 'items-end' : 'items-start'} flex flex-col`}
        onContextMenu={(e) => { e.preventDefault(); handleLongPress(); }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onTouchMove={onTouchMove}
        onDoubleClick={() => onReact('❤️')}
      >
        {/* Sender Name */}
        {!isSelf && (
          <span className="text-[12px] font-bold text-blue-400 ml-1 mb-1 opacity-80">
            {partnerName || 'Stranger'}
          </span>
        )}

        {/* Reply Preview */}
        {replyTo && (
          <div className={`
            mb-[-8px] px-3 pt-2 pb-4 rounded-t-xl text-[12px] flex items-center gap-2 border-x border-t border-white/5
            ${isSelf ? 'bg-primary/30 mr-2' : 'bg-white/5 ml-2'}
          `}>
            <div className="w-0.5 h-6 bg-primary rounded-full" />
            <div className="flex-1 min-w-0 opacity-60">
              <p className="font-bold uppercase tracking-tighter text-[10px]">
                {replyTo.senderId === localStorage.getItem('chat_user_id') ? 'You' : partnerName}
              </p>
              <p className="truncate italic">
                {replyTo.type === 'image' ? 'Photo' : replyTo.message}
              </p>
            </div>
          </div>
        )}

        {/* Bubble Container */}
        <div className={`
          relative px-4 py-2.5 rounded-2xl shadow-lg transition-all duration-300 z-10
          ${isSelf 
            ? 'gradient-primary text-white rounded-tr-none shadow-primary/20' 
            : 'glass-panel text-gray-100 rounded-tl-none border border-white/10'
          }
          ${isEditing ? 'w-full min-w-[200px]' : ''}
        `}>
          {/* Actions Menu */}
          <div className={`
            absolute -bottom-12 flex items-center gap-0.5 p-1 bg-[#1a1c2e]/95 backdrop-blur-2xl border border-white/10 rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.5)] z-30 transition-all duration-200
            ${showMobileActions || showEmojiPicker ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-90 translate-y-[-10px] pointer-events-none md:group-hover:opacity-100 md:group-hover:scale-100 md:group-hover:translate-y-0 md:group-hover:pointer-events-auto'}
            ${isSelf ? 'right-0' : 'left-0'}
            min-w-max
          `}>
            {/* Emoji Quick Picker */}
            <div className="flex gap-0.5 px-1 border-r border-white/10 mr-0.5">
              {romanticEmojis.map(emoji => (
                <button 
                  key={emoji}
                  onClick={(e) => { e.stopPropagation(); onReact(emoji); setShowEmojiPicker(false); setShowMobileActions(false); }}
                  className="w-7 h-7 flex items-center justify-center text-[18px] hover:scale-125 hover:bg-white/5 rounded-full transition-all"
                >
                  {emoji}
                </button>
              ))}
            </div>
            
            <div className="flex gap-0.5 px-0.5">
              <button 
                onClick={(e) => { e.stopPropagation(); onReply(); setShowMobileActions(false); }}
                className="p-1.5 hover:bg-white/10 rounded-full transition-colors group/act"
                title="Reply"
              >
                <Reply className="w-3.5 h-3.5 text-blue-400 group-hover/act:scale-110" />
              </button>

              {isSelf && type === 'text' && (
                <button 
                  onClick={(e) => { e.stopPropagation(); setIsEditing(true); setShowMobileActions(false); }}
                  className="p-1.5 hover:bg-white/10 rounded-full transition-colors group/act"
                >
                  <Pencil className="w-3.5 h-3.5 text-green-400 group-hover/act:scale-110" />
                </button>
              )}

              {isSelf && (
                <button 
                  onClick={(e) => { e.stopPropagation(); onDelete(messageId); setShowMobileActions(false); }}
                  className="p-1.5 hover:bg-white/10 rounded-full transition-colors group/act"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-400 group-hover/act:scale-110" />
                </button>
              )}
              
              <button 
                onClick={(e) => { e.stopPropagation(); setShowMobileActions(false); setShowEmojiPicker(false); }}
                className="p-1.5 hover:bg-white/10 rounded-full transition-colors group/act ml-1"
              >
                <X className="w-3.5 h-3.5 text-gray-500 group-hover/act:text-white" />
              </button>
            </div>
          </div>

          {/* Message Content */}
          <div className="text-[15px] leading-relaxed break-words">
            {type === 'image' ? (
              <div 
                onClick={() => !isUploading && onZoom(message)}
                className="relative mt-1 w-44 h-14 rounded-xl overflow-hidden border border-white/10 shadow-inner group/img cursor-pointer flex items-center px-3 gap-3 bg-black/20 hover:bg-black/40 transition-all"
              >
                <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 relative">
                  <img src={message} alt="shared" className="w-full h-full object-cover blur-md scale-150" />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                    {isUploading ? (
                      <div className="w-4 h-4 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
                    ) : (
                      <Maximize2 className="w-4 h-4 text-white/70" />
                    )}
                  </div>
                </div>
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="text-[13px] font-bold text-white/90 truncate uppercase tracking-wider">
                    {isUploading ? 'Sending...' : 'Photo'}
                  </span>
                  <span className="text-[10px] text-white/40 font-medium truncate">Tap to view</span>
                </div>
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
                  <button onClick={() => { setIsEditing(false); setEditText(message); }} className="px-3 py-1 rounded-lg text-[11px] font-bold bg-white/5 hover:bg-white/10 transition-colors">Cancel</button>
                  <button onClick={handleSaveEdit} className="px-3 py-1 rounded-lg text-[11px] font-bold bg-white text-black hover:bg-gray-200 transition-colors flex items-center gap-1">
                    <Save className="w-3 h-3" /> Save
                  </button>
                </div>
              </div>
            ) : (
              <span className="whitespace-pre-wrap">{message}</span>
            )}
          </div>

          {/* Timestamp and Tags */}
          <div className={`flex items-center justify-end gap-1.5 mt-1 ${isSelf ? 'text-white/40' : 'text-gray-500'}`}>
            {initialIsEdited && <span className="text-[9px] font-black italic uppercase tracking-tighter opacity-60">Edited</span>}
            <span className="text-[10px] font-medium">
              {new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
            </span>
            {isSelf && (
              <span className="ml-1">
                {status === 'seen' ? <CheckCheck className="w-3.5 h-3.5 text-blue-400" /> : <Check className="w-3.5 h-3.5 text-white/40" />}
              </span>
            )}
          </div>
        </div>

        {/* Reaction Pills */}
        {Object.keys(reactionGroups).length > 0 && (
          <div className={`flex flex-wrap gap-1 mt-[-6px] z-20 ${isSelf ? 'justify-end' : 'justify-start'}`}>
            {Object.entries(reactionGroups).map(([emoji, count]) => (
              <button
                key={emoji}
                onClick={(e) => { e.stopPropagation(); onReact(emoji); }}
                className={`
                  flex items-center gap-1 px-1.5 py-0.5 rounded-full border border-white/10 text-[11px] backdrop-blur-md transition-all active:scale-90
                  ${reactions.some(r => r.emoji === emoji && r.userId === localStorage.getItem('chat_user_id'))
                    ? 'bg-primary/20 border-primary/30 scale-105'
                    : 'bg-[#1a1c2e]/80'
                  }
                `}
              >
                <span>{emoji}</span>
                {count > 1 && <span className="font-bold opacity-70">{count}</span>}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageBubble;

