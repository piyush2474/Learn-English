import React from 'react';
import { Plus, Shield, Globe } from 'lucide-react';

const MatchmakingView = ({ status, onStartSession, onCancelSearch }) => {
  if (status === 'Idle') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-12 animate-in fade-in duration-700">
        <div className="max-w-md space-y-6">
          <div className="w-24 h-24 gradient-primary rounded-[40px] flex items-center justify-center mx-auto mb-8 transform hover:scale-110 transition-transform duration-500 shadow-2xl shadow-primary/20">
            <Shield className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-6xl font-black text-white tracking-tighter">Aura <br/><span className="text-primary">Chat</span></h1>
          <p className="text-gray-500 text-lg font-medium">Connect with the world, securely.</p>
        </div>

        <button 
          onClick={onStartSession}
          className="group relative flex items-center gap-4 gradient-primary hover:opacity-90 text-white px-12 py-6 rounded-2xl font-bold text-xl transition-all hover:scale-105 active:scale-95 shadow-2xl shadow-primary/20"
        >
          <Plus className="w-6 h-6 group-hover:rotate-90 transition-transform duration-300" />
          Start Aura Session
        </button>
      </div>
    );
  }

  if (status === 'Waiting') {
    return (
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
          onClick={onCancelSearch}
          className="text-gray-500 hover:text-white text-sm font-medium underline underline-offset-4 transition-colors"
        >
          Cancel Search
        </button>
      </div>
    );
  }

  return null;
};

export default MatchmakingView;
