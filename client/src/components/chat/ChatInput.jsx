import React, { useRef } from 'react';
import { Plus, Send } from 'lucide-react';

const ChatInput = ({
  inputText,
  handleTyping,
  handleSendMessage,
  handleImageUpload,
  status,
  roomId,
  isStealthMode
}) => {
  const fileInputRef = useRef(null);

  if (status === 'Idle' || isStealthMode) return null;

  const isDisabled = status !== 'Matched' && !roomId?.startsWith('private_');

  return (
    <footer className="shrink-0 w-full max-w-4xl mx-auto px-4 pb-6 pt-2 z-20">
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
