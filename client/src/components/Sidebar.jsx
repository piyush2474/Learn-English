import React from 'react';
import { Plus, MessageSquare, Globe, LogOut, X, Tv, UserRound, Trash2, Info } from 'lucide-react';

const Sidebar = ({ status, onNewChat, onEndSession, userCount, isOpen, onClose, onStartCall, isCalling, callAccepted, friends = [], onSelectFriend, onRemoveFriend, onInform }) => {
  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] md:hidden"
          onClick={onClose}
        />
      )}

      <div className={`
        fixed inset-y-0 left-0 z-[70] w-[260px] bg-[#171717] flex flex-col border-r border-[#2f2f2f] 
        transition-transform duration-300 ease-in-out md:relative md:translate-x-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-3 flex items-center justify-between">
          <button 
            onClick={() => {
              onNewChat();
              onClose();
            }}
            className="flex-1 flex items-center justify-between px-3 py-3 rounded-lg hover:bg-[#2f2f2f] transition-colors group"
          >
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-white/10 rounded-full flex items-center justify-center">
                <Plus className="w-4 h-4 text-white" />
              </div>
              <span className="text-[14px] font-medium text-white">New Chat</span>
            </div>
          </button>
          
          <button 
            onClick={onClose}
            className="p-2 md:hidden hover:bg-white/5 rounded-lg ml-2"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
        <div className="text-[11px] font-bold text-gray-500 px-3 py-2 uppercase tracking-wider">
          Recent chats
        </div>
        <div className="px-3 py-2 bg-[#2f2f2f] rounded-lg flex items-center gap-2 cursor-pointer">
          <MessageSquare className="w-4 h-4 text-gray-300" />
          <span className="text-[13px] text-gray-200 truncate">Learn English Chat</span>
        </div>

        {friends.length > 0 && (
          <div className="mt-6 space-y-1">
            <div className="text-[11px] font-bold text-gray-500 px-3 py-2 uppercase tracking-wider">
              My English Notes ({friends.length})
            </div>
            {friends.map((friend, i) => (
              <div 
                key={i} 
                onClick={() => {
                  if (friend.isOnline) {
                    onSelectFriend(friend.userId);
                    onClose();
                  }
                }}
                className={`px-3 py-2 hover:bg-[#2f2f2f] rounded-lg flex items-center gap-2 cursor-pointer group transition-colors ${!friend.isOnline && 'opacity-50 cursor-not-allowed'}`}
              >
                <div className={`w-2 h-2 rounded-full ${friend.isOnline ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-gray-600'}`} />
                <UserRound className={`w-4 h-4 ${friend.isOnline ? 'text-gray-300' : 'text-gray-600'} group-hover:text-white`} />
                <span className={`text-[13px] flex-1 ${friend.isOnline ? 'text-gray-200' : 'text-gray-500'} truncate group-hover:text-white`}>
                  {friend.name || `Friend ${friend.userId.substring(0, 8)}...`}
                </span>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveFriend(friend.userId);
                  }}
                  className="opacity-60 md:opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-500/10 text-gray-500 hover:text-red-500 rounded-md transition-all"
                  title="Remove Friend"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="px-3 py-4 flex items-center gap-2 mt-4 ml-2">
          <div className="relative flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-ping" />
            <div className="w-2 h-2 rounded-full bg-green-500 absolute" />
          </div>
          <span className="text-[13px] font-bold text-gray-400 tracking-wide uppercase">
            {Math.max(0, userCount - 1)} Nodes Live
          </span>
        </div>
      </div>

      <div className="p-3 border-t border-[#2f2f2f] space-y-1">
        {status === 'Matched' && !isCalling && !callAccepted && (
          <>
            <div 
              onClick={() => {
                onStartCall('audio');
                onClose();
              }}
              className="px-3 py-3 rounded-lg hover:bg-[#2f2f2f] flex items-center gap-3 cursor-pointer transition-colors text-green-500"
            >
              <UserRound className="w-4 h-4" />
              <span className="text-[13px] font-medium">Transcription</span>
            </div>
            
            <div 
              onClick={() => {
                onStartCall('video');
                onClose();
              }}
              className="px-3 py-3 rounded-lg hover:bg-[#2f2f2f] flex items-center gap-3 cursor-pointer transition-colors text-blue-500"
            >
              <Tv className="w-4 h-4" />
              <span className="text-[13px] font-medium">Virtualization</span>
            </div>
          </>
        )}

        <div className="px-3 py-3 rounded-lg hover:bg-[#2f2f2f] flex items-center gap-3 cursor-pointer transition-colors">
          <Globe className="w-4 h-4 text-gray-400" />
          <div className="flex-1">
            <div className="text-[13px] text-gray-200">Status</div>
            <div className={`text-[11px] ${status === 'Matched' ? 'text-green-500' : 'text-yellow-500'}`}>
              {status}
            </div>
          </div>
        </div>
        
        <div 
          onClick={() => {
            onInform();
            onClose();
          }}
          className="px-3 py-3 rounded-lg hover:bg-[#2f2f2f] flex items-center gap-3 cursor-pointer transition-colors"
        >
          <Info className="w-4 h-4 text-gray-400" />
          <span className="text-[13px] text-gray-200">Inform</span>
        </div>

        <div 
          onClick={() => {
            onEndSession();
            onClose();
          }}
          className="px-3 py-3 rounded-lg hover:bg-[#2f2f2f] flex items-center gap-3 cursor-pointer transition-colors"
        >
          <LogOut className="w-4 h-4 text-gray-400" />
          <span className="text-[13px] text-gray-200">End Session</span>
        </div>
      </div>
    </div>
    </>
  );
};

export default Sidebar;
