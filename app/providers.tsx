'use client';

import { AuthProvider, useAuth } from '@/context/AuthContext';
import LoginPage from '@/app/login/page';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useState, Suspense } from 'react';
import ChangePasswordModal from '@/components/ChangePasswordModal';

function AppLayoutContent({ children }: { children: React.ReactNode }) {
  const { user, logout, isLoading, menuTree } = useAuth();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [openFolders, setOpenFolders] = useState<{ [id: string]: boolean }>({});
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);

  const toggleFolder = (folderId: string) => {
    setOpenFolders((prev) => ({
      ...prev,
      [folderId]: prev[folderId] === false ? true : false,
    }));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-400 font-mono text-sm">
        授权校验中...
      </div>
    );
  }

  // If not logged in, render LoginPage if not on /login route, or children if on /login
  if (!user) {
    if (pathname !== '/login') {
      return <LoginPage />;
    }
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex bg-zinc-950 text-zinc-100 relative overflow-hidden">
      {/* Background glow blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-orange-600/5 blur-[120px] pointer-events-none z-0" />
      <div className="absolute bottom-[10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-blue-600/5 blur-[120px] pointer-events-none z-0" />

      {/* Left Sidebar */}
      <aside className="relative z-10 w-64 bg-zinc-950 border-r border-zinc-900 flex flex-col justify-between p-6">
        <div className="space-y-8">
          <div>
            <Link href="/" className="font-extrabold text-lg text-orange-500 tracking-wider">
              弹壳呱呱 · 数据中台
            </Link>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1">
              Guagua Danke Admin
            </p>
          </div>

          <nav className="flex flex-col space-y-1.5">
            {(menuTree.length > 0
              ? menuTree
              : [
                  { id: 'default-1', name: '中盘大屏首页', path: '/' },
                  { id: 'default-2', name: '道具配置库', path: '/items' },
                  { id: 'default-4', name: '提醒规则', path: '/reminders' },
                  { id: 'default-5', name: '导航菜单管理', path: '/menus' },
                ]
            ).map((node) => {
              // Option A: Leaf Link (direct route)
              if (node.path !== null) {
                const isActive = pathname === node.path;
                return (
                  <Link
                    key={node.id}
                    href={node.path}
                    className={`px-4 py-2.5 rounded-xl text-xs font-bold border transition-all duration-300 ${
                      isActive
                        ? 'bg-orange-500/10 text-orange-400 border-orange-500/20'
                        : 'text-zinc-400 border-transparent hover:text-orange-300 hover:bg-zinc-900/40'
                    }`}
                  >
                    {node.name}
                  </Link>
                );
              }

              // Option B: Folder (collapsible submenu)
              const isOpen = openFolders[node.id] !== false; // defaults to true
              return (
                <div key={node.id} className="flex flex-col">
                  <button
                    onClick={() => toggleFolder(node.id)}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-zinc-400 hover:text-orange-300 hover:bg-zinc-900/40 border border-transparent flex items-center justify-between transition-all duration-300 cursor-pointer"
                  >
                    <span>{node.name}</span>
                    <svg
                      className={`w-3.5 h-3.5 transition-transform duration-300 ${
                        isOpen ? 'rotate-180' : 'rotate-0'
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>

                  <div
                    className={`transition-all duration-300 overflow-hidden ${
                      isOpen ? 'max-h-[500px] opacity-100 mt-1.5' : 'max-h-0 opacity-0'
                    }`}
                  >
                    <div className="pl-4 pr-1 py-1 flex flex-col space-y-1 border-l border-zinc-900/80 ml-4">
                      {node.children.map((child: any) => {
                        const searchCategory = child.path?.split('category=')[1] || null;
                        const decodedCategory = searchCategory ? decodeURIComponent(searchCategory) : null;
                        const currentCategoryParam = searchParams ? searchParams.get('category') : null;
                        const isSubActive = pathname === '/yields' && currentCategoryParam === decodedCategory;

                        return (
                          <Link
                            key={child.id}
                            href={child.path || '#'}
                            className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-all duration-200 ${
                              isSubActive
                                ? 'bg-orange-500/5 text-orange-400 border-orange-500/10 font-bold'
                                : 'text-zinc-500 border-transparent hover:text-orange-300 hover:bg-zinc-900/20'
                            }`}
                          >
                            • {child.name}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer User info & Change Password / Logout */}
        <div className="border-t border-zinc-900 pt-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5 truncate pr-2">
              {/* Settings Gear Button opens Change Password Modal */}
              <button
                onClick={() => setIsChangePasswordOpen(true)}
                title="修改密码 / 账户安全"
                className="p-2 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-400 hover:text-orange-400 hover:border-orange-500/30 hover:bg-orange-500/10 transition-all duration-300 group cursor-pointer"
              >
                <svg
                  className="w-4 h-4 group-hover:rotate-90 transition-transform duration-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </button>

              <div
                onClick={() => setIsChangePasswordOpen(true)}
                className="truncate cursor-pointer group"
                title="点击修改密码"
              >
                <p className="text-xs font-bold text-white truncate group-hover:text-orange-400 transition-colors">{user.username}</p>
                <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-semibold mt-0.5 ${
                  user.role === 'ADMIN' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' : 'bg-blue-500/10 text-cyan-400 border border-blue-500/20'
                }`}>
                  {user.role === 'ADMIN' ? '超级博主' : '录入助理'}
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-1.5">
              <button
                onClick={() => setIsChangePasswordOpen(true)}
                title="修改密码"
                className="px-2 py-1.5 bg-zinc-900 border border-zinc-800 text-[10px] font-bold rounded-xl text-zinc-400 hover:text-orange-400 hover:border-orange-500/30 hover:bg-orange-500/10 transition-all cursor-pointer"
              >
                改密
              </button>
              <button
                onClick={logout}
                title="退出登录"
                className="px-2 py-1.5 bg-zinc-900 border border-zinc-800 text-[10px] font-bold rounded-xl text-zinc-400 hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/10 transition-all cursor-pointer"
              >
                退出
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Right Content */}
      <main className="relative z-10 flex-grow p-8 overflow-y-auto max-w-7xl mx-auto w-full">
        {children}
      </main>

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
      />
    </div>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <Suspense fallback={
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-400 font-mono text-sm">
          加载中...
        </div>
      }>
        <AppLayoutContent>{children}</AppLayoutContent>
      </Suspense>
    </AuthProvider>
  );
}
