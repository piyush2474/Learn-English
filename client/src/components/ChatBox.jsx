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
      className="flex-1 overflow-y-auto scrollbar-hide flex flex-col bg-[#212121] relative"
    >
      <div className="flex-1 flex flex-col min-h-0 relative z-10">
        {messages.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-4 space-y-6">
            <h1 className="text-4xl font-bold text-white tracking-tight">Practice English</h1>
            <p className="text-gray-400 max-w-sm">Start a conversation to begin practicing!</p>
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
