import { useEffect, useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  Search, CheckCircle2, XCircle, Clock, 
  Eye, FileText, Building2, Calendar, 
  CreditCard, ExternalLink,
  AlertCircle, MessageSquare
} from 'lucide-react';
import apiClient from '../../api/client';
import { cn } from '../../utils/cn';
import { getMediaUrl } from '../../utils/media';
import type { Payment } from '../../types';

export default function AdminPaymentsPage() {
  const { search: urlSearch } = useLocation();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  
  // Review Modal state
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      
      const { data } = await apiClient.get('admin/payments/', { params });
      const results = data.results ?? data;
      setPayments(results);

      // Auto-open modal if ID is in URL
      const urlParams = new URLSearchParams(urlSearch);
      const paymentId = urlParams.get('id');
      if (paymentId) {
        const p = results.find((item: Payment) => item.id === Number(paymentId));
        if (p) setSelectedPayment(p);
      }
    } catch (err) {
      console.error('Error fetching payments:', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, urlSearch]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const handleApprove = async (id: number, skipConfirm = false) => {
    if (!skipConfirm && !window.confirm("Ushbu to'lovni tasdiqlaysizmi? Kompaniya obunasi uzaytiriladi.")) return;
    
    setSubmitting(true);
    try {
      await apiClient.post(`admin/payments/${id}/approve/`);
      setSelectedPayment(null);
      fetchPayments();
    } catch (err) {
      console.error('Approval error:', err);
      alert("Xatolik yuz berdi.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async (id: number) => {
    if (!rejectionReason.trim()) {
      alert("Iltimos, rad etish sababini yozing.");
      return;
    }
    
    setSubmitting(true);
    try {
      await apiClient.post(`admin/payments/${id}/reject/`, { reason: rejectionReason });
      setSelectedPayment(null);
      setRejectionReason('');
      fetchPayments();
    } catch (err) {
      console.error('Rejection error:', err);
      alert("Xatolik yuz berdi.");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredPayments = payments.filter(p => 
    p.company_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">To'lovlar Boshqaruvi</h1>
          <p className="text-sm text-slate-500 font-medium mt-1">Kompaniya obunalarini va to'lov cheklarini tasdiqlash</p>
        </div>
        
        <div className="flex items-center gap-2 bg-white p-1.5 rounded-[22px] border border-slate-100 shadow-sm">
          {(['pending', 'approved', 'rejected', 'all'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                "px-5 py-2.5 rounded-[18px] text-[11px] font-black uppercase tracking-widest transition-all",
                statusFilter === s 
                  ? "bg-[#0067a5] text-white shadow-lg shadow-blue-900/10" 
                  : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
              )}
            >
              {s === 'all' ? 'Barchasi' : s === 'pending' ? 'Kutilmoqda' : s === 'approved' ? 'Tasdiqlangan' : 'Rad etilgan'}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Quick View */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <div className="bg-white p-7 rounded-[32px] border border-slate-100 shadow-sm flex items-center gap-5 group hover:border-blue-100 transition-colors">
            <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shrink-0">
               <Clock size={24} />
            </div>
            <div>
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Kutilmoqda</p>
               <h3 className="text-2xl font-black text-slate-900">{payments.filter(p => p.status === 'pending').length} ta</h3>
            </div>
         </div>
         <div className="bg-white p-7 rounded-[32px] border border-slate-100 shadow-sm flex items-center gap-5 group hover:border-emerald-100 transition-colors">
            <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shrink-0">
               <CheckCircle2 size={24} />
            </div>
            <div>
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Tasdiqlangan</p>
               <h3 className="text-2xl font-black text-slate-900">{payments.filter(p => p.status === 'approved').length} ta</h3>
            </div>
         </div>
         <div className="bg-white p-7 rounded-[32px] border border-slate-100 shadow-sm flex items-center gap-5 group hover:border-red-100 transition-colors">
            <div className="w-14 h-14 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center shrink-0">
               <XCircle size={24} />
            </div>
            <div>
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Rad etilgan</p>
               <h3 className="text-2xl font-black text-slate-900">{payments.filter(p => p.status === 'rejected').length} ta</h3>
            </div>
         </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
        <div className="relative">
          <input
            type="text"
            placeholder="Kompaniya nomi bo'yicha qidirish..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 border-none rounded-[20px] pl-12 pr-6 py-4 text-sm font-bold focus:ring-2 focus:ring-blue-500/10 transition-all"
          />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
        </div>
      </div>

      {/* Payments Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 border-4 border-[#0067a5] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredPayments.length === 0 ? (
        <div className="bg-white rounded-[40px] py-20 flex flex-col items-center justify-center border border-slate-100 shadow-sm">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-6">
            <CreditCard size={40} />
          </div>
          <h3 className="text-xl font-black text-slate-900">To'lovlar topilmadi</h3>
          <p className="text-slate-400 font-medium mt-1">Qidiruv mezonlarini o'zgartirib ko'ring</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {filteredPayments.map((p) => (
            <div key={p.id} className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all group">
               <div className="flex items-start justify-between mb-8">
                  <div className="flex items-center gap-5">
                     <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-slate-900/10">
                        <Building2 size={24} />
                     </div>
                     <div>
                        <h3 className="text-lg font-black text-slate-900 tracking-tight">{p.company_name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                           <span className={cn(
                             "px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest",
                             p.status === 'approved' ? 'bg-emerald-50 text-emerald-600' : 
                             p.status === 'rejected' ? 'bg-red-50 text-red-600' : 
                             'bg-blue-50 text-blue-600'
                           )}>
                             {p.status === 'pending' ? 'Kutilmoqda' : p.status === 'approved' ? 'Tasdiqlangan' : 'Rad etilgan'}
                           </span>
                           <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">#{p.id}</span>
                        </div>
                     </div>
                  </div>
                  
                  <div className="text-right">
                     <p className="text-xl font-black text-slate-900">{p.amount.toLocaleString()} <span className="text-xs font-medium text-slate-400">uzs</span></p>
                     <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">{p.months} oylik obuna</p>
                  </div>
               </div>

               <div className="grid grid-cols-2 gap-4 mb-8">
                  <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-100 flex items-center gap-3">
                     <Calendar size={16} className="text-slate-400" />
                     <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Sana</p>
                        <p className="text-[11px] font-black text-slate-700">{new Date(p.created_at).toLocaleDateString()}</p>
                     </div>
                  </div>
                  <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-100 flex items-center gap-3">
                     <FileText size={16} className="text-slate-400" />
                     <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Screenshot</p>
                        <p className="text-[11px] font-black text-emerald-600 flex items-center gap-1">
                           Mavjud <CheckCircle2 size={10} />
                        </p>
                     </div>
                  </div>
               </div>

               {p.note && (
                 <div className="mb-8 p-4 bg-blue-50/30 border border-blue-100/50 rounded-2xl flex items-start gap-3">
                    <MessageSquare size={16} className="text-blue-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-blue-700 font-medium leading-relaxed italic">"{p.note}"</p>
                 </div>
               )}

               <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setSelectedPayment(p)}
                    className="flex-1 h-12 bg-slate-900 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                  >
                    <Eye size={16} /> Ko'rib chiqish
                  </button>
                  {p.status === 'pending' && (
                    <button 
                      onClick={() => handleApprove(p.id)}
                      className="h-12 w-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center hover:bg-emerald-100 transition-all shadow-sm"
                      title="Tezda tasdiqlash"
                    >
                      <CheckCircle2 size={20} />
                    </button>
                  )}
               </div>
            </div>
          ))}
        </div>
      )}

      {/* Review Modal */}
      {selectedPayment && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300" onClick={() => !submitting && setSelectedPayment(null)}>
          <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-4xl max-h-[95vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="px-10 py-8 border-b border-slate-100 flex items-center justify-between shrink-0">
               <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
                     <CreditCard size={24} />
                  </div>
                  <div>
                     <h2 className="text-xl font-black text-slate-900 tracking-tight">To'lovni Tasdiqlash</h2>
                     <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">{selectedPayment.company_name} — #{selectedPayment.id}</p>
                  </div>
               </div>
               <button onClick={() => setSelectedPayment(null)} className="w-10 h-10 bg-slate-50 text-slate-400 rounded-full hover:bg-red-50 hover:text-red-500 transition-all flex items-center justify-center">
                  <XCircle size={20} />
               </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-10 grid grid-cols-1 lg:grid-cols-2 gap-10">
               {/* Left: Screenshot */}
               <div className="space-y-4">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">To'lov cheki (Screenshot)</p>
                  <div className="aspect-[3/4] bg-slate-100 rounded-[32px] overflow-hidden border border-slate-200 relative group">
                     {selectedPayment.screenshot ? (
                       <img 
                         src={getMediaUrl(selectedPayment.screenshot)} 
                         alt="Payment Receipt" 
                         className="w-full h-full object-contain bg-slate-900" 
                       />
                     ) : (
                       <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 italic">
                          <AlertCircle size={48} className="mb-4 opacity-20" />
                          <p>Rasm yuklanmagan</p>
                       </div>
                     )}
                     <a 
                       href={getMediaUrl(selectedPayment.screenshot || '')} 
                       target="_blank" 
                       rel="noopener noreferrer"
                       className="absolute bottom-6 right-6 w-12 h-12 bg-white/20 backdrop-blur-md text-white rounded-2xl flex items-center justify-center hover:bg-white/40 transition-all opacity-0 group-hover:opacity-100"
                     >
                        <ExternalLink size={20} />
                     </a>
                  </div>
               </div>

               {/* Right: Info & Actions */}
               <div className="space-y-10">
                  <div className="space-y-6">
                     <div className="p-6 bg-slate-50 rounded-[28px] border border-slate-100">
                        <div className="grid grid-cols-2 gap-8">
                           <div>
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">To'lov Summasi</p>
                              <p className="text-xl font-black text-slate-900">{selectedPayment.amount.toLocaleString()} uzs</p>
                           </div>
                           <div>
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Obuna Davomiyligi</p>
                              <p className="text-xl font-black text-slate-900">{selectedPayment.months} oy</p>
                           </div>
                        </div>
                     </div>

                     {selectedPayment.note && (
                       <div className="p-6 bg-blue-50/40 border border-blue-100/50 rounded-[28px]">
                          <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                             <MessageSquare size={12} /> Foydalanuvchi izohi
                          </p>
                          <p className="text-sm font-medium text-blue-800 leading-relaxed italic">"{selectedPayment.note}"</p>
                       </div>
                     )}
                  </div>

                  {selectedPayment.status === 'pending' ? (
                    <div className="space-y-6">
                       <div className="space-y-3">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Rad etish sababi (faqat rad etilganda)</label>
                          <textarea 
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            placeholder="To'lov summasi noto'g'ri / Rasmda ma'lumotlar ko'rinmayapti..."
                            className="w-full bg-slate-50 border border-slate-100 rounded-3xl px-5 py-4 text-sm font-medium focus:ring-2 focus:ring-red-500/10 transition-all resize-none"
                            rows={3}
                          />
                       </div>

                       <div className="grid grid-cols-2 gap-4">
                          <button 
                            disabled={submitting}
                            onClick={() => handleReject(selectedPayment.id)}
                            className="h-14 bg-white border border-red-100 text-red-600 rounded-[20px] text-[11px] font-black uppercase tracking-widest hover:bg-red-50 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                          >
                            <XCircle size={18} /> Rad etish
                          </button>
                          <button 
                            disabled={submitting}
                            onClick={() => handleApprove(selectedPayment.id, true)}
                            className="h-14 bg-emerald-500 text-white rounded-[20px] text-[11px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
                          >
                            {submitting ? "Yuklanmoqda..." : <><CheckCircle2 size={18} /> Tasdiqlash</>}
                          </button>
                       </div>
                    </div>
                  ) : (
                    <div className="p-8 bg-slate-50 rounded-[32px] border border-slate-100 text-center">
                       <p className="text-sm font-bold text-slate-500 mb-2">To'lov allaqachon ko'rib chiqilgan</p>
                       <div className={cn(
                         "inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest",
                         selectedPayment.status === 'approved' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'
                       )}>
                          {selectedPayment.status === 'approved' ? <><CheckCircle2 size={16} /> Tasdiqlangan</> : <><XCircle size={16} /> Rad etilgan</>}
                       </div>
                       {selectedPayment.rejection_reason && (
                         <p className="mt-4 text-xs text-red-500 font-bold italic">Sabab: {selectedPayment.rejection_reason}</p>
                       )}
                       {selectedPayment.reviewed_at && (
                         <p className="mt-6 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                           {new Date(selectedPayment.reviewed_at).toLocaleString()} da ko'rib chiqildi
                         </p>
                       )}
                    </div>
                  )}
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
