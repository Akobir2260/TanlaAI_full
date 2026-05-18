import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { 
  ChevronLeft, ShoppingBag, Plus, Minus, MapPin, 
  CheckCircle2, Loader2, Phone, Send, Info
} from 'lucide-react';
import apiClient from '../api/client';
import { getMediaUrl } from '../utils/media';
import { useTelegram } from '../contexts/useTelegram';
import type { Product } from '../types';

const OrderPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { haptic } = useTelegram();

  // Parse initial state from nav extras if available
  const queryParams = new URLSearchParams(location.search);
  const initialQty = parseInt(queryParams.get('qty') || '1');
  const initialAiId = queryParams.get('ai_id');

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState(initialQty);
  const [phone, setPhone] = useState('+998 ');
  const [message, setMessage] = useState('');
  const [addressText, setAddressText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    apiClient.get<Product>(`/products/${id}/`)
      .then(res => setProduct(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  // Phone formatting: +998 90 123 45 67
  const formatPhone = (val: string) => {
    let digits = val.replace(/\D/g, '');
    if (!digits.startsWith('998')) digits = '998' + digits;
    digits = digits.substring(0, 12); // max 12 digits
    
    let formatted = '+';
    if (digits.length > 0) formatted += digits.substring(0, 3);
    if (digits.length > 3) formatted += ' ' + digits.substring(3, 5);
    if (digits.length > 5) formatted += ' ' + digits.substring(5, 8);
    if (digits.length > 8) formatted += ' ' + digits.substring(8, 10);
    if (digits.length > 10) formatted += ' ' + digits.substring(10, 12);
    
    return formatted;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    // Don't allow deleting the prefix entirely
    if (val.length < 5) {
      setPhone('+998 ');
      return;
    }
    setPhone(formatPhone(val));
  };


  const handleSubmit = async () => {
    if (!product || submitting) return;
    
    const phoneDigits = phone.replace(/\D/g, '');
    if (phoneDigits.length < 12) {
      alert("Iltimos, telefon raqamingizni to'liq kiriting.");
      return;
    }

    if (!addressText.trim()) {
      alert("Iltimos, manzilni kiriting.");
      return;
    }

    setSubmitting(true);
    haptic('medium');

    try {
      const basePrice = product.price ?? product.price_per_m2 ?? 0;
      const price = product.is_on_sale && product.discount_price 
        ? Number(product.discount_price) 
        : Number(basePrice);
        
      await apiClient.post('/leads/', {
        product: product.id,
        lead_type: 'direct',
        phone: phone.replace(/\s/g, ''),
        message: message || "Siz bilan bog'lanishlarini kutmoqda.",
        quantity: qty,
        total_price: price * qty,
        latitude: null,
        longitude: null,
        address_text: addressText,
        ai_result: initialAiId || null
      });

      setSuccess(true);
      haptic('heavy');
      setTimeout(() => navigate('/'), 3000);
    } catch (err: any) {
      console.error(err);
      const errMsg = err.response?.data?.address?.[0] 
        || err.response?.data?.detail 
        || "Xatolik yuz berdi. Iltimos qayta urinib ko'ring.";
      alert(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-10 text-center">Yuklanmoqda...</div>;
  if (!product) return <div className="p-10 text-center">Mahsulot topilmadi.</div>;

  const basePrice = product.price ?? product.price_per_m2 ?? 0;
  const unitPrice = product.is_on_sale && product.discount_price 
    ? Number(product.discount_price) 
    : Number(basePrice);
  const totalPrice = unitPrice * qty;

  return (
    <div className="min-h-screen bg-[#FFFBF6] pb-32">
      {/* Header */}
      <div className="px-4 pt-4 pb-2 flex items-center gap-4">
        <button 
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-full flex items-center justify-center bg-white shadow-sm"
        >
          <ChevronLeft size={20} color="#1A1A2E" />
        </button>
        <h1 className="text-xl font-black text-[#1A1A2E]">Buyurtma berish</h1>
      </div>

      {success ? (
        <div className="px-6 py-20 text-center animate-in zoom-in duration-500">
           <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-200">
             <CheckCircle2 size={40} color="white" />
           </div>
           <h2 className="text-2xl font-black text-[#1A1A2E] mb-2">Buyurtma qabul qilindi!</h2>
           <p className="text-[#8A8A99] font-medium">Kompaniya vakili tez orada siz bilan bog'lanadi.</p>
           <button 
             onClick={() => navigate('/')}
             className="mt-10 px-8 py-3 bg-[#1A1A2E] text-white rounded-full font-bold"
           >
             Asosiy sahifaga qaytish
           </button>
        </div>
      ) : (
        <div className="px-4 mt-6 space-y-6">
          {/* Product Summary */}
          <div className="bg-white p-4 rounded-[24px] shadow-sm border border-[#f0ede8] flex gap-4">
            <div className="w-24 h-24 rounded-[18px] overflow-hidden bg-[#f5f0eb]">
              <img src={getMediaUrl(product.image)} alt="" className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 flex flex-col justify-center">
              <p className="text-[10px] font-black uppercase tracking-widest text-[#FF6B35] mb-0.5">Mahsulot</p>
              <h3 className="text-[17px] font-black text-[#1A1A2E] leading-tight mb-1">{product.name}</h3>
              <p className="text-[15px] font-bold text-[#FF6B35]">{unitPrice.toLocaleString()} so'm</p>
            </div>
          </div>

          {/* Quantity selector */}
          <div className="bg-white p-5 rounded-[24px] shadow-sm border border-[#f0ede8] space-y-4">
            <div className="flex items-center justify-between">
               <div>
                 <p className="text-[11px] font-black uppercase tracking-widest text-[#B0B0BF] mb-1">Miqdor</p>
                 <div className="flex items-center gap-4">
                   <button 
                    onClick={() => { setQty(q => Math.max(1, q-1)); haptic('light'); }}
                    className="w-10 h-10 rounded-full bg-[#f5f0eb] flex items-center justify-center font-black text-xl"
                   >
                     <Minus size={18} />
                   </button>
                   <span className="text-xl font-black">{qty}</span>
                   <button 
                    onClick={() => { setQty(q => q+1); haptic('light'); }}
                    className="w-10 h-10 rounded-full bg-[#FF6B35] text-white flex items-center justify-center font-black text-xl"
                   >
                     <Plus size={18} />
                   </button>
                 </div>
               </div>
               <div className="text-right">
                 <p className="text-[11px] font-black uppercase tracking-widest text-[#B0B0BF] mb-1">Umumiy summa</p>
                 <p className="text-xl font-black text-[#1A1A2E]">{totalPrice.toLocaleString()} so'm</p>
               </div>
            </div>
            {qty > 1 && (
              <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-xl text-blue-600 text-[11px] font-bold">
                 <Info size={14} />
                 <span>Siz {qty} dona mahsulotni tanladingiz</span>
              </div>
            )}
          </div>

          {/* Form */}
          <div className="space-y-4">
            {/* Phone */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-black uppercase tracking-widest text-[#B0B0BF] ml-2">Telefon raqamingiz</label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#1A1A2E]">
                  <Phone size={18} />
                </div>
                <input 
                  type="tel"
                  value={phone}
                  onChange={handlePhoneChange}
                  className="w-full bg-white border border-[#f0ede8] rounded-[20px] py-4 pl-12 pr-4 text-lg font-black text-[#1A1A2E] outline-none shadow-sm focus:border-[#FF6B35] transition-colors"
                  placeholder="+998 00 000 00 00"
                />
              </div>
            </div>

            {/* Address */}
            <div className="space-y-1.5">
               <label className="text-[11px] font-black uppercase tracking-widest text-[#B0B0BF] ml-2">Yetkazib berish manzili</label>
               <div className="relative">
                  <div className="absolute left-4 top-4 text-[#C0C0CE]">
                     <MapPin size={18} />
                  </div>
                  <textarea 
                    value={addressText}
                    onChange={(e) => setAddressText(e.target.value)}
                    className="w-full bg-white border border-[#f0ede8] rounded-[20px] py-4 pl-12 pr-4 min-h-[100px] text-sm font-bold text-[#1A1A2E] outline-none shadow-sm focus:border-[#FF6B35] transition-colors"
                    placeholder="Tuman, ko'cha, uy raqami..."
                  />
               </div>
            </div>

            {/* Comment */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-black uppercase tracking-widest text-[#B0B0BF] ml-2">Qo'shimcha izoh (Ixtiyoriy)</label>
              <div className="relative">
                <div className="absolute left-4 top-4 text-[#C0C0CE]">
                  <Send size={18} />
                </div>
                <textarea 
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full bg-white border border-[#f0ede8] rounded-[20px] py-4 pl-12 pr-4 min-h-[80px] text-sm font-bold text-[#1A1A2E] outline-none shadow-sm focus:border-[#FF6B35] transition-colors"
                  placeholder="Xabaringizni yozing..."
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Fixed bottom bar */}
      {!success && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-xl border-t border-[#f0ede8] flex items-center gap-4 z-[1000]">
           <div className="flex-1">
              <p className="text-[10px] font-black uppercase text-[#B0B0BF] leading-none">Jami summa</p>
              <p className="text-xl font-black text-[#1A1A2E] tracking-tight">{totalPrice.toLocaleString()} so'm</p>
           </div>
           <button 
             onClick={handleSubmit}
             disabled={submitting}
             className="flex-[1.5] py-4 rounded-[20px] bg-gradient-to-r from-[#FF6B35] to-[#FF2D55] text-white font-black flex items-center justify-center gap-2 shadow-lg shadow-[#FF6B35]/25 active:scale-[0.97] transition-all disabled:opacity-50"
           >
             {submitting ? <Loader2 size={20} className="animate-spin" /> : <ShoppingBag size={20} className="fill-white" />}
             <span>Buyurtmani tasdiqlash</span>
           </button>
        </div>
      )}
    </div>
  );
};

export default OrderPage;
