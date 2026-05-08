import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export const LoginScreen: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Invalid credentials');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0F172A] px-6 py-12 relative overflow-hidden">
      {/* Decorative Orbs */}
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[120px]"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-indigo-500/10 rounded-full blur-[100px]"></div>

      <div className="w-full max-w-md z-10">
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-white/5 backdrop-blur-xl border border-white/10 rounded-[28px] flex items-center justify-center mx-auto mb-6 shadow-2xl">
            <span className="text-3xl">🪡</span>
          </div>
          <h1 className="font-serif text-4xl font-bold text-white tracking-tight mb-2">TailorVoice</h1>
          <p className="text-gray-400 font-medium tracking-wide">Enter your atelier</p>
        </div>

        <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[40px] p-8 shadow-2xl shadow-black/50">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold px-4 py-3 rounded-2xl mb-6 text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-2 block ml-1">Email Address</label>
              <input 
                type="email" 
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="tailor@luxury.com"
                className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-6 text-white text-lg outline-none focus:border-white/30 focus:ring-4 focus:ring-white/5 transition-all"
              />
            </div>

            <div className="relative">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-2 block ml-1">Password</label>
              <input 
                type={showPassword ? "text" : "password"} 
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-6 text-white text-lg outline-none focus:border-white/30 focus:ring-4 focus:ring-white/5 transition-all"
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-[38px] w-10 h-10 flex items-center justify-center text-gray-500 hover:text-white transition-colors"
              >
                {showPassword ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                )}
              </button>
            </div>

            <button 
              type="submit"
              disabled={isLoading}
              className="w-full h-16 bg-white text-[#0F172A] rounded-2xl font-bold text-sm uppercase tracking-[0.2em] shadow-xl shadow-white/5 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100 mt-4"
            >
              {isLoading ? 'Entering...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-gray-500 text-sm">
              New atelier? {' '}
              <button 
                onClick={() => navigate('/signup')} 
                className="text-white font-bold hover:underline"
              >
                Create Shop
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
