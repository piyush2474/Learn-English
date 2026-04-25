import React, { useState } from 'react';
import { Eye, EyeOff, Lock } from 'lucide-react';

const PasswordGate = ({ children }) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(
    localStorage.getItem('site_auth') === 'true'
  );
  const [error, setError] = useState(false);

  const handleLogin = (e) => {
    e.preventDefault();
    if (password === 'Mishu24') {
      localStorage.setItem('site_auth', 'true');
      setIsAuthenticated(true);
      setError(false);
    } else {
      setError(true);
      setPassword('');
    }
  };

  if (isAuthenticated) {
    return children;
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#050505] font-sans overflow-hidden">
      {/* Dynamic Background Glows */}
      <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-blue-600/10 blur-[150px] rounded-full animate-pulse pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-purple-600/10 blur-[150px] rounded-full animate-pulse pointer-events-none" style={{ animationDelay: '1s' }}></div>

      <div className="w-full max-w-md px-8 py-16 relative z-10">
        <div className="space-y-12">
          {/* Header Section */}
          <div className="flex flex-col items-center space-y-6 text-center">
            <div className="p-5 rounded-3xl bg-[#111] border border-white/10 shadow-2xl backdrop-blur-3xl ring-1 ring-white/5">
              <Lock className="w-12 h-12 text-blue-500" />
            </div>
            <div className="space-y-3">
              <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white leading-tight">
                Protected Access
              </h1>
              <p className="text-gray-500 text-sm md:text-base font-medium opacity-80">
                Please enter the password to continue
              </p>
            </div>
          </div>

          {/* Form Section */}
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="relative group">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password..."
                className={`w-full px-6 py-5 bg-[#0f0f0f]/80 border-2 ${
                  error ? 'border-red-500/50' : 'border-white/5 group-hover:border-white/10'
                } rounded-2xl text-white text-lg placeholder-gray-600 focus:outline-none focus:border-blue-500/60 focus:ring-4 focus:ring-blue-500/10 transition-all duration-300 backdrop-blur-2xl shadow-inner`}
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-5 top-1/2 -translate-y-1/2 p-2 text-gray-500 hover:text-white transition-colors"
              >
                {showPassword ? (
                  <EyeOff className="w-6 h-6" />
                ) : (
                  <Eye className="w-6 h-6" />
                )}
              </button>
            </div>

            {error && (
              <p className="text-red-500 text-xs font-black uppercase tracking-widest text-center animate-shake">
                Incorrect Access Key
              </p>
            )}

            <button
              type="submit"
              className="w-full py-5 bg-blue-600 hover:bg-blue-500 text-white font-black text-sm uppercase tracking-[0.2em] rounded-2xl shadow-[0_20px_40px_-10px_rgba(37,99,235,0.3)] transform active:scale-[0.97] transition-all duration-300 ring-1 ring-white/10"
            >
              Unlock Site
            </button>
          </form>

          {/* Footer Text */}
          <div className="text-gray-700 text-[10px] font-black uppercase tracking-[0.4em] text-center pt-8 opacity-50">
            Secured Infrastructure
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
        }
        .animate-shake {
          animation: shake 0.4s ease-in-out;
        }
      `}</style>
    </div>
  );
};

export default PasswordGate;
