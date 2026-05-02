import React from 'react';
import { VideoOff, MicOff, Mic, Video, RefreshCw, MessageCircle, Trash2, PhoneOff, ArrowUp, X } from 'lucide-react';

function snippet(text, max = 56) {
  if (!text || typeof text !== 'string') return '';
  const t = text.replace(/\s+/g, ' ').trim();
  return t.length <= max ? t : `${t.slice(0, max)}…`;
}

const CallOverlay = ({
  isVideoCall,
  callAccepted,
  mainView,
  setMainView,
  remoteVideoRef,
  localVideoRef,
  isCameraOff,
  isMicMuted,
  isMirrored,
  facingMode,
  partnerName,
  showVcChat,
  setShowVcChat,
  messages,
  myUserId,
  inputText,
  setInputText,
  handleSendMessage,
  editingMessage,
  onCancelEdit,
  replyingTo,
  onCancelReply,
  toggleMic,
  toggleCamera,
  switchCamera,
  clearChat,
  endCall,
  vcChatRef
}) => {
  if (!isVideoCall) return null;

  return (
    <div className="fixed inset-0 z-[150] bg-[#111] overflow-hidden animate-in fade-in duration-500">
      
      {/* Remote Video Container */}
      <div 
        className={`transition-all duration-500 absolute overflow-hidden ${
          mainView === 'remote' 
            ? 'inset-0 z-0' 
            : 'top-6 right-6 w-32 h-48 md:w-48 md:h-72 z-40 rounded-2xl shadow-2xl border-2 border-white/20 cursor-pointer hover:scale-105'
        }`}
        onClick={() => mainView !== 'remote' && setMainView('remote')}
      >
        {!callAccepted ? (
          <div className="w-full h-full flex flex-col items-center justify-center text-center p-6 space-y-4 bg-[#171717]">
            <div className={`border-4 border-green-500/20 border-t-green-500 rounded-full animate-spin ${mainView === 'remote' ? 'w-16 h-16' : 'w-6 h-6 border-2'}`} />
            {mainView === 'remote' && (
              <div>
                <h3 className="text-xl font-bold text-white mb-1">Connecting Video</h3>
                <p className="text-sm text-gray-400">Establishing secure connection...</p>
              </div>
            )}
          </div>
        ) : (
          <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
        )}
      </div>

      {/* Local Video Container */}
      <div 
        className={`transition-all duration-500 absolute overflow-hidden ${
          mainView === 'local' 
            ? 'inset-0 z-0' 
            : 'top-6 right-6 w-32 h-48 md:w-48 md:h-72 z-40 rounded-2xl shadow-2xl border-2 border-white/20 cursor-pointer hover:scale-105'
        }`}
        onClick={() => mainView !== 'local' && setMainView('local')}
      >
        <video 
          ref={localVideoRef} 
          autoPlay 
          playsInline 
          muted 
          className={`w-full h-full object-cover ${isCameraOff ? 'hidden' : ''} ${isMirrored && facingMode === 'user' ? '-scale-x-100' : ''}`}
        />
        {isCameraOff && (
          <div className="w-full h-full flex items-center justify-center bg-[#2a2a2a]">
            <VideoOff className={`${mainView === 'local' ? 'w-16 h-16' : 'w-8 h-8'} text-gray-500`} />
          </div>
        )}
      </div>

      {/* Overlay Info (Top Left) */}
      <div className="absolute top-6 left-6 flex items-center gap-2 bg-black/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 z-40">
        <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
        <span className="text-[13px] font-medium text-white">{partnerName}</span>
      </div>

      {/* Chat Overlay */}
      {showVcChat && (
        <div className="absolute bottom-[100px] left-0 w-full md:w-[400px] pointer-events-none flex flex-col justify-end px-4 py-6 z-40 animate-in slide-in-from-left-4 duration-300">
          <div ref={vcChatRef} className="max-h-[300px] overflow-y-auto space-y-3 pointer-events-auto scrollbar-hide pr-2">
            {messages.slice(-8).map((msg) => {
              const isMe = msg.senderId === myUserId;
              return (
                <div key={msg.messageId} className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-300`}>
                  <div className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-[14px] backdrop-blur-xl border flex flex-col gap-1 ${
                    isMe 
                      ? 'bg-blue-600/80 border-blue-400/30 text-white shadow-[0_8px_16px_rgba(37,99,235,0.2)] rounded-br-sm' 
                      : 'bg-black/60 border-white/10 text-gray-100 shadow-[0_8px_16px_rgba(0,0,0,0.4)] rounded-bl-sm'
                  }`}>
                    <span className={`text-[11px] font-bold uppercase tracking-wider opacity-70 ${isMe ? 'text-blue-200' : 'text-gray-400'}`}>
                      {isMe ? 'You' : partnerName}
                    </span>
                    <span className="leading-snug">{msg.message}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {(editingMessage || replyingTo) && (
            <div className="mt-3 pointer-events-auto space-y-2">
              {editingMessage && (
                <div className="flex items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/15 px-3 py-2 text-[12px] text-amber-100">
                  <span className="font-semibold flex-1 truncate">
                    Editing… {snippet(editingMessage.originalText, 48)}
                  </span>
                  <button
                    type="button"
                    onClick={onCancelEdit}
                    className="rounded-full bg-black/40 p-1.5 hover:bg-black/60"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
              {!editingMessage && replyingTo && (
                <div className="flex items-center gap-2 rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-[12px] text-gray-200">
                  <span className="flex-1 truncate">
                    To {replyingTo.senderId === myUserId ? 'You' : partnerName}: “
                    {replyingTo.type === 'image' ? 'Photo' : snippet(replyingTo.message, 48)}”
                  </span>
                  <button
                    type="button"
                    onClick={onCancelReply}
                    className="rounded-full bg-black/40 p-1.5 hover:bg-black/60"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          )}
          
          {/* Chat Input */}
          <div className="mt-4 pointer-events-auto flex items-center gap-2 bg-black/50 backdrop-blur-xl rounded-full p-1.5 border border-white/10 shadow-xl">
            <input
              type="text"
              placeholder="Type a message..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => { if(e.key === 'Enter') { e.preventDefault(); handleSendMessage(e); } }}
              className="flex-1 bg-transparent border-none outline-none text-white text-[14px] px-4"
            />
            <button onClick={handleSendMessage} className="p-2 bg-blue-500 hover:bg-blue-600 rounded-full transition-colors">
              <ArrowUp className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>
      )}

      {/* Bottom Floating Control Bar */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 sm:gap-4 bg-black/40 backdrop-blur-xl px-4 sm:px-6 py-3 rounded-full border border-white/10 z-50 shadow-2xl">
        <button onClick={toggleMic} className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all ${isMicMuted ? 'bg-red-500 text-white' : 'hover:bg-white/10 text-white'}`}>
          {isMicMuted ? <MicOff className="w-4 h-4 sm:w-5 h-5" /> : <Mic className="w-4 h-4 sm:w-5 h-5" />}
        </button>
        
        <button onClick={toggleCamera} className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all ${isCameraOff ? 'bg-red-500 text-white' : 'hover:bg-white/10 text-white'}`}>
          {isCameraOff ? <VideoOff className="w-4 h-4 sm:w-5 h-5" /> : <Video className="w-4 h-4 sm:w-5 h-5" />}
        </button>

        <button onClick={switchCamera} className="w-10 h-10 sm:w-12 sm:h-12 hover:bg-white/10 text-white rounded-full flex items-center justify-center transition-all md:hidden">
          <RefreshCw className="w-4 h-4 sm:w-5 h-5" />
        </button>

        <button onClick={() => setShowVcChat(!showVcChat)} className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all ${!showVcChat ? 'bg-white/20 text-white' : 'hover:bg-white/10 text-white'}`}>
          <MessageCircle className="w-4 h-4 sm:w-5 h-5" />
        </button>

        <button onClick={clearChat} className="w-10 h-10 sm:w-12 sm:h-12 hover:bg-white/10 text-white rounded-full flex items-center justify-center transition-all" title="Clear Chat">
          <Trash2 className="w-4 h-4 sm:w-5 h-5" />
        </button>

        <div className="w-[1px] h-6 sm:h-8 bg-white/20 mx-1 sm:mx-2" />

        <button onClick={endCall} className="w-12 h-12 sm:w-14 sm:h-14 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg transition-all">
          <PhoneOff className="w-5 h-5 sm:w-6 h-6" />
        </button>
      </div>
    </div>
  );
};

export default CallOverlay;
