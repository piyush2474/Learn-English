import React from 'react';
import { Menu, Shield, Phone, Video, LogOut, UserPlus, Trash2 } from 'lucide-react';

const ChatHeader = ({
  status,
  partnerName,
  onOpenSidebar,
  onStartCall,
  onEndSession,
  onSendFriendRequest,
  showFriendAdd,
  partnerUserId,
  partnerStatus,
  onClearChat
}) => {
  return (
    <header className="h-16 flex items-center justify-between px-4 md:px-6 border-b border-white/5 bg-[#0a0b14]/80 backdrop-blur-md z-40">
      <div className="flex items-center gap-3">
        <button 
          onClick={onOpenSidebar}
          className="p-2 -ml-2 md:hidden hover:bg-white/5 rounded-lg transition-colors"
        >
          <Menu className="w-5 h-5 text-gray-300" />
        </button>
        
        <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h2 className="text-[15px] font-bold text-white tracking-tight leading-none">
                {status === 'Matched' ? partnerName : 'Aura'}
              </h2>
              <div className={`w-2 h-2 rounded-full ${partnerStatus === 'Online' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-gray-500'}`} />
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                {status === 'Matched' ? (partnerStatus || 'Active Chat') : 'Secured Gateway'}
              </span>
            </div>
          </div>
        </div>

      <div className="flex items-center gap-1">
        {status === 'Matched' && (
          <>
            <button 
              onClick={() => onStartCall('audio')}
              className="p-2 text-gray-400 hover:text-green-400 hover:bg-green-400/5 rounded-lg transition-all"
            >
              <Phone className="w-5 h-5" />
            </button>
            <button 
              onClick={() => onStartCall('video')}
              className="p-2 text-gray-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-all"
            >
              <Video className="w-5 h-5" />
            </button>
          </>
        )}
        
        {(status === 'Matched' || status === 'Waiting' || status === 'Disconnected') && (
          <button 
            onClick={onEndSession} 
            className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-500/5 rounded-lg transition-all" 
            title="End Session"
          >
            <LogOut className="w-5 h-5" />
          </button>
        )}

        {status === 'Matched' && showFriendAdd && (
          <button 
            onClick={onSendFriendRequest} 
            className="p-2 text-primary hover:bg-primary/5 rounded-lg transition-all" 
            title="Add Friend"
          >
            <UserPlus className="w-5 h-5" />
          </button>
        )}

        {(status === 'Matched' || status === 'Disconnected') && (
          <button 
            onClick={onClearChat} 
            className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-500/5 rounded-lg transition-all" 
            title="Clear Chat"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        )}
      </div>
    </header>
  );
};

export default ChatHeader;
