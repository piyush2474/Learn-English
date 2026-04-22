import React, { useEffect, useRef } from 'react';
import MessageBubble from './MessageBubble';
import TypingIndicator from './TypingIndicator';
import { Globe } from 'lucide-react';

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
      className="flex-1 overflow-y-auto scrollbar-hide flex flex-col bg-[#0b141a] relative"
    >
      {/* Subtle Background Pattern (Optional/Stylized) */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]" />

      <div className="flex-1 flex flex-col min-h-0 relative z-10">
        {messages.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-4 space-y-6">
            <div className="w-24 h-24 bg-blue-500/10 rounded-full flex items-center justify-center mb-4">
               <Globe className="w-12 h-12 text-blue-500 animate-pulse" />
            </div>
            <h1 className="text-4xl font-bold text-white tracking-tight">Practice English</h1>
            <p className="text-gray-400 max-w-sm">Connect with partners worldwide and improve your language skills in real-time.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 max-w-3xl w-full mt-8">
              {[
                { title: "Secure Chat", icon: "🔒" },
                { title: "Voice & Video", icon: "📹" },
                { title: "Friend System", icon: "👥" }
              ].map((item, i) => (
                <div key={i} className="p-4 bg-[#111b21] border border-white/5 rounded-2xl text-center">
                  <span className="text-2xl mb-2 block">{item.icon}</span>
                  <p className="text-[13px] text-gray-300 font-medium">{item.title}</p>
                </div>
              ))}
            </div>
          </div>
        )}
        
        <div className="flex flex-col w-full py-4 space-y-1">
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
