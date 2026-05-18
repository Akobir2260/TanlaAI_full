import { useEffect, useState, useCallback } from 'react';
import { 
  TrendingUp, CheckCircle2, Clock, Trash2, 
  Phone, Ruler, Filter, ChevronDown, 
  User, Package, Calendar,
  MessageCircle, Loader2, Check, XCircle,
  AlertCircle, Sparkles
} from 'lucide-react';
import apiClient from '../../api/client';

type Lead = {
  id: number;
  lead_type: 'call' | 'telegram' | 'measurement' | 'visualize';
  status: 'new' | 'contacted' | 'active' | 'converted' | 'rejected' | 'closed';
  message: string;
  phone: string;
  price_info: string;
  is_processed: boolean;
  created_at: string;
  user_name: string;
  product_name: string;
  product_image: string | null;
  ai_result_image: string | null;
  company_name: string | null;
};

const STATUS_CONFIG = {
  new: { label: 'Yangi', color: 'bg-pink-50 text-pink-600 border-pink-100', icon: AlertCircle },
  contacted: { label: 'Bog\'lanildi', color: 'bg-sky-50 text-sky-600 border-sky-100', icon: Phone },
  active: { label: 'Jarayonda', color: 'bg-indigo-50 text-indigo-600 border-indigo-100', icon: Clock },
  converted: { label: 'Sotildi', color: 'bg-emerald-50 text-emerald-600 border-emerald-100', icon: CheckCircle2 },
  rejected: { label: 'Rad etildi', color: 'bg-rose-50 text-rose-600 border-rose-100', icon: XCircle },
  closed: { label: 'Yakunlandi', color: 'bg-slate-50 text-slate-600 border-slate-100', icon: Check },
};

export default function AdminLeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get('admin/leads/', {
        params: filter !== 'all' ? { status: filter } : {},
      });
      setLeads(data.results ?? data);
    } catch (err) {
      console.error('Error fetching leads:', err);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const handleStatusChange = async (id: number, newStatus: string) => {
    setUpdatingId(id);
    try {
      await apiClient.post(`admin/leads/${id}/set-status/`, { status: newStatus });
      setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, status: newStatus as Lead['status'] } : l)));
    } catch (e) {
      console.error('Error updating status:', e);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Ushbu leadni o'chirmoqchimisiz?")) return;
    try {
      await apiClient.delete(`admin/leads/${id}/`);
      setLeads((prev) => prev.filter((l) => l.id !== id));
    } catch (err) {
      console.error('Error deleting lead:', err);
    }
  };

  const getLeadTypeIcon = (type: string) => {
    switch (type) {
      case 'call': return <Phone size={14} className="text-secondary" />;
      case 'measurement': return <Ruler size={14} className="text-primary" />;
      case 'visualize': return <Sparkles size={14} className="text-amber-500" />;
      default: return <MessageCircle size={14} className="text-sky-500" />;
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto space-y-8 p-2">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary-dark rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
              <TrendingUp size={20} className="text-white" />
            </div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">Leads & CRM</h1>
          </div>
          <p className="text-slate-500 text-sm font-medium ml-1">Mijoz so'rovlari va savdo kanali boshqaruvi</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative group">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
              <Filter size={14} className="text-slate-400" />
            </div>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="pl-9 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-primary/5 transition-all appearance-none cursor-pointer shadow-sm"
            >
              <option value="all">Barcha so'rovlar</option>
              {Object.entries(STATUS_CONFIG).map(([val, conf]) => (
                <option key={val} value={val}>{conf.label}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Main Content */}
      {loading && !leads.length ? (
        <div className="flex flex-col items-center justify-center py-32 space-y-4">
          <div className="relative">
            <div className="w-12 h-12 border-4 border-primary/10 border-t-primary rounded-full animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <TrendingUp size={16} className="text-primary animate-pulse" />
            </div>
          </div>
          <p className="text-slate-400 text-sm font-bold animate-pulse">Ma'lumotlar yuklanmoqda...</p>
        </div>
      ) : leads.length === 0 ? (
        <div className="bg-white rounded-[32px] border-2 border-dashed border-slate-100 p-20 text-center space-y-4 shadow-sm">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto">
            <TrendingUp size={32} className="text-slate-200" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-black text-slate-800">Hozircha leadlar yo'q</h3>
            <p className="text-slate-400 text-sm max-w-xs mx-auto">Sizda hali mijoz so'rovlari mavjud emas. Reklamani boshlang! 🚀</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {leads.map((lead) => {
            const status = STATUS_CONFIG[lead.status] || STATUS_CONFIG.new;

            return (
              <div
                key={lead.id}
                className="group bg-white rounded-[32px] border border-slate-100 hover:border-primary/20 hover:shadow-2xl hover:shadow-primary/5 transition-all duration-300 p-6 relative overflow-hidden flex flex-col sm:flex-row gap-6"
              >
                {/* Status Indicator Bar */}
                <div className={`absolute top-0 left-0 w-1.5 h-full ${status.color.split(' ')[1].replace('text-', 'bg-')}`} />

                {/* Product/Visual Section */}
                <div className="w-full sm:w-32 h-40 sm:h-auto rounded-2xl bg-slate-50 overflow-hidden relative group-hover:shadow-lg transition-all border border-slate-200/50 shrink-0">
                  {lead.ai_result_image ? (
                    <img src={lead.ai_result_image} alt="AI Result" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                  ) : lead.product_image ? (
                    <img src={lead.product_image} alt={lead.product_name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                      <Package size={24} />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  {lead.ai_result_image && (
                    <div className="absolute top-2 right-2 bg-amber-500 text-white p-1 rounded-md shadow-lg">
                      <Sparkles size={12} />
                    </div>
                  )}
                </div>

                {/* Info Section */}
                <div className="flex-1 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <User size={14} className="text-slate-400" />
                        <h3 className="text-lg font-black text-slate-800 leading-tight">{lead.user_name}</h3>
                      </div>
                      <div className="flex items-center gap-2 text-slate-500 text-xs font-bold bg-slate-50 py-1 px-3 rounded-full border border-slate-100 inline-flex">
                        <Phone size={12} className="text-slate-400" />
                        {lead.phone}
                      </div>
                    </div>

                    <div className="relative inline-block h-fit">
                      {updatingId === lead.id ? (
                        <div className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 flex items-center gap-2">
                          <Loader2 size={12} className="animate-spin text-primary" />
                          <span className="text-[10px] font-black text-primary uppercase">Yangilanmoqda...</span>
                        </div>
                      ) : (
                        <select
                          value={lead.status}
                          onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                          className={`appearance-none border pl-3 pr-8 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider outline-none cursor-pointer transition-all ${status.color}`}
                        >
                          {Object.entries(STATUS_CONFIG).map(([val, conf]) => (
                            <option key={val} value={val}>{conf.label}</option>
                          ))}
                        </select>
                      )}
                      {updatingId !== lead.id && <ChevronDown size={10} className="absolute right-3 top-1/2 -translate-y-1/2 text-current pointer-events-none opacity-50" />}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 bg-slate-50/50 p-4 rounded-2xl border border-slate-100 group-hover:bg-white transition-colors">
                    <div className="space-y-1">
                      <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-1">
                        <Package size={10} /> Mahsulot
                      </p>
                      <p className="text-xs font-bold text-slate-700 truncate">{lead.product_name}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-1">
                        <Calendar size={10} /> Sana
                      </p>
                      <p className="text-xs font-bold text-slate-700">
                        {new Date(lead.created_at).toLocaleDateString()}
                        <span className="text-[10px] text-slate-400 ml-1.5">
                          {new Date(lead.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </p>
                    </div>
                  </div>

                  {lead.message && (
                    <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10 relative">
                      <MessageCircle className="absolute -top-1 -left-1 text-primary/10 w-8 h-8 -rotate-12" />
                      <p className="text-xs text-primary/80 leading-relaxed font-medium transition-all group-hover:text-primary">
                        "{lead.message}"
                      </p>
                    </div>
                  )}

                  {lead.price_info && (
                    <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 py-2 px-3 rounded-xl border border-emerald-100 text-[11px] font-bold">
                      <TrendingUp size={14} />
                      {lead.price_info}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-lg">
                        {getLeadTypeIcon(lead.lead_type)}
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                          {lead.lead_type.toUpperCase()}
                        </span>
                      </div>
                      <div className="text-[10px] font-black text-slate-300 uppercase italic">
                        {lead.company_name || 'Tanla AI Platform'}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleDelete(lead.id)}
                        className="w-10 h-10 bg-rose-50 text-rose-400 hover:bg-rose-500 hover:text-white rounded-xl flex items-center justify-center transition-all duration-300 shadow-sm"
                        title="O'chirish"
                      >
                        <Trash2 size={16} />
                      </button>
                      <a
                        href={`tel:${lead.phone}`}
                        className="w-10 h-10 bg-primary text-white hover:bg-primary-dark rounded-xl flex items-center justify-center transition-all duration-300 shadow-lg shadow-primary/20"
                        title="Qo'ng'iroq qilish"
                      >
                        <Phone size={16} />
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
