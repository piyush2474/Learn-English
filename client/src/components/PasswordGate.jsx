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
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#0a0a0a] font-sans h-[100dvh] overflow-hidden">
      <div className="w-full max-w-md px-6 py-12 text-center">
        {/* Decorative Background Glows */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-purple-600/10 blur-[100px] rounded-full pointer-events-none"></div>

        <div className="relative z-10 space-y-8">
          {/* Logo/Icon Section */}
          <div className="flex flex-col items-center space-y-4">
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 shadow-2xl backdrop-blur-xl">
              <Lock className="w-10 h-10 text-blue-400" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white">
              Protected Access
            </h1>

          </div>

          {/* Form Section */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="relative group">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password..."
                className={`w-full px-5 py-4 bg-white/5 border ${
                  error ? 'border-red-500/50' : 'border-white/10 group-hover:border-white/20'
                } rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all duration-300 backdrop-blur-md`}
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-white transition-colors"
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>

            {error && (
              <p className="text-red-400 text-sm animate-pulse">
                Incorrect password. Please try again.
              </p>
            )}

            <button
              type="submit"
              className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl shadow-lg shadow-blue-900/20 transform active:scale-[0.98] transition-all duration-200"
            >
              Unlock Site
            </button>
          </form>



          {/* Footer Text */}
          <div className="text-gray-600 text-xs uppercase tracking-widest pt-4">
            Secured Infrastructure
          </div>
        </div>
      </div>
    </div>
  );
};

export default PasswordGate;
