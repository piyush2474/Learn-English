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

  const [localStream, setLocalStream] = useState(null);
  const peerConnection = useRef(null);
  const iceCandidatesQueue = useRef([]);
  const audioContext = useRef(null);
  const analyser = useRef(null);
  const animationFrame = useRef(null);

  const roomIdRef = useRef(roomId);
  useEffect(() => {
    roomIdRef.current = roomId;
  }, [roomId]);

  const endCall = () => {
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
    if (audioContext.current) {
      audioContext.current.close().catch(() => {});
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
    setIsVideoCall(false);
    setIsMicMuted(false);
    setIsCameraOff(false);
  };

  const switchCamera = async (facingMode) => {
    if (!localStream) return;
    try {
      const oldTrack = localStream.getVideoTracks()[0];
      if (oldTrack) oldTrack.stop();
      
      const newStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode } 
      });
      const newTrack = newStream.getVideoTracks()[0];
      
      const updatedStream = new MediaStream(localStream.getTracks());
      const oldVideoTrack = updatedStream.getVideoTracks()[0];
      if (oldVideoTrack) updatedStream.removeTrack(oldVideoTrack);
      updatedStream.addTrack(newTrack);
      
      setLocalStream(updatedStream);
      
      if (peerConnection.current) {
        const sender = peerConnection.current.getSenders().find(s => s.track && s.track.kind === 'video');
        if (sender) sender.replaceTrack(newTrack);
      }
      return true;
    } catch (e) {
      console.error("Camera switch failed:", e);
      return false;
    }
  };

  const createPeerConnection = (currentRoomId, type, stream) => {
    const pc = new RTCPeerConnection({ iceServers });

    pc.onicecandidate = (event) => {
      if (event.candidate && roomIdRef.current) {
        socket.emit('ice_candidate', { roomId: roomIdRef.current, candidate: event.candidate });
      }
    };

    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        setRemoteStream(event.streams[0]);
      }
    };

    if (stream) {
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });
    }

    return pc;
  };

  const startCall = async (type = 'audio') => {
    if (!roomIdRef.current) return;
    try {
      setIsCalling(true);
      setIsVideoCall(type === 'video');
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: type === 'video',
        audio: true
      });
      
      setLocalStream(stream);
      peerConnection.current = createPeerConnection(roomIdRef.current, type, stream);
      
      const offer = await peerConnection.current.createOffer();
      await peerConnection.current.setLocalDescription(offer);
      
      socket.emit('call_user', { roomId: roomIdRef.current, signalData: offer, type });
      startAudioAnalysis(stream);
    } catch (err) {
      console.error("Failed to start call:", err);
      setIsCalling(false);
      setIsVideoCall(false);
    }
  };

  const answerCall = async () => {
    if (!roomIdRef.current || !incomingSignal) return;
    try {
      setCallAccepted(true);
      setIsReceivingCall(false);
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: isVideoCall,
        audio: true
      });
      
      setLocalStream(stream);
      peerConnection.current = createPeerConnection(roomIdRef.current, isVideoCall ? 'video' : 'audio', stream);
      
      await peerConnection.current.setRemoteDescription(new RTCSessionDescription(incomingSignal));
      const answer = await peerConnection.current.createAnswer();
      await peerConnection.current.setLocalDescription(answer);
      
      socket.emit('answer_call', { roomId: roomIdRef.current, signalData: answer });
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
    if (audioContext.current) audioContext.current.close().catch(() => {});
    
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
      if (audioContext.current?.state === 'closed') return;
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
    const handleIncomingCall = (data) => {
      setIsReceivingCall(true);
      setIncomingSignal(data.signal);
      setIsVideoCall(data.type === 'video');
    };

    const handleCallAccepted = async (signal) => {
      if (peerConnection.current) {
        try {
          await peerConnection.current.setRemoteDescription(new RTCSessionDescription(signal));
          setCallAccepted(true);
          while (iceCandidatesQueue.current.length > 0) {
            const candidate = iceCandidatesQueue.current.shift();
            await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
          }
        } catch (e) {
          console.error("Error setting remote description:", e);
        }
      }
    };

    const handleIceCandidate = async (candidate) => {
      if (peerConnection.current && peerConnection.current.remoteDescription) {
        try {
          await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.error("Error adding ice candidate:", e);
        }
      } else {
        iceCandidatesQueue.current.push(candidate);
      }
    };

    socket.on('incoming_call', handleIncomingCall);
    socket.on('call_accepted', handleCallAccepted);
    socket.on('call_ended', endCall);
    socket.on('partner_disconnected', endCall);
    socket.on('ice_candidate', handleIceCandidate);

    return () => {
      socket.off('incoming_call', handleIncomingCall);
      socket.off('call_accepted', handleCallAccepted);
      socket.off('call_ended', endCall);
      socket.off('partner_disconnected', endCall);
      socket.off('ice_candidate', handleIceCandidate);
    };
  }, []); // Static listeners, uses internal endCall

  const toggleMic = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMicMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleCamera = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsCameraOff(!videoTrack.enabled);
      }
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
      if (roomIdRef.current) {
        socket.emit('end_call', { roomId: roomIdRef.current });
      }
      endCall();
    },
    toggleMic,
    toggleCamera,
    switchCamera,
    localStream
  };
};

export default useWebRTC;
