import { useEffect, useState, useCallback } from 'react';
import { 
  Search, Users, Shield, 
  ShieldCheck, User as UserIcon, 
  Calendar, Fingerprint, Mail,
  ExternalLink, ChevronDown, RefreshCw
} from 'lucide-react';
import apiClient from '../../api/client';
import { cn } from '../../utils/cn';
import { useTelegram } from '../../contexts/useTelegram';

type TgUser = {
  id: number;
  telegram_id: number;
  first_name: string;
  last_name: string;
  username: string;
  role: 'USER' | 'COMPANY' | 'ADMIN';
  photo_url: string | null;
  created_at: string;
  has_company: boolean;
};

const ROLES = [
  { value: 'USER', label: 'User', color: 'bg-slate-100 text-slate-500', icon: UserIcon },
  { value: 'COMPANY', label: 'Company', color: 'bg-sky-50 text-sky-600', icon: Shield },
  { value: 'ADMIN', label: 'Admin', color: 'bg-purple-50 text-purple-600', icon: ShieldCheck },
];

export default function AdminUsersPage() {
  const [users, setUsers] = useState<TgUser[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const { profile, refreshProfile } = useTelegram();

  const fetchUsers = useCallback(async (q = '') => {
    setLoading(true);
    try {
      const { data } = await apiClient.get('admin/users/', { 
        params: q ? { search: q } : {} 
      });
      setUsers(data.results ?? data);
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    const t = setTimeout(() => fetchUsers(search), 400);
    return () => clearTimeout(t);
  }, [search, fetchUsers]);

  const handleRoleChange = async (id: number, role: string) => {
    setUpdatingId(id);
    try {
      const { data } = await apiClient.post(`admin/users/${id}/set-role/`, { role });
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...data } : u)));
      
      // If we are updating our own role, refresh the profile to update UI permissions
      if (profile && profile.id === id) {
        await refreshProfile();
      }
    } catch (err) {
      console.error('Error updating role:', err);
      alert('Rolni yangilashda xatolik yuz berdi.');
    } finally {
      setUpdatingId(null);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '—';
    return date.toLocaleDateString([], { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Search & Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Foydalanuvchilar</h1>
          <p className="text-sm text-slate-500 font-medium mt-1">Platforma a'zolari va ularning huquqlarini boshqarish</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative w-full sm:w-80 group">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-sky-600 transition-colors" />
            <input
              type="text"
              placeholder="Ism yoki username bo'yicha..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-[20px] text-sm font-bold focus:outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 transition-all shadow-sm"
            />
          </div>
          <button onClick={() => fetchUsers(search)} className="p-3.5 bg-white border border-slate-200 rounded-[20px] text-slate-400 hover:text-sky-600 hover:bg-sky-50 transition-all shadow-sm active:scale-95">
            <RefreshCw size={20} />
          </button>
        </div>
      </div>

      {/* Modern Table Container */}
      <div className="bg-white rounded-[40px] shadow-[0_8px_30px_rgb(0,0,0,0.02)] border border-slate-100/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="text-left text-[11px] uppercase tracking-[0.2em] text-slate-400 font-black px-8 py-5">Foydalanuvchi</th>
                <th className="text-left text-[11px] uppercase tracking-[0.2em] text-slate-400 font-black px-6 py-5">Telegram ID</th>
                <th className="text-left text-[11px] uppercase tracking-[0.2em] text-slate-400 font-black px-6 py-5">Rol</th>
                <th className="text-left text-[11px] uppercase tracking-[0.2em] text-slate-400 font-black px-6 py-5">Ro'yxatdan o'tgan</th>
                <th className="text-right text-[11px] uppercase tracking-[0.2em] text-slate-400 font-black px-8 py-5">Amallar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={5} className="px-8 py-4">
                      <div className="h-10 bg-slate-50 rounded-2xl w-full" />
                    </td>
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-24 text-center">
                    <Users size={40} className="mx-auto text-slate-200 mb-4" />
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Foydalanuvchilar yo'q</p>
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const roleConfig = ROLES.find(r => r.value === u.role) || ROLES[0];
                  
                  return (
                    <tr key={u.id} className="group hover:bg-slate-50/50 transition-colors">
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-4">
                          <div className="relative">
                            {u.photo_url ? (
                              <img src={u.photo_url} alt="" className="w-12 h-12 rounded-[20px] object-cover ring-2 ring-white shadow-md border border-slate-100" />
                            ) : (
                              <div className="w-12 h-12 rounded-[20px] bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-slate-400 text-sm font-black ring-2 ring-white shadow-sm border border-slate-100">
                                {u.first_name?.charAt(0) || 'U'}
                              </div>
                            )}
                            {u.role === 'ADMIN' && (
                              <div className="absolute -top-1 -right-1 w-5 h-5 bg-purple-500 rounded-full border-2 border-white flex items-center justify-center text-[10px] text-white">
                                <ShieldCheck size={10} />
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-black text-slate-900 group-hover:text-sky-600 transition-colors">
                              {[u.first_name, u.last_name].filter(Boolean).join(' ') || 'Noma\'lum User'}
                            </p>
                            <p className="text-[11px] text-slate-400 font-bold flex items-center gap-1">
                              {u.username ? (
                                <><Mail size={10} /> @{u.username}</>
                              ) : (
                                <span className="opacity-50">—</span>
                              )}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-100 w-fit group-hover:bg-white transition-colors">
                          <Fingerprint size={12} className="text-slate-400" />
                          <span className="text-xs font-black text-slate-600 font-mono tracking-tighter">{u.telegram_id}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className={cn(
                          "inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest",
                          roleConfig.color
                        )}>
                          <roleConfig.icon size={12} />
                          {roleConfig.label}
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2 text-slate-400">
                          <Calendar size={14} />
                          <span className="text-xs font-bold">{formatDate(u.created_at)}</span>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex items-center justify-end gap-3">
                          <div className="relative group/select">
                            <select
                              value={u.role}
                              onChange={(e) => handleRoleChange(u.id, e.target.value)}
                              disabled={updatingId === u.id}
                              className="appearance-none bg-white border border-slate-200 rounded-xl px-4 py-2 pr-10 text-[11px] font-black uppercase tracking-widest text-slate-600 outline-none hover:border-sky-300 focus:ring-4 focus:ring-sky-500/5 transition-all cursor-pointer disabled:opacity-50"
                            >
                              {ROLES.map(r => (
                                <option key={r.value} value={r.value}>{r.label}</option>
                              ))}
                            </select>
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-hover/select:text-sky-500 transition-colors">
                              {updatingId === u.id ? (
                                <RefreshCw size={12} className="animate-spin" />
                              ) : (
                                <ChevronDown size={12} />
                              )}
                            </div>
                          </div>
                          {u.has_company && (
                            <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center hover:bg-sky-100 transition-all cursor-help" title="Kompaniya profili mavjud">
                              <Shield size={16} />
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pro Strategy Tooltip */}
      <div className="bg-slate-900 rounded-[32px] p-8 text-white relative overflow-hidden group shadow-2xl shadow-slate-900/10">
        <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/5 rounded-full group-hover:scale-150 transition-transform duration-1000" />
        <div className="relative flex flex-col md:flex-row items-center gap-8">
          <div className="w-16 h-16 bg-white/10 rounded-[24px] flex items-center justify-center text-sky-400 flex-shrink-0 backdrop-blur-md border border-white/10">
            <ShieldCheck size={32} />
          </div>
          <div className="flex-1 text-center md:text-left">
            <h3 className="text-xl font-black tracking-tight mb-2">Hamkorlik Strategiyasi</h3>
            <p className="text-sm text-slate-400 font-medium leading-relaxed max-w-2xl">
              Foydalanuvchini <span className="text-sky-400 font-bold">Company</span> roliga o'tkazish orqali unga WebApp'da mahsulot qo'shish imkonini berasiz. 
              Rolni o'zgartirish bilan birga, tizim avtomatik ravishda yangi brend profili va obunasini yaratib beradi.
            </p>
          </div>
          <button className="px-6 py-4 bg-white text-slate-900 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-sky-400 hover:text-white transition-all shadow-xl active:scale-95 flex items-center gap-2">
            Batafsil <ExternalLink size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

