import React, { useRef } from 'react';
import { Plus, Send, X } from 'lucide-react';

const ChatInput = ({
  inputText,
  handleTyping,
  handleSendMessage,
  handleImageUpload,
  status,
  roomId,
  isStealthMode,
  replyingTo,
  onCancelReply
}) => {
  const fileInputRef = useRef(null);

  if (status === 'Idle' || isStealthMode) return null;

  const isDisabled = status !== 'Matched' && !roomId?.startsWith('private_');

  return (
    <footer className="shrink-0 w-full max-w-4xl mx-auto px-4 pb-6 pt-2 z-20">
      {replyingTo && (
        <div className="mb-2 mx-4 flex items-center gap-3 bg-[#1a1c2e]/90 backdrop-blur-xl border border-white/10 p-3 rounded-2xl animate-in slide-in-from-bottom-2 duration-300">
          <div className="w-1 h-8 bg-primary rounded-full" />
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold text-primary uppercase tracking-wider">
              Replying to {replyingTo.senderId === localStorage.getItem('chat_user_id') ? 'yourself' : 'partner'}
            </p>
            <p className="text-[13px] text-gray-400 truncate">
              {replyingTo.type === 'image' ? 'Photo' : replyingTo.message}
            </p>
          </div>
          <button 
            onClick={onCancelReply}
            className="p-1.5 hover:bg-white/5 rounded-full text-gray-500 transition-colors"
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
        className="relative flex items-center bg-[#1a1c2e]/80 backdrop-blur-xl rounded-[28px] border border-white/10 focus-within:border-primary/50 transition-all shadow-2xl shadow-black/40"
      >
        <button
          type="button"
          onClick={() => fileInputRef.current.click()}
          disabled={isDisabled}
          className="pl-4 pr-2 text-gray-400 hover:text-primary transition-colors"
        >
          <Plus className="w-5 h-5" />
        </button>
        <textarea
          rows="1"
          value={inputText}
          onChange={handleTyping}
          disabled={isDisabled}
          placeholder="Message..."
          className="w-full bg-transparent text-white px-3 py-4 pr-12 resize-none focus:outline-none min-h-[56px] max-h-48 scrollbar-hide text-[15px]"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage(e);
            }
          }}
        />
        <button
          type="submit"
          disabled={isDisabled || !inputText.trim()}
          className={`absolute right-2 p-2 rounded-2xl transition-all ${
            inputText.trim() && !isDisabled
              ? 'bg-primary text-white shadow-lg shadow-primary/20' 
              : 'bg-white/5 text-gray-600'
          }`}
        >
          <Send className="w-5 h-5" />
        </button>
      </form>
      <p className="hidden sm:block text-[10px] text-center text-gray-500 mt-4 font-bold uppercase tracking-widest opacity-40">
        Aura Platform &bull; End-to-End Encrypted Secure Tunnel
      </p>
    </footer>
  );
};

export default ChatInput;
