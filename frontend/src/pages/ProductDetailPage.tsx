import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Heart, User, Calculator, Stars, RefreshCcw, Clock,
  ShoppingBag, Phone, Send, ChevronLeft, Flame, Plus, Minus,
} from 'lucide-react';
import apiClient from '../api/client';
import { getMediaUrl } from '../utils/media';
import type { Product } from '../types';
import { useTelegram } from '../contexts/useTelegram';
import LeadForm, { type LeadFormType } from '../components/LeadForm';

const buildTelegramLink = (v?: string) => {
  if (!v) return null;
  if (v.startsWith('http://') || v.startsWith('https://')) return v;
  return `https://t.me/${v.replace('@', '')}`;
};

const ProductDetailPage: React.FC = () => {
  const { id }    = useParams<{ id: string }>();
  const navigate  = useNavigate();
  const [product,      setProduct]      = useState<Product | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [wishlistBusy, setWishlistBusy] = useState(false);
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [leadType]              = useState<LeadFormType>('call');
  const [calcH, setCalcH] = useState(200);
  const [calcW, setCalcW] = useState(80);
  const [activeImg, setActiveImg] = useState(0);
  const [qty, setQty] = useState(1);
  const touchStartX = useRef<number>(0);
  const { haptic, webApp } = useTelegram();

  useEffect(() => {
    apiClient.get<Product>(`/products/${id}/`)
      .then(res => {
        setProduct(res.data);
        if (res.data.height) setCalcH(Number(res.data.height));
        if (res.data.width)  setCalcW(Number(res.data.width));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { setActiveImg(0); }, [product?.id]);

  const gallery = useMemo(() => {
    if (product?.images?.length) {
      return [...product.images]
        .sort((a, b) => (a.is_main === b.is_main ? 0 : a.is_main ? -1 : 1))
        .map(i => i.image);
    }
    // Fallback: original image (before AI processing) or main image
    const fallback = product?.original_image || product?.image;
    return fallback ? [fallback] : [];
  }, [product]);

  const toggleWishlist = async () => {
    if (!product || wishlistBusy) return;
    setWishlistBusy(true);
    try {
      const res = await apiClient.post<{ status: 'added'|'removed' }>(`/products/${product.id}/toggle_wishlist/`);
      setProduct(p => p ? { ...p, is_wishlisted: res.data.status === 'added' } : p);
      haptic(res.data.status === 'added' ? 'medium' : 'soft');
    } finally { setWishlistBusy(false); }
  };

  const calcTotal = () => {
    if (!product?.price_per_m2) return 0;
    const rate = product.is_on_sale && product.discount_price
      ? Number(product.discount_price) : Number(product.price_per_m2);
    return Math.round((calcH * calcW / 10000) * rate);
  };

  const fmt = (v?: string | null) => v ? `${Number(v).toLocaleString()} so'm` : null;

  if (loading) {
    return (
      <div className="p-4 space-y-4" style={{ background: '#FFFBF6', minHeight: '100vh' }}>
        <style>{`@keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}`}</style>
        {[1,2,3].map(i => (
          <div key={i} className="rounded-[22px]" style={{
            height: i===1 ? '340px' : '80px',
            background: 'linear-gradient(90deg,#f0ede8 25%,#e8e4de 50%,#f0ede8 75%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.4s infinite',
          }} />
        ))}
      </div>
    );
  }

  if (!product) return <div className="p-6 text-center text-[#8A8A99]">Mahsulot topilmadi.</div>;

  const company     = product.company_details;
  const telegramHref = buildTelegramLink(company?.telegram_link);
  const hasSale     = product.is_on_sale && Boolean(product.discount_price);

  const handleCall = () => {
    if (!company?.phone) return;
    haptic('light');
    const uri = `tel:${company.phone}`;
    if (webApp?.openLink) webApp.openLink(uri); else window.location.href = uri;
  };
  const handleTelegram = () => {
    if (!telegramHref) return;
    haptic('light');
    if (webApp?.openLink) webApp.openLink(telegramHref); else window.open(telegramHref, '_blank');
  };

  return (
    <div style={{ background: '#FFFBF6', minHeight: '100vh' }}>
      <style>{`@keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}`}</style>

      {/* Hero Image — swipeable gallery */}
      <div className="relative">
        <div
          className="w-full overflow-hidden select-none"
          style={{ height: '340px', background: '#f5f0eb' }}
          onTouchStart={e => { touchStartX.current = e.touches[0].clientX; }}
          onTouchEnd={e => {
            const dx = e.changedTouches[0].clientX - touchStartX.current;
            if (Math.abs(dx) < 40) return;
            if (dx < 0 && activeImg < gallery.length - 1) { setActiveImg(i => i + 1); haptic('light'); }
            if (dx > 0 && activeImg > 0) { setActiveImg(i => i - 1); haptic('light'); }
          }}
        >
          <img
            src={getMediaUrl(gallery[activeImg]) || getMediaUrl(product.image) || 'https://via.placeholder.com/800'}
            alt={product.name}
            className="w-full h-full object-contain mix-blend-multiply transition-opacity duration-200"
          />
          <div className="absolute bottom-0 left-0 right-0 h-24"
            style={{ background: 'linear-gradient(to top,#FFFBF6,transparent)' }} />

          {/* Back */}
          <button
            onClick={() => navigate(-1)}
            className="absolute top-4 left-4 w-10 h-10 rounded-full flex items-center justify-center active:scale-90 transition-transform"
            style={{ background: 'rgba(255,251,246,0.90)', backdropFilter: 'blur(12px)', boxShadow: '0 2px 12px rgba(0,0,0,0.12)' }}
          >
            <ChevronLeft size={20} color="#1A1A2E" />
          </button>

          {/* Wishlist */}
          <button
            onClick={toggleWishlist}
            disabled={wishlistBusy}
            className="absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center active:scale-90 transition-transform"
            style={{ background: 'rgba(255,251,246,0.90)', backdropFilter: 'blur(12px)', boxShadow: '0 2px 12px rgba(0,0,0,0.12)' }}
          >
            <Heart size={18} className={product.is_wishlisted ? 'fill-[#FF2D55] text-[#FF2D55]' : 'text-[#C0C0CE]'} />
          </button>

          {/* AI badge */}
          {product.ai_status === 'processing' && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1.5 rounded-full text-white text-[10px] font-black uppercase"
              style={{ background: 'rgba(0,150,255,0.88)', backdropFilter: 'blur(8px)' }}>
              <RefreshCcw size={12} className="animate-spin" /> AI ishlayapti
            </div>
          )}

          {/* Badges */}
          <div className="absolute top-4 left-16 flex flex-col gap-1.5">
            {hasSale && (
              <span className="text-white text-[10px] font-black px-2.5 py-1 rounded-full"
                style={{ background: 'linear-gradient(135deg,#FF6B35,#FF2D55)' }}>
                Chegirma
              </span>
            )}
            {product.is_featured && (
              <span className="text-white text-[10px] font-black px-2.5 py-1 rounded-full flex items-center gap-1"
                style={{ background: '#FFB800' }}>
                <Flame size={9} className="fill-white" /> TOP
              </span>
            )}
          </div>

          {/* Dot indicators */}
          {gallery.length > 1 && (
            <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-1.5">
              {gallery.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImg(i)}
                  className="transition-all duration-300 rounded-full"
                  style={{
                    width: activeImg === i ? '20px' : '6px',
                    height: '6px',
                    background: activeImg === i ? '#FF6B35' : 'rgba(255,255,255,0.6)',
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Thumbnail strip (tap to jump) */}
        {gallery.length > 1 && (
          <div className="flex gap-2 overflow-x-auto no-scrollbar px-4 pb-2 mt-3">
            {gallery.map((src, i) => (
              <button
                key={i}
                onClick={() => setActiveImg(i)}
                className="flex-shrink-0 w-[58px] h-[58px] rounded-[14px] overflow-hidden active:scale-90 transition-transform"
                style={{
                  border: activeImg === i ? '2.5px solid #FF6B35' : '2px solid transparent',
                  boxShadow: activeImg === i ? '0 4px 12px rgba(255,107,53,0.28)' : '0 2px 8px rgba(0,0,0,0.06)',
                  background: '#f5f0eb',
                }}
              >
                <img src={getMediaUrl(src)} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="px-4 pt-4 pb-40 space-y-4">
        <div>
          <p className="text-[11px] font-black uppercase tracking-widest text-[#FF6B35] mb-1">{product.category_name}</p>
          <h1 className="text-[22px] font-black text-[#1A1A2E] leading-tight tracking-tight">{product.name}</h1>
        </div>

        {/* Price + Quantity */}
        <div
          className="p-4 rounded-[20px] space-y-3"
          style={{ background: hasSale ? 'rgba(255,107,53,0.06)' : '#fff', boxShadow: '0 4px 16px rgba(26,26,46,0.06)' }}
        >
          {/* Price row */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-[#B0B0BF] mb-1">Narx</p>
              {(() => {
                const basePrice = product.price ?? product.price_per_m2 ?? 0;
                const hasActualPrice = Boolean(product.price || product.price_per_m2);

                if (hasActualPrice) {
                  return (
                    <>
                      <p className="text-[24px] font-black leading-none" style={{ color: hasSale ? '#FF6B35' : '#1A1A2E' }}>
                        {fmt(hasSale ? product.discount_price : basePrice.toString())}
                        {!product.price && product.price_per_m2 ? ' / m²' : ''}
                      </p>
                      {hasSale && <p className="text-[12px] text-[#C0C0CE] line-through mt-0.5">{fmt(basePrice.toString())}{!product.price && product.price_per_m2 ? ' / m²' : ''}</p>}
                    </>
                  );
                } else {
                  return <p className="text-[18px] font-black text-[#8A8A99]">Kelishilgan narx</p>;
                }
              })()}
            </div>
            {hasSale && (product.price || product.price_per_m2) && product.discount_price && (
              <div className="w-14 h-14 rounded-[18px] flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg,#FF6B35,#FF2D55)', boxShadow: '0 6px 18px rgba(255,107,53,0.32)' }}>
                <div className="text-center">
                  <p className="text-white text-[9px] font-black leading-none">MINUS</p>
                  <p className="text-white text-[16px] font-black leading-none mt-0.5">
                    {Math.round((1 - Number(product.discount_price)/Number(product.price ?? product.price_per_m2))*100)}%
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Quantity selector — only for fixed-price products */}
          {product.price && (
            <div className="flex items-center justify-between pt-1 border-t border-[rgba(26,26,46,0.07)]">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-[#B0B0BF]">Miqdor</p>
                {qty > 1 && (
                  <p className="text-[13px] font-black mt-0.5" style={{ color: '#FF6B35' }}>
                    Jami: {(Number(hasSale ? product.discount_price : product.price) * qty).toLocaleString()} so'm
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => { setQty(q => Math.max(1, q - 1)); haptic('light'); }}
                  disabled={qty <= 1}
                  className="w-9 h-9 rounded-full flex items-center justify-center active:scale-90 transition-transform disabled:opacity-30"
                  style={{ background: 'rgba(26,26,46,0.06)' }}
                >
                  <Minus size={14} color="#1A1A2E" />
                </button>
                <span className="text-[20px] font-black text-[#1A1A2E] min-w-[24px] text-center">{qty}</span>
                <button
                  onClick={() => { setQty(q => q + 1); haptic('light'); }}
                  className="w-9 h-9 rounded-full flex items-center justify-center active:scale-90 transition-transform"
                  style={{ background: 'linear-gradient(135deg,#FF6B35,#FF2D55)', boxShadow: '0 4px 12px rgba(255,107,53,0.30)' }}
                >
                  <Plus size={14} color="white" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Lead time */}
        {product.lead_time_days && (
          <div className="flex items-center gap-3 p-4 rounded-[18px]"
            style={{ background: 'rgba(0,201,177,0.07)', border: '1.5px solid rgba(0,201,177,0.18)' }}>
            <div className="w-10 h-10 rounded-[14px] flex items-center justify-center"
              style={{ background: 'rgba(0,201,177,0.15)' }}>
              <Clock size={18} color="#00C9B1" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-[#00A896]">Tayyor bo'lishi</p>
              <p className="text-[15px] font-black text-[#1A1A2E]">{product.lead_time_days} ish kuni</p>
            </div>
          </div>
        )}

        {/* Description */}
        {product.description && (
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-[#B0B0BF] mb-2">Tavsif</p>
            <p className="text-[14px] text-[#4A4A5A] leading-relaxed font-medium">{product.description}</p>
          </div>
        )}

        {/* Calculator */}
        {product.price_per_m2 && (
          <div className="p-5 rounded-[20px] space-y-4"
            style={{ background: 'rgba(255,107,53,0.05)', border: '1.5px solid rgba(255,107,53,0.12)' }}>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: 'rgba(255,107,53,0.12)' }}>
                <Calculator size={15} color="#FF6B35" />
              </div>
              <p className="text-[12px] font-black uppercase tracking-widest text-[#FF6B35]">Narx Hisoblagichi</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Balandlik (sm)', val: calcH, set: setCalcH },
                { label: 'Kenglik (sm)',   val: calcW, set: setCalcW },
              ].map(({ label, val, set }) => (
                <div key={label}>
                  <p className="text-[10px] font-bold text-[#B0B0BF] uppercase tracking-wider mb-1.5">{label}</p>
                  <input
                    type="number"
                    value={val}
                    onChange={e => set(Number(e.target.value))}
                    className="w-full rounded-[14px] px-4 py-3 text-[14px] font-black text-[#1A1A2E] outline-none"
                    style={{ background: '#fff', border: '1.5px solid rgba(255,107,53,0.15)' }}
                  />
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between px-4 py-3 rounded-[16px]"
              style={{ background: 'linear-gradient(135deg,#FF6B35,#FF2D55)', boxShadow: '0 6px 20px rgba(255,107,53,0.28)' }}>
              <div>
                <p className="text-white/70 text-[9px] font-black uppercase tracking-widest">Taxminiy summa</p>
                <p className="text-white text-[20px] font-black leading-tight">{calcTotal().toLocaleString()} so'm</p>
              </div>
              <div className="text-right">
                <p className="text-white/60 text-[9px] font-black uppercase">Narx / m2</p>
                <p className="text-white text-[12px] font-black">
                  {Number(hasSale ? product.discount_price : product.price_per_m2).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Company */}
        {company && (
          <button
            onClick={() => navigate(`/company/${company.id}`)}
            className="w-full flex items-center justify-between p-4 rounded-[20px] active:scale-[0.97] transition-transform text-left"
            style={{ background: '#fff', boxShadow: '0 4px 16px rgba(26,26,46,0.07)' }}
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-[14px] overflow-hidden bg-[#f5f0eb] flex items-center justify-center">
                {company.logo
                  ? <img src={getMediaUrl(company.logo)} alt="Logo" className="w-full h-full object-cover" />
                  : <User size={22} color="#C0C0CE" />
                }
              </div>
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-[#B0B0BF]">Studiya</p>
                <p className="text-[15px] font-black text-[#1A1A2E]">{company.name}</p>
              </div>
            </div>
            <span className="text-[9px] font-black uppercase tracking-tighter px-2.5 py-1 rounded-full text-white"
              style={{ background: 'rgba(0,201,177,0.85)' }}>
              Tasdiqlangan
            </span>
          </button>
        )}
      </div>

      {/* Sticky CTA Bar */}
      <div
        className="fixed bottom-0 left-0 right-0 z-[10000] px-4 py-3 space-y-2.5"
        style={{
          background: 'rgba(255,251,246,0.97)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderTop: '1px solid rgba(26,26,46,0.07)',
          paddingBottom: 'calc(0.75rem + var(--sab))',
        }}
      >
        <button
          onClick={() => { navigate(`/product/${product.id}/order?qty=${qty}`); haptic('medium'); }}
          className="w-full flex items-center justify-center gap-2.5 py-4 rounded-[18px] text-[15px] font-black text-white active:scale-[0.97] transition-transform"
          style={{ background: 'linear-gradient(135deg,#FF6B35,#FF2D55)', boxShadow: '0 8px 28px rgba(255,107,53,0.35)' }}
        >
          <ShoppingBag size={18} className="fill-white" />
          Buyurtma berish
        </button>

        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={handleCall}
            disabled={!company?.phone}
            className="flex items-center justify-center gap-1.5 py-3 rounded-[14px] text-[12px] font-black text-white active:scale-95 transition-transform disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg,#00C9B1,#00A896)', boxShadow: '0 4px 14px rgba(0,201,177,0.28)' }}
          >
            <Phone size={14} className="fill-white" />
            Qo'ng'iroq
          </button>
          <button
            onClick={handleTelegram}
            disabled={!telegramHref}
            className="flex items-center justify-center gap-1.5 py-3 rounded-[14px] text-[12px] font-black text-white active:scale-95 transition-transform disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg,#1DA1F2,#0078D4)', boxShadow: '0 4px 14px rgba(29,161,242,0.28)' }}
          >
            <Send size={14} />
            Telegram
          </button>
          <button
            onClick={() => { navigate(`/product/${product.id}/visualize`); haptic('medium'); }}
            className="flex items-center justify-center gap-1.5 py-3 rounded-[14px] text-[12px] font-black text-white active:scale-95 transition-transform"
            style={{ background: 'linear-gradient(135deg,#8B5CF6,#6D28D9)', boxShadow: '0 4px 14px rgba(109,40,217,0.28)' }}
          >
            <Stars size={14} />
            AI
          </button>
        </div>
      </div>

      {showLeadForm && (
        <LeadForm
          productId={product.id}
          leadType={leadType}
          initialPriceInfo={
            product.price_per_m2
              ? `${calcH}x${calcW} sm - ${calcTotal().toLocaleString()} so'm`
              : product.price && qty > 1
                ? `${qty} dona × ${Number(product.price).toLocaleString()} so'm`
                : ''
          }
          widthCm={product.price_per_m2 ? calcW : undefined}
          heightCm={product.price_per_m2 ? calcH : undefined}
          quantity={product.price ? qty : undefined}
          totalPrice={
            product.price
              ? Number(product.price) * qty
              : product.price_per_m2 ? calcTotal() : undefined
          }
          onClose={() => setShowLeadForm(false)}
        />
      )}
    </div>
  );
};

export default ProductDetailPage;
