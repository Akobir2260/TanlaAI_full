import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Upload, 
  ChevronLeft, 
  CheckCircle2, 
  Clock, 
  ShieldCheck, 
  Copy,
} from 'lucide-react';
import apiClient from '../api/client';
import { useTelegram } from '../contexts/useTelegram';
import { cn } from '../utils/cn';

const SubscriptionPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const { haptic, profile, refreshProfile } = useTelegram();
  const [preview, setPreview] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [billingInfo, setBillingInfo] = useState<{ monthly_price: number; card_number: string; card_holder: string } | null>(null);

  useEffect(() => {
    // If company is already active or is VIP, go to dashboard
    if (profile?.has_company && profile?.role === 'COMPANY') {
      if (profile.company_status === 'active' || profile.company_is_vip) {
        navigate('/creator', { replace: true });
        return;
      }
      
      // If already submitted, show success view
      if (profile.company_status === 'waiting_confirmation' || profile.company_status === 'review') {
        setSubmitted(true);
      }
    }

    // Fetch billing info
    apiClient.get('/system-billing/')
      .then(res => setBillingInfo(res.data))
      .catch(err => console.error("Billing fetch error:", err));
  }, [profile, navigate]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setScreenshot(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text.replace(/\s/g, ''));
    haptic('light');
    // alert("Nusxa olindi!");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!screenshot || !billingInfo) return;

    setLoading(true);
    haptic('medium');

    try {
      const fd = new FormData();
      fd.append('amount', billingInfo.monthly_price.toString());
      fd.append('months', '1');
      fd.append('screenshot', screenshot);
      fd.append('note', note);

      await apiClient.post('/payments/', fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setSubmitted(true);
      haptic('heavy');
      await refreshProfile();
    } catch (error: any) {
      console.error('Payment error:', error);
      const detail = error.response?.data?.detail || error.response?.data?.message || "Xatolik yuz berdi. Iltimos qayta urinib ko'ring.";
      alert(detail);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center" style={{ background: '#FFFBF6' }}>
        <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mb-6 text-emerald-600 animate-bounce">
          <CheckCircle2 size={48} />
        </div>
        <h1 className="text-2xl font-black text-slate-800 mb-3">To'lov qabul qilindi!</h1>
        <p className="text-slate-500 font-medium mb-8 leading-relaxed">
          Sizning to'lovingiz ko'rib chiqilmoqda. Admin tasdiqlashi bilan do'koningiz faollashadi (odatda 1 soat ichida).
        </p>
        <button
          onClick={() => navigate('/profile')}
          className="w-full h-14 bg-slate-900 text-white rounded-2xl font-bold active:scale-95 transition-all"
        >
          Profilga qaytish
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24" style={{ background: '#FFFBF6' }}>
      {/* Header */}
      <div className="bg-white px-4 py-4 flex items-center justify-between border-b border-slate-100 sticky top-0 z-10">
        <button 
          onClick={() => { haptic('light'); navigate(-1); }}
          className="w-10 h-10 flex items-center justify-center text-slate-600 bg-slate-50 rounded-full active:scale-95 transition-all"
        >
          <ChevronLeft size={22} />
        </button>
        <span className="font-bold text-[17px] text-slate-800">Obuna bo'lish</span>
        <div className="w-10"></div>
      </div>

      <div className="p-5 space-y-6 max-w-xl mx-auto">
        {/* Intro Card */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-[32px] p-6 text-white relative overflow-hidden shadow-xl shadow-slate-200">
           <div className="absolute -right-4 -top-4 w-32 h-32 bg-white/5 rounded-full blur-2xl" />
           <div className="relative z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-[10px] font-bold uppercase tracking-widest mb-4">
                 <ShieldCheck size={12} className="text-emerald-400" />
                 Premium Sotuvchi
              </div>
              <h2 className="text-2xl font-black mb-2">Do'konni faollashtirish</h2>
              <p className="text-slate-300 text-sm font-medium leading-relaxed mb-6">
                Mahsulot qo'shish va sotishni boshlash uchun 1 oylik obunani faollashtiring.
              </p>
              
              <div className="flex items-baseline gap-1">
                 <span className="text-4xl font-black">{billingInfo?.monthly_price?.toLocaleString() || "..."}</span>
                 <span className="text-slate-400 font-bold">so'm / oy</span>
              </div>
           </div>
        </div>

        {/* Payment Steps */}
        <div className="space-y-4">
           <div className="flex items-center gap-3 ml-1">
              <div className="w-6 h-6 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-xs font-black">1</div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">To'lov ma'lumotlari</h3>
           </div>

           <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-5">
              <div className="space-y-1.5">
                 <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Karta raqami</label>
                 <div className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <span className="text-[15px] font-black text-slate-800 tracking-wider">{billingInfo?.card_number || ".... .... .... ...."}</span>
                    <button onClick={() => billingInfo && copyToClipboard(billingInfo.card_number)} className="text-orange-600 active:scale-90 transition-transform">
                       <Copy size={20} />
                    </button>
                 </div>
              </div>

              <div className="flex gap-4">
                 <div className="flex-1 space-y-1.5">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Ega</label>
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-[13px] font-bold text-slate-800">
                       {billingInfo?.card_holder || "—"}
                    </div>
                 </div>
                 <div className="w-1/3 space-y-1.5">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Turi</label>
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-[13px] font-bold text-slate-800 flex items-center gap-2">
                       <div className="w-4 h-2 bg-slate-300 rounded-sm" /> Uzcard
                    </div>
                 </div>
              </div>
           </div>
        </div>

        <div className="space-y-4 pt-2">
           <div className="flex items-center gap-3 ml-1">
              <div className="w-6 h-6 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-xs font-black">2</div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">To'lovni tasdiqlash</h3>
           </div>

           <form onSubmit={handleSubmit} className="space-y-4">
              <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-5">
                 <label className="block space-y-3 cursor-pointer">
                    <span className="block text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">To'lov cheki (skrinshot) *</span>
                    <div className={cn(
                      "w-full aspect-video rounded-2xl border-2 border-dashed flex flex-col items-center justify-center transition-all overflow-hidden relative",
                      preview ? "border-emerald-200 bg-emerald-50/10" : "border-slate-200 bg-slate-50 hover:border-orange-300 hover:bg-orange-50/20"
                    )}>
                       {preview ? (
                         <>
                           <img src={preview} alt="Receipt" className="w-full h-full object-cover" />
                           <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                              <Upload className="text-white" />
                           </div>
                         </>
                       ) : (
                         <>
                           <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-slate-400 mb-2">
                              <Upload size={24} />
                           </div>
                           <p className="text-[13px] font-bold text-slate-500">Rasm yuklash</p>
                           <p className="text-[10px] text-slate-400 mt-1 font-medium italic">Click, Payme yoki bank ilovasidan chek</p>
                         </>
                       )}
                    </div>
                    <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                 </label>

                 <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Izoh (ixtiyoriy)</label>
                    <textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Qo'shimcha ma'lumotlar..."
                      className="w-full p-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-orange-500 text-[14px] font-medium text-slate-800 min-h-[100px] resize-none"
                    />
                 </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-orange-50 rounded-2xl border border-orange-100/50">
                 <Clock size={20} className="text-orange-600 shrink-0 mt-0.5" />
                 <p className="text-[12px] text-orange-900 leading-relaxed font-medium">
                    To'lov yuborilgandan so'ng 1 soat ichida admin tomonidan tekshiriladi. Natija haqida bildirishnoma olasiz.
                 </p>
              </div>

              <button
                type="submit"
                disabled={loading || !screenshot}
                className={cn(
                  "w-full h-14 flex items-center justify-center rounded-[20px] text-[15px] font-black uppercase tracking-wider transition-all shadow-xl shadow-slate-200",
                  screenshot && !loading ? "bg-slate-900 text-white active:scale-[0.98]" : "bg-slate-200 text-slate-400 cursor-not-allowed"
                )}
              >
                {loading ? "Yuborilmoqda..." : "Tasdiqlash uchun yuborish"}
              </button>
           </form>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionPage;
