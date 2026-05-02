import { useEffect, useRef } from 'react';
import { socket } from '../socket/socket';
import useStore from '../store/useStore';
import {
  buildReplyToPayload,
  normalizeReplyToFromServer,
  hasRenderableReply
} from '../utils/replyPreview';
import {
  encryptWithKey,
  decryptToPlaintext,
  exportPublicKey,
  importPublicKey,
  deriveSharedSecret,
  exportSharedKey,
  importSharedKey
} from '../utils/crypto';

const useChat = () => {
  const {
    status,
    setStatus,
    roomId,
    setRoomId,
    setMyUserId,
    setMyName,
    messages,
    setMessages,
    sharedKey,
    setSharedKey,
    friends,
    setFriends,
    friendRequests,
    setFriendRequests,
    setIsSocketConnected,
    setUserCount,
    setPartnerName,
    setPartnerUserId,
    setIsPartnerTyping,
    setUnreadCounts,
    setIsVaultEnabled,
    setIsVaultUnlocked,
    replyingTo,
    setReplyingTo,
    hasMoreMessages,
    setHasMoreMessages,
    resetChat
  } = useStore();

  const roomIdRef = useRef(roomId);
  const sharedKeyRef = useRef(sharedKey);
  const myKeyPairRef = useRef(null);
  const outboundQueueRef = useRef([]);

  useEffect(() => {
    roomIdRef.current = roomId;
    sharedKeyRef.current = sharedKey;
  }, [roomId, sharedKey]);

  useEffect(() => {
    let cancelled = false;

    const deliverQueued = async (item) => {
      const rid = roomIdRef.current;
      const key = sharedKeyRef.current;
      if (!rid || !key || cancelled) return;

      let encrypted;
      try {
        encrypted = await encryptWithKey(item.text, key);
      } catch (e) {
        console.error(e);
        setMessages((prev) =>
          prev.map((m) =>
            m.messageId === item.pendingId ? { ...m, status: 'failed' } : m
          )
        );
        return;
      }

      const messageId = Math.random().toString(36).substr(2, 9);
      const senderId = localStorage.getItem('chat_user_id');
      const msgData = {
        roomId: rid,
        message: encrypted,
        type: item.type,
        messageId,
        senderId,
        timestamp: new Date().toISOString(),
        status: 'sending'
      };
      if (item.replyPayload) msgData.replyTo = item.replyPayload;

      setMessages((prev) =>
        prev.map((m) =>
          m.messageId === item.pendingId
            ? {
                ...m,
                ...msgData,
                message: item.text,
                rawContent: item.text,
                status: 'sending',
                messageId
              }
            : m
        )
      );

      socket.timeout(15000).emit('send_message', msgData, (err, ack) => {
        if (cancelled) return;
        const ok = !err && ack && ack.ok;
        setMessages((prev) =>
          prev.map((m) =>
            m.messageId === messageId ? { ...m, status: ok ? 'sent' : 'failed' } : m
          )
        );
      });
    };

    const run = async () => {
      if (!sharedKey || !roomId) return;
      while (!cancelled && outboundQueueRef.current.length > 0) {
        const item = outboundQueueRef.current.shift();
        await deliverQueued(item);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [sharedKey, roomId, setMessages]);

  const initSocket = (myKeyPair) => {
    myKeyPairRef.current = myKeyPair;

    if (!socket.connected) {
      socket.connect();
    }

    socket.on('connect', () => {
      setIsSocketConnected(true);
      const id = localStorage.getItem('chat_user_id');
      if (id) {
        socket.emit('register_user', { userId: id });
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
        } catch (e) {
          console.error('Failed to restore shared key', e);
        }
      }

      socket.emit('mark_messages_seen', {
        roomId: data.roomId,
        userId: localStorage.getItem('chat_user_id')
      });

      if (myKeyPairRef.current) {
        const pubKeyBase64 = await exportPublicKey(myKeyPairRef.current.publicKey);
        socket.emit('exchange_keys', { roomId: data.roomId, publicKey: pubKeyBase64 });
      }
    });

    socket.on('matched', async (data) => {
      outboundQueueRef.current = [];
      setRoomId(data.roomId);
      setStatus('Matched');
      setMessages([]);
      setPartnerUserId(data.partnerUserId);
      sessionStorage.setItem('current_room_id', data.roomId);

      if (data.isPrivate) {
        setPartnerName(data.partnerName || 'Friend');

        const savedKey = localStorage.getItem(`shared_key_${data.roomId}`);
        if (savedKey) {
          try {
            const key = await importSharedKey(savedKey);
            setSharedKey(key);
          } catch (e) {
            console.error('Failed to load cached key', e);
          }
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
        setUnreadCounts((prev) => ({
          ...prev,
          [data.senderId]: (prev[data.senderId] || 0) + 1
        }));
      }

      let key = sharedKeyRef.current;
      if (!key) {
        for (let i = 0; i < 25; i++) {
          await new Promise((r) => setTimeout(r, 200));
          key = sharedKeyRef.current;
          if (key) break;
        }
      }

      let displayMessage = data.message;
      let rawContent = data.message;

      if (key) {
        displayMessage = await decryptToPlaintext(data.message, key);
        rawContent = displayMessage;
      }

      if (
        data.type === 'image' &&
        typeof displayMessage === 'string' &&
        displayMessage.startsWith('data:')
      ) {
        try {
          const res = await fetch(displayMessage);
          const blob = await res.blob();
          displayMessage = URL.createObjectURL(blob);
        } catch (e) {
          console.error('Blob conversion failed', e);
        }
      }

      let replyToNorm = null;
      if (data.replyTo) {
        replyToNorm = await normalizeReplyToFromServer(data.replyTo, key || null);
      }

      setMessages((prev) => {
        const arr = Array.isArray(prev) ? prev : [];
        if (arr.some((m) => m.messageId === data.messageId)) return arr;
        return [
          ...arr,
          {
            ...data,
            message: displayMessage,
            rawContent,
            isEdited: data.isEdited || false,
            replyTo: hasRenderableReply(replyToNorm) ? replyToNorm : null
          }
        ];
      });
      setIsPartnerTyping(false);

      if (roomIdRef.current === data.roomId) {
        socket.emit('mark_messages_seen', {
          roomId: data.roomId,
          userId: localStorage.getItem('chat_user_id')
        });
      }
    });

    socket.on('exchange_keys', async (data) => {
      if (!myKeyPairRef.current || !data.publicKey || !data.roomId) return;
      try {
        const partnerPubKey = await importPublicKey(data.publicKey);
        const shared = await deriveSharedSecret(
          myKeyPairRef.current.privateKey,
          partnerPubKey
        );
        setSharedKey(shared);
        const exported = await exportSharedKey(shared);
        localStorage.setItem(`shared_key_${data.roomId}`, exported);
      } catch (e) {
        console.error('exchange_keys handler', e);
      }
    });

    socket.on('chat_history', async (data) => {
      const history = data.messages || [];
      const hasMore = data.hasMore || false;
      setHasMoreMessages(hasMore);

      if (!Array.isArray(history)) return;

      let key = null;
      const currentRoomId = roomIdRef.current;
      const storedKey = localStorage.getItem(`shared_key_${currentRoomId}`);

      if (storedKey) {
        try {
          key = await importSharedKey(storedKey);
        } catch (e) {
          console.error('Failed to import stored key', e);
        }
      }

      if (!key) {
        for (let i = 0; i < 20; i++) {
          await new Promise((r) => setTimeout(r, 200));
          key = sharedKeyRef.current;
          if (key) break;
        }
      }

      if (key) {
        const decrypted = await Promise.all(
          history.map(async (msg) => {
            try {
              const decryptedMsg = await decryptToPlaintext(msg.message, key);

              let replyData = null;
              if (msg.replyTo) {
                replyData = await normalizeReplyToFromServer(msg.replyTo, key);
              }

              return {
                ...msg,
                message: decryptedMsg,
                rawContent: msg.message,
                messageId: msg.messageId || msg._id,
                isEdited: msg.isEdited || false,
                replyTo: hasRenderableReply(replyData) ? replyData : null,
                reactions: msg.reactions || []
              };
            } catch (e) {
              return {
                ...msg,
                message: msg.message,
                rawContent: msg.message,
                messageId: msg.messageId || msg._id,
                isEdited: msg.isEdited || false,
                reactions: msg.reactions || []
              };
            }
          })
        );
        setMessages(decrypted);
        socket.emit('mark_messages_seen', {
          roomId: currentRoomId,
          userId: localStorage.getItem('chat_user_id')
        });
      } else {
        setMessages(
          history.map((m) => ({
            ...m,
            message: '[Encrypted Message]',
            rawContent: m.message,
            messageId: m.messageId || m._id,
            isEdited: m.isEdited || false,
            reactions: m.reactions || []
          }))
        );
      }
    });

    socket.on('more_messages', async (data) => {
      const history = data.messages || [];
      const hasMore = data.hasMore || false;
      setHasMoreMessages(hasMore);

      let key = sharedKeyRef.current;
      if (!key && roomIdRef.current) {
        const stored = localStorage.getItem(`shared_key_${roomIdRef.current}`);
        if (stored) {
          try {
            key = await importSharedKey(stored);
          } catch (e) {
            console.error(e);
          }
        }
      }

      if (!key || history.length === 0) {
        if (history.length > 0) {
          setMessages((prev) => [
            ...history.map((m) => ({ ...m, message: '[Encrypted]' })),
            ...prev
          ]);
        }
        return;
      }

      const decrypted = await Promise.all(
        history.map(async (msg) => {
          try {
            const decryptedMsg = await decryptToPlaintext(msg.message, key);

            let replyData = null;
            if (msg.replyTo) {
              replyData = await normalizeReplyToFromServer(msg.replyTo, key);
            }

            return {
              ...msg,
              message: decryptedMsg,
              rawContent: msg.message,
              messageId: msg.messageId || msg._id,
              isEdited: msg.isEdited || false,
              replyTo: hasRenderableReply(replyData) ? replyData : null,
              reactions: msg.reactions || []
            };
          } catch (e) {
            return { ...msg, message: msg.message, reactions: msg.reactions || [] };
          }
        })
      );

      setMessages((prev) => [...decrypted, ...prev]);
    });

    socket.on('message_reaction_updated', (data) => {
      const { messageId, emoji, userId } = data;
      setMessages((prev) =>
        prev.map((m) => {
          if (m.messageId === messageId) {
            const reactions = [...(m.reactions || [])];
            const idx = reactions.findIndex((r) => r.emoji === emoji && r.userId === userId);
            if (idx > -1) {
              reactions.splice(idx, 1);
            } else {
              reactions.push({ emoji, userId });
            }
            return { ...m, reactions };
          }
          return m;
        })
      );
    });

    socket.on('user_count', (count) => setUserCount(count));
    socket.on('typing', (data) => setIsPartnerTyping(data.isTyping));
    socket.on('partner_disconnected', () => {
      if (roomIdRef.current?.startsWith('private_')) {
        setMessages((prev) => [
          ...prev,
          {
            message: 'Partner is offline. You can still send messages.',
            senderId: 'system',
            timestamp: new Date().toISOString()
          }
        ]);
      } else {
        setStatus('Disconnected');
        setMessages((prev) => [
          ...prev,
          {
            message: 'Stranger has disconnected.',
            senderId: 'system',
            timestamp: new Date().toISOString()
          }
        ]);
      }
    });

    socket.on('partner_rejoined', async () => {
      setStatus('Matched');
      if (myKeyPairRef.current && roomIdRef.current) {
        try {
          const pubKeyBase64 = await exportPublicKey(myKeyPairRef.current.publicKey);
          socket.emit('exchange_keys', {
            roomId: roomIdRef.current,
            publicKey: pubKeyBase64
          });
        } catch (e) {
          console.error(e);
        }
      }
    });

    socket.on('friend_status_update', (data) => {
      setFriends((prev) =>
        prev.map((f) =>
          f.userId === data.userId
            ? {
                ...f,
                isOnline: data.isOnline,
                activity: data.activity,
                roomId: data.roomId,
                lastActive: data.lastActive
              }
            : f
        )
      );
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
      setFriends((prev) => {
        const currentFriends = Array.isArray(prev) ? prev : [];
        if (currentFriends.some((f) => f.userId === data.userId)) return currentFriends;
        return [...currentFriends, data];
      });
      setFriendRequests((prev) =>
        (Array.isArray(prev) ? prev : []).filter((req) => req.from !== data.userId)
      );
    });

    socket.on('friend_removed', (data) => {
      setFriends((prev) => prev.filter((f) => f.userId !== data.userId));
    });

    socket.on('friend_request_received', (data) => {
      setFriendRequests((prev) => {
        const current = Array.isArray(prev) ? prev : [];
        if (current.some((r) => r.from === data.from)) return current;
        return [...current, data];
      });
    });

    socket.on('messages_marked_seen', (data) => {
      if (data.roomId === roomIdRef.current) {
        const myId = localStorage.getItem('chat_user_id');
        setMessages((prev) =>
          prev.map((m) =>
            m.senderId === myId && m.status === 'sent' ? { ...m, status: 'seen' } : m
          )
        );
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
        displayMessage = await decryptToPlaintext(newContent, sharedKeyRef.current);
      }

      setMessages((prev) =>
        prev.map((m) =>
          m.messageId === messageId
            ? { ...m, message: displayMessage, rawContent: newContent, isEdited: true }
            : m
        )
      );
    });

    socket.on('message_deleted', (data) => {
      const { messageId } = data;
      setMessages((prev) => prev.filter((m) => m.messageId !== messageId));
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
      socket.off('more_messages');
      socket.off('message_reaction_updated');
    };
  };

  const findPartner = () => {
    outboundQueueRef.current = [];
    resetChat();
    setStatus('Waiting');
    socket.emit('find_partner', { userId: localStorage.getItem('chat_user_id') });
  };

  const sendMessage = async (text, type = 'text') => {
    if (!text.trim() || !roomId) return;

    const senderId = localStorage.getItem('chat_user_id');
    let replyPayload = null;
    if (replyingTo) {
      replyPayload = buildReplyToPayload(replyingTo);
      setReplyingTo(null);
    }

    if (!sharedKey) {
      const pendingId = `q_${Math.random().toString(36).slice(2)}`;
      outboundQueueRef.current.push({
        pendingId,
        text,
        type,
        replyPayload
      });
      setMessages((prev) => [
        ...prev,
        {
          roomId,
          message: text,
          rawContent: text,
          type,
          messageId: pendingId,
          senderId,
          timestamp: new Date().toISOString(),
          status: 'queued',
          ...(replyPayload && hasRenderableReply(replyPayload) ? { replyTo: replyPayload } : {})
        }
      ]);
      return;
    }

    let encrypted;
    try {
      encrypted = await encryptWithKey(text, sharedKey);
    } catch (e) {
      console.error(e);
      return;
    }

    const messageId = Math.random().toString(36).substr(2, 9);
    const msgData = {
      roomId,
      message: encrypted,
      type,
      messageId,
      senderId,
      timestamp: new Date().toISOString(),
      status: 'sending'
    };
    if (replyPayload) msgData.replyTo = replyPayload;

    setMessages((prev) => [...prev, { ...msgData, message: text, rawContent: text }]);

    socket.timeout(15000).emit('send_message', msgData, (err, ack) => {
      const ok = !err && ack && ack.ok;
      setMessages((prev) =>
        prev.map((m) =>
          m.messageId === messageId ? { ...m, status: ok ? 'sent' : 'failed' } : m
        )
      );
    });
  };

  const loadMoreMessages = () => {
    if (!roomId || messages.length === 0 || !hasMoreMessages) return;
    const firstMsg = messages[0];
    socket.emit('load_more_messages', { roomId, beforeTimestamp: firstMsg.timestamp });
  };

  const reactToMessage = (messageId, emoji) => {
    if (!roomId) return;
    socket.emit('react_to_message', { roomId, messageId, emoji });
  };

  const editMessage = async (messageId, newText) => {
    if (!newText.trim() || !roomId || !sharedKey) return;

    let encrypted;
    try {
      encrypted = await encryptWithKey(newText, sharedKey);
    } catch (e) {
      console.error(e);
      return;
    }

    socket.emit('edit_message', { roomId, messageId, newContent: encrypted });

    setMessages((prev) =>
      prev.map((m) =>
        m.messageId === messageId
          ? { ...m, message: newText, rawContent: newText, isEdited: true }
          : m
      )
    );
  };

  const leaveChat = () => {
    outboundQueueRef.current = [];
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
    loadMoreMessages,
    reactToMessage,
    leaveChat
  };
};

export default useChat;
