import React, { useRef, forwardRef } from 'react';
import { Plus, Send, X, Pencil } from 'lucide-react';
import { getReplySnippetDisplay } from '../../utils/replyPreview';

function truncatePreview(text, max = 72) {
  if (text == null || typeof text !== 'string') return '';
  const t = text.replace(/\s+/g, ' ').trim();
  if (!t) return '';
  return t.length <= max ? t : `${t.slice(0, max)}…`;
}

const ChatInput = forwardRef(function ChatInput(
  {
    inputText,
    handleTyping,
    handleSendMessage,
    handleImageUpload,
    status,
    roomId,
    isStealthMode,
    replyingTo,
    onCancelReply,
    editingMessage,
    onCancelEdit,
    partnerName,
    myUserId
  },
  ref
) {
  const fileInputRef = useRef(null);

  if (status === 'Idle' || isStealthMode) return null;

  const isDisabled = status !== 'Matched' && !roomId?.startsWith('private_');
  const isEditing = !!editingMessage;
  const replyName = replyingTo
    ? replyingTo.senderId === myUserId
      ? 'You'
      : partnerName || 'Contact'
    : '';
  const replySnippet = replyingTo ? getReplySnippetDisplay(replyingTo, 96) : '';

  return (
    <footer className="shrink-0 w-full max-w-4xl mx-auto px-4 pb-6 pt-2 z-30">
      {isEditing && (
        <div className="mb-2 mx-4 flex items-center gap-3 bg-amber-500/10 backdrop-blur-xl border border-amber-500/30 p-3 rounded-2xl animate-in slide-in-from-bottom-2 duration-300">
          <div className="w-1 h-8 bg-amber-400 rounded-full" />
          <Pencil className="w-4 h-4 text-amber-300 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold text-amber-200 uppercase tracking-wider">
              Editing message
            </p>
            <p className="text-[13px] text-gray-400 truncate italic">
              {truncatePreview(editingMessage.originalText, 100)}
            </p>
          </div>
          <button
            type="button"
            onClick={onCancelEdit}
            className="p-1.5 hover:bg-white/5 rounded-full text-gray-400 transition-colors"
            title="Cancel edit"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {!isEditing && replyingTo && (
        <div className="mb-2 mx-4 flex items-center gap-3 bg-[#1a1c2e]/95 backdrop-blur-xl border border-white/10 p-3 rounded-2xl shadow-lg shadow-black/20 animate-in slide-in-from-bottom-2 duration-300 min-w-0">
          <div className="w-1 shrink-0 self-stretch min-h-[2.5rem] rounded-full bg-primary/90" />
          <div className="flex-1 min-w-0 overflow-hidden">
            <p className="text-[11px] font-bold text-primary uppercase tracking-wider truncate">
              Replying to {replyName}
            </p>
            <p className="text-[13px] text-gray-300 truncate mt-0.5" title={replySnippet}>
              {replySnippet}
            </p>
          </div>
          <button
            type="button"
            onClick={onCancelReply}
            className="p-1.5 hover:bg-white/5 rounded-full text-gray-500 transition-colors"
            title="Cancel reply"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImageUpload}
        accept="image/*"
        className="hidden"
      />
      <form
        onSubmit={handleSendMessage}
        className={`relative flex items-center bg-[#1a1c2e]/80 backdrop-blur-xl rounded-[28px] border transition-all shadow-2xl shadow-black/40 ${
          isEditing
            ? 'border-amber-500/40 focus-within:border-amber-500/60'
            : 'border-white/10 focus-within:border-primary/50'
        }`}
      >
        <button
          type="button"
          onClick={() => fileInputRef.current.click()}
          disabled={isDisabled || isEditing}
          title={isEditing ? 'Finish editing before sending a photo' : 'Attach image'}
          className="pl-4 pr-2 text-gray-400 hover:text-primary transition-colors disabled:opacity-30 disabled:pointer-events-none"
        >
          <Plus className="w-5 h-5" />
        </button>
        <textarea
          ref={ref}
          rows="1"
          value={inputText}
          onChange={handleTyping}
          disabled={isDisabled}
          placeholder={isEditing ? 'Edit your message…' : 'Message…'}
          className="w-full bg-transparent text-white px-3 py-4 pr-12 resize-none focus:outline-none min-h-[56px] max-h-48 scrollbar-hide text-[15px]"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage(e);
            }
            if (e.key === 'Escape' && isEditing) {
              e.preventDefault();
              onCancelEdit();
            }
          }}
        />
        <button
          type="submit"
          disabled={isDisabled || !inputText.trim()}
          className={`absolute right-2 p-2 rounded-2xl transition-all ${
            inputText.trim() && !isDisabled
              ? isEditing
                ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/25'
                : 'bg-primary text-white shadow-lg shadow-primary/20'
              : 'bg-white/5 text-gray-600'
          }`}
          title={isEditing ? 'Save edit' : 'Send'}
        >
          <Send className="w-5 h-5" />
        </button>
      </form>
      <p className="hidden sm:block text-[10px] text-center text-gray-500 mt-4 font-bold uppercase tracking-widest opacity-40">
        Aura Platform &bull; End-to-End Encrypted Secure Tunnel
      </p>
    </footer>
  );
});

export default ChatInput;
