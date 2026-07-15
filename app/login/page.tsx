'use client';

import { useState } from 'react';
import { useAuth, UserRole } from '@/context/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const [selectedRole, setSelectedRole] = useState<UserRole>('ADMIN');
  const [username, setUsername] = useState('弹壳呱呱');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRoleChange = (role: UserRole) => {
    setSelectedRole(role);
    setUsername(role === 'ADMIN' ? '弹壳呱呱' : '助理小白');
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    // Simple password verification
    if (password !== '123') {
      setError('密匙错误，请使用测试密匙 123 登录');
      setIsSubmitting(false);
      return;
    }

    try {
      await login(username, selectedRole);
    } catch {
      setError('登录失败，请稍后重试');
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
          <h1 className="text-2xl font-black tracking-wider text-white uppercase">呱呱弹壳空间</h1>
          <p className="text-xs text-orange-400 font-bold tracking-widest uppercase">数据运营中台系统</p>
        </div>

        {/* Role tabs */}
        <div className="grid grid-cols-2 gap-2 bg-zinc-950 p-1 rounded-xl border border-zinc-900">
          <button
            type="button"
            onClick={() => handleRoleChange('ADMIN')}
            className={`py-2 rounded-lg text-xs font-bold transition-all ${
              selectedRole === 'ADMIN' ? 'bg-orange-500 text-zinc-950 shadow' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            超级博主 (Admin)
          </button>
          <button
            type="button"
            onClick={() => handleRoleChange('ASSISTANT')}
            className={`py-2 rounded-lg text-xs font-bold transition-all ${
              selectedRole === 'ASSISTANT' ? 'bg-orange-500 text-zinc-950 shadow' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            录入助理 (Assistant)
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs text-zinc-500 font-medium">账号用户名</label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-orange-500/50"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-zinc-500 font-medium">战术授权密匙</label>
            <input
              type="password"
              required
              placeholder="请输入测试密匙 123"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-orange-500/50"
            />
          </div>

          {error && <p className="text-xs text-red-500 font-medium">{error}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-zinc-950 rounded-xl text-xs font-black tracking-wider uppercase hover:from-orange-400 hover:to-amber-400 transition-all shadow-[0_0_15px_rgba(249,115,22,0.1)] cursor-pointer"
          >
            {isSubmitting ? '正在授权...' : '授权登入'}
          </button>
        </form>
      </div>
    </div>
  );
}
