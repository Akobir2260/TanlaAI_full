import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, CheckCircle2, Sparkles, ChevronRight } from 'lucide-react';
import apiClient from '../api/client';
import { getMediaUrl } from '../utils/media';
import type { Product } from '../types';
import { useTelegram } from '../contexts/useTelegram';

const VisualizePickerPage: React.FC = () => {
  const navigate = useNavigate();
  const { haptic } = useTelegram();

  const [roomFile, setRoomFile] = useState<File | null>(null);
  const [roomPreview, setRoomPreview] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);

  // Load featured / recent products (max 4)
  useEffect(() => {
    apiClient.get<Product[]>('/products/?is_featured=true')
      .then(res => {
        const featured = res.data.slice(0, 4);
        if (featured.length < 4) {
          apiClient.get<Product[]>('/products/').then(r => {
            const extra = r.data.filter(p => !featured.find(f => f.id === p.id));
            setProducts([...featured, ...extra].slice(0, 4));
          });
        } else {
          setProducts(featured);
        }
      })
      .catch(() => apiClient.get<Product[]>('/products/').then(r => setProducts(r.data.slice(0, 4))))
      .finally(() => setLoading(false));
  }, []);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setRoomFile(f);
    setRoomPreview(URL.createObjectURL(f));
    haptic('light');
  };

  const handleStart = () => {
    if (!selected) return;
    haptic('medium');
    // Store the room image in sessionStorage for the AI page to pick up
    if (roomFile) {
      const reader = new FileReader();
      reader.onload = () => {
        try { sessionStorage.setItem('visualizer_room_b64', reader.result as string); } catch { /* storage unavailable */ }
        navigate(`/product/${selected}/visualize`);
      };
      reader.readAsDataURL(roomFile);
    } else {
      navigate(`/product/${selected}/visualize`);
    }
  };

  const canStart = selected !== null;

  return (
    <div className="min-h-screen pb-36" style={{ background: '#FFFBF6', fontFamily: 'Manrope, sans-serif' }}>

      {/* Header */}
      <div className="px-5 pt-6 pb-4">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest mb-3"
          style={{ background: 'rgba(0,201,177,0.12)', color: '#00A896' }}>
          <Sparkles size={11} /> AI Visualizer
        </div>
        <h1 className="text-[24px] font-black text-[#1A1A2E] leading-tight tracking-tight">
          Xonangizga mahsulotni<br />virtual o'rnating
        </h1>
        <p className="text-[13px] text-[#8A8A99] font-medium mt-1.5">
          Xona rasmini yuklang va mahsulot variantini tanlang
        </p>
      </div>

      {/* STEP 1 — Room image */}
      <div className="px-4 mb-5">
        <p className="text-[10px] font-black uppercase tracking-widest text-[#B0B0BF] mb-2 ml-1">
          1-qadam — Xona rasmi
        </p>
        <div
          onClick={() => fileRef.current?.click()}
          className="relative w-full rounded-[24px] overflow-hidden cursor-pointer active:scale-[0.98] transition-transform"
          style={{
            height: '200px',
            background: roomPreview ? 'transparent' : 'rgba(255,107,53,0.05)',
            border: roomPreview ? 'none' : '2px dashed rgba(255,107,53,0.25)',
          }}
        >
          {roomPreview ? (
            <>
              <img src={roomPreview} alt="Xona" className="w-full h-full object-cover" />
              <div className="absolute inset-0" style={{ background: 'linear-gradient(to top,rgba(0,0,0,0.45),transparent)' }} />
              {/* Badge */}
              <div className="absolute bottom-3 left-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-white text-[10px] font-black"
                style={{ background: 'rgba(0,0,0,0.50)', backdropFilter: 'blur(8px)' }}>
                <CheckCircle2 size={11} className="text-green-400" />
                Rasm tanlandi — o'zgartirish uchun bosing
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <div className="w-16 h-16 rounded-[20px] flex items-center justify-center"
                style={{ background: 'rgba(255,107,53,0.10)' }}>
                <Camera size={28} color="#FF6B35" />
              </div>
              <div className="text-center">
                <p className="text-[14px] font-black text-[#1A1A2E]">Xona rasmini yuklang</p>
                <p className="text-[11px] text-[#B0B0BF] mt-0.5">Ixtiyoriy — keyin ham qo'shish mumkin</p>
              </div>
            </div>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      </div>

      {/* STEP 2 — Product picker */}
      <div className="px-4 mb-4">
        <p className="text-[10px] font-black uppercase tracking-widest text-[#B0B0BF] mb-3 ml-1">
          2-qadam — Mahsulot tanlang
        </p>

        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {[1,2,3,4].map(i => (
              <div key={i} className="rounded-[20px] overflow-hidden"
                style={{ height: '170px', background: 'linear-gradient(90deg,#f0ede8 25%,#e8e4de 50%,#f0ede8 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite' }} />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-10 text-[#B0B0BF] text-[13px] font-bold">
            Mahsulotlar topilmadi
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {products.map(p => {
              const isActive = selected === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => { setSelected(p.id); haptic('light'); }}
                  className="text-left rounded-[20px] overflow-hidden flex flex-col active:scale-[0.97] transition-transform"
                  style={{
                    background: '#fff',
                    boxShadow: isActive
                      ? '0 0 0 2.5px #FF6B35, 0 8px 24px rgba(255,107,53,0.22)'
                      : '0 4px 16px rgba(26,26,46,0.07)',
                  }}
                >
                  <div className="relative" style={{ height: '120px', background: '#f5f0eb' }}>
                    <img
                      src={getMediaUrl(p.image) || 'https://via.placeholder.com/300'}
                      alt={p.name}
                      className="w-full h-full object-cover"
                    />
                    {isActive && (
                      <div className="absolute inset-0 flex items-center justify-center"
                        style={{ background: 'rgba(255,107,53,0.18)' }}>
                        <div className="w-9 h-9 rounded-full flex items-center justify-center"
                          style={{ background: '#FF6B35' }}>
                          <CheckCircle2 size={18} className="text-white" />
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="p-3 flex-1">
                    <p className="text-[12px] font-black text-[#1A1A2E] line-clamp-2 leading-snug">{p.name}</p>
                    {p.price ? (
                      <p className="text-[11px] font-bold mt-1" style={{ color: '#FF6B35' }}>
                        {Number(p.price).toLocaleString()} so'm
                      </p>
                    ) : p.price_per_m2 ? (
                      <p className="text-[11px] font-bold mt-1" style={{ color: '#FF6B35' }}>
                        {Number(p.price_per_m2).toLocaleString()} / m²
                      </p>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* See all products */}
        <button
          onClick={() => navigate('/search')}
          className="w-full mt-3 flex items-center justify-center gap-2 py-3 rounded-[16px] text-[12px] font-black active:scale-[0.97] transition-transform"
          style={{ background: 'rgba(26,26,46,0.05)', color: '#8A8A99' }}
        >
          Barcha mahsulotlarni ko'rish <ChevronRight size={14} />
        </button>
      </div>

      {/* Fixed CTA */}
      <div
        className="fixed bottom-0 left-0 right-0 z-[10000] px-4 py-3"
        style={{
          background: 'rgba(255,251,246,0.97)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderTop: '1px solid rgba(26,26,46,0.07)',
          paddingBottom: 'calc(0.75rem + var(--sab))',
        }}
      >
        {canStart && (
          <p className="text-center text-[10px] font-black uppercase tracking-widest text-[#B0B0BF] mb-2">
            ⚡ 30–60 soniyada natija tayyor
          </p>
        )}
        <button
          onClick={handleStart}
          disabled={!canStart}
          className="w-full flex items-center justify-center gap-2.5 py-4 rounded-[18px] text-[15px] font-black text-white active:scale-[0.97] transition-transform disabled:opacity-40"
          style={{
            background: canStart
              ? 'linear-gradient(135deg,#00C9B1,#0096FF)'
              : '#E8E4DE',
            boxShadow: canStart ? '0 8px 28px rgba(0,201,177,0.32)' : 'none',
            color: canStart ? 'white' : '#B0B0BF',
          }}
        >
          <Sparkles size={18} />
          {canStart ? 'AI bilan sinab ko\'rish' : 'Mahsulot tanlang'}
        </button>
      </div>

      <style>{`@keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}`}</style>
    </div>
  );
};

export default VisualizePickerPage;
