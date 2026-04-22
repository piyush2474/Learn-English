import React from 'react';
import { User, Languages } from 'lucide-react';

const MessageBubble = ({ message, isSelf, timestamp }) => {
  return (
    <div className={`w-full py-6 ${!isSelf ? 'bg-[#2f2f2f]' : 'bg-transparent'}`}>
      <div className="max-w-3xl mx-auto px-4 flex gap-4 md:gap-6">
        <div className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 ${
          isSelf ? 'bg-[#3b82f6]' : 'bg-[#10a37f]'
        }`}>
          {isSelf ? (
            <User className="w-5 h-5 text-white" />
          ) : (
            <Languages className="w-5 h-5 text-white" />
          )}
        </div>
        
        <div className="flex-1 flex flex-col pt-0.5">
          <div className="font-bold text-gray-100 text-[14px] mb-1">
            {isSelf ? 'You' : 'Stranger'}
          </div>
          <div className="text-[15px] leading-relaxed text-gray-200 prose prose-invert max-w-none">
            {message}
          </div>
          <div className="text-[11px] mt-2 text-gray-500 font-medium opacity-50 uppercase tracking-tight">
            {new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
