'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ChangePasswordModal({ isOpen, onClose }: ChangePasswordModalProps) {
  const { changePassword } = useAuth();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showOldPass, setShowOldPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const handleClose = () => {
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowOldPass(false);
    setShowNewPass(false);
    setShowConfirmPass(false);
    setErrorMsg('');
    setSuccessMsg('');
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!oldPassword) {
      setErrorMsg('请输入原密码');
      return;
    }
    if (newPassword.length < 6) {
      setErrorMsg('新密码长度不能少于 6 位');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg('两次输入的新密码不一致');
      return;
    }
    if (oldPassword === newPassword) {
      setErrorMsg('新密码不能与原密码相同');
      return;
    }

    setLoading(true);
    try {
      const res = await changePassword(oldPassword, newPassword);
      if (res.success) {
        setSuccessMsg(res.message || '密码修改成功！');
        setTimeout(() => {
          handleClose();
        }, 1500);
      } else {
        setErrorMsg(res.message || '修改密码失败，请核对原密码');
      }
    } catch {
      setErrorMsg('网络请求异常，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const renderEyeButton = (show: boolean, toggle: () => void) => (
    <button
      type="button"
      tabIndex={-1}
      onClick={toggle}
      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors p-1"
      title={show ? '隐藏密码' : '查看密码'}
    >
      {show ? (
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
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-md p-6 sm:p-8 shadow-2xl space-y-6 relative animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white">修改登录密码</h2>
              <p className="text-[11px] text-zinc-500">更新中台管理员安全凭证</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-zinc-500 hover:text-zinc-300 p-1.5 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 原密码 */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300">原密码</label>
            <div className="relative">
              <input
                type={showOldPass ? 'text' : 'password'}
                required
                placeholder="请输入当前使用的原密码"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-4 pr-11 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-orange-500/50"
              />
              {renderEyeButton(showOldPass, () => setShowOldPass(!showOldPass))}
            </div>
          </div>

          {/* 新密码 */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300">新密码 (至少 6 位)</label>
            <div className="relative">
              <input
                type={showNewPass ? 'text' : 'password'}
                required
                placeholder="请输入新密码（至少 6 个字符）"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-4 pr-11 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-orange-500/50"
              />
              {renderEyeButton(showNewPass, () => setShowNewPass(!showNewPass))}
            </div>
          </div>

          {/* 确认新密码 */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300">确认新密码</label>
            <div className="relative">
              <input
                type={showConfirmPass ? 'text' : 'password'}
                required
                placeholder="请再次输入新密码"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-4 pr-11 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-orange-500/50"
              />
              {renderEyeButton(showConfirmPass, () => setShowConfirmPass(!showConfirmPass))}
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 flex items-center space-x-2">
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-400 flex items-center space-x-2">
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>{successMsg}</span>
            </div>
          )}

          <div className="flex items-center space-x-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={loading || !!successMsg}
              className="flex-1 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-zinc-950 font-black rounded-xl text-xs transition-all shadow-[0_0_15px_rgba(249,115,22,0.15)] disabled:opacity-50 cursor-pointer"
            >
              {loading ? '正在保存...' : '确认修改'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
