'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

interface Menu {
  id: string;
  name: string;
  path: string;
  sort: number;
}

export default function MenusPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [menus, setMenus] = useState<Menu[]>([]);
  const [loadingMenus, setLoadingMenus] = useState(true);

  // Modal & Form State
  const [showModal, setShowModal] = useState(false);
  const [editingMenu, setEditingMenu] = useState<Menu | null>(null);
  const [name, setName] = useState('');
  const [path, setPath] = useState('');
  const [sort, setSort] = useState<number | string>(0);

  // Status State
  const [saveStatus, setSaveStatus] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const apiBase = process.env.NEXT_PUBLIC_CORE_API_URL || 'http://localhost:3000';
  const apiKey = process.env.NEXT_PUBLIC_ADMIN_API_KEY || 'danke_super_secret_key_123';

  // Authorization Redirect
  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.replace('/login');
      } else if (user.role !== 'ADMIN') {
        router.replace('/');
      }
    }
  }, [user, isLoading, router]);

  // Fetch menus list
  const fetchMenus = async () => {
    try {
      setLoadingMenus(true);
      const res = await fetch(`${apiBase}/menus`);
      if (!res.ok) {
        throw new Error('无法拉取菜单数据');
      }
      const data = await res.json();
      if (Array.isArray(data)) {
        setMenus(data);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || '获取菜单列表失败，请检查后端服务是否启动');
    } finally {
      setLoadingMenus(false);
    }
  };

  useEffect(() => {
    if (user && user.role === 'ADMIN') {
      fetchMenus();
    }
  }, [user]);

  // Open modal for creating new menu
  const handleOpenCreateModal = () => {
    setEditingMenu(null);
    setName('');
    setPath('/yields?type=');
    setSort(menus.length > 0 ? Math.max(...menus.map((m) => m.sort)) + 1 : 1);
    setErrorMessage('');
    setShowModal(true);
  };

  // Open modal for editing existing menu
  const handleOpenEditModal = (menu: Menu) => {
    setEditingMenu(menu);
    setName(menu.name);
    setPath(menu.path);
    setSort(menu.sort);
    setErrorMessage('');
    setShowModal(true);
  };

  // Handle submit (Create or Update)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const payload = {
      name,
      path,
      sort: parseInt(sort.toString(), 10) || 0,
    };

    try {
      const url = editingMenu 
        ? `${apiBase}/menus/${editingMenu.id}` 
        : `${apiBase}/menus`;
      const method = editingMenu ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || '操作失败');
      }

      setSaveStatus(editingMenu ? '修改成功 ✅' : '添加成功 ✅');
      setTimeout(() => setSaveStatus(''), 2000);
      setShowModal(false);

      // Refresh both local list and global layout sidebar
      await fetchMenus();
      window.dispatchEvent(new Event('menu-changed'));
    } catch (err: any) {
      setErrorMessage(err.message || '网络请求错误，请重试');
    }
  };

  // Handle Delete
  const handleDelete = async (id: string, menuName: string) => {
    if (!window.confirm(`确定要删除菜单 "${menuName}" 吗？此操作不可逆。`)) {
      return;
    }
    setErrorMessage('');

    try {
      const res = await fetch(`${apiBase}/menus/${id}`, {
        method: 'DELETE',
        headers: {
          'x-api-key': apiKey,
        },
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || '删除失败');
      }

      setSaveStatus('删除成功 🗑️');
      setTimeout(() => setSaveStatus(''), 2000);

      // Refresh list & sidebar
      await fetchMenus();
      window.dispatchEvent(new Event('menu-changed'));
    } catch (err: any) {
      setErrorMessage(err.message || '网络错误，删除失败');
    }
  };

  // Render authorization loading or if restricted user is visiting
  if (isLoading || !user || user.role !== 'ADMIN') {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-400 font-mono text-sm">
        鉴权中或无权限访问，正在重定向...
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="space-y-1">
          <h1 className="text-2xl font-black text-white">导航菜单管理</h1>
          <p className="text-xs text-zinc-500">
            动态增删改系统左侧边栏的二级动态菜单（“资产产出录入”下的子选项），修改后侧边栏将自动实时刷新。
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="px-4 py-2 bg-orange-500 text-zinc-950 rounded-xl text-xs font-bold hover:bg-orange-400 transition-all cursor-pointer shadow-lg shadow-orange-500/10"
        >
          + 新增导航菜单
        </button>
      </div>

      {/* Save status or main error notification banner */}
      {errorMessage && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs font-medium animate-shake">
          ⚠️ 错误提示: {errorMessage}
        </div>
      )}

      {saveStatus && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs font-semibold font-mono">
          {saveStatus}
        </div>
      )}

      {/* Spreadsheet List */}
      <div className="border border-zinc-900 bg-zinc-900/10 rounded-2xl overflow-hidden">
        {loadingMenus ? (
          <div className="p-12 text-center text-zinc-500 text-xs font-mono">
            正在拉取菜单数据...
          </div>
        ) : menus.length === 0 ? (
          <div className="p-12 text-center text-zinc-500 text-xs">
            暂无动态菜单，点击右上方按钮新增菜单。
          </div>
        ) : (
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-500 font-bold bg-zinc-950/40">
                <th className="p-4 w-40">菜单名称</th>
                <th className="p-4">路由链接 (Path)</th>
                <th className="p-4 w-28">排序序号 (Sort)</th>
                <th className="p-4 w-32 text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              {menus.map((menu) => (
                <tr
                  key={menu.id}
                  className="border-b border-zinc-900/60 hover:bg-zinc-900/20 text-zinc-300 transition-colors"
                >
                  <td className="p-4 font-bold text-white">{menu.name}</td>
                  <td className="p-4 font-mono text-zinc-400">{menu.path}</td>
                  <td className="p-4 font-mono">{menu.sort}</td>
                  <td className="p-4 text-right space-x-2">
                    <button
                      onClick={() => handleOpenEditModal(menu)}
                      className="px-2.5 py-1 bg-zinc-800 border border-zinc-700 text-zinc-300 rounded-lg hover:text-orange-400 hover:border-orange-500/40 transition-all cursor-pointer"
                    >
                      编辑
                    </button>
                    <button
                      onClick={() => handleDelete(menu.id, menu.name)}
                      className="px-2.5 py-1 bg-red-950/20 text-red-400 border border-red-500/25 rounded-lg hover:bg-red-500 hover:text-white transition-all cursor-pointer"
                    >
                      删除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Edit / Add Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 p-6 rounded-3xl space-y-4 shadow-2xl relative overflow-hidden animate-zoomIn">
            <h3 className="text-lg font-bold text-white">
              {editingMenu ? '编辑导航菜单' : '新增导航菜单'}
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs text-zinc-500 font-medium">菜单名称</label>
                <input
                  type="text"
                  required
                  placeholder="如: 每日产出"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-200 focus:outline-none focus:border-orange-500/50"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-zinc-500 font-medium">路由链接 (Path)</label>
                <input
                  type="text"
                  required
                  placeholder="如: /yields?type=DAILY"
                  value={path}
                  onChange={(e) => setPath(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-200 font-mono focus:outline-none focus:border-orange-500/50"
                />
                <p className="text-[10px] text-zinc-600">
                  提示：资产页面可通过附带 `type` 参数（如 `DAILY`, `WEEKLY`, `EVENT` 等）动态过滤对应资产来源。
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-zinc-500 font-medium">排序序号 (Sort)</label>
                <input
                  type="number"
                  required
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-200 font-mono focus:outline-none focus:border-orange-500/50"
                />
                <p className="text-[10px] text-zinc-600">
                  提示：数字越小，在侧边栏子菜单中排序越靠前。
                </p>
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-white rounded-xl text-xs font-bold transition-all"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-orange-500 text-zinc-950 rounded-xl text-xs font-bold hover:bg-orange-400 transition-all"
                >
                  确认保存
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
