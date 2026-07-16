'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import {
  ChevronDown,
  ChevronRight,
  Folder,
  FolderOpen,
  FileText,
  FolderPlus,
  Plus,
  Edit3,
  Trash2,
  Shield,
} from 'lucide-react';

interface Menu {
  id: string;
  name: string;
  path: string | null;
  sort: number;
  parentId: string | null;
  permissionCode: string | null;
}

export default function MenusPage() {
  const { user, token, isLoading, hasPermission } = useAuth();
  const router = useRouter();

  const [menus, setMenus] = useState<Menu[]>([]);
  const [loadingMenus, setLoadingMenus] = useState(true);

  // Modal & Form State
  const [showModal, setShowModal] = useState(false);
  const [editingMenu, setEditingMenu] = useState<Menu | null>(null);
  const [name, setName] = useState('');
  const [path, setPath] = useState('');
  const [sort, setSort] = useState<number | string>(0);
  const [parentId, setParentId] = useState<string>('');
  const [permissionCode, setPermissionCode] = useState<string>('');

  // Status State
  const [saveStatus, setSaveStatus] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Tree Grid states and helpers
  const [collapsedMenuIds, setCollapsedMenuIds] = useState<Set<string>>(new Set());

  const toggleCollapse = (menuId: string) => {
    setCollapsedMenuIds(prev => {
      const next = new Set(prev);
      if (next.has(menuId)) {
        next.delete(menuId);
      } else {
        next.add(menuId);
      }
      return next;
    });
  };

  interface FlatMenuItem extends Menu {
    depth: number;
    hasChildren: boolean;
    isCollapsed: boolean;
  }

  const getFlattenedTree = (menuList: Menu[]): FlatMenuItem[] => {
    const rootNodes = menuList.filter(m => !m.parentId);
    rootNodes.sort((a, b) => a.sort - b.sort);

    const result: FlatMenuItem[] = [];

    const traverse = (node: Menu, depth: number) => {
      const children = menuList.filter(m => m.parentId === node.id);
      children.sort((a, b) => a.sort - b.sort);

      const hasChildren = children.length > 0;
      const isCollapsed = collapsedMenuIds.has(node.id);

      result.push({
        ...node,
        depth,
        hasChildren,
        isCollapsed,
      });

      if (hasChildren && !isCollapsed) {
        children.forEach(child => traverse(child, depth + 1));
      }
    };

    rootNodes.forEach(node => traverse(node, 0));
    return result;
  };

  const apiBase = process.env.NEXT_PUBLIC_CORE_API_URL || 'http://localhost:3000';

  // Authorization Redirect
  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.replace('/login');
      } else if (!hasPermission('menu:manage')) {
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
    if (user && hasPermission('menu:manage')) {
      fetchMenus();
    }
  }, [user]);

  // Folders for parent selection (menus that have null path)
  const folders = menus.filter((m) => !m.path && (!editingMenu || m.id !== editingMenu.id));

  // Open modal for creating new menu
  const handleOpenCreateModal = () => {
    setEditingMenu(null);
    setName('');
    setPath('/yields?category=');
    setSort(menus.length > 0 ? Math.max(...menus.map((m) => m.sort)) + 1 : 1);
    setParentId('');
    setPermissionCode('');
    setErrorMessage('');
    setShowModal(true);
  };

  // Open modal for editing existing menu
  const handleOpenEditModal = (menu: Menu) => {
    setEditingMenu(menu);
    setName(menu.name);
    setPath(menu.path || '');
    setSort(menu.sort);
    setParentId(menu.parentId || '');
    setPermissionCode(menu.permissionCode || '');
    setErrorMessage('');
    setShowModal(true);
  };

  // Handle submit (Create or Update)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const payload = {
      name,
      path: path.trim() === '' ? null : path,
      sort: parseInt(sort.toString(), 10) || 0,
      parentId: parentId === '' ? null : parentId,
      permissionCode: permissionCode === '' ? null : permissionCode,
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
          'Authorization': `Bearer ${token}`,
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

      // Refresh list & dynamic layout sidebar
      await fetchMenus();
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
          'Authorization': `Bearer ${token}`,
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
    } catch (err: any) {
      setErrorMessage(err.message || '网络错误，删除失败');
    }
  };

  // Render authorization loading or if restricted user is visiting
  if (isLoading || !user || !hasPermission('menu:manage')) {
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
            动态配置和管理中台系统所有的侧边栏导航菜单。支持树形二级目录（将路径置空即可作为目录）。
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

      {/* Dynamic menu list */}
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
                <th className="p-4 w-64">菜单名称</th>
                <th className="p-4">路由链接 (Path)</th>
                <th className="p-4 w-40">所属父目录 (Parent)</th>
                <th className="p-4 w-48">需鉴权权限 (Permission)</th>
                <th className="p-4 w-20">排序 (Sort)</th>
                <th className="p-4 w-60 text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              {getFlattenedTree(menus).map((menu) => {
                const parentMenu = menus.find((m) => m.id === menu.parentId);
                const isFolder = !menu.path;
                const indentPadding = `${16 + menu.depth * 24}px`;

                return (
                  <tr
                    key={menu.id}
                    className="border-b border-zinc-900/60 hover:bg-zinc-900/20 text-zinc-300 transition-colors"
                  >
                    <td
                      className="p-4 font-bold text-white flex items-center gap-2"
                      style={{ paddingLeft: indentPadding }}
                    >
                      {/* Folder Chevron Toggle */}
                      {isFolder && menu.hasChildren ? (
                        <button
                          type="button"
                          onClick={() => toggleCollapse(menu.id)}
                          className="p-0.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition-all cursor-pointer shrink-0"
                        >
                          {menu.isCollapsed ? (
                            <ChevronRight className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )}
                        </button>
                      ) : isFolder ? (
                        // Placeholder space for folders with no children
                        <span className="w-4.5 shrink-0" />
                      ) : (
                        // Leaf node icon
                        <FileText className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                      )}

                      {/* Folder Icon */}
                      {isFolder ? (
                        menu.isCollapsed ? (
                          <Folder className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                        ) : (
                          <FolderOpen className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                        )
                      ) : null}

                      <span>{menu.name}</span>
                    </td>
                    <td className="p-4 font-mono text-zinc-400">
                      {menu.path ? (
                        <span>{menu.path}</span>
                      ) : (
                        <span className="text-[10px] text-orange-400 bg-orange-950/30 border border-orange-500/15 px-1.5 py-0.5 rounded font-bold inline-flex items-center gap-1 select-none">
                          <Folder className="w-2.5 h-2.5" /> 文件夹目录
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-zinc-400">
                      {parentMenu ? parentMenu.name : <span className="text-zinc-600">-</span>}
                    </td>
                    <td className="p-4 font-mono text-zinc-400">
                      {menu.permissionCode ? (
                        <span className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[10px] text-zinc-400 font-bold inline-flex items-center gap-1">
                          <Shield className="w-2.5 h-2.5 text-zinc-500" /> {menu.permissionCode}
                        </span>
                      ) : (
                        <span className="text-zinc-600 text-[10px]">公开 (Public)</span>
                      )}
                    </td>
                    <td className="p-4 font-mono">{menu.sort}</td>
                    <td className="p-4 text-right space-x-2">
                      {/* "Add Child" shortcut button for top-level folders */}
                      {isFolder && !menu.parentId && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingMenu(null);
                            setName('');
                            setPath('/yields?category=');
                            setSort(menus.length > 0 ? Math.max(...menus.map((m) => m.sort)) + 1 : 1);
                            setParentId(menu.id);
                            setPermissionCode('');
                            setErrorMessage('');
                            setShowModal(true);
                          }}
                          className="px-2 py-1 bg-orange-500/10 border border-orange-500/20 text-orange-400 rounded-lg hover:bg-orange-500 hover:text-zinc-950 transition-all cursor-pointer inline-flex items-center gap-1"
                        >
                          <FolderPlus className="w-3 h-3" /> 新增子级
                        </button>
                      )}
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
                );
              })}
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
                <label className="text-xs text-zinc-500 font-medium">路由链接 (Path - 置空则作为目录)</label>
                <input
                  type="text"
                  placeholder="如: /yields?category=广告"
                  value={path}
                  onChange={(e) => setPath(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-200 font-mono focus:outline-none focus:border-orange-500/50"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-zinc-500 font-medium">所属父目录 (可选)</label>
                <select
                  value={parentId}
                  onChange={(e) => setParentId(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-200 focus:outline-none focus:border-orange-500/50 cursor-pointer"
                >
                  <option value="">-- 无 (顶级菜单) --</option>
                  {folders.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-zinc-500 font-medium">访问控制权限权限码 (Optional Permission Code)</label>
                <input
                  type="text"
                  placeholder="如: items:view (为空代表公开)"
                  value={permissionCode}
                  onChange={(e) => setPermissionCode(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-200 font-mono focus:outline-none focus:border-orange-500/50"
                />
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
