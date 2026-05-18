import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BannerCarousel from '../components/BannerCarousel';
import CategoryGrid from '../components/CategoryGrid';
import ProductCard from '../components/ProductCard';
import apiClient from '../api/client';
import type { Banner, Category, Product } from '../types';
import { useTelegram } from '../contexts/useTelegram';
import { Search, Sparkles, ChevronRight, Flame, TrendingUp, Tag } from 'lucide-react';

/* ─── Skeleton loader ─── */
const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`rounded-2xl ${className}`}
    style={{
      background: 'linear-gradient(90deg, #f0ede8 25%, #e8e4de 50%, #f0ede8 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.4s infinite',
    }}
  />
);

/* ─── Section header ─── */
const SectionHeader: React.FC<{
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  onSeeAll?: () => void;
  color?: string;
}> = ({ icon, title, subtitle, onSeeAll, color = '#FF6B35' }) => (
  <div className="flex items-center justify-between mb-5 px-1">
    <div className="flex items-center gap-2.5">
      <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `${color}18` }}>
        <span style={{ color }}>{icon}</span>
      </div>
      <div>
        <h2 className="text-[18px] font-black text-[#1A1A2E] leading-none tracking-tight">{title}</h2>
        {subtitle && <p className="text-[10px] text-[#B0B0BF] font-bold uppercase tracking-widest mt-0.5">{subtitle}</p>}
      </div>
    </div>
    {onSeeAll && (
      <button
        onClick={onSeeAll}
        className="flex items-center gap-0.5 text-[11px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg active:scale-95 transition-transform"
        style={{ color, background: `${color}14` }}
      >
        Barchasi <ChevronRight size={12} />
      </button>
    )}
  </div>
);

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { haptic } = useTelegram();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [onSaleProducts, setOnSaleProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const [bRes, cRes, pRes, sRes] = await Promise.all([
          apiClient.get('banners/'),
          apiClient.get('categories/'),
          apiClient.get('products/'),
          apiClient.get('products/?is_on_sale=true'),
        ]);
        setBanners(bRes.data.results ?? bRes.data);
        setCategories(cRes.data.results ?? cRes.data);
        setProducts(pRes.data.results ?? pRes.data);
        setOnSaleProducts(sRes.data.results ?? sRes.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const toggleWishlist = async (
    id: number,
    setter: React.Dispatch<React.SetStateAction<Product[]>>
  ) => {
    try {
      await apiClient.post(`products/${id}/toggle_wishlist/`);
      setter(prev => prev.map(p => p.id === id ? { ...p, is_wishlisted: !p.is_wishlisted } : p));
    } catch (e) {
      console.error(e);
    }
  };

  /* ─── Loading skeleton ─── */
  if (loading) {
    return (
      <div className="px-4 pt-4 space-y-6">
        <style>{`@keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}`}</style>
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-44 w-full" />
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-56" />
          <Skeleton className="h-56" />
          <Skeleton className="h-56" />
          <Skeleton className="h-56" />
        </div>
      </div>
    );
  }

  const topProducts = products.slice(0, 4);
  const recentProducts = products.slice(4);

  return (
    <div className="pb-8" style={{ background: '#FFFBF6' }}>
      <style>{`
        @keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
      `}</style>



      {/* ─── Search Bar ─── */}
      <div className="px-4 mb-6">
        <div
          className="relative cursor-pointer active:scale-[0.98] transition-transform"
          onClick={() => { haptic('light'); navigate('/search'); }}
        >
          <div
            className="w-full h-[52px] flex items-center gap-3 px-5 rounded-[18px]"
            style={{
              background: 'white',
              boxShadow: '0 4px 20px rgba(26,26,46,0.06)',
              border: '1.5px solid rgba(255,107,53,0.10)',
            }}
          >
            <Search size={20} color="#FF6B35" strokeWidth={2.5} />
            <span className="text-[14px] font-semibold text-[#C0C0CE]">
              Mahsulot qidiring…
            </span>
          </div>
        </div>
      </div>

      {/* ─── Banners ─── */}
      {banners.length > 0 && (
        <div className="px-4 mb-8">
          <BannerCarousel banners={banners} />
        </div>
      )}

      {/* ─── Categories ─── */}
      {categories.length > 0 && (
        <section className="mb-8">
          <div className="px-4">
            <SectionHeader
              icon={<Tag size={16} />}
              title="Kategoriyalar"
              subtitle="Mahsulot turini tanlang"
              color="#00C9B1"
            />
          </div>
          <div className="px-4">
            <CategoryGrid categories={categories} />
          </div>
        </section>
      )}

      {/* ─── SALE Strip ─── */}
      {onSaleProducts.length > 0 && (
        <section className="mb-8">
          <div className="px-4">
            <SectionHeader
              icon={<Flame size={16} />}
              title="Chegirmalar 🔥"
              subtitle="Maxsus narxlar"
              onSeeAll={() => { haptic('light'); navigate('/discounts'); }}
              color="#FF2D55"
            />
          </div>

          {/* Horizontal scroll strip with gradient fade */}
          <div className="relative">
            <div className="flex gap-3 overflow-x-auto no-scrollbar pb-3 px-4 snap-x snap-mandatory">
              {onSaleProducts.map(p => (
                <ProductCard
                  key={p.id}
                  product={p}
                  variant="horizontal"
                  onToggleWishlist={id => toggleWishlist(id, setOnSaleProducts)}
                  isWishlisted={p.is_wishlisted}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── Best Sellers ─── */}
      {topProducts.length > 0 && (
        <section className="mb-8 px-4">
          <SectionHeader
            icon={<TrendingUp size={16} />}
            title="Eng ko'p sotilayotganlar"
            subtitle="Xaridorlar sevgani"
            color="#FF6B35"
          />
          <div className="grid grid-cols-2 gap-3">
            {topProducts.map(p => (
              <ProductCard
                key={p.id}
                product={p}
                onToggleWishlist={id => toggleWishlist(id, setProducts)}
                isWishlisted={p.is_wishlisted}
              />
            ))}
          </div>
        </section>
      )}

      {/* ─── Recent Products ─── */}
      {recentProducts.length > 0 && (
        <section className="mb-8 px-4">
          <SectionHeader
            icon={<Sparkles size={16} />}
            title="So'nggi mahsulotlar"
            subtitle="Yangi kelganlar"
            color="#FFB800"
          />
          <div className="grid grid-cols-2 gap-3">
            {recentProducts.map(p => (
              <ProductCard
                key={p.id}
                product={p}
                onToggleWishlist={id => toggleWishlist(id, setProducts)}
                isWishlisted={p.is_wishlisted}
              />
            ))}
          </div>
        </section>
      )}

      {/* ─── Footer brand ─── */}
      <div className="mt-6 mb-4 text-center">
        <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white"
          style={{ boxShadow: '0 2px 12px rgba(26,26,46,0.06)' }}>
          <div className="w-5 h-5 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,#FF6B35,#FF2D55)' }}>
            <Sparkles size={11} className="text-white" />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-[#C0C0CE]">
            Tanla · Home Boutique
          </span>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
