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
import {
  compressImage,
  readFileAsDataURL,
  MAX_GIF_SIZE_BYTES
} from '../utils/imageCompressor';
import {
  isSupabaseMediaEnabled,
  uploadChatMedia,
  validateChatMediaFile,
  deleteChatMedia
} from '../utils/mediaUpload';

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
    myName, setMyName,
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
    replyingTo, setReplyingTo,
    editingMessage, setEditingMessage,
    hasMoreMessages
  } = useStore();

  // --- Custom Hooks ---
  const { initSocket, findPartner, sendMessage, editMessage, loadMoreMessages, reactToMessage, leaveChat } = useChat();
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
  const [statusBarY, setStatusBarY] = useState(24);
  const [lightboxMedia, setLightboxMedia] = useState(null);
  const [showVaultGate, setShowVaultGate] = useState(null);
  const [pendingPrivateChatId, setPendingPrivateChatId] = useState(null);
  const pendingPrivateChatIdRef = useRef(null);
  const [mainView, setMainView] = useState('remote');
  const [showVcChat, setShowVcChat] = useState(true);
  const [isMirrored, setIsMirrored] = useState(true);
  const [facingMode, setFacingMode] = useState('user');

  const [isInformModalOpen, setIsInformModalOpen] = useState(false);
  const [informMessage, setInformMessage] = useState('');
  const [isSendingInform, setIsSendingInform] = useState(false);
  const [isFetchingWord, setIsFetchingWord] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);

  const handleMasterEnglish = async () => {
    if (!inputText.trim()) return;
    setIsTranslating(true);
    
    // Simulate "Magic" feel
    await new Promise(r => setTimeout(r, 800));
    
    // Smart English Master logic
    // Note: You can replace this with a real AI call to OpenAI/Gemini later
    const mastered = inputText
      .trim()
      .replace(/^([a-z])/, (m) => m.toUpperCase()) // Capitalize first letter
      .replace(/\s+i\s+/g, ' I ') // Fix lowercase "i"
      .replace(/\s+i'([a-z]+)/g, " I'$1") // Fix "i'm"
      .replace(/([^.!?])$/, '$1.'); // Add period if missing
      
    setInputText(mastered);
    setIsTranslating(false);
  };

  const dragStartY = useRef(0);
  const dragStartStatusBarY = useRef(0);
  const isDragging = useRef(false);
  const remoteAudioRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localVideoRef = useRef(null);
  const vcChatRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const composerInputRef = useRef(null);

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

    const handleVaultStatus = (data) => {
      useStore.getState().setIsVaultEnabled(data.isVaultEnabled);
      if (data.success) {
        setShowVaultGate(null);
      }
      if (data.isVaultEnabled) {
        setIsVaultUnlocked(false);
      }
    };

    const handleVaultVerified = (data) => {
      console.log("Vault verified response:", data);
      if (data.success) {
        setIsVaultUnlocked(true);
        setShowVaultGate(null);
        const nextFriendId = pendingPrivateChatIdRef.current;
        if (nextFriendId) {
          console.log("Starting pending private chat with:", nextFriendId);
          socket.emit("start_private_chat", { friendId: nextFriendId });
          setMessages([]);
          pendingPrivateChatIdRef.current = null;
          setPendingPrivateChatId(null);
        }
      } else {
        console.warn("Vault verification failed");
        window.dispatchEvent(new CustomEvent('wrong-vault-pin'));
      }
    };

    const handlePasswordSet = (data) => {
      if (data.success) {
        setShowVaultGate(null);
      }
    };

    socket.on('inform_sent', handleInformSent);
    socket.on('vault_status_updated', handleVaultStatus);
    socket.on('vault_verify_result', handleVaultVerified);
    socket.on('password_set', handlePasswordSet);

    const handleVisibilityChange = () => {
      if (document.hidden) setIsVaultUnlocked(false);
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      socket.off('inform_sent', handleInformSent);
      socket.off('vault_status_updated', handleVaultStatus);
      socket.off('vault_verify_result', handleVaultVerified);
      socket.off('password_set', handlePasswordSet);
    };
  }, []);

  // Sync name input when settings opens
  useEffect(() => {
    if (isSettingsOpen) {
      setNameInput(myName);
    }
  }, [isSettingsOpen, myName]);

  const handleToggleVault = () => {
    if (isVaultEnabled) {
      setShowVaultGate('verify'); // Require PIN to disable
    } else {
      setShowVaultGate('setup');
    }
  };

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

  const handleClearChat = () => {
    if (window.confirm("Are you sure you want to clear this chat? This will delete all messages permanently from the database.")) {
      socket.emit('clear_chat', { roomId });
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
  const handleCancelComposerEdit = () => {
    setEditingMessage(null);
    setInputText('');
  };

  const handleStartComposerEdit = (msg) => {
    if (msg.type !== 'text') return;
    const mid = msg.messageId;
    if (!mid || String(mid).startsWith('q_')) return;
    setReplyingTo(null);
    const text = typeof msg.message === 'string' ? msg.message : '';
    setEditingMessage({ messageId: mid, originalText: text });
    setInputText(text);
    requestAnimationFrame(() => {
      const el = composerInputRef.current;
      if (el && typeof el.focus === 'function') {
        el.focus();
        const len = text.length;
        if (typeof el.setSelectionRange === 'function') el.setSelectionRange(len, len);
      }
    });
  };

  const handleReplySelect = (msg) => {
    setEditingMessage(null);
    setReplyingTo(msg);
  };

  const handleSendMessage = (e) => {
    e?.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed) return;

    if (editingMessage) {
      if (trimmed === editingMessage.originalText) {
        handleCancelComposerEdit();
        return;
      }
      editMessage(editingMessage.messageId, trimmed);
      handleCancelComposerEdit();
      if (roomId) socket.emit('typing', { roomId, isTyping: false });
      return;
    }

    sendMessage(inputText);
    setInputText('');
    if (roomId) socket.emit('typing', { roomId, isTyping: false });
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

  const handleMediaUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !roomId) return;
    if (!sharedKey) {
      alert('Wait for the chat connection before sending media.');
      return;
    }
    if (editingMessage) {
      setEditingMessage(null);
      setInputText('');
    }

    const v = validateChatMediaFile(file);
    if (!v.ok) {
      alert(v.error);
      return;
    }

    const isVideo = v.kind === 'video';

    if (isSupabaseMediaEnabled()) {
      const messageId = `m_${Math.random().toString(36).slice(2, 12)}`;
      const localPreview =
        !isVideo && file.type.startsWith('image/')
          ? URL.createObjectURL(file)
          : '';

      setMessages((prev) => [
        ...prev,
        {
          roomId,
          messageId,
          senderId: myUserId,
          timestamp: new Date().toISOString(),
          type: isVideo ? 'video' : 'image',
          message: localPreview,
          isUploading: true
        }
      ]);

      try {
        const { publicUrl } = await uploadChatMedia(file, { roomId, messageId });
        if (localPreview) URL.revokeObjectURL(localPreview);
        sendMessage(publicUrl, isVideo ? 'video' : 'image', { replaceMessageId: messageId });
      } catch (err) {
        console.warn('Supabase upload failed, falling back to direct socket send:', err);
        try {
          const fallbackData = await readFileAsDataURL(file);
          if (localPreview) URL.revokeObjectURL(localPreview);
          sendMessage(fallbackData, isVideo ? 'video' : 'image', { replaceMessageId: messageId });
        } catch (fallbackErr) {
          console.error('Final fallback failed:', fallbackErr);
          if (localPreview) URL.revokeObjectURL(localPreview);
          setMessages((prev) => prev.filter((m) => m.messageId !== messageId));
        }
      }
      return;
    }

    if (isVideo) {
      alert(
        'Video requires Supabase. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in client/.env'
      );
      return;
    }

    try {
      if (file.type === 'image/gif') {
        if (file.size > MAX_GIF_SIZE_BYTES) {
          alert(
            `GIF is too large (max ${MAX_GIF_SIZE_BYTES / (1024 * 1024)} MB). Try a shorter or smaller file.`
          );
          return;
        }
        const dataUrl = await readFileAsDataURL(file);
        sendMessage(dataUrl, 'image');
      } else {
        const compressed = await compressImage(file);
        sendMessage(compressed, 'image');
      }
    } catch (err) {
      console.error('Image send failed', err);
      try {
        const fallback = await readFileAsDataURL(file);
        sendMessage(fallback, 'image');
      } catch (e2) {
        console.error(e2);
      }
    }
  };

  const handleDownloadMedia = async (url) => {
    if (!url) return;
    try {
      if (url.startsWith('data:')) {
        const link = document.createElement('a');
        link.href = url;
        link.download = `aura_media_${Date.now()}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return;
      }
      const res = await fetch(url, { mode: 'cors' });
      const blob = await res.blob();
      const obj = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = obj;
      link.download = `aura_media_${Date.now()}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(obj);
    } catch {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const startPrivateChat = (friendId) => {
    setUnreadCounts(prev => ({ ...prev, [friendId]: 0 }));
    endCall();
    setIsVaultUnlocked(false);
    if (isVaultEnabled) {
      pendingPrivateChatIdRef.current = friendId;
      setPendingPrivateChatId(friendId);
      setShowVaultGate('verify');
    } else {
      socket.emit("start_private_chat", { friendId });
      setMessages([]);
    }
  };

  const handleSendFriendRequest = () => {
    if (!roomId) return;
    console.log("Sending friend request for room:", roomId);
    socket.emit('send_friend_request', { roomId });
    alert("Friend request sent!");
  };

  const deleteMessage = async (messageId) => {
    if (editingMessage?.messageId === messageId) {
      setEditingMessage(null);
      setInputText('');
    }

    // --- Clean up media from storage if applicable ---
    const targetMsg = messages.find(m => m.messageId === messageId);
    if (targetMsg && (targetMsg.type === 'image' || targetMsg.type === 'video')) {
      const mediaUrl = targetMsg.message;
      if (typeof mediaUrl === 'string' && mediaUrl.startsWith('https://')) {
        // This is likely a Supabase URL, try to delete from storage
        await deleteChatMedia(mediaUrl);
      }
    }

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
    >
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
        editingMessage={editingMessage}
        onCancelEdit={handleCancelComposerEdit}
        replyingTo={replyingTo}
        onCancelReply={() => setReplyingTo(null)}
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
        clearChat={handleClearChat}
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
          onSendFriendRequest={handleSendFriendRequest}
          showFriendAdd={partnerUserId && Array.isArray(friends) && !friends.some(f => f.userId === partnerUserId)}
          partnerUserId={partnerUserId}
          partnerStatus={
            status === 'Matched' && partnerUserId
              ? (Array.isArray(friends) && friends.some(f => f.userId === partnerUserId)
                  ? (friends.find(f => f.userId === partnerUserId)?.isOnline ? 'Online' : 'Offline') 
                  : 'Online')
              : null
          }
          onClearChat={handleClearChat}
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
                <div className="absolute top-4 right-4 z-50 bg-[#1a1c2e] border border-white/10 p-5 rounded-2xl shadow-2xl animate-in slide-in-from-right duration-500 w-80">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold">
                      {friendRequests[0]?.fromName?.charAt(0).toUpperCase() || 'S'}
                    </div>
                    <div>
                      <p className="text-sm text-white font-bold">{friendRequests[0]?.fromName || 'Stranger'}</p>
                      <p className="text-[10px] text-gray-500 font-medium">Sent you a friend request</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        const fromUserId = friendRequests[0]?.from;
                        if (fromUserId) {
                          socket.emit('accept_friend_request', { fromUserId });
                          setFriendRequests(prev => prev.slice(1));
                        }
                      }} 
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-xl text-xs font-bold transition-all active:scale-95"
                    >
                      Accept
                    </button>
                    <button 
                      onClick={() => {
                        const fromUserId = friendRequests[0]?.from;
                        if (fromUserId) {
                          socket.emit('decline_friend_request', { fromUserId });
                          setFriendRequests(prev => prev.slice(1));
                        }
                      }} 
                      className="flex-1 bg-white/5 hover:bg-white/10 text-gray-400 py-2 rounded-xl text-xs font-bold transition-all active:scale-95"
                    >
                      Decline
                    </button>
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
                  onStartComposerEdit={handleStartComposerEdit}
                  onReplyMessage={handleReplySelect}
                  onReactMessage={reactToMessage}
                  loadMoreMessages={loadMoreMessages}
                  hasMoreMessages={hasMoreMessages}
                  partnerName={partnerName}
                  onZoomImage={(url, mediaType) =>
                    setLightboxMedia({
                      url,
                      kind: mediaType === 'video' ? 'video' : 'image'
                    })
                  }
                />
              )}
            </>
          )}
        </main>

        <ChatInput 
          ref={composerInputRef}
          inputText={inputText}
          handleTyping={handleTyping}
          handleSendMessage={handleSendMessage}
          handleImageUpload={handleMediaUpload}
          status={status}
          roomId={roomId}
          replyingTo={replyingTo}
          onCancelReply={() => setReplyingTo(null)}
          editingMessage={editingMessage}
          onCancelEdit={handleCancelComposerEdit}
          partnerName={partnerName}
          myUserId={myUserId}
          isStealthMode={isStealthMode}
          onMasterEnglish={handleMasterEnglish}
          isTranslating={isTranslating}
        />

        {isSettingsOpen && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-[#1a1c2e] w-full max-w-sm rounded-[32px] border border-white/10 p-8 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-500" />
              
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h2 className="text-2xl font-black text-white tracking-tight">Settings</h2>
                  <p className="text-gray-500 text-[11px] font-bold uppercase tracking-widest mt-1">Personalize your experience</p>
                </div>
                <button 
                  onClick={() => setIsSettingsOpen(false)} 
                  className="p-2 hover:bg-white/5 rounded-full text-gray-500 hover:text-white transition-colors"
                >
                  <CloseIcon className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-2 block ml-1">Display Name</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      value={nameInput} 
                      onChange={(e) => setNameInput(e.target.value)} 
                      className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-blue-500/50 transition-all font-medium" 
                      placeholder="How should we call you?..." 
                    />
                    <Shield className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                  </div>
                </div>

                <div className="p-5 bg-white/5 rounded-2xl border border-white/5 flex items-center justify-between group hover:bg-white/[0.08] transition-all">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${isVaultEnabled ? 'bg-blue-500/20 text-blue-400' : 'bg-gray-500/10 text-gray-500'}`}>
                      <Shield className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[13px] font-bold text-gray-200">Private Vault</p>
                      <p className="text-[10px] text-gray-500 font-medium">{isVaultEnabled ? 'Secure 4-digit protection' : 'Add extra layer of security'}</p>
                    </div>
                  </div>
                  <button 
                    onClick={handleToggleVault}
                    className={`relative w-12 h-6 rounded-full transition-all duration-300 ${isVaultEnabled ? 'bg-blue-600' : 'bg-white/10'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-300 ${isVaultEnabled ? 'left-7 shadow-lg' : 'left-1'}`} />
                  </button>
                </div>

                <button 
                  onClick={() => { 
                    socket.emit('update_profile', { name: nameInput }); 
                    setIsSettingsOpen(false); 
                  }} 
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-blue-600/20 active:scale-95 mt-4"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {lightboxMedia?.url && (
        <div
          className="fixed inset-0 z-[1000] bg-black/98 backdrop-blur-xl flex flex-col items-center justify-center animate-in fade-in duration-300"
          onClick={() => setLightboxMedia(null)}
          role="dialog"
          aria-modal="true"
          aria-label={lightboxMedia.kind === 'video' ? 'Video' : 'Image'}
        >
          <div className="absolute top-6 right-6 flex items-center gap-4 z-[1001]">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleDownloadMedia(lightboxMedia.url);
              }}
              className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all active:scale-95 group shadow-xl border border-white/10"
              title="Download"
            >
              <Download className="w-6 h-6 group-hover:translate-y-0.5 transition-transform" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setLightboxMedia(null);
              }}
              className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all active:scale-95 group shadow-xl border border-white/10"
              title="Close"
            >
              <CloseIcon className="w-6 h-6 group-hover:rotate-90 transition-transform duration-300" />
            </button>
          </div>
          <div className="relative max-w-[90vw] max-h-[80vh] flex items-center justify-center p-4">
            {lightboxMedia.kind === 'video' ? (
              <video
                src={lightboxMedia.url}
                controls
                autoPlay
                playsInline
                className="max-w-full max-h-[80vh] rounded-2xl shadow-[0_0_100px_rgba(0,0,0,0.5)] bg-black"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <img
                src={lightboxMedia.url}
                alt="Full size"
                className="max-w-full max-h-full rounded-2xl shadow-[0_0_100px_rgba(0,0,0,0.5)] object-contain"
                onClick={(e) => e.stopPropagation()}
              />
            )}
          </div>
        </div>
      )}

      {showVaultGate && (
        <VaultGate 
          mode={showVaultGate}
          onClose={() => setShowVaultGate(null)}
          onUnlock={(pin) => {
            if (isSettingsOpen && isVaultEnabled) {
              socket.emit('toggle_vault', { enabled: false, password: pin });
            } else {
              socket.emit('verify_vault_password', { password: pin });
            }
          }}
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
