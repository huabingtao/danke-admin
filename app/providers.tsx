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
  const { user, logout, isLoading } = useAuth();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentType = searchParams ? searchParams.get('type') : null;

  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    const fetchCategories = () => {
      if (user) {
        const apiBase = process.env.NEXT_PUBLIC_CORE_API_URL || 'http://localhost:3000';
        fetch(`${apiBase}/menus`)
          .then((res) => res.json())
          .then((data) => {
            if (Array.isArray(data)) {
              setCategories(data);
            }
          })
          .catch((err) => console.error('Failed to load categories', err));
      }
    };

    fetchCategories();

    if (typeof window !== 'undefined') {
      window.addEventListener('menu-changed', fetchCategories);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('menu-changed', fetchCategories);
      }
    };
  }, [user]);

  const navItems = [
    { name: '中盘大屏首页', path: '/' },
    { name: '资产产出录入', path: '/yields' },
    { name: '道具配置库', path: '/items' },
    { name: '限时活动库', path: '/events' },
  ];

  if (user && user.role === 'ADMIN') {
    navItems.push({ name: '导航菜单管理', path: '/menus' });
  }

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
            {navItems.map((item) => {
              const isYields = item.path === '/yields';
              const isActive = pathname === item.path && (!isYields || !currentType);
              return (
                <div key={item.path} className="flex flex-col space-y-1">
                  <Link
                    href={item.path}
                    className={`px-4 py-2.5 rounded-xl text-xs font-bold border transition-all duration-300 ${
                      isActive
                        ? 'bg-orange-500/10 text-orange-400 border-orange-500/20'
                        : 'text-zinc-400 border-transparent hover:text-orange-300 hover:bg-zinc-900/40'
                    }`}
                  >
                    {item.name}
                  </Link>

                  {/* Submenu for Yields */}
                  {isYields && categories.length > 0 && (
                    <div className="pl-4 pr-1 py-1 flex flex-col space-y-1 border-l border-zinc-900 ml-4 mt-1">
                      {categories.map((cat) => {
                        const targetType = cat.path.split('type=')[1] || null;
                        const isSubActive = pathname === '/yields' && currentType === targetType;
                        return (
                          <Link
                            key={cat.id}
                            href={cat.path}
                            className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-all duration-200 ${
                              isSubActive
                                ? 'bg-orange-500/5 text-orange-400 border-orange-500/10'
                                : 'text-zinc-500 border-transparent hover:text-orange-300 hover:bg-zinc-900/20'
                            }`}
                          >
                            • {cat.name}
                          </Link>
                        );
                      })}
                    </div>
                  )}
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
