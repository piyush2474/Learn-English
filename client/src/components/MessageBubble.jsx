import React, { useState, useEffect, useRef } from 'react';
import { Trash2, X, Maximize2, Check, CheckCheck, Pencil, Reply } from 'lucide-react';
import { hasRenderableReply, getReplySnippetDisplay } from '../utils/replyPreview';

const SWIPE_THRESHOLD_PX = 52;
const LONG_PRESS_MS = 600;
const MOVE_CANCEL_LONGPRESS_PX = 14;

const MessageBubble = ({
  message,
  isSelf,
  timestamp,
  type,
  messageId,
  onDelete,
  onComposerEdit,
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
  const [showMobileActions, setShowMobileActions] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const menuRef = useRef(null);
  const longPressTimerRef = useRef(null);
  const swipeStartRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMobileActions(false);
        setShowEmojiPicker(false);
      }
    };

    if (showMobileActions || showEmojiPicker) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [showMobileActions, showEmojiPicker]);

  const romanticEmojis = ['❤️', '😘', '🥰', '💋', '👍', '🔥'];

  const clearLongPressTimer = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleLongPress = () => {
    longPressTimerRef.current = null;
    setShowEmojiPicker(true);
    setShowMobileActions(true);
  };

  const handlePointerDown = (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    swipeStartRef.current = { x: e.clientX, y: e.clientY };
    clearLongPressTimer();
    longPressTimerRef.current = setTimeout(handleLongPress, LONG_PRESS_MS);
  };

  const handlePointerMove = (e) => {
    if (!swipeStartRef.current) return;
    const dx = e.clientX - swipeStartRef.current.x;
    const dy = e.clientY - swipeStartRef.current.y;
    if (Math.abs(dx) > MOVE_CANCEL_LONGPRESS_PX || Math.abs(dy) > MOVE_CANCEL_LONGPRESS_PX) {
      clearLongPressTimer();
    }
  };

  const handlePointerUp = (e) => {
    clearLongPressTimer();
    if (!swipeStartRef.current) return;
    const dx = e.clientX - swipeStartRef.current.x;
    const dy = e.clientY - swipeStartRef.current.y;
    swipeStartRef.current = null;

    const horizontal = Math.abs(dx) >= SWIPE_THRESHOLD_PX;
    const notTooVertical = Math.abs(dy) < 56;
    const dominantHorizontal = Math.abs(dx) >= Math.abs(dy) * 1.05;

    if (horizontal && notTooVertical && dominantHorizontal) {
      onReply();
    }
  };

  const handlePointerCancel = () => {
    clearLongPressTimer();
    swipeStartRef.current = null;
  };

  const reactionGroups = reactions.reduce((acc, curr) => {
    acc[curr.emoji] = (acc[curr.emoji] || 0) + 1;
    return acc;
  }, {});

  const actionsOpen = showMobileActions || showEmojiPicker;

  return (
    <div
      className={`
        w-full px-4 py-2 flex ${isSelf ? 'justify-end' : 'justify-start'}
        animate-in fade-in slide-in-from-bottom-2 duration-300
        relative isolate touch-pan-y
        ${actionsOpen ? 'z-200' : 'z-0 hover:z-100'}
      `}
    >
      <div
        className={`max-w-[85%] md:max-w-[70%] relative group ${isSelf ? 'items-end' : 'items-start'} flex flex-col select-none`}
        onContextMenu={(e) => {
          e.preventDefault();
          handleLongPress();
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onDoubleClick={() => onReact('❤️')}
      >
        {!isSelf && (
          <span className="text-[12px] font-bold text-blue-400 ml-1 mb-1 opacity-80">
            {partnerName || 'Stranger'}
          </span>
        )}

        {hasRenderableReply(replyTo) && (
          <div
            className={`
            mb-[-8px] w-full max-w-full min-w-0 mr-2 ml-2 rounded-t-2xl border border-b-0 overflow-hidden
            ${isSelf
              ? 'bg-black/25 border-white/15'
              : 'bg-black/25 border-white/10'
            }
          `}
          >
            <div className="flex gap-2.5 px-3 py-2 min-w-0 items-stretch">
              <div className={`w-[3px] shrink-0 rounded-full self-stretch ${isSelf ? 'bg-white/70' : 'bg-primary'}`} />
              <div className="min-w-0 flex-1 overflow-hidden">
                <p className={`text-[10px] font-bold uppercase tracking-wider truncate ${isSelf ? 'text-white/80' : 'text-primary/90'}`}>
                  {replyTo.senderId === localStorage.getItem('chat_user_id') ? 'You' : partnerName || 'Contact'}
                </p>
                <p className={`text-[12px] leading-snug truncate mt-0.5 ${isSelf ? 'text-white/85' : 'text-gray-300'}`}>
                  {getReplySnippetDisplay(replyTo, 120)}
                </p>
              </div>
            </div>
          </div>
        )}

        <div
          className={`
          relative px-4 py-2.5 rounded-2xl shadow-lg transition-all duration-300 z-10
          ${isSelf
            ? 'gradient-primary text-white rounded-tr-none shadow-primary/20'
            : 'glass-panel text-gray-100 rounded-tl-none border border-white/10'
          }
        `}
        >
          <div
            ref={menuRef}
            className={`
            absolute -bottom-12 flex items-center gap-0.5 p-1 bg-[#1a1c2e]/95 backdrop-blur-2xl border border-white/10 rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.5)] z-300 transition-all duration-200
            ${showMobileActions || showEmojiPicker ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-90 translate-y-[-10px] pointer-events-none md:group-hover:opacity-100 md:group-hover:scale-100 md:group-hover:translate-y-0 md:group-hover:pointer-events-auto'}
            ${isSelf ? 'right-0' : 'left-0'}
            min-w-max
          `}
          >
            <div className="flex gap-0.5 px-1 border-r border-white/10 mr-0.5">
              {romanticEmojis.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onReact(emoji);
                    setShowEmojiPicker(false);
                    setShowMobileActions(false);
                  }}
                  className="w-7 h-7 flex items-center justify-center text-[18px] hover:scale-125 hover:bg-white/5 rounded-full transition-all"
                >
                  {emoji}
                </button>
              ))}
            </div>

            <div className="flex gap-0.5 px-0.5">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onReply();
                  setShowMobileActions(false);
                }}
                className="p-1.5 hover:bg-white/10 rounded-full transition-colors group/act"
                title="Reply"
              >
                <Reply className="w-3.5 h-3.5 text-blue-400 group-hover/act:scale-110" />
              </button>

              {isSelf && type === 'text' && onComposerEdit && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onComposerEdit();
                    setShowMobileActions(false);
                  }}
                  className="p-1.5 hover:bg-white/10 rounded-full transition-colors group/act"
                  title="Edit"
                >
                  <Pencil className="w-3.5 h-3.5 text-green-400 group-hover/act:scale-110" />
                </button>
              )}

              {isSelf && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(messageId);
                    setShowMobileActions(false);
                  }}
                  className="p-1.5 hover:bg-white/10 rounded-full transition-colors group/act"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-400 group-hover/act:scale-110" />
                </button>
              )}

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMobileActions(false);
                  setShowEmojiPicker(false);
                }}
                className="p-1.5 hover:bg-white/10 rounded-full transition-colors group/act ml-1"
              >
                <X className="w-3.5 h-3.5 text-gray-500 group-hover/act:text-white" />
              </button>
            </div>
          </div>

          <div className="text-[15px] leading-relaxed break-words">
            {type === 'image' ? (
              <div
                onClick={() => !isUploading && onZoom(message)}
                className="relative mt-1 w-44 h-14 rounded-xl overflow-hidden border border-white/10 shadow-inner group/img cursor-pointer flex items-center px-3 gap-3 bg-black/20 hover:bg-black/40 transition-all"
              >
                <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 relative">
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
            ) : (
              <span className="whitespace-pre-wrap">{message}</span>
            )}
          </div>

          <div className={`flex items-center justify-end gap-1.5 mt-1 ${isSelf ? 'text-white/40' : 'text-gray-500'}`}>
            {initialIsEdited && (
              <span className="text-[9px] font-black italic uppercase tracking-tighter opacity-60">Edited</span>
            )}
            <span className="text-[10px] font-medium">
              {new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
            </span>
            {isSelf && (
              <span className="ml-1 flex items-center">
                {status === 'failed' ? (
                  <span className="text-[9px] font-bold text-red-300 uppercase tracking-tight">Failed</span>
                ) : status === 'queued' ? (
                  <span className="text-[9px] font-semibold text-white/50 uppercase tracking-tight">Queued</span>
                ) : status === 'sending' ? (
                  <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white/70 rounded-full animate-spin" />
                ) : status === 'seen' ? (
                  <CheckCheck className="w-3.5 h-3.5 text-blue-400" />
                ) : (
                  <Check className="w-3.5 h-3.5 text-white/40" />
                )}
              </span>
            )}
          </div>
        </div>

        {Object.keys(reactionGroups).length > 0 && (
          <div className={`flex flex-wrap gap-1 mt-[-6px] z-20 ${isSelf ? 'justify-end' : 'justify-start'}`}>
            {Object.entries(reactionGroups).map(([emoji, count]) => (
              <button
                key={emoji}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onReact(emoji);
                }}
                className={`
                  flex items-center gap-1 px-1.5 py-0.5 rounded-full border border-white/10 text-[11px] backdrop-blur-md transition-all active:scale-90
                  ${reactions.some((r) => r.emoji === emoji && r.userId === localStorage.getItem('chat_user_id'))
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
