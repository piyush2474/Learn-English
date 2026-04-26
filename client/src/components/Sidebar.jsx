import React from 'react';
import { Plus, MessageSquare, Globe, LogOut, X, Tv, UserRound, Trash2, Info, Settings } from 'lucide-react';

const Sidebar = ({ status, onNewChat, onEndSession, userCount, isOpen, onClose, onStartCall, isCalling, callAccepted, friends = [], onSelectFriend, onRemoveFriend, onInform, onOpenSettings, currentRoomId, unreadCounts = {} }) => {
  
  const formatLastSeen = (date) => {
    if (!date) return 'Offline';
    const now = new Date();
    const lastActive = new Date(date);
    const diffInSeconds = Math.floor((now - lastActive) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return lastActive.toLocaleDateString();
  };

  const getInitials = (name) => {
    if (!name) return 'S';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

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
        fixed inset-y-0 left-0 z-[70] w-[280px] bg-[var(--color-sidebar-bg)] flex flex-col border-r border-white/5 
        transition-transform duration-300 ease-in-out md:relative md:translate-x-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-4 flex items-center justify-between">
          <button 
            onClick={() => {
              onNewChat();
              onClose();
            }}
            className="flex-1 flex items-center gap-3 px-4 py-3 rounded-xl gradient-primary text-white shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-95 group"
          >
            <Plus className="w-5 h-5 text-white group-hover:rotate-90 transition-transform duration-300" />
            <span className="text-[14px] font-bold tracking-tight">New Chat</span>
          </button>
          
          <button 
            onClick={onClose}
            className="p-2 md:hidden hover:bg-white/5 rounded-lg ml-2"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-4">
        <div>
          <div className="text-[11px] font-bold text-gray-500 px-3 py-2 uppercase tracking-widest">
            Aura Channels
          </div>
          <div className="px-3 py-3 bg-white/5 rounded-xl border border-white/5 flex items-center gap-3 cursor-pointer hover:bg-white/10 transition-colors">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <Globe className="w-4 h-4 text-blue-400" />
            </div>
            <span className="text-[13px] font-medium text-gray-200 truncate">Global Community</span>
          </div>
        </div>

        {friends.length > 0 && (
          <div className="space-y-1">
            <div className="text-[11px] font-bold text-gray-500 px-3 py-2 uppercase tracking-widest flex justify-between items-center">
              <span>Friends</span>
              <span className="bg-white/5 px-2 py-0.5 rounded-full text-[9px]">{friends.length}</span>
            </div>
            <div className="space-y-1">
              {friends.map((friend, i) => (
                <div 
                  key={i} 
                  onClick={() => {
                    onSelectFriend(friend.userId);
                    onClose();
                  }}
                  className={`group relative px-3 py-2.5 rounded-xl flex items-center gap-3 cursor-pointer transition-all border border-transparent hover:border-white/5 ${
                    friend.isOnline 
                      ? 'hover:bg-white/5 active:scale-95' 
                      : 'hover:bg-white/5 opacity-60 grayscale-[0.5]'
                  }`}
                >
                  <div className="relative">
                    <div 
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-[13px] font-bold text-white shadow-lg"
                      style={{ backgroundColor: friend.avatarColor || '#333' }}
                    >
                      {getInitials(friend.name)}
                    </div>
                    {friend.isOnline && (
                      <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#171717] shadow-lg ${
                        friend.roomId === currentRoomId ? 'bg-blue-500 shadow-blue-500/50' :
                        'bg-green-500 shadow-green-500/50'
                      }`} />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[13px] font-semibold text-gray-100 truncate">
                        {friend.name || 'Stranger'}
                      </span>
                      {unreadCounts[friend.userId] > 0 && (
                        <span className="bg-blue-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-[0_0_10px_rgba(37,99,235,0.5)] animate-bounce">
                          {unreadCounts[friend.userId]}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-gray-500 flex items-center gap-1.5 mt-0.5">
                      {friend.isOnline ? (
                        friend.roomId === currentRoomId ? (
                          <span className="text-blue-400 font-bold animate-pulse">In chat with you</span>
                        ) : (
                          <span className="text-green-500 font-medium">Online</span>
                        )
                      ) : (
                        <span>Active {formatLastSeen(friend.lastActive)}</span>
                      )}
                    </div>
                  </div>

                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveFriend(friend.userId);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-2 hover:bg-red-500/10 text-gray-500 hover:text-red-500 rounded-lg transition-all"
                    title="Remove Friend"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="px-3 py-6 flex items-center gap-3 mt-auto">
          <div className="relative flex items-center justify-center">
            <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-ping opacity-75" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-500 absolute" />
          </div>
          <span className="text-[12px] font-bold text-gray-400 tracking-widest uppercase">
            {Math.max(0, userCount - 1)} Users Online
          </span>
        </div>
      </div>

      <div className="p-4 border-t border-[#2f2f2f] space-y-2 bg-[#1a1a1a]/50">
        {status === 'Matched' && !isCalling && !callAccepted && (
          <div className="grid grid-cols-2 gap-2 mb-2">
            <button 
              onClick={() => { onStartCall('audio'); onClose(); }}
              className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-green-500/10 hover:bg-green-500/20 text-green-500 border border-green-500/10 transition-all text-[12px] font-bold"
            >
              <UserRound className="w-4 h-4" />
              AC
            </button>
            <button 
              onClick={() => { onStartCall('video'); onClose(); }}
              className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 border border-blue-500/10 transition-all text-[12px] font-bold"
            >
              <Tv className="w-4 h-4" />
              VC
            </button>
          </div>
        )}

        <div className="flex flex-col gap-1">
          <div 
            onClick={() => { onOpenSettings(); onClose(); }}
            className="flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-white/5 transition-colors cursor-pointer group"
          >
            <Settings className="w-4 h-4 text-gray-500 group-hover:text-blue-400" />
            <span className="text-[13px] text-gray-400 group-hover:text-gray-200">Profile Settings</span>
          </div>



          <div 
            onClick={() => { onEndSession(); onClose(); }}
            className="flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-white/5 transition-colors cursor-pointer group"
          >
            <LogOut className="w-4 h-4 text-gray-500 group-hover:text-red-400" />
            <span className="text-[13px] text-gray-400 group-hover:text-gray-200">End Session</span>
          </div>
        </div>
      </div>
    </div>
    </>
  );
};

export default Sidebar;
