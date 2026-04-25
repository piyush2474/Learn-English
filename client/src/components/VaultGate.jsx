import React, { useState, useEffect } from 'react';
import { Lock, ShieldCheck, X, ArrowRight, Fingerprint, Delete } from 'lucide-react';

const VaultGate = ({ mode = 'verify', onUnlock, onClose, onSetPassword }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [isSetup, setIsSetup] = useState(mode === 'setup');

  const handleKeyPress = (num) => {
    if (pin.length < 4) {
      setPin(prev => prev + num);
      setError(false);
    }
  };

  const handleBackspace = () => {
    setPin(prev => prev.slice(0, -1));
    setError(false);
  };

  useEffect(() => {
    if (pin.length === 4) {
      if (isSetup) {
        onSetPassword(pin);
      } else {
        onUnlock(pin);
      }
    }
  }, [pin]);

  const triggerError = () => {
    setError(true);
    setPin('');
    // Simple haptic feedback simulation
    if (window.navigator.vibrate) window.navigator.vibrate(50);
  };

  // Expose reset to parent if needed
  useEffect(() => {
    const handleWrongPin = () => triggerError();
    window.addEventListener('wrong-vault-pin', handleWrongPin);
    return () => window.removeEventListener('wrong-vault-pin', handleWrongPin);
  }, []);

  return (
    <div className="fixed inset-0 z-[1000] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="w-full max-w-sm bg-[#1a1a1a] rounded-[40px] border border-white/5 p-8 relative overflow-hidden shadow-2xl">
        {/* Background Glow */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-blue-600/20 blur-[80px] rounded-full pointer-events-none" />
        
        <div className="relative z-10 flex flex-col items-center">
          <div className="w-16 h-16 bg-blue-600/10 border border-blue-500/20 rounded-3xl flex items-center justify-center mb-6 shadow-inner">
            {isSetup ? (
              <ShieldCheck className="w-8 h-8 text-blue-500" />
            ) : (
              <Lock className="w-8 h-8 text-blue-500" />
            )}
          </div>

          <h2 className="text-2xl font-bold text-white mb-2">
            {isSetup ? 'Set Vault PIN' : 'Private Vault'}
          </h2>
          <p className="text-gray-500 text-sm mb-10 text-center px-4">
            {isSetup 
              ? 'Create a 4-digit PIN to protect your private conversations' 
              : 'Enter your 4-digit security PIN to access this chat'}
          </p>

          {/* PIN Indicators */}
          <div className={`flex gap-4 mb-12 ${error ? 'animate-shake' : ''}`}>
            {[1, 2, 3, 4].map((i) => (
              <div 
                key={i}
                className={`w-4 h-4 rounded-full transition-all duration-300 border ${
                  pin.length >= i 
                    ? 'bg-blue-500 border-blue-500 scale-110 shadow-[0_0_15px_rgba(59,130,246,0.5)]' 
                    : 'bg-transparent border-white/20'
                } ${error ? 'border-red-500 bg-red-500/20' : ''}`}
              />
            ))}
          </div>

          {/* Number Pad */}
          <div className="grid grid-cols-3 gap-4 w-full">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <button
                key={num}
                onClick={() => handleKeyPress(num.toString())}
                className="h-16 rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] active:bg-blue-600/20 border border-white/5 text-xl font-bold text-white transition-all flex items-center justify-center"
              >
                {num}
              </button>
            ))}
            <div className="flex items-center justify-center">
              {onClose && (
                <button 
                  onClick={onClose}
                  className="w-12 h-12 rounded-full flex items-center justify-center text-gray-500 hover:text-white transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              )}
            </div>
            <button
              onClick={() => handleKeyPress('0')}
              className="h-16 rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] active:bg-blue-600/20 border border-white/5 text-xl font-bold text-white transition-all flex items-center justify-center"
            >
              0
            </button>
            <button
              onClick={handleBackspace}
              className="h-16 rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] text-gray-400 hover:text-white transition-all flex items-center justify-center"
            >
              <Delete className="w-6 h-6" />
            </button>
          </div>

          {error && (
            <p className="mt-8 text-red-500 text-sm font-bold animate-pulse">
              Incorrect PIN. Please try again.
            </p>
          )}

          {!isSetup && (
            <button className="mt-8 text-xs font-bold text-gray-600 uppercase tracking-widest hover:text-blue-500 transition-colors">
              Forgot PIN?
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default VaultGate;
