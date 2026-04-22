import { User, Languages, Trash2 } from 'lucide-react';

const MessageBubble = ({ message, isSelf, timestamp, type, messageId, onDelete }) => {
  return (
    <div className={`w-full py-6 group ${!isSelf ? 'bg-[#2f2f2f]' : 'bg-transparent hover:bg-white/[0.02]'}`}>
      <div className="max-w-3xl mx-auto px-4 flex gap-4 md:gap-6 relative">
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
          <div className="flex items-center justify-between mb-1">
            <div className="font-bold text-gray-100 text-[14px]">
              {isSelf ? 'You' : 'Stranger'}
            </div>
            {isSelf && (
              <button 
                onClick={() => onDelete(messageId)}
                className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-500/10 text-gray-500 hover:text-red-500 rounded-lg transition-all"
                title="Delete for Everyone"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
          
          <div className="text-[15px] leading-relaxed text-gray-200 prose prose-invert max-w-none">
            {type === 'image' ? (
              <div className="mt-1 max-w-sm rounded-xl overflow-hidden border border-white/10 shadow-xl">
                <img 
                  src={message} 
                  alt="shared" 
                  className="w-full h-auto object-cover cursor-zoom-in"
                  onClick={() => window.open(message, '_blank')}
                />
              </div>
            ) : (
              message
            )}
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
