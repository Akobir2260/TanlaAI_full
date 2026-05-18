import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, Trash2, Building2, 
  X, Package, 
  AlertCircle, MapPin, 
  Settings2, Plus, ArrowRight, Phone, Play, MessageCircle, CreditCard
} from 'lucide-react';
import apiClient from '../../api/client';
import { cn } from '../../utils/cn';
import { getMediaUrl } from '../../utils/media';

type Company = {
  id: number;
  name: string;
  description: string;
  location: string;
  logo: string | null;
  is_active: boolean;
  subscription_deadline: string | null;
  plan_name?: string;
  plan_price?: number;
  owner_name: string;
  owner_username: string;
  product_count: number;
  created_at: string;
  telegram_link?: string;
  instagram_link?: string;
  phone?: string;
  youtube_link?: string;
  is_vip: boolean;
  status: string;
  pending_payment_id?: number | null;
};

type StatusType = 'active' | 'warning' | 'expired';

const getCompanyStatus = (deadline: string | null, is_vip: boolean = false): StatusType => {
  if (is_vip) return 'active';
  if (!deadline) return 'expired';
  const now = new Date();
  const due = new Date(deadline);
  const diff = (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

  if (diff <= 0) return 'expired';
  if (diff <= 3) return 'warning';
  return 'active';
};

const getDaysLeft = (deadline: string | null, is_vip: boolean = false) => {
  if (is_vip) return 9999; // Represents infinity for UI
  if (!deadline) return 0;
  const now = new Date();
  const due = new Date(deadline);
  const diff = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return diff < 0 ? 0 : diff;
};

export default function AdminCompaniesPage() {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState<'all'|'unpaid'|'warning'>('all');
  const [loading, setLoading] = useState(true);

  // Edit Form state
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Company | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    location: '',
    telegram_link: '',
    instagram_link: '',
    phone: '',
    youtube_link: '',
    is_vip: false,
    logo: null as File | null
  });
  const [saving, setSaving] = useState(false);

  const fetchCompanies = useCallback(async (q = '') => {
    setLoading(true);
    try {
      const { data } = await apiClient.get('admin/companies/', { 
        params: q ? { search: q } : {} 
      });
      setCompanies(data.results ?? data);
    } catch (err) {
      console.error('Error fetching companies:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  useEffect(() => {
    const t = setTimeout(() => fetchCompanies(search), 400);
    return () => clearTimeout(t);
  }, [search, fetchCompanies]);

  const openEdit = (c: Company) => {
    setEditing(c);
    setFormData({
      name: c.name,
      description: c.description || '',
      location: c.location || '',
      telegram_link: c.telegram_link || '',
      instagram_link: c.instagram_link || '',
      phone: c.phone || '',
      youtube_link: c.youtube_link || '',
      is_vip: c.is_vip || false,
      logo: null
    });
    setShowForm(true);
  };

  const handleEditSubmit = async () => {
    if (!editing || !formData.name.trim()) return;
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('name', formData.name.trim());
      fd.append('description', formData.description.trim());
      fd.append('location', formData.location.trim());
      fd.append('telegram_link', formData.telegram_link.trim());
      fd.append('instagram_link', formData.instagram_link.trim());
      fd.append('phone', formData.phone.trim());
      fd.append('youtube_link', formData.youtube_link.trim());
      fd.append('is_vip', String(formData.is_vip));
      if (formData.logo) fd.append('logo', formData.logo);

      const { data } = await apiClient.patch(`admin/companies/${editing.id}/`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      
      setCompanies(prev => prev.map(c => c.id === editing.id ? { ...c, ...data } : c));
      setShowForm(false);
    } catch (err) {
      console.error('Error updating company:', err);
    } finally {
      setSaving(false);
    }
  };

  const toggleVIP = async (id: number) => {
    try {
      const { data } = await apiClient.post(`admin/companies/${id}/toggle-vip/`);
      setCompanies(prev => prev.map(c => c.id === id ? { ...c, is_vip: data.is_vip } : c));
    } catch (e) {
      console.error(e);
    }
  };

  const toggleActive = async (id: number) => {
    try {
      const { data } = await apiClient.post(`admin/companies/${id}/toggle-active/`);
      setCompanies(prev => prev.map(c => c.id === id ? { ...c, is_active: data.is_active } : c));
    } catch (e) {
      console.error(e);
    }
  };

  const updateDeadline = async (id: number, date: string) => {
    try {
      const { data } = await apiClient.post(`admin/companies/${id}/update-deadline/`, {
        subscription_deadline: date || null,
      });
      setCompanies(prev => prev.map(c => c.id === id ? { ...c, subscription_deadline: data.subscription_deadline } : c));
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Ushbu kompaniyani o'chirishni xohlaysizmi? Bu amalni ortga qaytarib bo'lmaydi.")) return;
    try {
      await apiClient.delete(`admin/companies/${id}/`);
      setCompanies(prev => prev.filter(x => x.id !== id));
    } catch (err) {
      console.error('Error deleting company:', err);
    }
  };

  const handleAcceptPayment = async (id: number) => {
    if (!confirm("To'lov qabul qilinganini tasdiqlaysizmi? Obuna 1 oyga uzaytiriladi.")) return;
    try {
      const { data } = await apiClient.post(`admin/companies/${id}/accept-payment/`);
      setCompanies(prev => prev.map(c => c.id === id ? { ...c, ...data } : c));
    } catch (err) {
      console.error('Error processing payment:', err);
    }
  };

  const filteredCompanies = useMemo(() => {
    return companies.filter(c => {
      if (filterMode === 'all') return true;
      const status = getCompanyStatus(c.subscription_deadline, c.is_vip);
      if (filterMode === 'unpaid') return status === 'expired';
      if (filterMode === 'warning') return status === 'warning';
      return true;
    });
  }, [companies, filterMode]);

  const unpaidCount = companies.filter(c => getCompanyStatus(c.subscription_deadline, c.is_vip) === 'expired').length;
  const warningCount = companies.filter(c => getCompanyStatus(c.subscription_deadline, c.is_vip) === 'warning').length;

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Search & Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Kompaniyalar</h1>
          <p className="text-sm text-slate-500 font-medium mt-1">Hamkorlar obunalari va biznes nazorati</p>
          
          {/* Top Alerts */}
          {(unpaidCount > 0 || warningCount > 0) && (
            <div className="flex flex-wrap gap-4 mt-4">
              {unpaidCount > 0 && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-600 rounded-full text-[11px] font-black uppercase tracking-widest border border-red-100">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  {unpaidCount} ta to'lamagan
                </div>
              )}
              {warningCount > 0 && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 text-amber-600 rounded-full text-[11px] font-black uppercase tracking-widest border border-amber-100">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  {warningCount} ta muddati tugayapti
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col items-end gap-3">
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <div className="relative w-full sm:w-80 group">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#0067a5] transition-colors" />
              <input
                type="text"
                placeholder="Brend nomi yoki shahar bo'yicha qidiruv..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-[20px] text-sm font-bold focus:outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 transition-all shadow-sm"
              />
            </div>
            <button className="px-6 py-3.5 bg-slate-900 text-white rounded-[20px] font-black text-sm uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center justify-center gap-2 shadow-lg shadow-slate-900/10 active:scale-95 shrink-0">
              <Plus size={18} /> Qo'shish
            </button>
          </div>
          
          {/* Filters */}
          <div className="flex gap-2 bg-slate-50 p-1 rounded-full border border-slate-200">
            <button onClick={() => setFilterMode('all')} className={cn("px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all", filterMode === 'all' ? "bg-white text-slate-900 shadow-sm border border-slate-100" : "text-slate-500 hover:text-slate-700")}>Barchasi</button>
            <button onClick={() => setFilterMode('unpaid')} className={cn("px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all", filterMode === 'unpaid' ? "bg-red-50 text-red-600 shadow-sm border border-red-100" : "text-slate-500 hover:text-slate-700")}>To'lamagan</button>
            <button onClick={() => setFilterMode('warning')} className={cn("px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all", filterMode === 'warning' ? "bg-amber-50 text-amber-600 shadow-sm border border-amber-100" : "text-slate-500 hover:text-slate-700")}>Tugayotgan</button>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-8">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-[32px] p-6 border border-slate-100 shadow-sm animate-pulse space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-slate-100 rounded-2xl" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-slate-100 rounded w-2/3" />
                  <div className="h-3 bg-slate-100 rounded w-1/2" />
                </div>
              </div>
              <div className="h-24 bg-slate-50 rounded-2xl" />
            </div>
          ))
        ) : filteredCompanies.length === 0 ? (
          <div className="col-span-full py-24 bg-white rounded-[40px] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-6">
              <Building2 size={40} />
            </div>
            <h3 className="text-xl font-black text-slate-900">Kompaniyalar topilmadi</h3>
            <p className="text-slate-400 mt-2">Qidiruv kriteriyalarini yoki filtringizni o'zgartirib ko'ring.</p>
          </div>
        ) : (
          filteredCompanies.map((c) => (
            <div key={c.id} className="group bg-white rounded-[40px] p-8 border border-slate-100/60 shadow-[0_8px_30px_rgb(0,0,0,0.02)] hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-500 relative overflow-hidden flex flex-col">
              {/* Background Decoration */}
              <div className="absolute -top-12 -right-12 w-48 h-48 bg-slate-50 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-700 pointer-events-none" />
              
              {/* Top Section: Logo & Status */}
              <div className="relative flex items-start justify-between mb-8">
                <div className="flex items-center gap-5">
                  <div className="w-16 h-16 bg-white rounded-[24px] shadow-lg border border-slate-100 p-1 flex-shrink-0 relative overflow-hidden">
                    {c.logo ? (
                      <img src={getMediaUrl(c.logo)} alt={c.name} className="w-full h-full object-contain" />
                    ) : (
                      <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-300">
                         <Building2 size={24} />
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2 py-1">
                      {c.name}
                    </h3>
                    <div className="flex items-center gap-2 text-slate-400">
                      <MapPin size={12} />
                      <span className="text-[11px] font-bold uppercase tracking-wider">{c.location || 'Hudud koʻrsatilmagan'}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col items-end gap-1.5">
                    <button
                      onClick={() => toggleActive(c.id)}
                      className={cn(
                        "px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-widest transition-all",
                        c.is_active 
                          ? "bg-slate-900 text-white hover:bg-slate-800 shadow-md shadow-slate-900/10" 
                          : "bg-slate-100 text-slate-400 hover:bg-slate-200"
                      )}
                    >
                      {c.is_active ? '✅ System Active' : '❌ System Block'}
                    </button>
                    <button
                      onClick={() => toggleVIP(c.id)}
                      className={cn(
                        "px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-widest transition-all",
                        c.is_vip 
                          ? "bg-amber-100 text-amber-700 border border-amber-200 shadow-sm" 
                          : "bg-slate-100 text-slate-400 hover:bg-slate-200"
                      )}
                    >
                      {c.is_vip ? '💎 VIP Hamkor' : '🤝 Oddiy'}
                    </button>
                    <div className={cn(
                      "px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest",
                      c.is_vip ? "bg-emerald-50 text-emerald-600" :
                      getCompanyStatus(c.subscription_deadline) === 'active' ? "bg-emerald-50 text-emerald-600" :
                      getCompanyStatus(c.subscription_deadline) === 'warning' ? "bg-amber-50 text-amber-600" :
                      "bg-red-50 text-red-600"
                    )}>
                      {c.is_vip ? '🟢 VIP (Doimiy)' : 
                       getCompanyStatus(c.subscription_deadline) === 'active' ? '🟢 Aktiv' :
                       getCompanyStatus(c.subscription_deadline) === 'warning' ? '🟡 Muddati Yaqin' :
                       '🔴 To\'lanmagan'}
                    </div>
                </div>
              </div>

              {/* Payment Details Block */}
              <div className="relative mb-6 p-5 rounded-[24px] bg-slate-50 border border-slate-100">
                <div className="flex items-center justify-between mb-3 border-b border-slate-200/50 pb-3">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">💰 Keyingi To'lov</span>
                  <span className="text-[10px] font-black text-slate-700 bg-white px-3 py-1.5 rounded-xl shadow-sm border border-slate-100">{c.plan_name || 'Tarif yoq'}</span>
                </div>
                <div className="flex items-center justify-between font-black">
                  <span className="text-xl tracking-tight text-slate-900">{c.is_vip ? '∞' : (c.plan_price ? `${c.plan_price.toLocaleString()} so'm` : '0 so\'m')}</span>
                  <span className={cn("text-xs flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl shadow-sm border border-slate-100", c.is_vip ? "text-emerald-500" : getCompanyStatus(c.subscription_deadline) === 'expired' ? "text-red-500" : getCompanyStatus(c.subscription_deadline) === 'warning' ? "text-amber-500" : "text-emerald-500")}>
                    {c.is_vip ? '💎 VIP Cheksiz' : `⏳ ${getDaysLeft(c.subscription_deadline)} kun qoldi`}
                  </span>
                </div>
              </div>

              {/* Owner Info & Socials */}
              <div className="relative bg-white border border-slate-100 rounded-[24px] p-4 mb-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-900 rounded-full flex items-center justify-center text-[10px] font-black text-white">
                    {c.owner_name?.charAt(0) || <Building2 size={12}/>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black text-slate-800 truncate">{c.owner_name || 'Owner'}</p>
                    <p className="text-[10px] text-slate-400 font-bold flex items-center gap-1 opacity-80"><Package size={10}/> {c.product_count} ta mahsulot</p>
                  </div>
                </div>
                {(c.phone || c.telegram_link) && (
                  <div className="flex items-center gap-2">
                    {c.phone && (
                      <a href={`tel:${c.phone}`} title="Qo'ng'iroq qilish" className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center hover:bg-emerald-100 transition-colors shadow-sm">
                        <Phone size={12} />
                      </a>
                    )}
                    {c.telegram_link && (
                      <a href={c.telegram_link} target="_blank" rel="noreferrer" title="Telegramda yozish" className="w-8 h-8 rounded-full bg-sky-50 text-sky-600 flex items-center justify-center hover:bg-sky-100 transition-colors shadow-sm">
                        <MessageCircle size={12} />
                      </a>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-auto">
                {c.pending_payment_id ? (
                  <button
                    onClick={() => navigate(`/adminka/payments?id=${c.pending_payment_id}`)}
                    className="w-full h-12 bg-sky-500 text-white rounded-[20px] text-[11px] font-black uppercase tracking-widest hover:bg-sky-600 transition-colors shadow-lg shadow-sky-500/20 active:scale-[0.98] flex items-center justify-center gap-2 mb-4"
                  >
                    <Search size={16} /> To'lovni tekshirish
                  </button>
                ) : (
                  <button
                    onClick={() => handleAcceptPayment(c.id)}
                    className="w-full h-12 bg-emerald-500 text-white rounded-[20px] text-[11px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/20 active:scale-[0.98] flex items-center justify-center gap-2 mb-4"
                  >
                    <CreditCard size={16} /> To'lov qabul qilindi
                  </button>
                )}
                
                {/* Deadline & Settings */}
                <div className="relative flex items-center justify-between pt-4 border-t border-slate-100/60">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Obuna muddati</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="date"
                        value={c.subscription_deadline?.slice(0, 10) || ''}
                        onChange={(e) => updateDeadline(c.id, e.target.value)}
                        className="bg-transparent text-[11px] font-black text-slate-700 focus:outline-none cursor-pointer hover:text-sky-600 transition-colors p-0 border-none"
                      />
                      {!c.subscription_deadline && <AlertCircle size={12} className="text-red-500" />}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openEdit(c)}
                      className="p-3 bg-white border border-slate-100 rounded-2xl text-slate-400 hover:text-sky-600 hover:border-sky-100 hover:bg-sky-50 transition-all shadow-sm"
                      title="Tahrirlash"
                    >
                      <Settings2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(c.id)}
                      className="p-3 bg-white border border-slate-100 rounded-2xl text-slate-400 hover:text-red-500 hover:border-red-100 hover:bg-red-50 transition-all shadow-sm"
                      title="O'chirish"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Edit Modal Improvements */}
      {showForm && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-in fade-in duration-300" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-lg p-10 space-y-8 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Profilni tahrirlash</h2>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">{editing?.name} boshqaruvi</p>
              </div>
              <button 
                onClick={() => setShowForm(false)} 
                className="w-10 h-10 flex items-center justify-center bg-slate-50 text-slate-400 rounded-full hover:bg-red-50 hover:text-red-500 transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2">Kompaniya nomi</label>
                  <input
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-100 rounded-[20px] px-5 py-3.5 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2">Manzil / Shahar</label>
                  <input
                    value={formData.location}
                    onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-100 rounded-[20px] px-5 py-3.5 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2">Tavsif</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows={2}
                    className="w-full bg-slate-50 border border-slate-100 rounded-[24px] px-5 py-3.5 text-sm font-medium focus:outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 transition-all"
                    placeholder="Kompaniya haqida qisqacha..."
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 flex items-center gap-1.5">
                    <Phone size={10} className="text-emerald-500" /> Telefon raqam
                  </label>
                  <input
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-100 rounded-[20px] px-5 py-3.5 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 transition-all"
                    placeholder="+998"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 flex items-center gap-1.5">
                    <MessageCircle size={10} className="text-sky-500" /> Telegram
                  </label>
                  <input
                    value={formData.telegram_link}
                    onChange={(e) => setFormData(prev => ({ ...prev, telegram_link: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-100 rounded-[20px] px-5 py-3.5 text-sm font-bold"
                    placeholder="@username"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 flex items-center gap-1.5">
                    <Play size={10} className="text-red-500" /> Instagram
                  </label>
                  <input
                    value={formData.instagram_link}
                    onChange={(e) => setFormData(prev => ({ ...prev, instagram_link: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-100 rounded-[20px] px-5 py-3.5 text-sm font-bold"
                    placeholder="@username"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 flex items-center gap-1.5">
                  <Play size={10} className="text-red-600" /> YouTube
                </label>
                <input
                  value={formData.youtube_link}
                  onChange={(e) => setFormData(prev => ({ ...prev, youtube_link: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-100 rounded-[20px] px-5 py-3.5 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 transition-all"
                  placeholder="https://youtube.com/..."
                />
              </div>

              <div className="flex items-center gap-3 p-5 bg-amber-50 rounded-[24px] border border-amber-100">
                <input
                  type="checkbox"
                  id="is_vip"
                  checked={formData.is_vip}
                  onChange={(e) => setFormData(prev => ({ ...prev, is_vip: e.target.checked }))}
                  className="w-5 h-5 rounded-md border-amber-300 text-amber-500 focus:ring-amber-500"
                />
                <label htmlFor="is_vip" className="text-sm font-black text-amber-900 cursor-pointer">
                  💎 VIP Hamkor (Tolovsiz eshik qo'shish)
                </label>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2">Brend Logotipi</label>
                <div className="relative group">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setFormData(prev => ({ ...prev, logo: e.target.files?.[0] ?? null }))}
                    className="hidden"
                    id="logo-upload"
                  />
                  <label 
                    htmlFor="logo-upload"
                    className="flex items-center justify-between w-full bg-slate-50 border border-slate-200 border-dashed rounded-[20px] px-5 py-3.5 cursor-pointer group-hover:bg-sky-50 group-hover:border-sky-200 transition-all"
                  >
                    <span className="text-xs font-bold text-slate-500">{formData.logo ? formData.logo.name : 'Rasm tanlash...'}</span>
                    <Plus size={18} className="text-slate-400 group-hover:text-sky-500" />
                  </label>
                </div>
              </div>

              <button
                onClick={handleEditSubmit}
                disabled={saving || !formData.name.trim()}
                className="w-full h-16 bg-slate-900 text-white font-black rounded-[24px] uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/10 disabled:opacity-50 active:scale-[0.98]"
              >
                {saving ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>Saqlash <ArrowRight size={18} /></>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
