import React, { useEffect, useRef } from 'react';
import MessageBubble from './MessageBubble';
import TypingIndicator from './TypingIndicator';

const ChatBox = ({ messages, isPartnerTyping, socketId, status, onDeleteMessage, partnerName }) => {
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isPartnerTyping]);

  return (
    <div 
      ref={scrollRef}
      className="flex-1 overflow-y-auto scrollbar-hide flex flex-col"
    >
      <div className="flex-1 flex flex-col min-h-0">
        {messages.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-4 space-y-6">
            <h1 className="text-4xl font-bold text-white tracking-tight">Learn English</h1>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 max-w-3xl w-full">
              {[
                { title: "Practice Speaking", icon: "💬" },
                { title: "Vocabulary Help", icon: "📚" },
                { title: "Real-time Matching", icon: "⚡" }
              ].map((item, i) => (
                <div key={i} className="p-4 bg-white/5 border border-white/10 rounded-xl text-left">
                  <span className="text-2xl mb-2 block">{item.icon}</span>
                  <p className="text-[14px] text-gray-300 font-medium">{item.title}</p>
                </div>
              ))}
            </div>
            {status === 'Waiting' && (
              <div className="flex flex-col items-center gap-3 mt-8">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" />
                <p className="text-blue-400 text-sm font-medium animate-pulse tracking-wide">Connecting you with a practice partner...</p>
              </div>
            )}
          </div>
        )}
        
        <div className="flex flex-col w-full">
          {messages.map((msg) => (
            <MessageBubble
              key={msg.messageId}
              message={msg.message}
              isSelf={msg.senderId === socketId}
              partnerName={partnerName}
              timestamp={msg.timestamp}
              type={msg.type}
              messageId={msg.messageId}
              onDelete={onDeleteMessage}
            />
          ))}
          
          {isPartnerTyping && (
            <div className="bg-[#2f2f2f] w-full py-6 border-t border-[#212121]">
              <div className="max-w-3xl mx-auto px-4">
                <TypingIndicator />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatBox;
