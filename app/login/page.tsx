'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const success = await login(username, password);
      if (!success) {
        setError('登录失败：用户名或密码错误');
      }
    } catch {
      setError('登录连接失败，请确保后台服务已启动');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col justify-center items-center px-4 relative overflow-hidden">
      {/* Background ambient light */}
      <div className="absolute top-[20%] left-[20%] w-[350px] h-[350px] rounded-full bg-orange-600/10 blur-[100px] pointer-events-none z-0" />
      <div className="absolute bottom-[20%] right-[20%] w-[350px] h-[350px] rounded-full bg-blue-600/10 blur-[100px] pointer-events-none z-0" />

      {/* Main card */}
      <div className="relative z-10 w-full max-w-md bg-zinc-900/40 backdrop-blur-md border border-zinc-800/80 p-8 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.3)] space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-black tracking-wider text-white">呱呱弹壳空间</h1>
          <p className="text-xs text-orange-400 font-bold tracking-widest uppercase">数据运营管理中台</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs text-zinc-400 font-medium">用户名</label>
            <input
              type="text"
              required
              placeholder="请输入用户名"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-orange-500/50"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-zinc-400 font-medium">密码</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="请输入密码"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-4 pr-11 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-orange-500/50"
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors p-1"
                title={showPassword ? '隐藏密码' : '查看密码'}
              >
                {showPassword ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {error && <p className="text-xs text-red-500 font-medium">{error}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-zinc-950 rounded-xl text-xs font-black tracking-wider uppercase hover:from-orange-400 hover:to-amber-400 transition-all shadow-[0_0_15px_rgba(249,115,22,0.1)] cursor-pointer"
          >
            {isSubmitting ? '登录中...' : '登录'}
          </button>
        </form>
      </div>
    </div>
  );
}
