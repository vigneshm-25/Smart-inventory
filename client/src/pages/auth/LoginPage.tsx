import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Boxes, Eye, EyeOff, ArrowRight, Laptop, Smartphone, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState<'admin' | 'member'>('admin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const user = await login(email, password, selectedRole);
      toast.success(`Welcome back, ${user.name.split(' ')[0]}!`);
      if (user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/member/scan');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 dark:bg-[#0B0F19] text-slate-900 dark:text-slate-100 font-sans">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center">
          <div className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center text-white mx-auto mb-3 shadow-xs font-bold">
            <Boxes className="w-5 h-5" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-white">Smart Inventory AI</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Sign in to manage equipment or borrow items</p>
        </div>

        {/* Main Panel Card */}
        <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] shadow-xs">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Role Selection Cards */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">Select Account Role</label>
              <div className="grid grid-cols-2 gap-3">
                {/* Admin Role Card */}
                <button
                  type="button"
                  onClick={() => setSelectedRole('admin')}
                  className={cn(
                    'flex flex-col p-3 rounded-lg border text-left cursor-pointer transition-all relative',
                    selectedRole === 'admin'
                      ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-950 dark:text-indigo-200'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                  )}
                >
                  {selectedRole === 'admin' && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 absolute top-2.5 right-2.5" />
                  )}
                  <div className={cn(
                    'w-7 h-7 rounded-md flex items-center justify-center mb-2',
                    selectedRole === 'admin' ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                  )}>
                    <Laptop className="w-4 h-4" />
                  </div>
                  <span className="font-semibold text-xs text-slate-900 dark:text-white">Admin</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">Dashboard & Inventory</span>
                </button>

                {/* Member Role Card */}
                <button
                  type="button"
                  onClick={() => setSelectedRole('member')}
                  className={cn(
                    'flex flex-col p-3 rounded-lg border text-left cursor-pointer transition-all relative',
                    selectedRole === 'member'
                      ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-950 dark:text-indigo-200'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                  )}
                >
                  {selectedRole === 'member' && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 absolute top-2.5 right-2.5" />
                  )}
                  <div className={cn(
                    'w-7 h-7 rounded-md flex items-center justify-center mb-2',
                    selectedRole === 'member' ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                  )}>
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <span className="font-semibold text-xs text-slate-900 dark:text-white">Student / Member</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">QR Camera Scan</span>
                </button>
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder={selectedRole === 'admin' ? 'admin@inventory.ai' : 'john@university.edu'}
                required
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:border-indigo-600 dark:focus:border-indigo-400 transition-colors"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:border-indigo-600 dark:focus:border-indigo-400 transition-colors pr-9"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-colors disabled:opacity-50 shadow-xs"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>Sign In as {selectedRole === 'admin' ? 'Admin' : 'Student'} <ArrowRight className="w-3.5 h-3.5" /></>
              )}
            </button>
          </form>

          <p className="text-center text-xs text-slate-500 dark:text-slate-400 mt-5">
            Don't have an account?{' '}
            <Link to="/register" className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline">
              Create account
            </Link>
          </p>
        </div>

        {/* Demo Preset Card */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A]">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Quick Test Accounts</p>
          <div className="space-y-1.5">
            <button
              type="button"
              onClick={() => {
                setSelectedRole('admin');
                setEmail('admin@inventory.ai');
                setPassword('admin123');
              }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/60 text-xs font-medium text-slate-700 dark:text-slate-300 transition-colors text-left"
            >
              <Laptop className="w-3.5 h-3.5 text-indigo-600" />
              Admin: admin@inventory.ai / admin123
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedRole('member');
                setEmail('john@university.edu');
                setPassword('member123');
              }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/60 text-xs font-medium text-slate-700 dark:text-slate-300 transition-colors text-left"
            >
              <Smartphone className="w-3.5 h-3.5 text-indigo-600" />
              Member: john@university.edu / member123
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
