import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card } from './ui/Card';
import { Input } from './ui/Input';
import { Button } from './ui/Button';

export const SignupScreen: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [shopName, setShopName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await signup(email, password, shopName);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Signup failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-light px-6 py-12 relative overflow-y-auto custom-scrollbar font-sans">
      
      {/* Workspace Center Card */}
      <div className="w-full max-w-md z-10">
        <Card bg="white" shadow="lg" className="p-8 lg:p-10 select-none animate-in fade-in duration-500">
          
          {/* Logo Monogram - Luxury Hanger Emblem */}
          <div className="w-16 h-16 bg-bg-secondary rounded-full flex items-center justify-center mx-auto mb-5 border border-accent/25 shadow-inner">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 10c0-2.5 1-4.5 3-4.5a2.5 2.5 0 1 0-5 0" />
              <path d="M2 17h20L12 10Z" />
            </svg>
          </div>
          
          {/* Headings */}
          <h1 className="font-serif text-4xl font-medium text-primary tracking-tighter text-center mb-1">
            Create Shop
          </h1>
          <p className="text-text-muted text-[10px] font-bold tracking-widest uppercase text-center mb-8">
            Launch your digital atelier
          </p>

          {error && (
            <div className="bg-rose-50 border border-rose-100 text-rose-800 text-xs font-bold px-4 py-3 rounded-2xl mb-6 text-center animate-in shake duration-300">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              label="Shop Name"
              type="text"
              value={shopName}
              onChange={setShopName}
              required
              id="shopName"
              placeholder="e.g. Savile Row Stitches"
              autoComplete="organization"
            />

            <Input
              label="Email Address"
              type="email"
              value={email}
              onChange={setEmail}
              required
              id="email"
              placeholder="tailor@luxury.com"
              autoComplete="email"
            />

            <div className="relative">
              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={setPassword}
                required
                id="password"
                placeholder="••••••••"
                autoComplete="new-password"
              />
              
              {/* Show/Hide Overlay Button */}
              {password.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-0 bottom-2 z-20 w-10 h-8 flex items-center justify-center text-text-muted hover:text-primary transition-colors text-xs font-bold uppercase tracking-wider"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              )}
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-14 mt-8"
            >
              {isLoading ? 'Creating...' : 'Launch Atelier'}
            </Button>
          </form>

          {/* Redirection */}
          <div className="mt-8 text-center border-t border-border-subtle pt-6">
            <p className="text-text-muted text-xs">
              Already have a shop?{' '}
              <button
                onClick={() => navigate('/login')}
                className="text-primary font-bold hover:text-accent transition-colors"
              >
                Sign In
              </button>
            </p>
          </div>

        </Card>
      </div>

    </div>
  );
};
