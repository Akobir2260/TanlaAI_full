import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Package, FolderTree, Tag, Building2, Users, Image, Settings, LogOut, Menu, TrendingUp, Eye, FlaskConical as Beaker, CreditCard } from 'lucide-react';
import apiClient from '../api/client';
import { cn } from '../utils/cn';

type AdminUser = { username: string };

const NAV_ITEMS = [
  { to: '/adminka', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/adminka/products', icon: Package, label: 'Products' },
  { to: '/adminka/categories', icon: FolderTree, label: 'Categories' },
  { to: '/adminka/promotions', icon: Tag, label: 'Promotions' },
  { to: '/adminka/companies', icon: Building2, label: 'Companies' },
  { to: '/adminka/payments', icon: CreditCard, label: 'To\'lovlar' },
  { to: '/adminka/users', icon: Users, label: 'Users' },
  { to: '/adminka/banners', icon: Image, label: 'Banners' },
  { to: '/adminka/leads', icon: TrendingUp, label: 'Leads' },
  { to: '/adminka/ai-results', icon: Eye, label: 'AI Results' },
  { to: '/adminka/ai-lab', icon: Beaker, label: 'AI Lab' },
  { to: '/adminka/system', icon: Settings, label: 'Tizim / Billing' },
];

export default function AdminLayout() {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    apiClient
      .get('/admin/me/')
      .then(({ data }) => {
        if (data.is_authenticated) {
          setAdmin({ username: data.username });
        } else {
          navigate('/adminka/login');
        }
      })
      .catch(() => navigate('/adminka/login'))
      .finally(() => setLoading(false));
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await apiClient.post('/admin/logout/');
    } finally {
      localStorage.removeItem('admin_token');
      navigate('/adminka/login');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-sky-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex">
      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 z-50 h-screen w-[280px] bg-white border-r border-slate-200/60
          flex flex-col transition-transform duration-300 ease-in-out
          lg:translate-x-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Brand */}
        <div className="px-8 py-8 flex flex-col justify-center border-b border-slate-50">
          <h1 className="text-2xl font-black tracking-tight text-[#0067a5]">Tanla</h1>
          <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-bold mt-1">
            Admin Panel
          </p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-8 px-4 space-y-1.5 overflow-y-auto">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-4 px-5 py-3.5 rounded-2xl text-[13px] font-black transition-all duration-300 group relative overflow-hidden
                ${
                  isActive
                    ? 'bg-[#0067a5] text-white shadow-[0_10px_20px_rgba(0,103,165,0.25)]'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-[#0067a5]'
                }`
              }
            >
              <item.icon size={20} className="relative z-10 transition-transform group-hover:scale-110" />
              <span className="relative z-10">{item.label}</span>
              {/* Active indicator bar */}
              <NavLink 
                to={item.to} 
                end={item.end}
                className={({ isActive }) => 
                  cn("absolute left-0 top-0 bottom-0 w-1.5 bg-sky-300 transition-transform duration-500", 
                  isActive ? "translate-x-0" : "-translate-x-full")
                }
              />
            </NavLink>
          ))}
        </nav>

        {/* User footer */}
        <div className="p-6 border-t border-slate-100 bg-slate-50/30">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-10 h-10 rounded-2xl bg-white shadow-sm border border-slate-100 flex items-center justify-center text-[#0067a5] text-sm font-black">
              {admin?.username?.charAt(0).toUpperCase() || 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black text-slate-700 truncate">{admin?.username || 'admin'}</p>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Admin</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-3 text-xs font-bold text-slate-400 hover:text-red-500 hover:bg-red-50/50 rounded-xl transition-all"
          >
            <LogOut size={16} />
            Chiqish
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0 bg-[#f8f9fa] lg:pl-[280px]">
        {/* Top bar */}
        <header className="sticky top-0 z-30 pt-[var(--sat)] min-h-[calc(4rem+var(--sat))] bg-white border-b border-slate-200/80 flex items-center px-4 lg:px-8 gap-4 shadow-sm">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 hover:bg-slate-100 rounded-lg"
          >
            <Menu size={22} />
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 text-xs font-bold">
                {admin?.username?.charAt(0).toUpperCase() || 'A'}
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-semibold text-slate-700">{admin?.username}</p>
                <p className="text-[10px] text-slate-400 uppercase">Administrator</p>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
