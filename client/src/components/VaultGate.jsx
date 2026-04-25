import React, { useState, useEffect } from 'react';
import { Lock, ShieldCheck, X, Check, Delete, ShieldAlert, ArrowRight, RefreshCw, PartyPopper } from 'lucide-react';

const VaultGate = ({ mode = 'verify', onUnlock, onClose, onSetPassword }) => {
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  const [step, setStep] = useState(mode === 'setup' ? 'create' : 'verify'); 
  const [isAnimating, setIsAnimating] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleKeyPress = (num) => {
    if (isSuccess) return;
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
    if (isSuccess) return;
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
        setIsSuccess(true);
        setTimeout(() => {
          onSetPassword(pin);
        }, 1500);
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

  if (isSuccess) {
    return (
      <div className="fixed inset-0 z-[2000] bg-black flex flex-col items-center justify-center p-6 animate-in fade-in duration-500">
        <div className="w-24 h-24 bg-green-500/20 border border-green-500/30 rounded-full flex items-center justify-center mb-8 animate-in zoom-in duration-700">
          <Check className="w-12 h-12 text-green-500" />
        </div>
        <h2 className="text-3xl font-black text-white mb-3 tracking-tight text-center">Vault Secured</h2>
        <p className="text-gray-400 text-center font-medium">Your private conversations are now protected.</p>
        
        {/* Animated Particles simulation */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-green-500/5 blur-[120px] rounded-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[1000] bg-black flex flex-col items-center justify-between py-12 px-6 animate-in fade-in duration-500 overflow-hidden font-sans">
      {/* Background Decorative Gradient */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 blur-[120px] rounded-full pointer-events-none" />

      {/* Top Header */}
      <div className="w-full max-w-md flex items-center justify-between relative z-20">
        {step === 'confirm' ? (
          <button 
            onClick={() => { setStep('create'); setConfirmPin(''); }}
            className="p-3 bg-white/5 rounded-2xl text-gray-400 hover:text-white transition-all active:scale-90"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        ) : (
          <div className="w-11" /> // Spacer
        )}
        
        <div className="flex flex-col items-center">
          <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mb-1 shadow-[0_0_10px_rgba(59,130,246,0.8)]" />
          <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em]">Security Protocol</span>
        </div>

        {onClose ? (
          <button 
            onClick={onClose}
            className="p-3 bg-white/5 rounded-2xl text-gray-400 hover:text-red-500 transition-all active:scale-90"
          >
            <X className="w-5 h-5" />
          </button>
        ) : (
          <div className="w-11" />
        )}
      </div>

      {/* Center Content */}
      <div className={`w-full max-w-md flex flex-col items-center relative z-20 flex-1 justify-center ${isAnimating ? 'animate-shake' : ''}`}>
        {/* Animated Icon Container */}
        <div className="relative mb-8">
          <div className={`w-24 h-24 rounded-[32px] flex items-center justify-center transition-all duration-500 ${
            error ? 'bg-red-500/10 border-red-500/30' : 'bg-blue-500/10 border-blue-500/30'
          } border shadow-[0_0_40px_rgba(0,0,0,0.5)]`}>
            {step === 'verify' ? <Lock className="w-10 h-10 text-blue-500" /> : 
             step === 'confirm' ? <ShieldAlert className="w-10 h-10 text-orange-500" /> :
             <ShieldCheck className="w-10 h-10 text-green-500" />}
          </div>
        </div>

        <h2 className="text-3xl font-black text-white mb-3 tracking-tighter text-center">
          {step === 'create' ? 'Create Vault PIN' : 
           step === 'confirm' ? 'Confirm PIN' : 
           'Private Vault'}
        </h2>
        <p className="text-gray-500 text-sm font-medium mb-12 text-center max-w-[280px] leading-relaxed">
          {step === 'create' ? 'Protect your conversations with a secure 4-digit PIN' : 
           step === 'confirm' ? 'Re-enter your PIN to verify and activate the vault' : 
           'Your identity and chats are secured by the vault'}
        </p>

        {/* PIN Indicators */}
        <div className="flex gap-6 mb-16">
          {[0, 1, 2, 3].map((i) => (
            <div 
              key={i}
              className={`w-4 h-4 rounded-full transition-all duration-300 border-2 ${
                currentPin.length > i 
                  ? 'bg-blue-500 border-blue-500 scale-150 shadow-[0_0_25px_rgba(59,130,246,0.8)]' 
                  : 'bg-white/10 border-white/5'
              } ${error ? 'border-red-500 bg-red-500/30' : ''}`}
            />
          ))}
        </div>

        {/* Number Pad (Optimized for thumb reach) */}
        <div className="grid grid-cols-3 gap-x-8 gap-y-6 w-full max-w-[320px]">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              onClick={() => handleKeyPress(num.toString())}
              className="h-20 rounded-full bg-white/[0.04] active:bg-white/[0.1] active:scale-90 text-3xl font-bold text-white transition-all flex items-center justify-center border border-white/5"
            >
              {num}
            </button>
          ))}
          <div /> {/* Spacer */}
          <button
            onClick={() => handleKeyPress('0')}
            className="h-20 rounded-full bg-white/[0.04] active:bg-white/[0.1] active:scale-90 text-3xl font-bold text-white transition-all flex items-center justify-center border border-white/5"
          >
            0
          </button>
          <button
            onClick={handleBackspace}
            className="h-20 rounded-full flex items-center justify-center text-gray-400 active:scale-90 transition-all"
          >
            <Delete className="w-8 h-8" />
          </button>
        </div>
      </div>

      {/* Bottom Action Button (Full Width) */}
      <div className="w-full max-w-md mt-10 relative z-20">
        <button
          onClick={handleSubmit}
          disabled={currentPin.length !== 4}
          className={`w-full py-5 rounded-2xl font-black text-xs uppercase tracking-[0.3em] transition-all flex items-center justify-center gap-3 ${
            currentPin.length === 4 
              ? 'bg-blue-600 text-white shadow-[0_20px_40px_-10px_rgba(37,99,235,0.5)]' 
              : 'bg-white/5 text-gray-600 cursor-not-allowed border border-white/5'
          }`}
        >
          {step === 'create' ? 'Continue' : 
           step === 'confirm' ? 'Activate Vault' : 
           'Access Chat'}
          {currentPin.length === 4 && <ArrowRight className="w-4 h-4 animate-in slide-in-from-left-2" />}
        </button>

        {error && (
          <p className="mt-6 text-red-500 text-[10px] font-black uppercase tracking-[0.2em] text-center animate-pulse">
            {error}
          </p>
        )}
      </div>

      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-12px); }
          40% { transform: translateX(12px); }
          60% { transform: translateX(-8px); }
          80% { transform: translateX(8px); }
        }
        .animate-shake {
          animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both;
        }
      `}</style>
    </div>
  );
};

export default VaultGate;
