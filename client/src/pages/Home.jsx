import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw, Shield, GripVertical, Volume2, Volume1, PhoneOff, Mic, X as CloseIcon, Download, Info } from 'lucide-react';
import { socket } from '../socket/socket';
import useStore from '../store/useStore';
import useChat from '../hooks/useChat';
import useWebRTC from '../hooks/useWebRTC';

import Sidebar from '../components/Sidebar';
import ChatBox from '../components/ChatBox';
import VaultGate from '../components/VaultGate';
import ChatHeader from '../components/chat/ChatHeader';
import ChatInput from '../components/chat/ChatInput';
import MatchmakingView from '../components/chat/MatchmakingView';
import CallOverlay from '../components/chat/CallOverlay';
import IncomingCallModal from '../components/chat/IncomingCallModal';
import DraggableStatusBar from '../components/chat/DraggableStatusBar';
import LMSDashboard from '../components/stealth/LMSDashboard';

import { 
  generateKeyPair, 
  exportKeyPair,
  importKeyPair,
} from '../utils/crypto';

const Home = () => {
  // --- Zustand Store ---
  const {
    status,
    isSocketConnected,
    partnerName,
    messages, setMessages,
    roomId,
    userCount,
    isSidebarOpen, setIsSidebarOpen,
    friends,
    friendRequests, setFriendRequests,
    myUserId, setMyUserId,
    sharedKey,
    isPartnerTyping,
    isSettingsOpen, setIsSettingsOpen,
    isVaultEnabled,
    isVaultUnlocked, setIsVaultUnlocked,
    isStealthMode,
    stealthWord, setStealthWord,
    partnerMediaStatus,
    partnerUserId,
    unreadCounts, setUnreadCounts,
  } = useStore();

  // --- Custom Hooks ---
  const { initSocket, findPartner, sendMessage, leaveChat } = useChat();
  const {
    isCalling,
    isReceivingCall,
    callAccepted,
    isVideoCall,
    isMicMuted,
    isCameraOff,
    isSpeakerMode,
    setIsSpeakerMode,
    remoteStream,
    isSpeaking,
    startCall,
    answerCall,
    endCall,
    toggleMic,
    toggleCamera,
    switchCamera,
    localStream
  } = useWebRTC(roomId);

  // --- Local Refs & UI State ---
  const [inputText, setInputText] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [pullOffset, setPullOffset] = useState(0);
  const [statusBarY, setStatusBarY] = useState(24);
  const [zoomedImage, setZoomedImage] = useState(null);
  const [showVaultGate, setShowVaultGate] = useState(null);
  const [pendingPrivateChatId, setPendingPrivateChatId] = useState(null);
  const [mainView, setMainView] = useState('remote');
  const [showVcChat, setShowVcChat] = useState(true);
  const [isMirrored, setIsMirrored] = useState(true);
  const [facingMode, setFacingMode] = useState('user');

  const [isInformModalOpen, setIsInformModalOpen] = useState(false);
  const [informMessage, setInformMessage] = useState('');
  const [isSendingInform, setIsSendingInform] = useState(false);
  const [isFetchingWord, setIsFetchingWord] = useState(false);

  const pullStartY = useRef(0);
  const dragStartY = useRef(0);
  const dragStartStatusBarY = useRef(0);
  const isDragging = useRef(false);
  const remoteAudioRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localVideoRef = useRef(null);
  const vcChatRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // --- Initialization ---
  useEffect(() => {
    let id = localStorage.getItem('chat_user_id');
    if (!id) {
      id = 'user_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('chat_user_id', id);
    }
    setMyUserId(id);

    const initKeys = async () => {
      const savedKeys = localStorage.getItem('chat_key_pair');
      let keyPair;
      if (savedKeys) {
        try {
          keyPair = await importKeyPair(savedKeys);
        } catch (e) { console.error("Failed to import keys", e); }
      }
      
      if (!keyPair) {
        keyPair = await generateKeyPair();
        const exported = await exportKeyPair(keyPair);
        localStorage.setItem('chat_key_pair', exported);
      }
      
      initSocket(keyPair);
    };
    initKeys();

    if (isStealthMode) fetchStealthWord();

    const handleInformSent = (data) => {
      setIsSendingInform(false);
      if (data.success) {
        alert("Information sent successfully!");
        setIsInformModalOpen(false);
        setInformMessage('');
      } else {
        alert("Error: " + data.error);
      }
    };

    socket.on('inform_sent', handleInformSent);

    const handleVisibilityChange = () => {
      if (document.hidden) setIsVaultUnlocked(false);
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      socket.off('inform_sent', handleInformSent);
    };
  }, []);

  const fetchStealthWord = async () => {
    setIsFetchingWord(true);
    try {
      const words = ['ubiquitous', 'ephemeral', 'mitigate', 'tenacious', 'resilient', 'paradigm', 'clandestine', 'scrutinize', 'advocate', 'integrity'];
      const randomWord = words[Math.floor(Math.random() * words.length)];
      const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${randomWord}`);
      const data = await res.json();
      if (data && data[0]) {
        setStealthWord(data[0]);
      }
    } catch (e) {
      console.error("Failed to fetch word", e);
    } finally {
      setIsFetchingWord(false);
    }
  };

  const handleSendInform = () => {
    if (!informMessage.trim()) return;
    setIsSendingInform(true);
    socket.emit('inform_owner', { 
      message: informMessage, 
      senderName: localStorage.getItem('chat_user_name') || 'Stranger' 
    });
  };

  // --- WebRTC Stream Attachment ---
  useEffect(() => {
    if (remoteStream && remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = remoteStream;
      remoteAudioRef.current.volume = isSpeakerMode ? 1.0 : 0.4;
    }
    if (remoteStream && isVideoCall && remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream, isVideoCall, isSpeakerMode]);

  useEffect(() => {
    if (localStream && localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // --- Event Handlers ---
  const handleSendMessage = (e) => {
    e?.preventDefault();
    if (!inputText.trim()) return;
    sendMessage(inputText);
    setInputText('');
  };

  const handleTyping = (e) => {
    setInputText(e.target.value);
    if (!roomId) return;
    socket.emit('typing', { roomId, isTyping: true });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('typing', { roomId, isTyping: false });
    }, 2000);
  };

  const handleDragStart = (e) => {
    isDragging.current = true;
    const clientY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;
    dragStartY.current = clientY;
    dragStartStatusBarY.current = statusBarY;
  };

  useEffect(() => {
    const handleMove = (e) => {
      if (!isDragging.current) return;
      const clientY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;
      const deltaY = clientY - dragStartY.current;
      const newY = Math.max(10, Math.min(window.innerHeight - 100, dragStartStatusBarY.current + deltaY));
      setStatusBarY(newY);
    };
    const handleEnd = () => { isDragging.current = false; };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleEnd);
    window.addEventListener('touchmove', handleMove);
    window.addEventListener('touchend', handleEnd);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [statusBarY]);

  // --- Stealth Mode ---
  useEffect(() => {
    const originalTitle = "Aura";
    if (isStealthMode) {
      document.title = "System Task Manager";
      fetchStealthWord();
    } else {
      document.title = originalTitle;
    }
    return () => { document.title = originalTitle; };
  }, [isStealthMode]);

  // --- Pull to Refresh ---
  const handleTouchStartRefresh = (e) => {
    pullStartY.current = e.touches[0].clientY;
  };

  const handleTouchMoveRefresh = (e) => {
    if (pullStartY.current === 0) return;
    const currentY = e.touches[0].clientY;
    const diff = currentY - pullStartY.current;
    if (diff > 0 && window.scrollY === 0) {
      const newOffset = Math.min(diff * 0.5, 120);
      setPullOffset(newOffset);
      if (newOffset > 10 && e.cancelable) e.preventDefault();
    }
  };

  const handleTouchEndRefresh = () => {
    if (pullOffset > 90) {
      setPullOffset(100);
      setTimeout(() => window.location.reload(), 500);
    } else {
      setPullOffset(0);
    }
    pullStartY.current = 0;
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !roomId) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const rawBase64 = reader.result;
      sendMessage(rawBase64, 'image');
    };
    reader.readAsDataURL(file);
  };

  const startPrivateChat = (friendId) => {
    setUnreadCounts(prev => ({ ...prev, [friendId]: 0 }));
    endCall();
    setIsVaultUnlocked(false);
    if (isVaultEnabled) {
      setPendingPrivateChatId(friendId);
      setShowVaultGate('verify');
    } else {
      socket.emit("start_private_chat", { friendId });
      setMessages([]);
    }
  };

  const deleteMessage = (messageId) => {
    socket.emit('delete_message', { roomId, messageId });
    setMessages(prev => prev.filter(msg => msg.messageId !== messageId));
  };

  const handleLeaveChat = () => {
    endCall();
    leaveChat();
  };

  return (
    <div 
      className="fixed inset-0 w-full h-[100dvh] bg-[#0a0b14] flex overflow-hidden font-sans select-none"
      onTouchStart={handleTouchStartRefresh}
      onTouchMove={handleTouchMoveRefresh}
      onTouchEnd={handleTouchEndRefresh}
    >
      {/* Pull to Refresh Indicator */}
      {pullOffset > 0 && (
        <div 
          className="fixed top-0 left-0 right-0 z-[1000] flex justify-center pointer-events-none"
          style={{ transform: `translateY(${pullOffset - 40}px)`, opacity: Math.min(pullOffset / 60, 1) }}
        >
          <div className="bg-[#1a1c2e] border border-white/10 p-3 rounded-full shadow-[0_0_30px_rgba(37,99,235,0.2)]">
            <RefreshCw className={`w-5 h-5 text-blue-400 ${pullOffset > 90 ? 'animate-spin' : ''}`} />
          </div>
        </div>
      )}

      <audio ref={remoteAudioRef} autoPlay />

      <CallOverlay 
        isVideoCall={isVideoCall}
        callAccepted={callAccepted}
        mainView={mainView}
        setMainView={setMainView}
        remoteVideoRef={remoteVideoRef}
        localVideoRef={localVideoRef}
        isCameraOff={isCameraOff}
        isMicMuted={isMicMuted}
        isMirrored={isMirrored}
        facingMode={facingMode}
        partnerName={partnerName}
        showVcChat={showVcChat}
        setShowVcChat={setShowVcChat}
        messages={messages}
        myUserId={myUserId}
        inputText={inputText}
        setInputText={setInputText}
        handleSendMessage={handleSendMessage}
        toggleMic={toggleMic}
        toggleCamera={toggleCamera}
        switchCamera={async () => {
          const newMode = facingMode === 'user' ? 'environment' : 'user';
          const success = await switchCamera(newMode);
          if (success) {
            setFacingMode(newMode);
            setIsMirrored(newMode === 'user');
          }
        }} 
        clearChat={() => socket.emit('clear_chat', { roomId })}
        endCall={endCall}
        vcChatRef={vcChatRef}
      />

      <IncomingCallModal 
        isReceivingCall={isReceivingCall}
        callType={isVideoCall ? 'video' : 'audio'}
        partnerName={partnerName}
        onDecline={endCall}
        onAccept={answerCall}
      />

      {(isCalling || callAccepted) && (
        <DraggableStatusBar 
          statusBarY={statusBarY}
          onDragStart={handleDragStart}
          isSpeaking={isSpeaking}
          callAccepted={callAccepted}
          isSpeakerMode={isSpeakerMode}
          setIsSpeakerMode={setIsSpeakerMode}
          onEndCall={endCall}
        />
      )}

      <Sidebar 
        status={status} 
        onNewChat={findPartner} 
        onEndSession={handleLeaveChat} 
        userCount={userCount}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onStartCall={startCall}
        isCalling={isCalling}
        callAccepted={callAccepted}
        friends={friends}
        onSelectFriend={startPrivateChat}
        onRemoveFriend={(id) => socket.emit('remove_friend', { friendId: id })}
        onInform={() => setIsInformModalOpen(true)} 
        onOpenSettings={() => setIsSettingsOpen(true)}
        currentRoomId={roomId}
        unreadCounts={unreadCounts}
      />

      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0 bg-[#0a0b14]">
        {!isSocketConnected && (
          <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[1000] flex items-center gap-4 bg-[#2f2f2f]/90 backdrop-blur-md border border-blue-500/30 px-6 py-3 rounded-2xl shadow-2xl">
            <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-white text-sm font-bold">Reconnecting...</span>
          </div>
        )}

        <ChatHeader 
          status={status}
          partnerName={partnerName}
          onOpenSidebar={() => setIsSidebarOpen(true)}
          onStartCall={startCall}
          onEndSession={handleLeaveChat}
          onSendFriendRequest={() => socket.emit('send_friend_request', { roomId })}
          showFriendAdd={partnerUserId && !friends.some(f => f.userId === partnerUserId)}
          partnerUserId={partnerUserId}
        />

        <main className="flex-1 overflow-hidden relative flex flex-col">
          {isStealthMode ? (
            <LMSDashboard 
              isFetchingWord={isFetchingWord}
              stealthWord={stealthWord}
              fetchNewWord={fetchStealthWord}
            />
          ) : (
            <>
              {friendRequests.length > 0 && (
                <div className="absolute top-4 right-4 z-50 bg-[#2f2f2f] border border-[#3d3d3d] p-4 rounded-xl shadow-2xl">
                  <p className="text-sm text-white font-medium">{friendRequests[0].fromName} wants to be friends!</p>
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => socket.emit('accept_friend_request', { fromUserId: friendRequests[0].from })} className="bg-blue-600 text-white px-3 py-1 rounded text-xs">Accept</button>
                    <button onClick={() => setFriendRequests(prev => prev.slice(1))} className="bg-gray-600 text-white px-3 py-1 rounded text-xs">Decline</button>
                  </div>
                </div>
              )}

              <MatchmakingView 
                status={status}
                onStartSession={findPartner}
                onCancelSearch={handleLeaveChat}
              />

              {(status === 'Matched' || status === 'Disconnected' || roomId?.startsWith('private_')) && (
                <ChatBox 
                  messages={messages} 
                  isPartnerTyping={isPartnerTyping} 
                  socketId={myUserId} 
                  status={status}
                  onDeleteMessage={deleteMessage}
                  partnerName={partnerName}
                  onZoomImage={setZoomedImage}
                />
              )}
            </>
          )}
        </main>

        <ChatInput 
          inputText={inputText}
          handleTyping={handleTyping}
          handleSendMessage={handleSendMessage}
          handleImageUpload={handleImageUpload}
          status={status}
          roomId={roomId}
          isStealthMode={isStealthMode}
        />

        {isSettingsOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <div className="bg-[#2f2f2f] w-full max-w-sm rounded-3xl border border-[#3d3d3d] p-8 shadow-2xl">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-white">Settings</h2>
                <button onClick={() => setIsSettingsOpen(false)} className="text-gray-500 hover:text-white"><CloseIcon className="w-6 h-6" /></button>
              </div>
              <input type="text" value={nameInput} onChange={(e) => setNameInput(e.target.value)} className="w-full bg-[#171717] border border-[#3d3d3d] rounded-xl px-4 py-3 text-white mb-4" placeholder="Enter name..." />
              <button onClick={() => { socket.emit('update_profile', { name: nameInput }); setIsSettingsOpen(false); }} className="w-full bg-blue-600 text-white py-3 rounded-xl">Save</button>
            </div>
          </div>
        )}
      </div>

      {zoomedImage && (
        <div className="fixed inset-0 z-[1000] bg-black/98 backdrop-blur-xl flex items-center justify-center" onClick={() => setZoomedImage(null)}>
          <img src={zoomedImage} alt="Zoomed" className="max-w-full max-h-[85vh] rounded-2xl" />
        </div>
      )}

      {showVaultGate && (
        <VaultGate 
          mode={showVaultGate}
          onClose={() => setShowVaultGate(null)}
          onUnlock={(pin) => socket.emit('verify_vault_password', { password: pin })}
          onSetPassword={(pin) => socket.emit('set_vault_password', { password: pin })}
        />
      )}

      {isInformModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-[#1a1c2e] w-full max-w-md rounded-3xl border border-white/10 p-8 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Info className="w-5 h-5 text-yellow-500" /> Inform Owner
              </h2>
              <button onClick={() => setIsInformModalOpen(false)} className="text-gray-500 hover:text-white"><CloseIcon className="w-6 h-6" /></button>
            </div>
            <p className="text-gray-400 text-sm mb-4">Send a direct message or feedback to the platform owner. Your identity remains protected.</p>
            <textarea 
              value={informMessage}
              onChange={(e) => setInformMessage(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-4 text-white mb-6 min-h-[150px] focus:outline-none focus:border-blue-500/50"
              placeholder="What would you like to say?..."
            />
            <button 
              onClick={handleSendInform}
              disabled={isSendingInform || !informMessage.trim()}
              className={`w-full py-4 rounded-2xl font-bold transition-all ${isSendingInform ? 'bg-blue-600/50 text-white' : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95 shadow-xl shadow-blue-600/20'}`}
            >
              {isSendingInform ? 'Sending Message...' : 'Send Message'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
