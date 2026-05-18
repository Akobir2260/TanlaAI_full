import React, { useState } from 'react';
import { X, Send, ShoppingBag } from 'lucide-react';
import apiClient from '../api/client';
import { useTelegram } from '../contexts/useTelegram';

export type LeadFormType = 'call' | 'measurement' | 'direct';

interface Props {
  productId: number;
  onClose: () => void;
  leadType: LeadFormType;
  initialPriceInfo?: string;
  widthCm?: number;
  heightCm?: number;
  source?: string;
  sharedId?: string;
  quantity?: number;
  totalPrice?: number;
}

// Per-type copy so we don't branch inside JSX.
// `direct` = AI-free checkout: customer just wants to buy, so we foreground
// that intent with a shopping icon and an order-focused title.
const LEAD_COPY: Record<LeadFormType, { title: string; subtitle: string; cta: string }> = {
  call: {
    title: "Qo'ng'iroq buyurtma qilish",
    subtitle: "Ma'lumotlaringizni kiriting, biz o'zimiz aloqaga chiqamiz.",
    cta: "So'rovni yuborish",
  },
  measurement: {
    title: "O'lchashni buyurtma qilish",
    subtitle: "Ma'lumotlaringizni kiriting, biz o'zimiz aloqaga chiqamiz.",
    cta: "So'rovni yuborish",
  },
  direct: {
    title: "Buyurtma berish",
    subtitle: "Mahsulotni buyurtma qilish uchun ma'lumotlaringizni kiriting.",
    cta: "Buyurtmani tasdiqlash",
  },
};



const LeadForm: React.FC<Props> = ({
  productId, onClose, leadType, initialPriceInfo,
  widthCm, heightCm, source, sharedId, quantity, totalPrice,
}) => {
  const [phone, setPhone] = useState('+998 ');
  const [qty, setQty] = useState(quantity ?? 1);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const { haptic } = useTelegram();

  // Price calculation
  // NOTE: In a production app, we'd fetch the latest product price here.
  // For this UI, we assume price info is passed or we could pass the whole product object.
  // Since we only have productId, we'll try to use totalPrice/quantity props if available.
  const unitPrice = quantity && totalPrice ? totalPrice / quantity : 0;
  const currentTotal = unitPrice > 0 ? unitPrice * qty : 0;

  // Address state — user picks exactly one mode, but we only send whichever is filled.
  const [addressText, setAddressText] = useState('');


  const hasManual = addressText.trim().length > 0;
  const isPhoneValid = phone.replace(/\s/g, '').length >= 12; // +998 + 9 digits
  const canSubmit = !loading && isPhoneValid && hasManual;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setErrorMsg(null);
    haptic('medium');

    try {
      const payload: Record<string, unknown> = {
        product: productId,
        lead_type: leadType,
        phone,
        message: message || "Siz bilan bog'lanishlarini kutmoqda.",
        price_info: initialPriceInfo || "",
        width_cm: widthCm ?? null,
        height_cm: heightCm ?? null,
        source: source || "",
        shared_id: sharedId || null,
        quantity: qty,
        total_price: currentTotal || totalPrice || null,
      };
      if (hasManual) {
        payload.address_text = addressText.trim();
      }

      await apiClient.post('/leads/', payload);
      setSuccess(true);
      setTimeout(onClose, 2000);
    } catch (error: any) {
      console.error('Error sending lead request:', error);
      const data = error.response?.data;
      const msg = data?.address?.[0] 
        || data?.detail 
        || "So'rovni yuborib bo'lmadi. Iltimos, qayta urinib ko'ring.";
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };


  const formatPrice = (p: number) => {
    return p.toLocaleString('ru-RU').replace(/,/g, ' ') + " so'm";
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-end justify-center px-4" onClick={onClose}>
      <div
        className="bg-surface w-full max-w-lg rounded-t-[32px] p-6 pb-12 max-h-[92vh] overflow-y-auto animate-in slide-in-from-bottom duration-300 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-12 h-1.5 bg-outline/20 rounded-full mx-auto mb-6" />

        {success ? (
          <div className="text-center py-10">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              {leadType === 'direct' ? (
                <ShoppingBag className="text-primary" size={32} />
              ) : (
                <Send className="text-primary" size={32} />
              )}
            </div>
            <h3 className="text-xl font-extrabold text-on-surface mb-2">
              {leadType === 'direct' ? "Buyurtma qabul qilindi!" : "Muvaffaqiyatli!"}
            </h3>
            <p className="text-xs text-outline">
              {leadType === 'direct'
                ? "Kompaniya tez orada siz bilan bog'lanadi."
                : "Mutaxassislarimiz tez orada siz bilan bog'lanishadi."}
            </p>
          </div>
        ) : (
          <>
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-start gap-3">
                {leadType === 'direct' && (
                  <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <ShoppingBag size={20} className="text-primary" />
                  </div>
                )}
                <div>
                  <h3 className="text-xl font-extrabold text-on-surface mb-1">
                    {LEAD_COPY[leadType].title}
                  </h3>
                  <p className="text-xs text-outline">{LEAD_COPY[leadType].subtitle}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-surface-variant flex items-center justify-center text-outline"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 pb-4">
              {/* Quantity selector for Direct orders */}
              {leadType === 'direct' && unitPrice > 0 && (
                <div className="bg-primary/5 rounded-2xl p-4 border border-primary/10 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-1">Eshiklar soni</p>
                    <div className="flex items-center gap-4">
                      <button 
                        type="button"
                        onClick={() => { setQty(Math.max(1, qty - 1)); haptic('light'); }}
                        className="w-8 h-8 rounded-full bg-white border border-primary/20 flex items-center justify-center text-primary font-bold shadow-sm"
                      >-</button>
                      <span className="text-lg font-black text-on-surface">{qty}</span>
                      <button 
                        type="button"
                        onClick={() => { setQty(qty + 1); haptic('light'); }}
                        className="w-8 h-8 rounded-full bg-white border border-primary/20 flex items-center justify-center text-primary font-bold shadow-sm"
                      >+</button>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black uppercase tracking-widest text-outline mb-1">Umumiy summa</p>
                    <p className="text-lg font-black text-primary">{formatPrice(currentTotal)}</p>
                  </div>
                </div>
              )}

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-outline ml-1 mb-1.5 block">
                  Telefon raqam
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val.startsWith('+998')) {
                      setPhone(val);
                    } else if (val === '' || val === '+') {
                      setPhone('+998 ');
                    }
                  }}
                  placeholder="+998 90 123 45 67"
                  required
                  className="w-full bg-white border border-outline/10 rounded-2xl py-4 px-5 text-on-surface focus:ring-2 focus:ring-primary/20 outline-none font-bold"
                />
              </div>

              {/* Address picker — only manual */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-outline ml-1 mb-1.5 block">
                  Manzil
                </label>
                <textarea
                  value={addressText}
                  onChange={(e) => setAddressText(e.target.value)}
                  placeholder="Masalan: Toshkent, Chilonzor, 5-kvartal, 12-uy"
                  rows={3}
                  className="w-full bg-white border border-outline/10 rounded-2xl py-4 px-5 text-on-surface focus:ring-2 focus:ring-primary/20 outline-none text-sm font-bold shadow-sm"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-outline ml-1 mb-1.5 block">
                  Izoh (Ixtiyoriy)
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Qulay vaqt yoki o'ziga xos talablaringiz..."
                  rows={2}
                  className="w-full bg-white border border-outline/10 rounded-2xl py-4 px-5 text-on-surface focus:ring-2 focus:ring-primary/20 outline-none text-sm"
                />
              </div>

              {errorMsg && (
                <div className="rounded-2xl border border-error/20 bg-error/10 px-4 py-3 text-xs font-bold text-error">
                  {errorMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={!canSubmit}
                className="w-full bg-primary text-white font-bold py-5 rounded-2xl mt-2 shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? 'Yuborilmoqda...' : LEAD_COPY[leadType].cta}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default LeadForm;
