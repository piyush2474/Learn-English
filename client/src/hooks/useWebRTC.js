import { useState, useEffect, useRef } from 'react';
import { socket } from '../socket/socket';

const iceServers = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun3.l.google.com:19302' },
  { urls: 'stun:stun4.l.google.com:19302' },
  { urls: 'stun:stun.stunprotocol.org' },
  { urls: 'stun:stun.sipgate.net:10000' },
  { urls: 'stun:global.stun.twilio.com:3478' },
];

const useWebRTC = (roomId) => {
  const [isCalling, setIsCalling] = useState(false);
  const [isReceivingCall, setIsReceivingCall] = useState(false);
  const [callAccepted, setCallAccepted] = useState(false);
  const [isVideoCall, setIsVideoCall] = useState(false);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isSpeakerMode, setIsSpeakerMode] = useState(false);
  const [incomingSignal, setIncomingSignal] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const peerConnection = useRef(null);
  const localStream = useRef(null);
  const iceCandidatesQueue = useRef([]);
  const audioContext = useRef(null);
  const analyser = useRef(null);
  const animationFrame = useRef(null);

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
    setIncomingSignal(null);
    setIsSpeaking(false);
  };

  const createPeerConnection = (currentRoomId, type) => {
    const pc = new RTCPeerConnection({ iceServers });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('ice_candidate', { roomId: currentRoomId, candidate: event.candidate });
      }
    };

    pc.ontrack = (event) => {
      setRemoteStream(event.streams[0]);
    };

    if (localStream.current) {
      localStream.current.getTracks().forEach(track => {
        pc.addTrack(track, localStream.current);
      });
    }

    return pc;
  };

  const startCall = async (type = 'audio') => {
    try {
      setIsCalling(true);
      setIsVideoCall(type === 'video');
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: type === 'video',
        audio: true
      });
      
      localStream.current = stream;
      peerConnection.current = createPeerConnection(roomId, type);
      
      const offer = await peerConnection.current.createOffer();
      await peerConnection.current.setLocalDescription(offer);
      
      socket.emit('call_user', { roomId, signalData: offer, type });
      startAudioAnalysis(stream);
    } catch (err) {
      console.error("Failed to start call:", err);
      endCall();
    }
  };

  const answerCall = async () => {
    try {
      setCallAccepted(true);
      setIsReceivingCall(false);
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: isVideoCall,
        audio: true
      });
      
      localStream.current = stream;
      peerConnection.current = createPeerConnection(roomId, isVideoCall ? 'video' : 'audio');
      
      await peerConnection.current.setRemoteDescription(new RTCSessionDescription(incomingSignal));
      const answer = await peerConnection.current.createAnswer();
      await peerConnection.current.setLocalDescription(answer);
      
      socket.emit('answer_call', { roomId, signalData: answer });
      startAudioAnalysis(stream);

      // Process queued candidates
      while (iceCandidatesQueue.current.length > 0) {
        const candidate = iceCandidatesQueue.current.shift();
        await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
      }
    } catch (err) {
      console.error("Failed to answer call:", err);
      endCall();
    }
  };

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
      if (!node) return;
      node.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i];
      }
      setIsSpeaking((sum / bufferLength) > 10);
      animationFrame.current = requestAnimationFrame(checkVolume);
    };
    checkVolume();
  };

  useEffect(() => {
    socket.on('incoming_call', (data) => {
      setIsReceivingCall(true);
      setIncomingSignal(data.signal);
      setIsVideoCall(data.type === 'video');
    });

    socket.on('call_accepted', async (signal) => {
      if (peerConnection.current) {
        await peerConnection.current.setRemoteDescription(new RTCSessionDescription(signal));
        setCallAccepted(true);
        while (iceCandidatesQueue.current.length > 0) {
          const candidate = iceCandidatesQueue.current.shift();
          await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
        }
      }
    });

    socket.on('call_ended', () => endCall());

    socket.on('ice_candidate', async (candidate) => {
      if (peerConnection.current && peerConnection.current.remoteDescription) {
        await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
      } else {
        iceCandidatesQueue.current.push(candidate);
      }
    });

    return () => {
      socket.off('incoming_call');
      socket.off('call_accepted');
      socket.off('call_ended');
      socket.off('ice_candidate');
    };
  }, [roomId]);

  const toggleMic = () => {
    if (localStream.current) {
      const audioTrack = localStream.current.getAudioTracks()[0];
      audioTrack.enabled = !audioTrack.enabled;
      setIsMicMuted(!audioTrack.enabled);
    }
  };

  const toggleCamera = () => {
    if (localStream.current) {
      const videoTrack = localStream.current.getVideoTracks()[0];
      videoTrack.enabled = !videoTrack.enabled;
      setIsCameraOff(!videoTrack.enabled);
    }
  };

  return {
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
    endCall: () => {
      socket.emit('end_call', { roomId });
      endCall();
    },
    toggleMic,
    toggleCamera,
    localStream: localStream.current
  };
};

export default useWebRTC;
