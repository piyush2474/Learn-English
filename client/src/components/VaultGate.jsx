import React, { useState, useEffect } from 'react';
import { Lock, ShieldCheck, X, Check, Delete, ShieldAlert, ArrowRight, RefreshCw } from 'lucide-react';

const VaultGate = ({ mode = 'verify', onUnlock, onClose, onSetPassword }) => {
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  const [step, setStep] = useState(mode === 'setup' ? 'create' : 'verify'); // 'create', 'confirm', 'verify'
  const [isAnimating, setIsAnimating] = useState(false);

  const handleKeyPress = (num) => {
    if (step === 'create' || step === 'verify') {
      if (pin.length < 4) {
        setPin(prev => prev + num);
        setError('');
      }
    } else {
      if (confirmPin.length < 4) {
        setConfirmPin(prev => prev + num);
        setError('');
      }
    }
  };

  const handleBackspace = () => {
    if (step === 'create' || step === 'verify') {
      setPin(prev => prev.slice(0, -1));
    } else {
      setConfirmPin(prev => prev.slice(0, -1));
    }
    setError('');
  };

  const handleSubmit = () => {
    if (step === 'create') {
      if (pin.length === 4) {
        setStep('confirm');
      }
    } else if (step === 'confirm') {
      if (pin === confirmPin) {
        onSetPassword(pin);
      } else {
        triggerError('PINs do not match');
        setConfirmPin('');
      }
    } else if (step === 'verify') {
      onUnlock(pin);
    }
  };

  const triggerError = (msg) => {
    setError(msg);
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 500);
    if (window.navigator.vibrate) window.navigator.vibrate(50);
  };

  useEffect(() => {
    const handleWrongPin = () => triggerError('Incorrect PIN');
    window.addEventListener('wrong-vault-pin', handleWrongPin);
    return () => window.removeEventListener('wrong-vault-pin', handleWrongPin);
  }, []);

  const currentPin = step === 'confirm' ? confirmPin : pin;

  return (
    <div className="fixed inset-0 z-[1000] bg-black/95 backdrop-blur-2xl flex items-center justify-center p-4 animate-in fade-in duration-500">
      <div className={`w-full max-w-[380px] bg-[#121212] rounded-[48px] border border-white/10 p-10 relative overflow-hidden shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)] ${isAnimating ? 'animate-shake' : ''}`}>
        
        {/* Decorative elements */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-50" />
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-600/10 blur-[100px] rounded-full" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-purple-600/10 blur-[100px] rounded-full" />

        <div className="relative z-10 flex flex-col items-center">
          {/* Header Icon */}
          <div className="relative mb-8">
            <div className={`w-20 h-20 rounded-[28px] flex items-center justify-center transition-all duration-500 ${
              error ? 'bg-red-500/10 border-red-500/30' : 'bg-blue-500/10 border-blue-500/30'
            } border shadow-inner`}>
              {step === 'verify' ? <Lock className="w-9 h-9 text-blue-500" /> : 
               step === 'confirm' ? <ShieldAlert className="w-9 h-9 text-orange-500" /> :
               <ShieldCheck className="w-9 h-9 text-green-500" />}
            </div>
            {error && (
              <div className="absolute -bottom-2 -right-2 bg-red-500 text-white p-1.5 rounded-full shadow-lg animate-bounce">
                <X className="w-3 h-3" />
              </div>
            )}
          </div>

          {/* Titles */}
          <h2 className="text-2xl font-black text-white mb-2 tracking-tight">
            {step === 'create' ? 'Create Vault PIN' : 
             step === 'confirm' ? 'Confirm Your PIN' : 
             'Private Vault'}
          </h2>
          <p className="text-gray-500 text-[13px] font-medium mb-10 text-center leading-relaxed">
            {step === 'create' ? 'Set a 4-digit PIN to secure your conversations' : 
             step === 'confirm' ? 'Please re-enter the same PIN to confirm' : 
             'Enter your security PIN to access this chat'}
          </p>

          {/* PIN Indicators */}
          <div className="flex gap-4 mb-12">
            {[0, 1, 2, 3].map((i) => (
              <div 
                key={i}
                className={`w-4 h-4 rounded-full transition-all duration-300 border-2 ${
                  currentPin.length > i 
                    ? 'bg-blue-500 border-blue-500 scale-125 shadow-[0_0_20px_rgba(59,130,246,0.6)]' 
                    : 'bg-white/5 border-white/10'
                } ${error ? 'border-red-500 bg-red-500/20' : ''}`}
              />
            ))}
          </div>

          {/* Number Pad */}
          <div className="grid grid-cols-3 gap-5 w-full mb-10">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <button
                key={num}
                onClick={() => handleKeyPress(num.toString())}
                className="h-16 rounded-3xl bg-white/[0.03] hover:bg-white/[0.07] active:scale-90 border border-white/5 text-2xl font-bold text-white transition-all duration-200 flex items-center justify-center hover:shadow-[0_0_20px_rgba(255,255,255,0.05)]"
              >
                {num}
              </button>
            ))}
            <div className="flex items-center justify-center">
              {step === 'confirm' ? (
                <button 
                  onClick={() => { setStep('create'); setConfirmPin(''); }}
                  className="w-12 h-12 rounded-2xl flex items-center justify-center text-gray-500 hover:text-white transition-colors hover:bg-white/5"
                  title="Go Back"
                >
                  <RefreshCw className="w-5 h-5" />
                </button>
              ) : onClose ? (
                <button 
                  onClick={onClose}
                  className="w-12 h-12 rounded-2xl flex items-center justify-center text-gray-500 hover:text-red-500 transition-colors hover:bg-red-500/10"
                >
                  <X className="w-6 h-6" />
                </button>
              ) : null}
            </div>
            <button
              onClick={() => handleKeyPress('0')}
              className="h-16 rounded-3xl bg-white/[0.03] hover:bg-white/[0.07] active:scale-90 border border-white/5 text-2xl font-bold text-white transition-all flex items-center justify-center"
            >
              0
            </button>
            <button
              onClick={handleBackspace}
              className="h-16 rounded-3xl bg-white/[0.03] hover:bg-white/[0.07] active:scale-90 border border-white/5 text-gray-400 hover:text-white transition-all flex items-center justify-center"
            >
              <Delete className="w-6 h-6" />
            </button>
          </div>

          {/* Action Button */}
          <button
            onClick={handleSubmit}
            disabled={currentPin.length !== 4}
            className={`w-full py-4 rounded-3xl font-bold text-sm uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 ${
              currentPin.length === 4 
                ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-[0_12px_24px_-8px_rgba(37,99,235,0.5)]' 
                : 'bg-white/5 text-gray-600 cursor-not-allowed border border-white/5'
            }`}
          >
            {step === 'create' ? 'Continue' : 
             step === 'confirm' ? 'Set Vault PIN' : 
             'Unlock Vault'}
            <ArrowRight className={`w-4 h-4 transition-transform ${currentPin.length === 4 ? 'translate-x-0' : 'translate-x-2 opacity-0'}`} />
          </button>

          {error && (
            <p className="mt-6 text-red-500 text-xs font-black uppercase tracking-widest animate-pulse">
              {error}
            </p>
          )}

          {!mode === 'setup' && (
            <button className="mt-8 text-[10px] font-black text-gray-700 uppercase tracking-[0.2em] hover:text-blue-500 transition-colors">
              Reset Vault
            </button>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-10px); }
          75% { transform: translateX(10px); }
        }
        .animate-shake {
          animation: shake 0.2s ease-in-out 0s 2;
        }
      `}</style>
    </div>
  );
};

export default VaultGate;
