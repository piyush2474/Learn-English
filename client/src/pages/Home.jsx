import React, { useState, useEffect, useRef } from 'react';
import { Send, ArrowUp, Plus, LayoutGrid, Menu, Phone, PhoneOff, Mic, MicOff } from 'lucide-react';
import { socket } from '../socket/socket';
import Sidebar from '../components/Sidebar';
import ChatBox from '../components/ChatBox';

const Home = () => {
  const [status, setStatus] = useState('Disconnected');
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [roomId, setRoomId] = useState(null);
  const [userCount, setUserCount] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);
  const typingTimeoutRef = useRef(null);

  // --- Calling States ---
  const [isCalling, setIsCalling] = useState(false);
  const [isReceivingCall, setIsReceivingCall] = useState(false);
  const [callAccepted, setCallAccepted] = useState(false);
  const [incomingSignal, setIncomingSignal] = useState(null);
  const peerConnection = useRef(null);
  const localStream = useRef(null);
  const remoteAudioRef = useRef(null);
  const iceCandidatesQueue = useRef([]);
  // ----------------------

  // Persistent User ID
  const userId = useRef(localStorage.getItem('chat_user_id') || `user_${Math.random().toString(36).substr(2, 9)}`);

  useEffect(() => {
    localStorage.setItem('chat_user_id', userId.current);

    if (!socket.connected) {
      socket.connect();
    }

    socket.on('connect', () => {
      const savedRoomId = sessionStorage.getItem('current_room_id');
      if (savedRoomId) {
        socket.emit('rejoin_chat', { userId: userId.current, roomId: savedRoomId });
      } else {
        setStatus('Connected');
        findNewPartner();
      }
    });

    socket.on('rejoined', (data) => {
      setStatus('Matched');
      setRoomId(data.roomId);
    });

    socket.on('partner_rejoined', () => {
      setMessages((prev) => [
        ...prev,
        { message: 'Partner is back!', senderId: 'system', timestamp: new Date().toISOString() }
      ]);
    });

    socket.on('rejoin_failed', () => {
      sessionStorage.removeItem('current_room_id');
      setStatus('Connected');
      findNewPartner();
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

    socket.on('matched', (data) => {
      setStatus('Matched');
      setRoomId(data.roomId);
      setMessages([]);
      sessionStorage.setItem('current_room_id', data.roomId);
    });

    socket.on('receive_message', (data) => {
      setMessages((prev) => [...prev, data]);
      setIsPartnerTyping(false);
    });

    socket.on('typing', (data) => {
      setIsPartnerTyping(data.isTyping);
    });

    socket.on('partner_disconnected', () => {
      setStatus('Disconnected');
      setMessages((prev) => [
        ...prev,
        { message: 'Stranger has disconnected.', senderId: 'system', timestamp: new Date().toISOString() }
      ]);
      setRoomId(null);
      sessionStorage.removeItem('current_room_id');
      endCall();
    });

    // --- WebRTC Listeners ---
    socket.on('incoming_call', (data) => {
      setIsReceivingCall(true);
      setIncomingSignal(data.signal);
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
      socket.disconnect();
    };
  }, []);

  const createPeerConnection = (roomId) => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('ice_candidate', { roomId, candidate: event.candidate });
      }
    };

    pc.ontrack = (event) => {
      console.log("Remote track received:", event.streams[0]);
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = event.streams[0];
        // Ensure the audio is playing
        remoteAudioRef.current.play().catch(e => console.error("Audio play error:", e));
      }
    };

    if (localStream.current) {
      localStream.current.getTracks().forEach(track => {
        pc.addTrack(track, localStream.current);
      });
    }

    peerConnection.current = pc;
    return pc;
  };

  const startCall = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStream.current = stream;
      setIsCalling(true);

      const pc = createPeerConnection(roomId);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socket.emit('call_user', { roomId, signalData: offer });
    } catch (err) {
      console.error("Failed to start call:", err);
      alert("Could not access microphone.");
    }
  };

  const answerCall = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStream.current = stream;
      setIsReceivingCall(false);
      setCallAccepted(true);

      const pc = createPeerConnection(roomId);
      await pc.setRemoteDescription(new RTCSessionDescription(incomingSignal));
      
      // Process queued candidates that arrived before we answered
      while (iceCandidatesQueue.current.length > 0) {
        const candidate = iceCandidatesQueue.current.shift();
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit('answer_call', { roomId, signalData: answer });
    } catch (err) {
      console.error("Failed to answer call:", err);
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
    setIsCalling(false);
    setIsReceivingCall(false);
    setCallAccepted(false);
    setIncomingSignal(null);
    iceCandidatesQueue.current = []; // Clear the queue
    socket.emit('end_call', { roomId });
  };

  const findNewPartner = () => {
    endCall();
    socket.emit('leave_chat');
    socket.emit('find_partner', { userId: userId.current });
    setMessages([]);
    setRoomId(null);
    sessionStorage.removeItem('current_room_id');
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputText.trim() || !roomId) return;

    const messageData = {
      message: inputText,
      roomId,
      senderId: socket.id,
      timestamp: new Date().toISOString()
    };

    socket.emit('send_message', messageData);
    setMessages((prev) => [...prev, messageData]);
    setInputText('');
    socket.emit('typing', { roomId, isTyping: false });
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
    <div className="h-screen bg-[#212121] flex overflow-hidden font-sans">
      {/* Hidden Audio for remote stream */}
      <audio ref={remoteAudioRef} autoPlay />

      {/* Incoming Call Modal */}
      {isReceivingCall && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#2f2f2f] p-8 rounded-3xl border border-white/10 text-center max-w-sm w-full shadow-2xl">
            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
              <Phone className="w-10 h-10 text-green-500" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Incoming Voice Call</h3>
            <p className="text-gray-400 mb-8 text-sm">Practice your English speaking skills!</p>
            <div className="flex gap-4">
              <button 
                onClick={endCall}
                className="flex-1 py-3 px-6 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold transition-colors"
              >
                Decline
              </button>
              <button 
                onClick={answerCall}
                className="flex-1 py-3 px-6 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold transition-colors"
              >
                Accept
              </button>
            </div>
          </div>
        </div>
      )}

      {/* In-Call Status Bar */}
      {(isCalling || callAccepted) && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[80] bg-[#2f2f2f] border border-green-500/30 px-6 py-2 rounded-full shadow-2xl flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-sm font-medium text-white">
              {callAccepted ? "On Call" : "Calling..."}
            </span>
          </div>
          <button 
            onClick={endCall}
            className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-colors"
          >
            <PhoneOff className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ChatGPT Sidebar */}
      <Sidebar 
        status={status} 
        onNewChat={findNewPartner} 
        userCount={userCount} 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col relative min-w-0">
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
              {status === 'Matched' && (
                <span className="text-[10px] bg-green-500/20 text-green-500 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                  Live
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {status === 'Matched' && !isCalling && !callAccepted && (
              <button 
                onClick={startCall}
                title="Start Audio Call"
                className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 hover:bg-green-500/20 text-green-500 rounded-lg transition-colors"
              >
                <Phone className="w-4 h-4" />
                <span className="hidden sm:inline text-xs font-bold uppercase tracking-wider">Call</span>
              </button>
            )}
            <button onClick={findNewPartner} className="p-2 hover:bg-white/5 rounded-lg" title="Find New Partner">
              <Plus className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </header>

        {/* Chat Interface */}
        <main className="flex-1 flex flex-col min-h-0 bg-[#212121]">
          <ChatBox 
            messages={messages} 
            isPartnerTyping={isPartnerTyping} 
            socketId={socket.id} 
            status={status}
          />
        </main>

        {/* ChatGPT Style Input Area */}
        <footer className="w-full max-w-3xl mx-auto px-4 pb-6 pt-2">
          <form 
            onSubmit={handleSendMessage}
            className="relative flex items-center bg-[#2f2f2f] rounded-[26px] border border-[#3d3d3d] focus-within:border-gray-500 transition-colors shadow-2xl"
          >
            <textarea
              rows="1"
              value={inputText}
              onChange={handleTyping}
              disabled={status !== 'Matched'}
              placeholder="Message Learn English..."
              className="w-full bg-transparent text-white px-5 py-4 pr-12 resize-none focus:outline-none min-h-[52px] max-h-48 scrollbar-hide text-[15px]"
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
              className={`absolute right-2 p-1.5 rounded-xl transition-all ${
                inputText.trim() && status === 'Matched' 
                  ? 'bg-white text-black' 
                  : 'bg-[#404040] text-[#171717]'
              }`}
            >
              <ArrowUp className="w-5 h-5 stroke-[2.5]" />
            </button>
          </form>
          <p className="text-[11px] text-center text-gray-500 mt-3 font-medium">
            Learn English can help you practice conversations in real-time.
          </p>
        </footer>
      </div>
    </div>
  );
};

export default Home;
