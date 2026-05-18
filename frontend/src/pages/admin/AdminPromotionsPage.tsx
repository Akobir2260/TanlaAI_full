import { useEffect, useState, useCallback } from 'react';
import { Tag, Package, Trash2, Edit3, Plus, Calendar, Clock, Megaphone } from 'lucide-react';
import { Link } from 'react-router-dom';
import apiClient from '../../api/client';
import { cn } from '../../utils/cn';

type Promotion = {
  id: number;
  name: string;
  description: string;
  price: string | null;
  discount_price: string | null;
  image: string | null;
  image_no_bg: string | null;
  is_on_sale: boolean;
  sale_end_date: string | null;
  company_details: { name: string } | null;
};

export default function AdminPromotionsPage() {
  const [promos, setPromos] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [broadcasting, setBroadcasting] = useState<number | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchPromos = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get('admin/promotions/');
      setPromos(data.results ?? data);
    } catch (error) {
      console.error('Error fetching promos:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPromos();
  }, [fetchPromos]);

  const handleStopSale = async (id: number) => {
    if (!window.confirm('Haqiqatan ham bu mahsulotni aksiyadan olib tashlamoqchimisiz?')) return;
    try {
      await apiClient.patch(`admin/promotions/${id}/`, { is_on_sale: false });
      setPromos(prev => prev.filter(p => p.id !== id));
    } catch (error) {
      console.error('Error stopping sale:', error);
      alert("Aksiyani to'xtatishda xatolik yuz berdi");
    }
  };

  const handleBroadcast = async (id: number, name: string) => {
    const userCount = 'barcha';
    if (!window.confirm(`"${name}" aksiyasini ${userCount} foydalanuvchilarga Telegram orqali yuborasizmi?`)) return;
    setBroadcasting(id);
    try {
      const { data } = await apiClient.post(`admin/promotions/${id}/broadcast/`);
      showToast(`📢 ${data.sent} ta foydalanuvchiga yuborildi!`, 'success');
    } catch (error: unknown) {
      const msg = (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "Broadcast xatosi";
      showToast(msg, 'error');
    } finally {
      setBroadcasting(null);
    }
  };

  const formatPrice = (price: string | number | null) => {
    if (!price) return '—';
    return new Intl.NumberFormat('uz-UZ').format(Number(price)) + " сум";
  };

  const getStatus = (expiry: string | null) => {
    if (!expiry) return { label: 'Active', color: 'bg-green-100 text-green-700' };
    const isExpired = new Date(expiry) < new Date();
    return isExpired 
      ? { label: 'Expired', color: 'bg-red-100 text-red-700' } 
      : { label: 'Active', color: 'bg-green-100 text-green-700' };
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">E'lon qilingan aksiyalar</h1>
          <p className="text-slate-500 font-medium">Barcha chegirmali mahsulotlarni boshqarish va broadcast qilish</p>
        </div>
        <Link 
          to="/adminka/products" 
          className="flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-2xl font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 hover:-translate-y-1 active:scale-95"
        >
          <Plus size={20} />
          Yangi aksiya qo'shish
        </Link>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-[32px] p-4 space-y-4 animate-pulse border border-slate-100">
              <div className="aspect-square bg-slate-100 rounded-2xl" />
              <div className="h-4 bg-slate-100 rounded w-2/3" />
              <div className="h-3 bg-slate-50 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : promos.length === 0 ? (
        <div className="bg-white rounded-[40px] border border-slate-100 p-20 text-center space-y-4 shadow-sm">
          <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300">
            <Tag size={48} />
          </div>
          <div className="max-w-xs mx-auto space-y-2">
            <h3 className="text-xl font-bold text-slate-900">Hozircha aksiyalar yo'q</h3>
            <p className="text-slate-500 text-sm">Yangi chegirma yaratish uchun mahsulotlar ro'yxatidan foydalaning.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {promos.map((p) => {
            const status = getStatus(p.sale_end_date);
            const isBroadcasting = broadcasting === p.id;
            return (
              <div key={p.id} className="group bg-white rounded-[32px] p-4 border border-slate-100 hover:border-primary/20 hover:shadow-2xl hover:shadow-primary/5 transition-all duration-500 flex flex-col">
                {/* Image Container */}
                <div className="relative aspect-square rounded-2xl bg-slate-50 overflow-hidden mb-4 border border-slate-100/50">
                  <img
                    src={p.image_no_bg || p.image || "/placeholder-product.png"}
                    alt={p.name}
                    className="w-full h-full object-contain mix-blend-multiply group-hover:scale-110 transition-transform duration-700"
                  />
                  <div className={cn("absolute top-3 left-3 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm", status.color)}>
                    {status.label}
                  </div>
                  <div className="absolute bottom-3 right-3 flex gap-2 translate-y-12 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                    <button
                      onClick={() => handleBroadcast(p.id, p.name)}
                      disabled={isBroadcasting}
                      className="p-2 bg-amber-500 rounded-xl text-white hover:bg-amber-600 shadow-lg border border-amber-400 transition-colors disabled:opacity-50"
                      title="📢 Barcha foydalanuvchilarga yuborish"
                    >
                      {isBroadcasting ? (
                        <div className="w-[18px] h-[18px] border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <Megaphone size={18} />
                      )}
                    </button>
                    <Link 
                      to={`/adminka/products/edit/${p.id}`}
                      className="p-2 bg-white rounded-xl text-slate-600 hover:text-primary shadow-lg border border-slate-100 transition-colors"
                    >
                      <Edit3 size={18} />
                    </Link>
                    <button 
                      onClick={() => handleStopSale(p.id)}
                      className="p-2 bg-white rounded-xl text-slate-600 hover:text-error shadow-lg border border-slate-100 transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 space-y-3">
                  <div>
                    <h3 className="font-bold text-slate-900 line-clamp-1">{p.name}</h3>
                    <div className="flex items-center gap-1.5 text-slate-400 mt-1">
                      <Package size={12} />
                      <span className="text-[11px] font-medium">{p.company_details?.name || 'Mustaqil usta'}</span>
                    </div>
                  </div>

                  <div className="bg-slate-50 rounded-2xl p-3 space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Asosiy narx</span>
                      <span className="text-xs text-slate-400 line-through font-medium">{formatPrice(p.price)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-error font-black uppercase tracking-wider">Aksiya narxi</span>
                      <span className="text-sm font-black text-error">{formatPrice(p.discount_price)}</span>
                    </div>
                  </div>

                  {/* Broadcast button (always visible) */}
                  <button
                    onClick={() => handleBroadcast(p.id, p.name)}
                    disabled={isBroadcasting}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-amber-50 text-amber-700 border border-amber-100 rounded-2xl text-xs font-black uppercase tracking-wider hover:bg-amber-100 transition-all active:scale-[0.98] disabled:opacity-50"
                  >
                    {isBroadcasting ? (
                      <div className="w-4 h-4 border-2 border-amber-300 border-t-amber-700 rounded-full animate-spin" />
                    ) : (
                      <Megaphone size={14} />
                    )}
                    {isBroadcasting ? 'Yuborilmoqda...' : '📢 Broadcast'}
                  </button>

                  <div className="flex items-center justify-between text-[11px] px-1">
                    <div className="flex items-center gap-1.5 text-slate-500">
                      <Calendar size={12} className="text-slate-400" />
                      <span>{p.sale_end_date ? new Date(p.sale_end_date).toLocaleDateString() : 'Muddatsiz'}</span>
                    </div>
                    {p.sale_end_date && !status.label.includes('Expired') && (
                      <div className="flex items-center gap-1 text-sky-600 font-bold">
                        <Clock size={12} />
                        <span>Qolmoqda</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={cn(
          "fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 px-8 py-4 rounded-[24px] shadow-2xl border-2 transition-all animate-in fade-in slide-in-from-bottom-4",
          toast.type === 'success' ? 'bg-emerald-900 border-emerald-800 text-white' : 'bg-red-900 border-red-800 text-white'
        )}>
          <span className="text-lg">{toast.type === 'success' ? '✅' : '❌'}</span>
          <span className="text-sm font-black tracking-tight">{toast.message}</span>
        </div>
      )}
    </div>
  );
}

