import React, { useState, useEffect, useRef } from 'react';
import { Send, ArrowUp, Plus, LayoutGrid, Menu, Phone, PhoneOff, Mic, MicOff, Volume2, Volume1, Video, VideoOff, Camera, RefreshCw } from 'lucide-react';
import { socket } from '../socket/socket';
import Sidebar from '../components/Sidebar';
import ChatBox from '../components/ChatBox';
import { encryptMessage, decryptMessage } from '../utils/crypto';

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
  const [isVideoCall, setIsVideoCall] = useState(false); 
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isSpeakerMode, setIsSpeakerMode] = useState(false); // Default: Ear Mode (false)
  const [incomingSignal, setIncomingSignal] = useState(null);
  const [callType, setCallType] = useState('audio'); // 'audio' or 'video'
  const [isSpeaking, setIsSpeaking] = useState(false);
  const peerConnection = useRef(null);
  const localStream = useRef(null);
  const remoteAudioRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localVideoRef = useRef(null);
  const iceCandidatesQueue = useRef([]);
  const audioContext = useRef(null);
  const analyser = useRef(null);
  const animationFrame = useRef(null);
  const fileInputRef = useRef(null);
  // ----------------------

  // Persistent User ID
  const userId = useRef(localStorage.getItem('chat_user_id') || `user_${Math.random().toString(36).substr(2, 9)}`);

  // Robust list of free STUN servers
  const iceServers = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    { urls: 'stun:stun.services.mozilla.com' },
    { urls: 'stun:stun.ekiga.net' },
    { urls: 'stun:stun.ideasip.com' },
    { urls: 'stun:stun.rixtelecom.se' },
    { urls: 'stun:stun.schlund.de' },
  ];

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

    socket.on('receive_message', async (data) => {
      const decryptedMessage = await decryptMessage(data.message, data.roomId);
      setMessages((prev) => [...prev, { ...data, message: decryptedMessage }]);
      setIsPartnerTyping(false);
    });

    socket.on('message_deleted', (data) => {
      const { messageId } = data;
      setMessages((prev) => prev.filter(msg => msg.messageId !== messageId));
    });

    socket.on('typing', (data) => {
      setIsPartnerTyping(data.isTyping);
    });

    socket.on('partner_disconnected', () => {
      setStatus('Disconnected');
      setMessages((prev) => [
        ...prev,
        { message: 'Stranger has disconnected. Finding someone new...', senderId: 'system', timestamp: new Date().toISOString() }
      ]);
      setRoomId(null);
      sessionStorage.removeItem('current_room_id');
      endCall();

      // Automatically search for a new partner after 2 seconds
      setTimeout(() => {
        findNewPartner();
      }, 2000);
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
      socket.disconnect();
    };
  }, []);

  // Update volume when speaker mode changes
  useEffect(() => {
    if (remoteAudioRef.current) {
      remoteAudioRef.current.volume = isSpeakerMode ? 1.0 : 0.4;
    }
  }, [isSpeakerMode]);

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
    const pc = new RTCPeerConnection({ iceServers });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('ice_candidate', { roomId, candidate: event.candidate });
      }
    };

    pc.ontrack = (event) => {
      console.log("Remote track received:", event.streams[0]);
      if (type === 'video') {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
          remoteVideoRef.current.play().catch(e => console.error("Video play error:", e));
        }
      } else {
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = event.streams[0];
          remoteAudioRef.current.muted = false;
          remoteAudioRef.current.volume = isSpeakerMode ? 1.0 : 0.4;
          remoteAudioRef.current.play().catch(e => console.error("Audio play error:", e));
        }
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
    endCall();
    socket.emit('leave_chat');
    socket.emit('find_partner', { userId: userId.current });
    setMessages([]);
    setRoomId(null);
    sessionStorage.removeItem('current_room_id');
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || !roomId) return;

    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const encryptedText = await encryptMessage(inputText, roomId);
    
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
      const encryptedImage = await encryptMessage(base64Image, roomId);

      const messageData = {
        message: encryptedImage,
        roomId,
        senderId: socket.id,
        type: 'image',
        messageId,
        timestamp: new Date().toISOString()
      };

      socket.emit('send_message', messageData);
      setMessages((prev) => [...prev, { ...messageData, message: base64Image }]);
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

      {/* Video Call Overlay */}
      {isVideoCall && (
        <div className="fixed inset-0 z-[150] bg-black flex flex-col items-center justify-center">
          {/* Remote Video (Partner) */}
          <video 
            ref={remoteVideoRef} 
            autoPlay 
            playsInline 
            className="w-full h-full object-cover"
          />
          
          {/* Local Video (Self - PIP) */}
          <div className="absolute top-6 right-6 w-32 sm:w-48 aspect-[3/4] bg-[#1a1a1a] rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
            <video 
              ref={localVideoRef} 
              autoPlay 
              playsInline 
              muted 
              className={`w-full h-full object-cover ${isCameraOff ? 'hidden' : ''}`}
            />
            {isCameraOff && (
              <div className="w-full h-full flex items-center justify-center bg-[#2a2a2a]">
                <VideoOff className="w-8 h-8 text-gray-500" />
              </div>
            )}
          </div>

          {/* Video Controls Footer */}
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-black/40 backdrop-blur-xl px-8 py-4 rounded-3xl border border-white/10">
            <button 
              onClick={toggleMic}
              className={`p-4 rounded-2xl transition-all ${isMicMuted ? 'bg-red-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}
            >
              {isMicMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
            </button>
            
            <button 
              onClick={toggleCamera}
              className={`p-4 rounded-2xl transition-all ${isCameraOff ? 'bg-red-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}
            >
              {isCameraOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
            </button>

            <button 
              onClick={switchCamera}
              className="p-4 bg-white/10 text-white hover:bg-white/20 rounded-2xl transition-all md:hidden"
            >
              <RefreshCw className="w-6 h-6" />
            </button>

            <button 
              onClick={endCall}
              className="p-4 bg-red-500 text-white hover:bg-red-600 rounded-2xl transition-all"
            >
              <PhoneOff className="w-6 h-6 rotate-[135deg]" />
            </button>
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
        userCount={userCount} 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
        onStartCall={startCall}
        isCalling={isCalling}
        callAccepted={callAccepted}
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
            onDeleteMessage={deleteMessage}
          />
        </main>

        {/* ChatGPT Style Input Area */}
        <footer className="w-full max-w-3xl mx-auto px-4 pb-6 pt-2">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleImageUpload} 
            accept="image/*" 
            className="hidden" 
          />
          <form 
            onSubmit={handleSendMessage}
            className="relative flex items-center bg-[#2f2f2f] rounded-[26px] border border-[#3d3d3d] focus-within:border-gray-500 transition-colors shadow-2xl"
          >
            <button
              type="button"
              onClick={() => fileInputRef.current.click()}
              disabled={status !== 'Matched'}
              className="pl-4 pr-2 text-gray-400 hover:text-white transition-colors"
            >
              <Plus className="w-5 h-5" />
            </button>
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
