'use client';

import { AuthProvider, useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useState, useEffect, Suspense } from 'react';

interface Category {
  id: string;
  name: string;
  path: string;
}

function AppLayoutContent({ children }: { children: React.ReactNode }) {
  const { user, logout, isLoading, menuTree } = useAuth();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [openFolders, setOpenFolders] = useState<{ [id: string]: boolean }>({});

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

  // If not logged in, we render the page directly (it will be the login page)
  if (!user) {
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
            {menuTree.map((node) => {
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

        {/* Sidebar Footer User info */}
        <div className="border-t border-zinc-900 pt-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="truncate pr-2">
              <p className="text-xs font-bold text-white truncate">{user.username}</p>
              <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-semibold mt-0.5 ${
                user.role === 'ADMIN' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' : 'bg-blue-500/10 text-cyan-400 border border-blue-500/20'
              }`}>
                {user.role === 'ADMIN' ? '超级博主' : '录入助理'}
              </span>
            </div>
            <button
              onClick={logout}
              className="px-2.5 py-1 bg-zinc-900 border border-zinc-800 text-[10px] font-bold rounded-lg text-zinc-400 hover:text-white hover:border-zinc-700 transition-all cursor-pointer"
            >
              退出
            </button>
          </div>
        </div>
      </aside>

      {/* Right Content */}
      <main className="relative z-10 flex-grow p-8 overflow-y-auto max-w-7xl mx-auto w-full">
        {children}
      </main>
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
