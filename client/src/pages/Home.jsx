import React, { useState, useEffect, useRef } from 'react';
import { Send, ArrowUp, Plus, LayoutGrid, Menu, Phone, PhoneOff, Mic, MicOff, Volume2, Volume1, Video, VideoOff, Camera, RefreshCw, UserPlus, Check, X as CloseIcon, Users, Settings, Globe, Trash2, Download, GraduationCap, LogOut } from 'lucide-react';
import { socket } from '../socket/socket';
import Sidebar from '../components/Sidebar';
import ChatBox from '../components/ChatBox';
import LMSDashboard from '../components/stealth/LMSDashboard';
import VaultGate from '../components/VaultGate';
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
  const myKeyPairRef = useRef(null);
  const roomIdRef = useRef(null);

  // Sync refs with state
  useEffect(() => {
    sharedKeyRef.current = sharedKey;
    myKeyPairRef.current = myKeyPair;
    roomIdRef.current = roomId;
  }, [sharedKey, myKeyPair, roomId]);

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
  const [zoomedImage, setZoomedImage] = useState(null);
  const [partnerMediaStatus, setPartnerMediaStatus] = useState(null); // 'image' | 'video' | null
  const [partnerUserId, setPartnerUserId] = useState(null);
  const [isStealthMode, setIsStealthMode] = useState(false);
  const [stealthWord, setStealthWord] = useState(null);
  const [isFetchingWord, setIsFetchingWord] = useState(false);
  const [isMirrored, setIsMirrored] = useState(true);
  const [isVaultEnabled, setIsVaultEnabled] = useState(false);
  const [isVaultUnlocked, setIsVaultUnlocked] = useState(false);
  const [showVaultGate, setShowVaultGate] = useState(null); // 'verify' | 'setup' | null
  const [pendingPrivateChatId, setPendingPrivateChatId] = useState(null);
  const peerConnection = useRef(null);
  const localStream = useRef(null);
  const remoteAudioRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localVideoRef = useRef(null);
  const vcChatRef = useRef(null);

  // --- Stealth Mode Metadata & Call Suppression ---
  useEffect(() => {
    const originalTitle = "Learn English - Chat";
    
    if (isStealthMode) {
      document.title = "English Prep - Vocabulary Builder";
      // Mute and silence if in a call
      if (isCalling || callAccepted) {
        setIsMicMuted(true);
        if (remoteAudioRef.current) remoteAudioRef.current.muted = true;
      }
      // Initial fetch if empty
      if (!stealthWord) fetchNewWord();
    } else {
      document.title = originalTitle;
      if (remoteAudioRef.current) remoteAudioRef.current.muted = false;
    }

    return () => { document.title = originalTitle; };
  }, [isStealthMode]);

  const fetchNewWord = async () => {
    const commonSophisticatedWords = ['Ubiquitous', 'Ephemeral', 'Pragmatic', 'Resilient', 'Eloquence', 'Alacrity', 'Paradigm', 'Luminous', 'Pensive', 'Quintessential'];
    const randomWord = commonSophisticatedWords[Math.floor(Math.random() * commonSophisticatedWords.length)];
    
    setIsFetchingWord(true);
    try {
      const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${randomWord}`);
      const data = await response.json();
      if (data && data[0]) {
        setStealthWord(data[0]);
      }
    } catch (err) {
      console.error("Stealth fetch failed:", err);
    } finally {
      setIsFetchingWord(false);
    }
  };

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

  // Decryption Watcher: When sharedKey arrives, decrypt any "locked" messages
  useEffect(() => {
    if (sharedKey && messages.length > 0) {
      const needsDecryption = messages.some(m => m.message === "[Encrypted Message]" && m.rawContent);
      if (needsDecryption) {
        const decryptMissing = async () => {
          const updated = await Promise.all(messages.map(async (msg) => {
            if (msg.message === "[Encrypted Message]" && msg.rawContent) {
              try {
                const decrypted = await decryptWithKey(msg.rawContent, sharedKey);
                return { ...msg, message: decrypted };
              } catch (e) {
                return msg;
              }
            }
            return msg;
          }));
          setMessages(updated);
        };
        decryptMissing();
      }
    }
  }, [sharedKey, messages]);

  // Robust list of free STUN servers
  const iceServers = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    { urls: 'stun:stun.stunprotocol.org' },
    { urls: 'stun:stun.sipgate.net:10000' },
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
      roomIdRef.current = data.roomId;
      setPartnerUserId(data.partnerUserId);
      
      const savedKey = localStorage.getItem(`shared_key_${data.roomId}`);
      if (savedKey) {
        try {
          const key = await importSharedKey(savedKey);
          setSharedKey(key);
          sharedKeyRef.current = key;
        } catch (e) { console.error("Failed to restore shared key", e); }
      }
      
      // Mark seen
      const currentId = localStorage.getItem('chat_user_id');
      socket.emit('mark_messages_seen', { roomId: data.roomId, userId: currentId });

      // Trigger key exchange in case the other person doesn't have our key
      if (myKeyPairRef.current) {
        const pubKeyBase64 = await exportPublicKey(myKeyPairRef.current.publicKey);
        socket.emit('exchange_keys', { roomId: data.roomId, publicKey: pubKeyBase64 });
      }
    });

    socket.on('partner_rejoined', async () => {
      // Restore state when partner returns
      setStatus('Matched');
      const savedRoomId = sessionStorage.getItem('current_room_id');
      if (savedRoomId) {
        setRoomId(savedRoomId);
        roomIdRef.current = savedRoomId;
      }

      setMessages((prev) => [
        ...prev,
        { message: 'Partner is back!', senderId: 'system', timestamp: new Date().toISOString() }
      ]);
      
      // Re-send our public key in case the partner lost theirs
      if (myKeyPairRef.current && sessionStorage.getItem('current_room_id')) {
        const pubKeyBase64 = await exportPublicKey(myKeyPairRef.current.publicKey);
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
      setPartnerUserId(data.partnerUserId);
      sessionStorage.setItem('current_room_id', data.roomId);
      
      if (data.isPrivate) {
        const otherUserId = data.roomId.replace('private_', '').replace(myUserId, '').replace('_', '');
        const friend = friends.find(f => f.userId === otherUserId);
        if (friend) {
          setPartnerName(friend.name);
        } else {
          setPartnerName('Friend');
        }
        // Mark seen for private rooms
        socket.emit('mark_messages_seen', { roomId: data.roomId, userId: myUserId });
      } else {
        setPartnerName('Stranger');
      }

      // Send our public key to the partner
      if (myKeyPairRef.current) {
        const pubKeyBase64 = await exportPublicKey(myKeyPairRef.current.publicKey);
        socket.emit('exchange_keys', { roomId: data.roomId, publicKey: pubKeyBase64 });
      }
    });

    socket.on('exchange_keys', async (data) => {
      if (myKeyPairRef.current && data.publicKey) {
        const partnerPubKey = await importPublicKey(data.publicKey);
        const shared = await deriveSharedSecret(myKeyPairRef.current.privateKey, partnerPubKey);
        setSharedKey(shared);
        
        // Persist key immediately
        if (roomIdRef.current) {
          const exported = await exportSharedKey(shared);
          localStorage.setItem(`shared_key_${roomIdRef.current}`, exported);
        }
      }
    });

    socket.on('chat_history', async (history) => {
      const storedKey = localStorage.getItem(`shared_key_${roomIdRef.current}`);
      const decryptHistory = async (key) => {
        return await Promise.all(history.map(async (msg) => {
          try {
            const decrypted = await decryptWithKey(msg.message, key);
            return { ...msg, message: decrypted, rawContent: msg.message };
          } catch (e) {
            return { ...msg, message: "[Encrypted Message]", rawContent: msg.message };
          }
        }));
      };

      if (storedKey) {
        try {
          const key = await importSharedKey(storedKey);
          const decrypted = await decryptHistory(key);
          setMessages(decrypted);
          socket.emit('mark_messages_seen', { roomId: roomIdRef.current, userId: myUserId });
        } catch (e) {
          setMessages(history.map(m => ({ ...m, message: "[Encrypted Message]", rawContent: m.message })));
        }
      } else {
        setMessages(history.map(m => ({ ...m, message: "[Encrypted Message]", rawContent: m.message })));
      }
    });

    socket.on('messages_marked_seen', (data) => {
      setMessages(prev => prev.map(m => ({ ...m, status: 'seen' })));
    });

    socket.on('receive_message', async (data) => {
      let displayMessage = data.message;
      let rawContent = data.message;

      if (sharedKeyRef.current) {
        try {
          displayMessage = await decryptWithKey(data.message, sharedKeyRef.current);
        } catch (e) {
          console.error("Decryption failed:", e);
          displayMessage = "[Encrypted Message]";
        }
      } else {
        displayMessage = "[Encrypted Message]";
      }

      // If it's an image, convert to Blob URL for privacy
      if (data.type === 'image' && displayMessage !== "[Encrypted Message]" && displayMessage.startsWith('data:')) {
        try {
          const res = await fetch(displayMessage);
          const blob = await res.blob();
          displayMessage = URL.createObjectURL(blob);
        } catch (e) { console.error("Blob conversion failed", e); }
      }

      setMessages((prev) => [...prev, { ...data, message: displayMessage, rawContent }]);
      setIsPartnerTyping(false);
      
      // Mark as seen if we are in this room
      if (roomIdRef.current === data.roomId) {
        socket.emit('mark_messages_seen', { roomId: data.roomId, userId: myUserId });
      }
    });

    socket.on('message_deleted', (data) => {
      const { messageId } = data;
      setMessages((prev) => prev.filter(msg => msg.messageId !== messageId));
    });

    socket.on('chat_cleared', () => {
      setMessages([]);
    });

    socket.on('typing', (data) => {
      setIsPartnerTyping(data.isTyping);
    });

    socket.on('friend_added', (data) => {
      setFriends(prev => {
        const exists = prev.find(f => f.userId === data.userId);
        if (exists) return prev;
        return [...prev, { 
          userId: data.userId, 
          name: data.name, 
          isOnline: data.isOnline,
          avatarColor: data.avatarColor,
          lastActive: data.lastActive
        }];
      });
      setFriendRequests(prev => prev.filter(r => r.from !== data.userId));
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
      setIsVaultEnabled(data.isVaultEnabled || false);
    });

    socket.on('vault_status', (data) => {
      if (data.isVaultEnabled !== undefined) setIsVaultEnabled(data.isVaultEnabled);
      if (data.success) {
        setShowVaultGate(null);
      } else if (data.error) {
        alert(data.error);
      }
    });

    socket.on('vault_verify_result', (data) => {
      if (data.success) {
        setIsVaultUnlocked(true);
        setShowVaultGate(null);
        if (pendingPrivateChatId) {
          socket.emit('start_private_chat', { friendId: pendingPrivateChatId });
          setPendingPrivateChatId(null);
          setMessages([]);
        }
      } else {
        window.dispatchEvent(new CustomEvent('wrong-vault-pin'));
      }
    });

    socket.on('friend_status_update', (data) => {
      setFriends(prev => prev.map(f => 
        f.userId === data.userId 
          ? { ...f, 
              isOnline: data.isOnline, 
              activity: data.activity, 
              roomId: data.roomId,
              lastActive: data.lastActive 
            } 
          : f
      ));
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
        { message: 'Stranger has disconnected. Waiting for them to return...', senderId: 'system', timestamp: new Date().toISOString() }
      ]);
      // Keep roomId and sharedKey for potential rejoin
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

    socket.on('partner_uploading_media', (data) => {
      setPartnerMediaStatus(data.type);
      setTimeout(() => setPartnerMediaStatus(null), 15000); // Auto-clear after 15s
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
      socket.off('exchange_keys');
      socket.off('chat_history');
      socket.off('messages_marked_seen');
      socket.off('message_deleted');
      socket.off('chat_cleared');
      socket.off('partner_uploading_media');
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [myUserId, pendingPrivateChatId]); // Removed friends from dependencies to ensure stability

  // --- STABLE WebRTC Signaling & Connection Persistence ---
  useEffect(() => {
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
        console.error("Error adding ICE candidate:", err);
      }
    });

    socket.on('matched', async (data) => {
      setRoomId(data.roomId);
      roomIdRef.current = data.roomId;
      setStatus('Matched');
      setMessages([]);
      setPartnerUserId(data.partnerUserId);
      sessionStorage.setItem('current_room_id', data.roomId);
      
      if (data.isPrivate) {
        const id = localStorage.getItem('chat_user_id');
        const otherUserId = data.roomId.replace('private_', '').replace(id, '').replace('_', '');
        // Note: we might not have friends list here, but partner name is handled in UI render
      } else {
        setPartnerName('Stranger');
      }

      if (myKeyPairRef.current) {
        const pubKeyBase64 = await exportPublicKey(myKeyPairRef.current.publicKey);
        socket.emit('exchange_keys', { roomId: data.roomId, publicKey: pubKeyBase64 });
      }
    });

    socket.on('rejoined', async (data) => {
      setStatus('Matched');
      setRoomId(data.roomId);
      roomIdRef.current = data.roomId;
      setPartnerUserId(data.partnerUserId);
      
      const savedKey = localStorage.getItem(`shared_key_${data.roomId}`);
      if (savedKey) {
        try {
          const key = await importSharedKey(savedKey);
          setSharedKey(key);
          sharedKeyRef.current = key;
        } catch (e) { console.error("Failed to restore shared key", e); }
      }
      
      const currentId = localStorage.getItem('chat_user_id');
      socket.emit('mark_messages_seen', { roomId: data.roomId, userId: currentId });

      if (myKeyPairRef.current) {
        const pubKeyBase64 = await exportPublicKey(myKeyPairRef.current.publicKey);
        socket.emit('exchange_keys', { roomId: data.roomId, publicKey: pubKeyBase64 });
      }
    });

    socket.on('rejoin_failed', () => {
      sessionStorage.removeItem('current_room_id');
      setStatus('Idle');
    });

    // Auto-Lock when tab loses focus
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setIsVaultUnlocked(false);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      socket.off('incoming_call');
      socket.off('call_accepted');
      socket.off('call_ended');
      socket.off('ice_candidate');
      socket.off('matched');
      socket.off('rejoined');
      socket.off('rejoin_failed');
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []); // Truly stable listeners

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
      iceCandidatePoolSize: 10,
      bundlePolicy: 'max-bundle',
      rtcpMuxPolicy: 'require'
    });

    let iceRestartCount = 0;
    pc.oniceconnectionstatechange = () => {
      console.log("WebRTC: ICE Connection State:", pc.iceConnectionState);
      if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
        if (iceRestartCount < 2) {
          console.log("WebRTC: Connection stalled. Attempting ICE Restart...");
          pc.restartIce();
          iceRestartCount++;
          // We must re-signaling the new offer for ICE restart to work
          pc.createOffer({ iceRestart: true }).then(offer => {
            return pc.setLocalDescription(offer).then(() => {
              socket.emit('call_user', { roomId, signalData: offer, type, isRestart: true });
            });
          }).catch(e => console.error("ICE Restart signaling failed:", e));
        } else {
          console.warn("WebRTC: Connection failed after retries. A TURN server is required for this network.");
        }
      }
    };

    pc.onnegotiationneeded = async () => {
       try {
         console.log("WebRTC: Negotiation needed...");
         const offer = await pc.createOffer();
         await pc.setLocalDescription(offer);
         socket.emit('call_user', { roomId, signalData: offer, type });
       } catch (err) {
         console.error("Negotiation error:", err);
       }
    };

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
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: type === 'video'
      });
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

      const answer = await pc.createAnswer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: type === 'video'
      });
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
    setIsVaultUnlocked(false); // Re-lock the vault
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
      senderId: myUserId, // Use persistent ID instead of socket.id
      type: 'text',
      messageId,
      timestamp: new Date().toISOString()
    };

    socket.emit('send_message', messageData);
    setMessages((prev) => [...prev, { ...messageData, message: inputText }]);
    setInputText('');
    socket.emit('typing', { roomId, isTyping: false });
  };

  const compressImage = (base64Str, maxWidth = 1200, maxHeight = 1200) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.7)); // Compress to 70% quality JPEG
      };
    });
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file || !roomId) return;

    if (file.size > 10 * 1024 * 1024) {
      alert("Image too large. Please select an image under 10MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const rawBase64 = reader.result;
      
      // 1. Create a local temporary message (Ghost Preview)
      const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const localMsg = {
        message: rawBase64,
        roomId,
        senderId: myUserId,
        type: 'image',
        messageId,
        timestamp: new Date().toISOString(),
        isUploading: true
      };
      setMessages((prev) => [...prev, localMsg]);

      // 2. Notify partner
      socket.emit('uploading_media', { roomId, type: 'image' });

      // 3. Compress and Send
      const compressedBase64 = await compressImage(rawBase64);
      
      let finalMessage = compressedBase64;
      if (sharedKeyRef.current) {
        finalMessage = await encryptWithKey(compressedBase64, sharedKeyRef.current);
      }

      const messageData = {
        message: finalMessage,
        roomId,
        senderId: myUserId,
        type: 'image',
        messageId,
        timestamp: new Date().toISOString()
      };

      socket.emit('send_message', messageData);
      
      // 4. Update the local message once done
      let localDisplay = compressedBase64;
      try {
        const res = await fetch(compressedBase64);
        const blob = await res.blob();
        localDisplay = URL.createObjectURL(blob);
      } catch (e) {}

      setMessages((prev) => prev.map(m => 
        m.messageId === messageId 
          ? { ...m, message: localDisplay, isUploading: false, rawContent: finalMessage } 
          : m
      ));
      setPartnerMediaStatus(null);
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
    // Always lock before opening a new chat for Ultra-Security
    setIsVaultUnlocked(false);
    
    // Only show vault if the CURRENT user has it enabled
    if (isVaultEnabled) {
      setPendingPrivateChatId(friendId);
      setShowVaultGate('verify');
    } else {
      socket.emit("start_private_chat", { friendId });
      setMessages([]);
    }
  };

  const handleSetVaultPin = (pin) => {
    socket.emit('set_vault_password', { password: pin });
    setIsVaultUnlocked(true); // Automatically unlock since user just created it
  };

  const handleVerifyVaultPin = (pin) => {
    socket.emit('verify_vault_password', { password: pin });
  };

  const clearChat = () => {
    if (!roomId) return;
    if (window.confirm("Are you sure you want to delete ALL messages in this chat? This cannot be undone.")) {
      socket.emit("clear_chat", { roomId });
      setMessages([]);
    }
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

  const toggleStealth = () => {
    const nextStealth = !isStealthMode;
    
    if (nextStealth) {
      // Panic Clear: Wipe everything immediately for stealth
      if (roomId) {
        socket.emit('clear_chat', { roomId });
        setMessages([]);
        setSharedKey(null);
      }
    }
    
    setIsStealthMode(nextStealth);
  };

  return (
    <div className="fixed inset-0 w-full h-full h-[100dvh] bg-[#212121] flex overflow-hidden font-sans">
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
              className={`w-full h-full object-cover ${isCameraOff ? 'hidden' : ''} ${isMirrored ? '-scale-x-100' : ''}`}
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
                  const isMe = msg.senderId === myUserId;
                  return (
                    <div key={msg.messageId} className="flex justify-start animate-in slide-in-from-bottom-2 duration-300">
                      <div className={`max-w-[85%] px-3 py-1.5 rounded-xl text-[13px] backdrop-blur-xl border flex flex-col gap-0.5 ${
                        isMe 
                          ? 'bg-[#10a37f]/40 border-[#10a37f]/40 text-white shadow-[0_4px_12px_rgba(16,163,127,0.2)]' 
                          : 'bg-[#2f2f2f]/60 border-white/10 text-gray-100 shadow-[0_4px_12px_rgba(0,0,0,0.3)]'
                      }`}>
                        <span className={`text-[10px] font-bold uppercase tracking-wider opacity-70 ${isMe ? 'text-blue-200' : 'text-gray-400'}`}>
                          {isMe ? 'You' : (friends.find(f => f.userId === roomId)?.name || 'Stranger')}
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
      
      {/* Interactive Stealth Mode Overlay (Fixed Fullscreen) */}
      {isStealthMode && (
        <div className="fixed inset-0 z-[300] bg-[#121212] flex flex-col animate-in fade-in duration-500">
          <div 
            className="h-14 bg-[#0a0a0a] border-b border-white/[0.02] flex items-center justify-between px-6 shrink-0 cursor-pointer select-none"
            onDoubleClick={toggleStealth}
          >
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              <span className="text-[10px] font-black text-gray-500 tracking-[0.2em] uppercase">Academic Portal Access v4.2</span>
            </div>
            <CloseIcon className="w-4 h-4 text-gray-700 hover:text-white transition-colors" onClick={toggleStealth} />
          </div>

          <LMSDashboard 
            isFetchingWord={isFetchingWord} 
            stealthWord={stealthWord} 
            fetchNewWord={fetchNewWord} 
          />
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

      {/* Main Container */}
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
        onOpenSettings={() => {
          setNameInput(myName);
          setIsSettingsOpen(true);
        }}
        currentRoomId={roomId}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0 bg-[#212121]">
        {!isSocketConnected && (
          <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[1000] flex items-center gap-4 bg-[#2f2f2f]/90 backdrop-blur-md border border-blue-500/30 px-6 py-3 rounded-2xl shadow-2xl animate-in slide-in-from-top-4 duration-300">
            <div className="relative">
              <div className="w-5 h-5 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
            </div>
            <div className="flex flex-col">
              <h2 className="text-sm font-bold text-white">Reconnecting</h2>
              <p className="text-[11px] text-gray-400">Restoring your session...</p>
            </div>
          </div>
        )}
        {/* Header (Fixed height) */}
        <header 
          onDoubleClick={toggleStealth}
          className="h-[60px] shrink-0 flex items-center justify-between px-4 border-b border-white/10 bg-[#212121] z-30 cursor-pointer select-none"
        >
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="md:hidden p-1 hover:bg-white/5 rounded-lg"
            >
              <Menu className="w-6 h-6 text-gray-400" />
            </button>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white">
                {status === 'Matched' && partnerUserId 
                  ? (friends.find(f => f.userId === partnerUserId)?.name || 'Stranger')
                  : 'Learn English'}
              </span>
              {status === 'Matched' ? (
                (() => {
                  const friend = friends.find(f => f.userId === partnerUserId);
                  const isOnline = friend ? friend.isOnline : true; // Default true for random matches
                  return isOnline ? (
                    <span className="text-[10px] bg-green-500/20 text-green-500 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1">
                       <div className="w-1.5 h-1.5 bg-green-500 rounded-full" /> Live
                    </span>
                  ) : (
                    <span className="text-[10px] bg-white/5 text-gray-500 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1 border border-white/5">
                       <div className="w-1.5 h-1.5 bg-gray-500 rounded-full" /> Offline
                    </span>
                  );
                })()
              ) : status === 'Waiting' ? (
                <span className="text-[10px] bg-blue-500/20 text-blue-500 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider animate-pulse">
                   Finding...
                </span>
              ) : null}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {(status === 'Matched' || status === 'Waiting' || status === 'Disconnected') && (
              <button onClick={endSession} className="p-2 hover:bg-red-500/10 text-red-500 rounded-lg" title="End Session">
                <LogOut className="w-5 h-5" />
              </button>
            )}
            
            {(status === 'Matched' || status === 'Disconnected') && roomId && (
              <>
                {/* Clear Chat (Private Only) */}
                {roomId.startsWith('private_') && (
                  <button onClick={clearChat} className="p-2 hover:bg-red-500/10 text-red-500 rounded-lg" title="Clear Chat History">
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}

                {/* Friend Logic */}
                {(() => {
                  // Skip for global or special rooms
                  if (roomId === 'global' || roomId === 'practice_with_you') return null;

                  const isAlreadyFriend = friends.some(f => f.userId === partnerUserId);

                  if (isAlreadyFriend || !partnerUserId) return null;

                  return (
                    <button onClick={sendFriendRequest} className="p-2 hover:bg-white/5 rounded-lg text-blue-400" title="Add Friend">
                      <UserPlus className="w-5 h-5" />
                    </button>
                  );
                })()}
              </>
            )}
          </div>
        </header>

        {/* Chat Interface (Scrollable zone) */}
        <main className="flex-1 overflow-hidden relative flex flex-col">
            <>
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
                <>
                  <ChatBox 
                    messages={messages} 
                    isPartnerTyping={isPartnerTyping} 
                    socketId={myUserId} 
                    status={status}
                    onDeleteMessage={deleteMessage}
                    partnerName={status === 'Matched' && partnerUserId ? (friends.find(f => f.userId === partnerUserId)?.name || 'Stranger') : 'Stranger'}
                    onZoomImage={setZoomedImage}
                  />
                  {partnerMediaStatus && (
                    <div className="absolute bottom-24 left-6 flex items-center gap-2 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 animate-in fade-in slide-in-from-bottom-2 duration-300">
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                      <span className="text-[11px] font-bold text-white tracking-wider uppercase">
                        {status === 'Matched' ? (friends.find(f => f.userId === roomId)?.name || 'Stranger') : 'Stranger'} is sending {partnerMediaStatus === 'image' ? 'a photo' : 'media'}...
                      </span>
                    </div>
                  )}
                </>
              )}
            </>
        </main>

        {/* Input Area (Fixed height at bottom) */}
        {status !== 'Idle' && !isStealthMode && (
          <footer className="shrink-0 w-full max-w-3xl mx-auto px-4 pb-6 pt-2 z-20">
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
                
                <div className="pt-4 border-t border-white/5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-white">Mirror My Video</h4>
                      <p className="text-[10px] text-gray-500">Flips your camera preview like a mirror</p>
                    </div>
                    <button 
                      onClick={() => setIsMirrored(!isMirrored)}
                      className={`w-12 h-6 rounded-full transition-all relative ${isMirrored ? 'bg-blue-600' : 'bg-gray-700'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${isMirrored ? 'left-7' : 'left-1'}`} />
                    </button>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/5">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">Security & Vault</h4>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-white">Private Chat Vault</h4>
                        <p className="text-[10px] text-gray-400">Lock friend list and history</p>
                      </div>
                      <button 
                        onClick={() => {
                          if (!isVaultEnabled) {
                            setShowVaultGate('setup');
                          } else {
                            const pass = prompt("Enter PIN to disable vault:");
                            if (pass) socket.emit('toggle_vault', { enabled: false, password: pass });
                          }
                        }}
                        className={`w-12 h-6 rounded-full transition-all relative ${isVaultEnabled ? 'bg-green-600' : 'bg-gray-700'}`}
                      >
                        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${isVaultEnabled ? 'left-7' : 'left-1'}`} />
                      </button>
                    </div>

                    {isVaultEnabled && (
                      <button 
                        onClick={() => {
                          const old = prompt("Enter old PIN:");
                          if (old) {
                            const newP = prompt("Enter new 4-digit PIN:");
                            if (newP && newP.length === 4) {
                              socket.emit('change_vault_password', { oldPassword: old, newPassword: newP });
                            } else {
                              alert("PIN must be 4 digits");
                            }
                          }
                        }}
                        className="w-full py-2 bg-white/5 hover:bg-white/10 text-white text-xs font-bold rounded-lg border border-white/5 transition-colors"
                      >
                        Change Vault PIN
                      </button>
                    )}
                  </div>
                </div>

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
      {/* Full Screen Image Modal - Top Level to avoid stacking context issues */}
      {zoomedImage && (
        <div 
          className="fixed inset-0 z-[1000] bg-black/98 backdrop-blur-xl flex flex-col items-center justify-center animate-in fade-in duration-300"
          onClick={() => setZoomedImage(null)}
        >
          {/* Header for Modal */}
          <div className="absolute top-0 inset-x-0 h-20 flex items-center justify-between px-6 bg-gradient-to-b from-black/60 to-transparent pointer-events-none">
            <div className="flex flex-col pointer-events-auto">
              <span className="text-white font-bold text-lg">Image View</span>
              <span className="text-gray-400 text-xs">Shared via Learn English</span>
            </div>
            <div className="flex items-center gap-4 pointer-events-auto">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  const link = document.createElement('a');
                  link.href = zoomedImage;
                  link.download = `practice_img_${Date.now()}.png`;
                  link.click();
                }}
                className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all"
                title="Download"
              >
                <Download className="w-6 h-6" />
              </button>
              <button 
                onClick={() => setZoomedImage(null)}
                className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all"
              >
                <CloseIcon className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Image Container */}
          <div className="w-full h-full flex items-center justify-center p-4">
            <img 
              src={zoomedImage} 
              alt="full-view" 
              className="max-w-full max-h-[85vh] rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-white/5 animate-in zoom-in-95 duration-300"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          
          {/* Hint */}
          <div className="absolute bottom-10 text-white/40 text-[13px] font-medium tracking-wide">
            Tap anywhere to close
          </div>
        </div>
      )}

      {/* Vault Modal */}
      {showVaultGate && (
        <VaultGate 
          mode={showVaultGate}
          onClose={() => {
            setShowVaultGate(null);
            setPendingPrivateChatId(null);
          }}
          onUnlock={handleVerifyVaultPin}
          onSetPassword={handleSetVaultPin}
        />
      )}
    </div>
  );
};

export default Home;
