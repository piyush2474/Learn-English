import { useEffect, useRef } from 'react';
import { socket } from '../socket/socket';
import useStore from '../store/useStore';
import { 
  encryptWithKey, 
  decryptWithKey, 
  exportPublicKey, 
  importPublicKey, 
  deriveSharedSecret,
  exportSharedKey,
  importSharedKey
} from '../utils/crypto';

const useChat = () => {
  const {
    status, setStatus,
    roomId, setRoomId,
    myUserId, setMyUserId,
    myName, setMyName,
    messages, setMessages,
    sharedKey, setSharedKey,
    friends, setFriends,
    friendRequests, setFriendRequests,
    setIsSocketConnected,
    setUserCount,
    setPartnerName,
    setPartnerUserId,
    setIsPartnerTyping,
    setUnreadCounts,
    setPartnerMediaStatus,
    setIsVaultEnabled,
    setIsVaultUnlocked,
    resetChat
  } = useStore();

  const roomIdRef = useRef(roomId);
  const sharedKeyRef = useRef(sharedKey);
  const myKeyPairRef = useRef(null);

  useEffect(() => {
    roomIdRef.current = roomId;
    sharedKeyRef.current = sharedKey;
  }, [roomId, sharedKey]);

  const initSocket = (myKeyPair) => {
    myKeyPairRef.current = myKeyPair;
    
    if (!socket.connected) {
      socket.connect();
    }

    socket.on('connect', () => {
      setIsSocketConnected(true);
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
      setPartnerUserId(data.partnerUserId);
      
      const savedKey = localStorage.getItem(`shared_key_${data.roomId}`);
      if (savedKey) {
        try {
          const key = await importSharedKey(savedKey);
          setSharedKey(key);
        } catch (e) { console.error("Failed to restore shared key", e); }
      }
      
      socket.emit('mark_messages_seen', { roomId: data.roomId, userId: localStorage.getItem('chat_user_id') });

      if (myKeyPairRef.current) {
        const pubKeyBase64 = await exportPublicKey(myKeyPairRef.current.publicKey);
        socket.emit('exchange_keys', { roomId: data.roomId, publicKey: pubKeyBase64 });
      }
    });

    socket.on('matched', async (data) => {
      setRoomId(data.roomId);
      setStatus('Matched');
      setMessages([]);
      setPartnerUserId(data.partnerUserId);
      sessionStorage.setItem('current_room_id', data.roomId);
      
      if (data.isPrivate) {
        const friend = friends.find(f => f.userId === data.partnerUserId);
        setPartnerName(friend ? friend.name : 'Friend');
      } else {
        setPartnerName('Stranger');
      }

      if (myKeyPairRef.current) {
        const pubKeyBase64 = await exportPublicKey(myKeyPairRef.current.publicKey);
        socket.emit('exchange_keys', { roomId: data.roomId, publicKey: pubKeyBase64 });
      }
    });

    socket.on('receive_message', async (data) => {
      if (data.roomId !== roomIdRef.current) {
        setUnreadCounts(prev => ({
          ...prev,
          [data.senderId]: (prev[data.senderId] || 0) + 1
        }));
      }

      let displayMessage = data.message;
      let rawContent = data.message;
      if (sharedKeyRef.current) {
        try {
          displayMessage = await decryptWithKey(data.message, sharedKeyRef.current);
          rawContent = displayMessage;
        } catch (e) {
          displayMessage = "[Encrypted Message]";
        }
      } else {
        displayMessage = "[Encrypted Message]";
      }

      if (data.type === 'image' && displayMessage !== "[Encrypted Message]" && displayMessage.startsWith('data:')) {
        try {
          const res = await fetch(displayMessage);
          const blob = await res.blob();
          displayMessage = URL.createObjectURL(blob);
        } catch (e) { console.error("Blob conversion failed", e); }
      }

      setMessages((prev) => [...prev, { ...data, message: displayMessage, rawContent }]);
      setIsPartnerTyping(false);
      
      if (roomIdRef.current === data.roomId) {
        socket.emit('mark_messages_seen', { roomId: data.roomId, userId: localStorage.getItem('chat_user_id') });
      }
    });

    socket.on('exchange_keys', async (data) => {
      if (myKeyPairRef.current && data.publicKey) {
        const partnerPubKey = await importPublicKey(data.publicKey);
        const shared = await deriveSharedSecret(myKeyPairRef.current.privateKey, partnerPubKey);
        setSharedKey(shared);
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
          socket.emit('mark_messages_seen', { roomId: roomIdRef.current, userId: localStorage.getItem('chat_user_id') });
        } catch (e) {
          setMessages(history.map(m => ({ ...m, message: "[Encrypted Message]", rawContent: m.message })));
        }
      } else {
        setMessages(history.map(m => ({ ...m, message: "[Encrypted Message]", rawContent: m.message })));
      }
    });

    socket.on('user_count', (count) => setUserCount(count));
    socket.on('typing', (data) => setIsPartnerTyping(data.isTyping));
    socket.on('partner_disconnected', () => {
      if (roomIdRef.current?.startsWith('private_')) {
        setMessages((prev) => [
          ...prev,
          { message: 'Partner is offline. You can still send messages.', senderId: 'system', timestamp: new Date().toISOString() }
        ]);
      } else {
        setStatus('Disconnected');
        setMessages((prev) => [
          ...prev,
          { message: 'Stranger has disconnected.', senderId: 'system', timestamp: new Date().toISOString() }
        ]);
      }
    });

    socket.on('friend_status_update', (data) => {
      setFriends(prev => prev.map(f => 
        f.userId === data.userId 
          ? { ...f, isOnline: data.isOnline, activity: data.activity, roomId: data.roomId, lastActive: data.lastActive } 
          : f
      ));
    });

    socket.on('init_data', (data) => {
      setMyName(data.name || 'Stranger');
      setFriends(data.friends || []);
      setFriendRequests(data.pendingRequests || []);
      setIsVaultEnabled(data.isVaultEnabled || false);
    });

    socket.on('friend_added', (data) => {
      setFriends(prev => [...prev, data]);
      setFriendRequests(prev => prev.filter(req => req.from !== data.userId));
    });

    socket.on('friend_removed', (data) => {
      setFriends(prev => prev.filter(f => f.userId !== data.userId));
    });

    socket.on('friend_request_received', (data) => {
      setFriendRequests(prev => [...prev, data]);
    });

    socket.on('messages_marked_seen', (data) => {
      if (data.roomId === roomIdRef.current) {
        setMessages(prev => prev.map(m => ({ ...m, status: 'seen' })));
      }
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('matched');
      socket.off('rejoined');
      socket.off('receive_message');
      socket.off('exchange_keys');
      socket.off('chat_history');
      socket.off('user_count');
      socket.off('typing');
      socket.off('partner_disconnected');
      socket.off('messages_marked_seen');
      socket.off('friend_status_update');
      socket.off('init_data');
      socket.off('friend_request_received');
      socket.off('friend_added');
      socket.off('friend_removed');
    };
  };

  const findPartner = () => {
    resetChat();
    setStatus('Waiting');
    socket.emit('find_partner', { userId: localStorage.getItem('chat_user_id') });
  };

  const sendMessage = async (text, type = 'text') => {
    if (!text.trim() || !roomId || !sharedKey) return;

    const messageId = Math.random().toString(36).substr(2, 9);
    const encrypted = await encryptWithKey(text, sharedKey);
    const senderId = localStorage.getItem('chat_user_id');

    const msgData = {
      roomId,
      message: encrypted,
      type,
      messageId,
      senderId,
      timestamp: new Date().toISOString(),
      status: 'sent'
    };

    socket.emit('send_message', msgData);
    setMessages((prev) => [...prev, { ...msgData, message: text, rawContent: text }]);
  };

  const leaveChat = () => {
    socket.emit('leave_chat');
    resetChat();
    setStatus('Idle');
    sessionStorage.removeItem('current_room_id');
  };

  return {
    initSocket,
    findPartner,
    sendMessage,
    leaveChat
  };
};

export default useChat;
