import React, { useState, useEffect, useRef } from 'react';
import { Send, ArrowUp, Plus, LayoutGrid, Menu, Phone, PhoneOff, Mic, MicOff, Volume2, Volume1, Video, VideoOff, Camera, RefreshCw, UserPlus, Check, X as CloseIcon, Users, Settings, Globe } from 'lucide-react';
import { socket } from '../socket/socket';
import Sidebar from '../components/Sidebar';
import ChatBox from '../components/ChatBox';
import { 
  encryptWithKey, 
  decryptWithKey, 
  generateKeyPair, 
  exportPublicKey, 
  importPublicKey, 
  deriveSharedSecret,
  exportKeyPair,
  importKeyPair,
  exportSharedKey,
  importSharedKey
} from '../utils/crypto';

const Home = () => {
  const [status, setStatus] = useState('Idle');
  const [isSocketConnected, setIsSocketConnected] = useState(socket.connected);
  const [partnerName, setPartnerName] = useState('Stranger');
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [roomId, setRoomId] = useState(null);
  const [userCount, setUserCount] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [friends, setFriends] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  const [myUserId, setMyUserId] = useState(null);
  const [myName, setMyName] = useState('Stranger');
  const [remoteStream, setRemoteStream] = useState(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [myKeyPair, setMyKeyPair] = useState(null);
  const [sharedKey, setSharedKey] = useState(null);
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);
  const typingTimeoutRef = useRef(null);
  const sharedKeyRef = useRef(null);

  // Sync ref with state
  useEffect(() => {
    sharedKeyRef.current = sharedKey;
  }, [sharedKey]);

  // --- Calling States ---
  const [isCalling, setIsCalling] = useState(false);
  const [isReceivingCall, setIsReceivingCall] = useState(false);
  const [callAccepted, setCallAccepted] = useState(false);
  const [isVideoCall, setIsVideoCall] = useState(false); 
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isSpeakerMode, setIsSpeakerMode] = useState(false); // Default: Ear Mode (false)
  const [incomingSignal, setIncomingSignal] = useState(null);
  const [callType, setCallType] = useState('audio'); // 'audio' or 'video'
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isInformModalOpen, setIsInformModalOpen] = useState(false);
  const [informMessage, setInformMessage] = useState('');
  const [isSendingInform, setIsSendingInform] = useState(false);
  const peerConnection = useRef(null);
  const localStream = useRef(null);
  const remoteAudioRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localVideoRef = useRef(null);
  const vcChatRef = useRef(null);

  // Auto-scroll VC chat
  useEffect(() => {
    if (vcChatRef.current) {
      vcChatRef.current.scrollTop = vcChatRef.current.scrollHeight;
    }
  }, [messages, isVideoCall]);

  // Handle Remote Stream Attachment
  useEffect(() => {
    if (remoteStream) {
      if (isVideoCall && remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
        remoteVideoRef.current.play().catch(e => {
          if (e.name !== 'AbortError') console.error("WebRTC: Video play failed", e);
        });
      }
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = remoteStream;
        remoteAudioRef.current.muted = false;
        remoteAudioRef.current.volume = isSpeakerMode ? 1.0 : 0.4;
        remoteAudioRef.current.play().catch(e => {
          if (e.name !== 'AbortError') console.error("WebRTC: Audio play failed", e);
        });
      }
    }
  }, [remoteStream, isVideoCall, isSpeakerMode]);
  const iceCandidatesQueue = useRef([]);
  const audioContext = useRef(null);
  const analyser = useRef(null);
  const animationFrame = useRef(null);
  const fileInputRef = useRef(null);
  // ----------------------

  // Persistent User ID and Key Pair
  useEffect(() => {
    let id = localStorage.getItem('chat_user_id');
    if (!id) {
      id = 'user_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('chat_user_id', id);
    }
    setMyUserId(id);

    const initKeys = async () => {
      const savedKeys = localStorage.getItem('chat_key_pair');
      if (savedKeys) {
        try {
          const keys = await importKeyPair(savedKeys);
          setMyKeyPair(keys);
          return;
        } catch (e) { console.error("Failed to import keys", e); }
      }
      
      const keys = await generateKeyPair();
      const exported = await exportKeyPair(keys);
      localStorage.setItem('chat_key_pair', exported);
      setMyKeyPair(keys);
    };
    initKeys();
  }, []);



  // Update volume when speaker mode changes
  useEffect(() => {
    if (remoteAudioRef.current) {
      remoteAudioRef.current.volume = isSpeakerMode ? 1.0 : 0.4;
    }
  }, [isSpeakerMode]);

  // Robust list of free STUN servers
  const iceServers = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    { urls: 'stun:global.stun.twilio.com:3478' }
  ];

  useEffect(() => {
    if (!socket.connected) {
      socket.connect();
    }

    socket.on('connect', () => {
      setIsSocketConnected(true);
      // Always register user on connect/reconnect
      const id = localStorage.getItem('chat_user_id');
      if (id) {
        socket.emit("register_user", { userId: id });
      }

      const savedRoomId = sessionStorage.getItem('current_room_id');
      if (savedRoomId) {
        socket.emit('rejoin_chat', { userId: id, roomId: savedRoomId });
      } else {
        setStatus('Idle');
      }
    });

    socket.on('disconnect', () => {
      setIsSocketConnected(false);
    });

    socket.on('rejoined', async (data) => {
      setStatus('Matched');
      setRoomId(data.roomId);
      const savedKey = sessionStorage.getItem(`shared_key_${data.roomId}`);
      if (savedKey) {
        try {
          const key = await importSharedKey(savedKey);
          setSharedKey(key);
        } catch (e) { console.error("Failed to restore shared key", e); }
      }
    });

    socket.on('partner_rejoined', async () => {
      setMessages((prev) => [
        ...prev,
        { message: 'Partner is back!', senderId: 'system', timestamp: new Date().toISOString() }
      ]);
      // Re-send our public key in case the partner lost theirs
      if (myKeyPair) {
        const pubKeyBase64 = await exportPublicKey(myKeyPair.publicKey);
        socket.emit('exchange_keys', { roomId: sessionStorage.getItem('current_room_id'), publicKey: pubKeyBase64 });
      }
    });

    socket.on('rejoin_failed', () => {
      sessionStorage.removeItem('current_room_id');
      setStatus('Idle');
    });

    socket.on('user_count', (count) => {
      setUserCount(count);
    });

    socket.on('waiting', () => {
      setStatus('Waiting');
      setMessages([]);
      setRoomId(null);
      sessionStorage.removeItem('current_room_id');
    });

    socket.on('matched', async (data) => {
      setRoomId(data.roomId);
      setStatus('Matched');
      setMessages([]); // Clear previous chat
      sessionStorage.setItem('current_room_id', data.roomId);
      
      if (data.isPrivate) {
        const otherUserId = data.roomId.replace('private_', '').replace(myUserId, '').replace('_', '');
        const friend = friends.find(f => f.userId === otherUserId);
        if (friend) {
          setPartnerName(friend.name);
        } else {
          setPartnerName('Friend');
        }
      } else {
        setPartnerName('Stranger');
      }

      // Send our public key to the partner
      if (myKeyPair) {
        const pubKeyBase64 = await exportPublicKey(myKeyPair.publicKey);
        socket.emit('exchange_keys', { roomId: data.roomId, publicKey: pubKeyBase64 });
      }
    });

    socket.on('exchange_keys', async (data) => {
      if (myKeyPair && !sharedKeyRef.current) {
        const partnerPubKey = await importPublicKey(data.publicKey);
        const derived = await deriveSharedSecret(myKeyPair.privateKey, partnerPubKey);
        setSharedKey(derived);
        // Persist shared key for refresh protection
        const exported = await exportSharedKey(derived);
        sessionStorage.setItem(`shared_key_${data.roomId}`, exported);
      }
    });

    socket.on('receive_message', async (data) => {
      let content = data.message;
      if (sharedKeyRef.current) {
        content = await decryptWithKey(data.message, sharedKeyRef.current);
      }
      
      // If it's an image, convert to Blob URL for privacy
      if (data.type === 'image' && content.startsWith('data:')) {
        try {
          const res = await fetch(content);
          const blob = await res.blob();
          content = URL.createObjectURL(blob);
        } catch (e) { console.error("Blob conversion failed", e); }
      }

      setMessages((prev) => [...prev, { ...data, message: content }]);
      setIsPartnerTyping(false);
    });

    socket.on('message_deleted', (data) => {
      const { messageId } = data;
      setMessages((prev) => prev.filter(msg => msg.messageId !== messageId));
    });

    socket.on('typing', (data) => {
      setIsPartnerTyping(data.isTyping);
    });

    socket.on('friend_added', (data) => {
      setFriends(prev => {
        const exists = prev.find(f => f.userId === data.userId);
        if (exists) return prev;
        return [...prev, { userId: data.userId, name: data.name, isOnline: data.isOnline }];
      });
      setFriendRequests(prev => prev.filter(r => r.from !== data.userId));
    });

    socket.on('friend_status_update', (data) => {
      setFriends(prev => prev.map(f => 
        f.userId === data.userId ? { ...f, isOnline: data.isOnline } : f
      ));
    });

    socket.on('incoming_friend_request', (data) => {
      setFriendRequests(prev => [...prev, data]);
    });

    socket.on('friend_removed', (data) => {
      setFriends(prev => prev.filter(f => f.userId !== data.userId));
    });

    socket.on('init_data', (data) => {
      setMyName(data.name || 'Stranger');
      setNameInput(data.name || 'Stranger');
      setFriends(data.friends || []);
      setFriendRequests(data.pendingRequests || []);
    });

    socket.on('profile_updated', (data) => {
      setMyName(data.name);
    });

    socket.on('inform_sent', (data) => {
      setIsSendingInform(false);
      if (data.success) {
        alert("Information sent successfully!");
        setIsInformModalOpen(false);
        setInformMessage('');
      } else {
        alert("Error: " + data.error);
      }
    });

    socket.on('partner_disconnected', () => {
      setStatus('Disconnected');
      setMessages((prev) => [
        ...prev,
        { message: 'Stranger has disconnected.', senderId: 'system', timestamp: new Date().toISOString() }
      ]);
      setRoomId(null);
      setSharedKey(null); // Reset encryption
      sessionStorage.removeItem('current_room_id');
      endCall();
    });

    // --- WebRTC Listeners ---
    socket.on('incoming_call', (data) => {
      setIsReceivingCall(true);
      setIncomingSignal(data.signal);
      setCallType(data.type || 'audio');
    });

    socket.on('call_accepted', async (signal) => {
      if (peerConnection.current) {
        try {
          await peerConnection.current.setRemoteDescription(new RTCSessionDescription(signal));
          setCallAccepted(true);
          // Process queued candidates
          while (iceCandidatesQueue.current.length > 0) {
            const candidate = iceCandidatesQueue.current.shift();
            await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
          }
        } catch (err) {
          console.error("Error setting remote description:", err);
        }
      }
    });

    socket.on('call_ended', () => {
      endCall();
    });

    socket.on('ice_candidate', async (candidate) => {
      try {
        if (peerConnection.current && peerConnection.current.remoteDescription) {
          await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
        } else {
          iceCandidatesQueue.current.push(candidate);
        }
      } catch (err) {
        console.error("Error adding ice candidate:", err);
      }
    });
    // ----------------------

    return () => {
      socket.off('connect');
      socket.off('waiting');
      socket.off('matched');
      socket.off('user_count');
      socket.off('receive_message');
      socket.off('typing');
      socket.off('partner_disconnected');
      socket.off('rejoined');
      socket.off('partner_rejoined');
      socket.off('rejoin_failed');
      socket.off('incoming_call');
      socket.off('call_accepted');
      socket.off('call_ended');
      socket.off('ice_candidate');
      socket.off('friend_added');
      socket.off('friend_removed');
      socket.off('friend_status_update');
      socket.off('incoming_friend_request');
      socket.off('init_data');
      socket.off('profile_updated');
      socket.off('inform_sent');
      // socket.disconnect(); // REMOVED: Keep connection stable
    };
  }, [myUserId]); 

  const startAudioAnalysis = (stream) => {
    const context = new (window.AudioContext || window.webkitAudioContext)();
    const source = context.createMediaStreamSource(stream);
    const node = context.createAnalyser();
    node.fftSize = 256;
    source.connect(node);
    
    audioContext.current = context;
    analyser.current = node;

    const bufferLength = node.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const checkVolume = () => {
      node.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i];
      }
      const average = sum / bufferLength;
      setIsSpeaking(average > 10); // Threshold for speaking
      animationFrame.current = requestAnimationFrame(checkVolume);
    };
    checkVolume();
  };

  const createPeerConnection = (roomId, type) => {
    const pc = new RTCPeerConnection({ 
      iceServers,
      iceCandidatePoolSize: 10 
    });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('ice_candidate', { roomId, candidate: event.candidate });
      }
    };

    pc.ontrack = (event) => {
      console.log("WebRTC: Remote track received", event.track.kind);
      setRemoteStream(event.streams[0]);
    };

    if (localStream.current) {
      localStream.current.getTracks().forEach(track => {
        pc.addTrack(track, localStream.current);
      });
    }

    peerConnection.current = pc;
    return pc;
  };

  const toggleMic = () => {
    if (localStream.current) {
      const audioTrack = localStream.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMicMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleCamera = () => {
    if (localStream.current) {
      const videoTrack = localStream.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsCameraOff(!videoTrack.enabled);
      }
    }
  };

  const switchCamera = async () => {
    alert("Switching camera...");
  };

  const startCall = async (type = 'audio') => {
    try {
      setCallType(type);
      if (type === 'video') setIsVideoCall(true);
      setIsCalling(true);

      const constraints = { 
        audio: true, 
        video: type === 'video' 
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStream.current = stream;
      
      if (type === 'video' && localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      
      startAudioAnalysis(stream);

      const pc = createPeerConnection(roomId, type);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socket.emit('call_user', { roomId, signalData: offer, type });
    } catch (err) {
      console.error("Failed to start call:", err);
      alert("Could not access camera/microphone.");
      setIsVideoCall(false);
      setIsCalling(false);
    }
  };

  const answerCall = async () => {
    try {
      const type = callType; // Capture the current type
      if (type === 'video') setIsVideoCall(true);
      setIsReceivingCall(false);
      setCallAccepted(true);

      const constraints = { 
        audio: true, 
        video: type === 'video' 
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStream.current = stream;
      
      if (type === 'video' && localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      startAudioAnalysis(stream);

      const pc = createPeerConnection(roomId, type);
      await pc.setRemoteDescription(new RTCSessionDescription(incomingSignal));
      
      while (iceCandidatesQueue.current.length > 0) {
        const candidate = iceCandidatesQueue.current.shift();
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit('answer_call', { roomId, signalData: answer });
    } catch (err) {
      console.error("Failed to answer call:", err);
      setIsVideoCall(false);
    }
  };

  const endCall = () => {
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }
    if (localStream.current) {
      localStream.current.getTracks().forEach(track => track.stop());
      localStream.current = null;
    }
    if (audioContext.current) {
      audioContext.current.close();
      audioContext.current = null;
    }
    if (animationFrame.current) {
      cancelAnimationFrame(animationFrame.current);
    }
    setRemoteStream(null);
    setIsCalling(false);
    setIsReceivingCall(false);
    setCallAccepted(false);
    setIsVideoCall(false);
    setIncomingSignal(null);
    setIsSpeaking(false);
    setIsMicMuted(false);
    setIsCameraOff(false);
    iceCandidatesQueue.current = [];
    socket.emit('end_call', { roomId });
  };

  const findNewPartner = () => {
    if (!myUserId) return;
    endCall();
    socket.emit('leave_chat');
    if (roomId) sessionStorage.removeItem(`shared_key_${roomId}`);
    socket.emit('find_partner', { userId: myUserId });
    setStatus('Waiting');
    setMessages([]);
    setRoomId(null);
    setSharedKey(null);
    sessionStorage.removeItem('current_room_id');
  };

  const endSession = () => {
    endCall();
    socket.emit('leave_chat');
    if (roomId) sessionStorage.removeItem(`shared_key_${roomId}`);
    setStatus('Idle');
    setMessages([]);
    setRoomId(null);
    setSharedKey(null);
    sessionStorage.removeItem('current_room_id');
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || !roomId) return;

    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    let encryptedText = inputText;
    
    if (sharedKeyRef.current) {
      encryptedText = await encryptWithKey(inputText, sharedKeyRef.current);
    }
    
    const messageData = {
      message: encryptedText,
      roomId,
      senderId: socket.id,
      type: 'text',
      messageId,
      timestamp: new Date().toISOString()
    };

    socket.emit('send_message', messageData);
    setMessages((prev) => [...prev, { ...messageData, message: inputText }]);
    setInputText('');
    socket.emit('typing', { roomId, isTyping: false });
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file || !roomId) return;

    if (file.size > 2 * 1024 * 1024) {
      alert("Image too large. Please select an image under 2MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const base64Image = reader.result;
      
      let finalMessage = base64Image;
      if (sharedKeyRef.current) {
        finalMessage = await encryptWithKey(base64Image, sharedKeyRef.current);
      }

      const messageData = {
        message: finalMessage,
        roomId,
        senderId: socket.id,
        type: 'image',
        messageId,
        timestamp: new Date().toISOString()
      };

      socket.emit('send_message', messageData);
      
      // Convert to Blob for local display privacy too
      let localDisplay = base64Image;
      try {
        const res = await fetch(base64Image);
        const blob = await res.blob();
        localDisplay = URL.createObjectURL(blob);
      } catch (e) {}

      setMessages((prev) => [...prev, { ...messageData, message: localDisplay }]);
    };
    reader.readAsDataURL(file);
    // Reset input
    e.target.value = '';
  };

  const deleteMessage = (messageId) => {
    if (!roomId) return;
    socket.emit('delete_message', { roomId, messageId });
    setMessages((prev) => prev.filter(msg => msg.messageId !== messageId));
  };

  const sendFriendRequest = () => {
    if (!roomId) return;
    socket.emit("send_friend_request", { roomId });
    alert("Friend request sent!");
  };

  const acceptFriendRequest = (fromUserId) => {
    socket.emit("accept_friend_request", { fromUserId });
  };

  const removeFriend = (friendId) => {
    if (window.confirm("Are you sure you want to remove this friend?")) {
      socket.emit("remove_friend", { friendId });
    }
  };

  const startPrivateChat = (friendId) => {
    endCall();
    socket.emit("start_private_chat", { friendId });
    setMessages([]);
  };

  const updateProfile = () => {
    if (!nameInput.trim()) return;
    socket.emit("update_profile", { name: nameInput });
    setIsSettingsOpen(false);
  };

  const handleSendInform = () => {
    if (!informMessage.trim()) return;
    setIsSendingInform(true);
    socket.emit("inform_owner", { message: informMessage, senderName: myName });
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

  return (
    <div className="fixed inset-0 h-screen h-[100dvh] bg-[#212121] flex overflow-hidden font-sans relative">
      {/* Hidden Audio for remote stream */}
      <audio ref={remoteAudioRef} autoPlay />

      {/* Video Call Overlay */}
      {isVideoCall && (
        <div className="fixed inset-0 z-[150] bg-black flex flex-col md:flex-row animate-in fade-in duration-500 overflow-hidden">
          {/* Section: Partner Video / Connecting State */}
          <div className="relative flex-1 bg-[#171717] border-b md:border-b-0 md:border-r border-white/5 overflow-hidden">
            {!callAccepted ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 space-y-4">
                <div className="w-16 h-16 border-4 border-green-500/20 border-t-green-500 rounded-full animate-spin" />
                <div>
                  <h3 className="text-xl font-bold text-white mb-1">Connecting Video</h3>
                  <p className="text-sm text-gray-400">Establishing secure connection...</p>
                </div>
              </div>
            ) : (
              <video 
                ref={remoteVideoRef} 
                autoPlay 
                playsInline 
                className="w-full h-full object-cover"
              />
            )}
            {/* Overlay Info (Top Left) */}
            <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-[12px] font-medium text-white">Stranger</span>
            </div>
          </div>

          {/* Section: Self Video */}
          <div className="relative flex-1 bg-[#1a1a1a] overflow-hidden">
            <video 
              ref={localVideoRef} 
              autoPlay 
              playsInline 
              muted 
              className={`w-full h-full object-cover ${isCameraOff ? 'hidden' : ''}`}
            />
            {isCameraOff && (
              <div className="w-full h-full flex items-center justify-center bg-[#2a2a2a]">
                <VideoOff className="w-10 h-10 text-gray-500" />
              </div>
            )}
            
            {/* Live Chat Overlay (on top of videos) */}
            <div className="absolute inset-x-0 bottom-[80px] top-0 pointer-events-none flex flex-col justify-end px-4 py-6">
              <div 
                ref={vcChatRef}
                className="max-h-[220px] overflow-y-auto space-y-2 pointer-events-auto scrollbar-hide"
              >
                {messages.slice(-6).map((msg) => {
                  const isMe = msg.senderId === socket.id;
                  return (
                    <div key={msg.messageId} className="flex justify-start animate-in slide-in-from-bottom-2 duration-300">
                      <div className={`max-w-[85%] px-3 py-1.5 rounded-xl text-[13px] backdrop-blur-xl border flex flex-col gap-0.5 ${
                        isMe 
                          ? 'bg-[#10a37f]/40 border-[#10a37f]/40 text-white shadow-[0_4px_12px_rgba(16,163,127,0.2)]' 
                          : 'bg-[#2f2f2f]/60 border-white/10 text-gray-100 shadow-[0_4px_12px_rgba(0,0,0,0.3)]'
                      }`}>
                        <span className={`text-[10px] font-bold uppercase tracking-wider opacity-70 ${isMe ? 'text-blue-200' : 'text-gray-400'}`}>
                          {isMe ? 'You' : partnerName}
                        </span>
                        <span className="leading-tight">{msg.message}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Side Floating Controls */}
            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-4 z-20">
              <button 
                onClick={toggleMic}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-lg ${isMicMuted ? 'bg-red-500 text-white' : 'bg-black/40 hover:bg-black/60 text-white border border-white/10'}`}
              >
                {isMicMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>
              
              <button 
                onClick={toggleCamera}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-lg ${isCameraOff ? 'bg-red-500 text-white' : 'bg-black/40 hover:bg-black/60 text-white border border-white/10'}`}
              >
                {isCameraOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
              </button>

              <button 
                onClick={switchCamera}
                className="w-12 h-12 bg-black/40 hover:bg-black/60 text-white rounded-full flex items-center justify-center shadow-lg border border-white/10 transition-all md:hidden"
              >
                <RefreshCw className="w-5 h-5" />
              </button>

              <button 
                onClick={endCall}
                className="w-12 h-12 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg transition-all"
              >
                <CloseIcon className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Integrated Chat Input at bottom */}
          <div className="bg-[#171717] p-3 border-t border-white/5 flex items-center gap-3">
            <form onSubmit={handleSendMessage} className="flex-1 flex items-center gap-2 bg-white/5 rounded-full px-4 py-2 border border-white/10">
              <input
                type="text"
                placeholder="Type a message..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="flex-1 bg-transparent border-none outline-none text-white text-[14px]"
              />
              <button type="submit" className="p-1.5 bg-blue-500 hover:bg-blue-600 rounded-full transition-colors">
                <ArrowUp className="w-4 h-4 text-white" />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Incoming Call Modal */}
      {isReceivingCall && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#2f2f2f] p-8 rounded-3xl border border-white/10 text-center max-w-sm w-full shadow-2xl">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse ${callType === 'video' ? 'bg-blue-500/20' : 'bg-green-500/20'}`}>
              {callType === 'video' ? <Video className="w-10 h-10 text-blue-500" /> : <Phone className="w-10 h-10 text-green-500" />}
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Incoming {callType === 'video' ? 'Video' : 'Voice'} Call</h3>
            <p className="text-gray-400 mb-8 text-sm">Stranger wants to {callType === 'video' ? 'video chat' : 'speak'} with you!</p>
            <div className="flex gap-4">
              <button 
                onClick={endCall}
                className="flex-1 py-3 px-6 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold transition-colors"
              >
                Decline
              </button>
              <button 
                onClick={answerCall}
                className={`flex-1 py-3 px-6 text-white rounded-xl font-bold transition-colors ${callType === 'video' ? 'bg-blue-500 hover:bg-blue-600' : 'bg-green-500 hover:bg-green-600'}`}
              >
                Accept
              </button>
            </div>
          </div>
        </div>
      )}

      {/* In-Call Status Bar */}
      {(isCalling || callAccepted) && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[80] bg-[#2f2f2f] border px-6 py-2 rounded-full shadow-2xl flex items-center gap-4 transition-all duration-300 ${
          isSpeaking ? 'border-green-500 shadow-[0_0_20px_rgba(34,197,94,0.4)]' : 'border-green-500/30'
        }`}>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isSpeaking ? 'bg-green-500 animate-ping' : 'bg-green-500'}`} />
            <span className="text-sm font-medium text-white flex items-center gap-2">
              {callAccepted ? "On Call" : "Calling..."}
              {isSpeaking && <Mic className="w-3 h-3 text-green-500" />}
            </span>
          </div>

          <div className="h-4 w-[1px] bg-white/10 mx-1" />

          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsSpeakerMode(!isSpeakerMode)}
              title={isSpeakerMode ? "Switch to Ear Mode" : "Switch to Speaker Mode"}
              className={`p-1.5 rounded-lg transition-colors ${
                isSpeakerMode ? 'bg-green-500 text-black' : 'hover:bg-white/5 text-gray-400'
              }`}
            >
              {isSpeakerMode ? <Volume2 className="w-4 h-4" /> : <Volume1 className="w-4 h-4" />}
            </button>

            <button 
              onClick={endCall}
              title="End Call"
              className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-colors"
            >
              <PhoneOff className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ChatGPT Sidebar */}
      <Sidebar 
        status={status} 
        onNewChat={findNewPartner} 
        onEndSession={endSession}
        userCount={userCount} 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
        onStartCall={startCall}
        isCalling={isCalling}
        callAccepted={callAccepted}
        friends={friends}
        onSelectFriend={startPrivateChat}
        onRemoveFriend={removeFriend}
        onInform={() => setIsInformModalOpen(true)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col relative min-w-0 h-full max-h-full">
        {!isSocketConnected && (
          <div className="absolute inset-0 z-[500] bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center text-center p-6 animate-in fade-in duration-300">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-6 animate-pulse">
              <Globe className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Connection Lost</h2>
            <p className="text-gray-400 max-w-xs">Attempting to restore your session. Please wait...</p>
          </div>
        )}
        {/* Header (Shared for Mobile and Desktop) */}
        <header className="flex items-center justify-between p-4 border-b border-[#2f2f2f] bg-[#212121]">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="md:hidden p-1 hover:bg-white/5 rounded-lg"
            >
              <Menu className="w-6 h-6 text-gray-400" />
            </button>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white">Learn English</span>
              {status === 'Matched' ? (
                <span className="text-[10px] bg-green-500/20 text-green-500 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1">
                   <div className="w-1.5 h-1.5 bg-green-500 rounded-full" /> Live
                </span>
              ) : status === 'Waiting' ? (
                <span className="text-[10px] bg-blue-500/20 text-blue-500 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider animate-pulse">
                   Finding...
                </span>
              ) : null}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={findNewPartner} className="p-2 hover:bg-white/5 rounded-lg" title="Find New Partner">
              <Plus className="w-5 h-5 text-gray-400" />
            </button>
            {status === 'Matched' && !friends.find(f => f.userId === roomId) && (
              <button onClick={sendFriendRequest} className="p-2 hover:bg-white/5 rounded-lg text-blue-400" title="Add Friend">
                <UserPlus className="w-5 h-5" />
              </button>
            )}
            <button onClick={() => setIsSettingsOpen(true)} className="p-2 hover:bg-white/5 rounded-lg text-gray-400" title="Settings">
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Chat Interface */}
        <main className="flex-1 flex flex-col min-h-0 bg-[#212121] relative">
          {/* Friend Request Toast */}
          {friendRequests.length > 0 && (
            <div className="absolute top-4 right-4 z-50 bg-[#2f2f2f] border border-[#3d3d3d] p-4 rounded-xl shadow-2xl animate-in slide-in-from-right duration-300">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                  <UserPlus className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{friendRequests[0].fromName || 'Stranger'}</p>
                  <p className="text-xs text-gray-400">Wants to be friends!</p>
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <button 
                  onClick={() => acceptFriendRequest(friendRequests[0].from)}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs py-1.5 rounded-lg font-medium transition-colors"
                >
                  Accept
                </button>
                <button 
                  onClick={() => setFriendRequests(prev => prev.slice(1))}
                  className="flex-1 bg-[#3d3d3d] hover:bg-[#4d4d4d] text-white text-xs py-1.5 rounded-lg font-medium transition-colors"
                >
                  Decline
                </button>
              </div>
            </div>
          )}

          {status === 'Idle' ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-12 animate-in fade-in duration-700">
              <div className="max-w-md space-y-6">
                <div className="w-24 h-24 bg-blue-500/10 rounded-3xl flex items-center justify-center mx-auto mb-8 transform hover:rotate-12 transition-transform duration-500 shadow-2xl shadow-blue-500/5">
                  <Globe className="w-12 h-12 text-blue-500" />
                </div>
                <h1 className="text-6xl font-extrabold text-white tracking-tighter">Practice <br/><span className="text-blue-500">English</span></h1>
              </div>

              <button 
                onClick={findNewPartner}
                className="group relative flex items-center gap-4 bg-white hover:bg-gray-200 text-black px-12 py-6 rounded-2xl font-bold text-xl transition-all hover:scale-105 active:scale-95 shadow-2xl shadow-white/5"
              >
                <div className="w-8 h-8 bg-black/5 rounded-lg flex items-center justify-center group-hover:bg-black/10 transition-colors">
                  <Plus className="w-5 h-5 text-black" />
                </div>
                <span>Start Learning</span>
              </button>

              <div className="flex items-center gap-6 text-sm text-gray-500 font-medium pt-8">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  <span>{userCount} Learners Online</span>
                </div>
                <span>•</span>
                <span>Secure</span>
                <span>•</span>
                <span>Global</span>
              </div>
            </div>
          ) : status === 'Waiting' ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-6 animate-in zoom-in duration-500">
              <div className="relative">
                <div className="w-32 h-32 border-4 border-blue-500/20 rounded-full" />
                <div className="absolute inset-0 w-32 h-32 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <Globe className="absolute inset-0 m-auto w-12 h-12 text-blue-500 animate-pulse" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-white">Finding a Partner...</h2>
                <p className="text-gray-400 font-medium">Matching you with someone based on availability.</p>
              </div>
              <button 
                onClick={endSession}
                className="text-gray-500 hover:text-white text-sm font-medium underline underline-offset-4 transition-colors"
              >
                Cancel Search
              </button>
            </div>
          ) : (
            <ChatBox 
              messages={messages} 
              isPartnerTyping={isPartnerTyping} 
              socketId={socket.id} 
              status={status}
              onDeleteMessage={deleteMessage}
              partnerName={status === 'Matched' ? (friends.find(f => f.userId === roomId)?.name || 'Stranger') : 'Stranger'}
            />
          )}
        </main>

        {/* ChatGPT Style Input Area */}
        {status !== 'Idle' && (
          <footer className="w-full max-w-3xl mx-auto px-2 sm:px-4 pb-4 sm:pb-6 pt-2 bg-[#212121] z-20 shrink-0">
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleImageUpload} 
              accept="image/*" 
              className="hidden" 
            />
            <form 
              onSubmit={handleSendMessage}
              className="relative flex items-center bg-[#2f2f2f] rounded-[24px] sm:rounded-[26px] border border-[#3d3d3d] focus-within:border-gray-500 transition-colors shadow-2xl"
            >
              <button
                type="button"
                onClick={() => fileInputRef.current.click()}
                disabled={status !== 'Matched'}
                className="pl-3 sm:pl-4 pr-1 sm:pr-2 text-gray-400 hover:text-white transition-colors"
              >
                <Plus className="w-5 h-5" />
              </button>
              <textarea
                rows="1"
                value={inputText}
                onChange={handleTyping}
                disabled={status !== 'Matched'}
                placeholder="Message..."
                className="w-full bg-transparent text-white px-3 sm:px-5 py-3 sm:py-4 pr-12 resize-none focus:outline-none min-h-[44px] sm:min-h-[52px] max-h-32 sm:max-h-48 scrollbar-hide text-[15px]"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage(e);
                  }
                }}
              />
              <button
                type="submit"
                disabled={status !== 'Matched' || !inputText.trim()}
                className={`absolute right-1.5 sm:right-2 p-1.5 rounded-xl transition-all ${
                  inputText.trim() && status === 'Matched' 
                    ? 'bg-white text-black' 
                    : 'bg-[#404040] text-[#171717]'
                }`}
              >
                <ArrowUp className="w-5 h-5 stroke-[2.5]" />
              </button>
            </form>
            <p className="hidden sm:block text-[11px] text-center text-gray-500 mt-3 font-medium">
              Learn English can help you practice conversations in real-time.
            </p>
          </footer>
        )}
        {/* Settings Modal */}
        {isSettingsOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-[#2f2f2f] w-full max-w-sm rounded-3xl border border-[#3d3d3d] p-8 shadow-2xl animate-in zoom-in-95 duration-300">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-white">Profile Settings</h2>
                <button onClick={() => setIsSettingsOpen(false)} className="text-gray-500 hover:text-white">
                  <CloseIcon className="w-6 h-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest block mb-2">Display Name</label>
                  <input 
                    type="text" 
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    placeholder="Enter your name..."
                    className="w-full bg-[#171717] border border-[#3d3d3d] rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                </div>
                
                <p className="text-xs text-gray-500 italic">
                  This name will be shown to people you send friend requests to.
                </p>

                <button 
                  onClick={updateProfile}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl mt-4 transition-colors"
                >
                  Save Profile
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      {/* Inform Modal */}
      {isInformModalOpen && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#2f2f2f] w-full max-w-md p-6 rounded-3xl border border-white/10 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">Inform Owner</h3>
              <button onClick={() => setIsInformModalOpen(false)} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                <CloseIcon className="w-6 h-6 text-gray-400" />
              </button>
            </div>
            
            <p className="text-gray-400 text-sm mb-4">Send a direct message or feedback to the platform owner.</p>
            
            <textarea 
              value={informMessage}
              onChange={(e) => setInformMessage(e.target.value)}
              placeholder="Type your message here..."
              className="w-full h-40 bg-[#212121] border border-white/10 rounded-2xl p-4 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors resize-none mb-6"
            />
            
            <div className="flex gap-4">
              <button 
                onClick={() => setIsInformModalOpen(false)}
                className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleSendInform}
                disabled={isSendingInform || !informMessage.trim()}
                className={`flex-1 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-bold transition-colors ${
                  (isSendingInform || !informMessage.trim()) ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {isSendingInform ? 'Sending...' : 'Send Message'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
