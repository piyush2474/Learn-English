import React, { useEffect, useRef } from 'react';
import MessageBubble from './MessageBubble';
import TypingIndicator from './TypingIndicator';
import { Globe } from 'lucide-react';

const ChatBox = ({ messages, isPartnerTyping, socketId, status, onDeleteMessage, partnerName, onZoomImage }) => {
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isPartnerTyping]);

  return (
    <div 
      ref={scrollRef}
      className="flex-1 overflow-y-auto scrollbar-hide flex flex-col bg-[#0a0b14] relative"
    >
      <div className="flex-1 flex flex-col min-h-0 relative z-10">
        {messages.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-4 space-y-6 animate-in fade-in zoom-in duration-700">
            <div className="w-20 h-20 rounded-3xl gradient-primary flex items-center justify-center shadow-2xl shadow-primary/20 mb-4 rotate-3">
              <Globe className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl font-black text-white tracking-tighter">Aura</h1>
            <p className="text-gray-500 max-w-sm text-sm leading-relaxed">
              Experience the next generation of private messaging. Secure, real-time, and beautifully simple.
            </p>
          </div>
        )}
        
        <div className="flex flex-col w-full py-4 space-y-1">
          {Array.isArray(messages) && messages.map((msg) => (
            <MessageBubble
              key={msg.messageId}
              message={msg.message}
              isSelf={msg.senderId === socketId}
              partnerName={partnerName}
              timestamp={msg.timestamp}
              type={msg.type}
              messageId={msg.messageId}
              onDelete={onDeleteMessage}
              status={msg.status}
              onZoom={onZoomImage}
              isUploading={msg.isUploading}
            />
          ))}
          
          {isPartnerTyping && (
            <div className="px-6 py-2">
              <TypingIndicator />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatBox;
