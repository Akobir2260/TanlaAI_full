import { useEffect, useState, useCallback } from 'react';
import { 
  Plus, Pencil, Trash2, X, 
  Image as ImageIcon, 
  Eye, EyeOff, LayoutPanelTop,
  ArrowUpNarrowWide, Calendar,
  RefreshCw, CheckCircle2, AlertCircle
} from 'lucide-react';
import apiClient from '../../api/client';
import { cn } from '../../utils/cn';

type Banner = {
  id: number;
  title: string;
  subtitle: string;
  image: string | null;
  is_active: boolean;
  order: number;
  created_at: string;
};

const MEDIA_BASE = import.meta.env.VITE_BACKEND_ORIGIN || '';

export default function AdminBannersPage() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Banner | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formSubtitle, setFormSubtitle] = useState('');
  const [formOrder, setFormOrder] = useState(0);
  const [formActive, setFormActive] = useState(true);
  const [formImage, setFormImage] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const fetchBanners = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get('admin/banners/');
      setBanners(data.results ?? data);
    } catch (err) {
      console.error('Error fetching banners:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBanners();
  }, [fetchBanners]);

  const openCreate = () => {
    setEditing(null);
    setFormTitle('');
    setFormSubtitle('');
    setFormOrder(0);
    setFormActive(true);
    setFormImage(null);
    setShowForm(true);
  };

  const openEdit = (b: Banner) => {
    setEditing(b);
    setFormTitle(b.title);
    setFormSubtitle(b.subtitle);
    setFormOrder(b.order);
    setFormActive(b.is_active);
    setFormImage(null);
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!formTitle && !editing) {
      alert('Sarlavha kiriting!');
      return;
    }
    
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('title', formTitle);
      fd.append('subtitle', formSubtitle);
      fd.append('order', String(formOrder));
      fd.append('is_active', String(formActive));
      if (formImage) fd.append('image', formImage);

      if (editing) {
        await apiClient.patch(`admin/banners/${editing.id}/`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        await apiClient.post('admin/banners/', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }
      setShowForm(false);
      fetchBanners();
    } catch (err) {
      console.error('Error saving banner:', err);
      alert('Bannerni saqlashda xatolik yuz berdi.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Ushbu bannerni o'chirishni xohlaysizmi?")) return;
    try {
      await apiClient.delete(`admin/banners/${id}/`);
      setBanners(prev => prev.filter(x => x.id !== id));
    } catch (err) {
      console.error('Error deleting banner:', err);
    }
  };

  const toggleStatus = async (b: Banner) => {
    setTogglingId(b.id);
    try {
      const { data } = await apiClient.patch(`admin/banners/${b.id}/`, { 
        is_active: !b.is_active 
      });
      setBanners((prev) => prev.map((item) => (item.id === b.id ? { ...item, ...data } : item)));
    } catch (err) {
      console.error('Error toggling status:', err);
    } finally {
      setTogglingId(null);
    }
  };

  const formatImageUrl = (img: string | null) => {
    if (!img) return null;
    if (img.startsWith('http')) return img;
    const base = MEDIA_BASE.endsWith('/') ? MEDIA_BASE.slice(0, -1) : MEDIA_BASE;
    const path = img.startsWith('/') ? img : `/${img}`;
    return `${base}${path}`;
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString([], { day: 'numeric', month: 'short' });
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <LayoutPanelTop size={32} className="text-pink-500" />
            Bannerlar
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1 uppercase tracking-wider">Asosiy sahifa karuseli va aksiyalar</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={fetchBanners}
            className="p-3.5 bg-white border border-slate-100 rounded-[22px] text-slate-400 hover:text-pink-600 transition-all shadow-sm active:scale-95"
          >
            <RefreshCw size={20} className={cn(loading && "animate-spin")} />
          </button>
          <button
            onClick={openCreate}
            className="flex items-center gap-3 bg-gradient-to-br from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white px-7 py-3.5 rounded-[22px] text-sm font-black uppercase tracking-widest transition-all shadow-xl shadow-pink-500/20 active:scale-95"
          >
            <Plus size={20} /> Yangi Banner
          </button>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white rounded-[40px] h-80 animate-pulse border border-slate-100" />
          ))}
        </div>
      ) : banners.length === 0 ? (
        <div className="bg-white rounded-[40px] border-2 border-dashed border-slate-100 p-24 text-center">
          <div className="w-20 h-20 bg-slate-50 rounded-[30px] flex items-center justify-center mx-auto mb-6">
            <ImageIcon size={32} className="text-slate-300" />
          </div>
          <p className="text-slate-400 font-black uppercase tracking-widest mb-2">Hali bannerlar yo'q</p>
          <p className="text-sm text-slate-300">Asosiy sahifaga rang qo'shish uchun birinchi bannerni yarating</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {banners.map((b) => (
            <div
              key={b.id}
              className="group bg-white rounded-[40px] shadow-[0_8px_30px_rgb(0,0,0,0.02)] border border-slate-100/60 overflow-hidden hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-500"
            >
              <div className="relative h-48 overflow-hidden">
                {b.image ? (
                  <img
                    src={formatImageUrl(b.image) || ''}
                    alt={b.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                ) : (
                  <div className="w-full h-full bg-slate-50 flex items-center justify-center">
                    <ImageIcon size={48} className="text-slate-200" />
                  </div>
                )}
                <div className="absolute top-4 right-4 flex gap-2">
                  <button 
                    onClick={() => toggleStatus(b)}
                    disabled={togglingId === b.id}
                    className={cn(
                      "p-2.5 rounded-2xl backdrop-blur-md border transition-all active:scale-90",
                      b.is_active 
                        ? "bg-emerald-500/90 border-emerald-400 text-white shadow-lg shadow-emerald-500/20" 
                        : "bg-slate-900/40 border-slate-500/30 text-white/50"
                    )}
                  >
                    {togglingId === b.id ? <RefreshCw size={16} className="animate-spin" /> : b.is_active ? <Eye size={16} /> : <EyeOff size={16} />}
                  </button>
                </div>
                <div className="absolute bottom-4 left-4">
                  <div className="px-3 py-1.5 bg-white/90 backdrop-blur-md rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-900 shadow-sm flex items-center gap-2">
                    <ArrowUpNarrowWide size={12} className="text-pink-500" />
                    Tartib: {b.order}
                  </div>
                </div>
              </div>

              <div className="p-8">
                <div className="mb-6">
                  <h3 className="text-xl font-black text-slate-900 leading-tight mb-2 group-hover:text-pink-600 transition-colors">
                    {b.title || `Banner #${b.id}`}
                  </h3>
                  {b.subtitle && (
                    <p className="text-[13px] text-slate-500 font-medium leading-relaxed">{b.subtitle}</p>
                  )}
                </div>

                <div className="flex items-center justify-between pt-6 border-t border-slate-50">
                  <div className="flex items-center gap-2 text-slate-400">
                    <Calendar size={14} />
                    <span className="text-[10px] font-black uppercase tracking-tighter">{formatDate(b.created_at)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openEdit(b)}
                      className="w-10 h-10 flex items-center justify-center bg-slate-50 text-slate-400 rounded-xl hover:bg-sky-50 hover:text-sky-600 transition-all active:scale-90"
                    >
                      <Pencil size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(b.id)}
                      className="w-10 h-10 flex items-center justify-center bg-slate-50 text-slate-400 rounded-xl hover:bg-red-50 hover:text-red-600 transition-all active:scale-90"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-300" onClick={(e) => e.stopPropagation()}>
            <div className="bg-slate-50 p-8 flex items-center justify-between border-b border-slate-100">
              <div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight">
                  {editing ? 'Bannerni tahrirlash' : 'Yangi banner'}
                </h2>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Vizual ma'lumotlarni kiriting</p>
              </div>
              <button onClick={() => setShowForm(false)} className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-400 hover:text-pink-600 transition-all shadow-sm">
                <X size={20} />
              </button>
            </div>

            <div className="p-8 space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">Sarlavha</label>
                  <input
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-pink-500/5 focus:border-pink-500 transition-all"
                    placeholder="E.g. Yangi kolleksiya"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">Tavsif (Subtitle)</label>
                  <textarea
                    value={formSubtitle}
                    onChange={(e) => setFormSubtitle(e.target.value)}
                    rows={2}
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-pink-500/5 focus:border-pink-500 transition-all resize-none"
                    placeholder="Banner haqida qisqacha..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">Tartib</label>
                    <div className="relative">
                      <ArrowUpNarrowWide size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="number"
                        value={formOrder}
                        onChange={(e) => setFormOrder(Number(e.target.value))}
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-12 pr-5 py-4 text-sm font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-pink-500/5 focus:border-pink-500 transition-all"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">Status</label>
                    <button
                      type="button"
                      onClick={() => setFormActive(!formActive)}
                      className={cn(
                        "w-full h-[58px] rounded-2xl flex items-center justify-center gap-2 border font-black text-xs uppercase tracking-widest transition-all",
                        formActive 
                          ? "bg-emerald-50 border-emerald-100 text-emerald-600 shadow-sm" 
                          : "bg-slate-50 border-slate-200 text-slate-400 shadow-sm"
                      )}
                    >
                      {formActive ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                      {formActive ? 'Faol' : 'Faol emas'}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">Banner Rasmi</label>
                  <div className="relative group/upload">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setFormImage(e.target.files?.[0] ?? null)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <div className="w-full bg-slate-50 border-2 border-dashed border-slate-200 rounded-[30px] p-8 flex flex-col items-center justify-center gap-3 group-hover/upload:border-pink-500 group-hover/upload:bg-pink-50/50 transition-all">
                      <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center text-slate-400 group-hover/upload:text-pink-500 transition-colors">
                        <ImageIcon size={24} />
                      </div>
                      <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 group-hover/upload:text-pink-600 transition-colors">
                        {formImage ? formImage.name : 'Rasm tanlang yoki yuklang'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={handleSubmit}
                disabled={saving}
                className="w-full bg-slate-900 hover:bg-pink-600 text-white font-black rounded-2xl py-5 text-xs uppercase tracking-[0.2em] transition-all shadow-xl shadow-slate-900/10 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
              >
                {saving ? <RefreshCw size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                {saving ? 'Saqlanmoqda...' : editing ? 'O\'zgarishlarni saqlash' : 'Banner yaratish'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

