import React, { useEffect, useRef } from 'react';
import MessageBubble from './MessageBubble';
import TypingIndicator from './TypingIndicator';
import { Globe } from 'lucide-react';

const canComposerEdit = (msg, socketId) =>
  msg.type === 'text' &&
  msg.senderId === socketId &&
  msg.messageId &&
  !String(msg.messageId).startsWith('q_') &&
  (!msg.status || msg.status === 'sent' || msg.status === 'seen');

const ChatBox = ({
  messages,
  isPartnerTyping,
  socketId,
  status,
  onDeleteMessage,
  onStartComposerEdit,
  onReplyMessage,
  onReactMessage,
  loadMoreMessages,
  hasMoreMessages,
  partnerName,
  onZoomImage
}) => {
  const scrollRef = useRef(null);
  const lastScrollHeight = useRef(0);

  useEffect(() => {
    if (scrollRef.current) {
      // If we just loaded more messages, maintain scroll position relative to bottom
      if (lastScrollHeight.current > 0) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight - lastScrollHeight.current;
        lastScrollHeight.current = 0;
      } else {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }
  }, [messages, isPartnerTyping]);

  const handleLoadMore = () => {
    if (scrollRef.current) {
      lastScrollHeight.current = scrollRef.current.scrollHeight;
    }
    loadMoreMessages();
  };

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

        <div className="flex flex-col w-full pt-4 pb-16 space-y-1">
          {hasMoreMessages && (
            <div className="w-full flex justify-center py-2">
              <button 
                onClick={handleLoadMore}
                className="px-4 py-1.5 rounded-full bg-white/5 hover:bg-white/10 text-[12px] text-gray-400 font-bold uppercase tracking-wider transition-all"
              >
                Load Previous Messages
              </button>
            </div>
          )}
          
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
              onComposerEdit={
                canComposerEdit(msg, socketId)
                  ? () => onStartComposerEdit(msg)
                  : undefined
              }
              onReply={() => onReplyMessage(msg)}
              onReact={(emoji) => onReactMessage(msg.messageId, emoji)}
              reactions={msg.reactions}
              replyTo={msg.replyTo}
              status={msg.status}
              onZoom={(url, mediaType) => onZoomImage(url, mediaType || msg.type)}
              isUploading={msg.isUploading}
              isEdited={msg.isEdited}
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
