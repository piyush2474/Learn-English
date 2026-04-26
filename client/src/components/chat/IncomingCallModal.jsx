import React from 'react';
import { Video, Phone, ArrowUp } from 'lucide-react';

const IncomingCallModal = ({ 
  isReceivingCall, 
  callType, 
  partnerName, 
  onDecline, 
  onAccept 
}) => {
  if (!isReceivingCall) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-[#0a0b14]/80 backdrop-blur-xl animate-in fade-in duration-500">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[120px] opacity-20 animate-pulse ${callType === 'video' ? 'bg-blue-500' : 'bg-green-500'}`}></div>
      </div>

      <div className="relative bg-[#1a1c2e]/60 border border-white/10 backdrop-blur-2xl p-10 rounded-[40px] text-center max-w-sm w-full shadow-[0_32px_64px_-12px_rgba(0,0,0,0.6)] animate-in zoom-in-95 duration-300">
        <div className="relative mx-auto mb-10 w-24 h-24">
          <div className={`w-full h-full rounded-[32px] flex items-center justify-center relative z-10 shadow-[0_0_40px_rgba(0,0,0,0.3)] transition-all duration-500 ${
            callType === 'video' ? 'bg-blue-600' : 'bg-green-600'
          }`}>
            {callType === 'video' ? <Video className="w-10 h-10 text-white" /> : <Phone className="w-10 h-10 text-white" />}
          </div>
          <div className={`absolute inset-0 rounded-[32px] animate-pulse-soft opacity-30 blur-[2px] ${callType === 'video' ? 'bg-blue-400' : 'bg-green-400'}`}></div>
          <div className={`absolute inset-0 rounded-[32px] animate-pulse-soft opacity-20 blur-[6px]`} style={{ animationDelay: '0.6s', backgroundColor: callType === 'video' ? '#60a5fa' : '#4ade80' }}></div>
          <div className={`absolute inset-0 rounded-[32px] border-2 animate-pulse-soft opacity-40`} style={{ animationDelay: '1.2s', borderColor: callType === 'video' ? '#60a5fa' : '#4ade80' }}></div>
        </div>

        <div className="space-y-2 mb-10">
          <h3 className="text-2xl font-black text-white tracking-tight">Incoming {callType === 'video' ? 'Video' : 'Voice'} Call</h3>
          <p className="text-gray-400 font-medium px-4">
            {partnerName} is inviting you to a private {callType === 'video' ? 'video session' : 'audio call'}.
          </p>
        </div>

        <div className="flex gap-4">
          <button 
            onClick={onDecline}
            className="flex-1 py-4 px-6 bg-white/5 hover:bg-red-500/20 text-gray-400 hover:text-red-400 rounded-2xl font-bold transition-all border border-white/5 hover:border-red-500/30 active:scale-95"
          >
            Decline
          </button>
          <button 
            onClick={onAccept}
            className={`flex-1 py-4 px-6 text-white rounded-2xl font-black transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2 ${
              callType === 'video' 
                ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-500/25' 
                : 'bg-green-600 hover:bg-green-500 shadow-green-500/25'
            }`}
          >
            Accept
            <ArrowUp className="w-5 h-5 rotate-90" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default IncomingCallModal;
