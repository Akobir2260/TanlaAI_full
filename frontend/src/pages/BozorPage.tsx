import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/client';
import type { Product } from '../types';
import { useTelegram } from '../contexts/useTelegram';
import { Search, SlidersHorizontal } from 'lucide-react';

const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div
    className={`rounded-2xl ${className}`}
    style={{
      background: 'linear-gradient(90deg, #f0ede8 25%, #e8e4de 50%, #f0ede8 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.4s infinite',
    }}
  />
);

const BozorPage: React.FC = () => {
  const navigate = useNavigate();
  const { haptic } = useTelegram();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    apiClient.get('/products/', { params: { page_size: 60 } })
      .then(r => setProducts(r.data?.results ?? r.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = search.trim()
    ? products.filter(p => p.name?.toLowerCase().includes(search.toLowerCase()))
    : products;

  return (
    <div className="min-h-screen pb-28" style={{ background: '#FFFBF6' }}>
      {/* Header */}
      <div className="sticky top-0 z-10 px-4 pt-5 pb-3" style={{ background: '#FFFBF6' }}>
        <div className="flex items-center gap-2 mb-3">
          <div className="flex-1 flex items-center gap-2.5 px-4 py-2.5 rounded-2xl" style={{ background: '#F2EDE6' }}>
            <Search size={16} color="#9A9AAF" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Mahsulot qidirish..."
              className="flex-1 bg-transparent text-sm font-semibold text-[#1A1A2E] placeholder-[#B0B0BF] outline-none"
            />
          </div>
          <button className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: '#F2EDE6' }}>
            <SlidersHorizontal size={18} color="#9A9AAF" />
          </button>
        </div>
        <p className="text-xs font-bold text-[#B0B0BF] uppercase tracking-widest">
          {loading ? 'Yuklanmoqda...' : `${filtered.length} ta mahsulot`}
        </p>
      </div>

      {/* Grid */}
      <div className="px-3">
        {loading ? (
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: '#F2EDE6' }}>
              <Search size={28} color="#B0B0BF" />
            </div>
            <p className="font-black text-[#1A1A2E] text-lg">Mahsulot topilmadi</p>
            <p className="text-sm text-[#B0B0BF] mt-1">Boshqa kalit so'z bilan qidiring</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {filtered.map(product => (
              <button
                key={product.id}
                onClick={() => { haptic('light'); navigate(`/product/${product.id}`); }}
                className="relative aspect-square rounded-2xl overflow-hidden active:scale-95 transition-transform"
                style={{ background: '#F2EDE6' }}
              >
                {product.image ? (
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-3xl">🚪</span>
                  </div>
                )}
                {product.discount_price && product.price && product.discount_price < product.price && (
                  <div className="absolute top-1.5 right-1.5 bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-lg">
                    -{Math.round((1 - Number(product.discount_price) / Number(product.price)) * 100)}%
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      <style>{`@keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }`}</style>
    </div>
  );
};

export default BozorPage;
