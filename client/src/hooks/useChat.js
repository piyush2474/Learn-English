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
      
      if (data.roomId.startsWith('private_')) {
        setPartnerName(data.partnerName || 'Friend');
      } else {
        setPartnerName(data.partnerName || 'Stranger');
      }
      
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
        setPartnerName(data.partnerName || 'Friend');
        
        // Try to load cached key for offline messaging
        const savedKey = localStorage.getItem(`shared_key_${data.roomId}`);
        if (savedKey) {
          try {
            const key = await importSharedKey(savedKey);
            setSharedKey(key);
          } catch (e) { console.error("Failed to load cached key", e); }
        }
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
      
      // Try to decrypt with current key, retry a few times if key isn't ready yet
      let key = sharedKeyRef.current;
      if (!key) {
        // Wait briefly for key exchange to complete
        for (let i = 0; i < 10; i++) {
          await new Promise(r => setTimeout(r, 300));
          key = sharedKeyRef.current;
          if (key) break;
        }
      }

      if (key) {
        try {
          displayMessage = await decryptWithKey(data.message, key);
          rawContent = displayMessage;
        } catch (e) {
          console.warn("Decryption failed:", e);
          displayMessage = data.message; // Show raw if decryption fails
        }
      }

      if (data.type === 'image' && displayMessage.startsWith('data:')) {
        try {
          const res = await fetch(displayMessage);
          const blob = await res.blob();
          displayMessage = URL.createObjectURL(blob);
        } catch (e) { console.error("Blob conversion failed", e); }
      }

      setMessages((prev) => [...(Array.isArray(prev) ? prev : []), { 
        ...data, 
        message: displayMessage, 
        rawContent,
        isEdited: data.isEdited || false 
      }]);
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
      if (!Array.isArray(history)) return;

      // Wait for shared key to be available
      let key = null;
      const currentRoomId = roomIdRef.current;
      const storedKey = localStorage.getItem(`shared_key_${currentRoomId}`);
      
      if (storedKey) {
        try {
          key = await importSharedKey(storedKey);
        } catch (e) {
          console.error("Failed to import stored key", e);
        }
      }

      // If no stored key, wait for key exchange to complete
      if (!key) {
        for (let i = 0; i < 15; i++) {
          await new Promise(r => setTimeout(r, 300));
          key = sharedKeyRef.current;
          if (key) break;
        }
      }

      if (key) {
        const decrypted = await Promise.all(history.map(async (msg) => {
          try {
            const decryptedMsg = await decryptWithKey(msg.message, key);
            return { 
              ...msg, 
              message: decryptedMsg, 
              rawContent: msg.message,
              messageId: msg.messageId || msg._id,
              isEdited: msg.isEdited || false
            };
          } catch (e) {
            return { 
              ...msg, 
              message: msg.message, // Show raw if can't decrypt
              rawContent: msg.message,
              messageId: msg.messageId || msg._id,
              isEdited: msg.isEdited || false
            };
          }
        }));
        setMessages(decrypted);
        socket.emit('mark_messages_seen', { roomId: currentRoomId, userId: localStorage.getItem('chat_user_id') });
      } else {
        // No key available at all, show what we have
        setMessages(history.map(m => ({ 
          ...m, 
          message: "[Encrypted Message]", 
          rawContent: m.message,
          messageId: m.messageId || m._id,
          isEdited: m.isEdited || false
        })));
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

    socket.on('partner_rejoined', () => {
      setStatus('Matched');
    });

    socket.on('friend_status_update', (data) => {
      setFriends(prev => prev.map(f => 
        f.userId === data.userId 
          ? { ...f, isOnline: data.isOnline, activity: data.activity, roomId: data.roomId, lastActive: data.lastActive } 
          : f
      ));
    });

    socket.on('init_data', (data) => {
      if (data.name) setMyName(data.name);
      if (Array.isArray(data.friends)) {
        setFriends(data.friends);
      }
      if (Array.isArray(data.pendingRequests)) {
        setFriendRequests(data.pendingRequests);
      }
      setIsVaultEnabled(!!data.isVaultEnabled);
    });

    socket.on('friend_added', (data) => {
      console.log("Friend added event received:", data);
      setFriends(prev => {
        const currentFriends = Array.isArray(prev) ? prev : [];
        if (currentFriends.some(f => f.userId === data.userId)) return currentFriends;
        return [...currentFriends, data];
      });
      setFriendRequests(prev => (Array.isArray(prev) ? prev : []).filter(req => req.from !== data.userId));
    });

    socket.on('friend_removed', (data) => {
      setFriends(prev => prev.filter(f => f.userId !== data.userId));
    });

    socket.on('friend_request_received', (data) => {
      console.log("Friend request received:", data);
      setFriendRequests(prev => {
        const current = Array.isArray(prev) ? prev : [];
        if (current.some(r => r.from === data.from)) return current;
        return [...current, data];
      });
    });

    socket.on('messages_marked_seen', (data) => {
      if (data.roomId === roomIdRef.current) {
        setMessages(prev => prev.map(m => ({ ...m, status: 'seen' })));
      }
    });

    socket.on('chat_cleared', (data) => {
      if (data.roomId === roomIdRef.current) {
        setMessages([]);
      }
    });

    socket.on('message_edited', async (data) => {
      const { messageId, newContent } = data;
      
      let displayMessage = newContent;
      if (sharedKeyRef.current) {
        try {
          displayMessage = await decryptWithKey(newContent, sharedKeyRef.current);
        } catch (e) {
          displayMessage = "[Encrypted Message]";
        }
      }

      setMessages(prev => prev.map(m => 
        m.messageId === messageId 
          ? { ...m, message: displayMessage, rawContent: newContent, isEdited: true } 
          : m
      ));
    });

    socket.on('message_deleted', (data) => {
      const { messageId } = data;
      setMessages(prev => prev.filter(m => m.messageId !== messageId));
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
      socket.off('partner_rejoined');
      socket.off('messages_marked_seen');
      socket.off('chat_cleared');
      socket.off('friend_status_update');
      socket.off('init_data');
      socket.off('friend_request_received');
      socket.off('friend_added');
      socket.off('friend_removed');
      socket.off('message_edited');
      socket.off('message_deleted');
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

  const editMessage = async (messageId, newText) => {
    if (!newText.trim() || !roomId || !sharedKey) return;

    const encrypted = await encryptWithKey(newText, sharedKey);
    socket.emit('edit_message', { roomId, messageId, newContent: encrypted });

    setMessages(prev => prev.map(m => 
      m.messageId === messageId 
        ? { ...m, message: newText, rawContent: newText, isEdited: true } 
        : m
    ));
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
    editMessage,
    leaveChat
  };
};

export default useChat;
