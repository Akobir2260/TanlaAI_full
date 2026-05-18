import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Search, X, LayoutGrid, SlidersHorizontal, Building2, MapPin, Package, Heart } from 'lucide-react';
import apiClient from '../api/client';
import type { ApiListResponse, Product, Category, Company } from '../types';
import { useTelegram } from '../contexts/useTelegram';
import ProductCard from '../components/ProductCard';
import { getMediaUrl } from '../utils/media';

/* ── Skeletons ─────────────────────────────────────────────── */
const CardSkeleton = () => (
  <div
    className="rounded-[22px] overflow-hidden"
    style={{
      background: 'linear-gradient(90deg,#f0ede8 25%,#e8e4de 50%,#f0ede8 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.4s infinite',
      height: '280px',
    }}
  />
);

const CompanySkeleton = () => (
  <div
    className="rounded-[20px] overflow-hidden"
    style={{
      background: 'linear-gradient(90deg,#f0ede8 25%,#e8e4de 50%,#f0ede8 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.4s infinite',
      height: '80px',
    }}
  />
);

/* ── Company Card ───────────────────────────────────────────── */
interface CompanyCardProps {
  company: Company;
}

const CompanyCard: React.FC<CompanyCardProps> = ({ company }) => {
  const navigate = useNavigate();
  const { haptic } = useTelegram();

  return (
    <div
      onClick={() => { haptic('light'); navigate(`/company/${company.id}`); }}
      className="flex items-center gap-4 bg-white p-4 rounded-[20px] active:scale-[0.97] transition-transform cursor-pointer"
      style={{ boxShadow: '0 4px 20px rgba(26,26,46,0.07)' }}
    >
      {/* Logo */}
      <div className="w-14 h-14 rounded-[16px] overflow-hidden flex-shrink-0 bg-[#f5f0eb]">
        {company.logo ? (
          <img
            src={getMediaUrl(company.logo)}
            alt={company.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center text-white text-[18px] font-black"
            style={{ background: 'linear-gradient(135deg,#FF6B35,#FF2D55)' }}
          >
            {company.name.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="text-[14px] font-black text-[#1A1A2E] truncate">{company.name}</h3>
          {company.is_currently_active && (
            <span
              className="flex-shrink-0 text-[9px] font-black text-white px-1.5 py-0.5 rounded-full"
              style={{ background: 'linear-gradient(135deg,#00B48C,#00D4AA)' }}
            >
              FAOL
            </span>
          )}
        </div>
        {company.location && (
          <div className="flex items-center gap-1 mt-0.5">
            <MapPin size={11} color="#FF6B35" />
            <span className="text-[12px] text-[#8A8A99] font-medium truncate">{company.location}</span>
          </div>
        )}
        <div className="flex items-center gap-1 mt-1">
          <Package size={11} color="#C0C0CE" />
          <span className="text-[11px] text-[#C0C0CE] font-bold">
            {company.product_count ?? 0} ta mahsulot
          </span>
        </div>
      </div>

      {/* Arrow */}
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ background: 'rgba(255,107,53,0.08)' }}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M5 3l4 4-4 4" stroke="#FF6B35" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  );
};

/* ── Main Page ──────────────────────────────────────────────── */
type Tab = 'products' | 'companies';

const SearchPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab] = useState<Tab>((searchParams.get('tab') as Tab) || 'products');

  const [products, setProducts] = useState<Product[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const { haptic } = useTelegram();

  const activeCategory = searchParams.get('category');

  /* ── Fetch Products ── */
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      let url = '/products/?';
      const cat = searchParams.get('category');
      const q   = searchParams.get('search');
      const wish = searchParams.get('is_wishlisted');
      if (cat) url += `category=${cat}&`;
      if (q)   url += `search=${q}&`;
      if (wish) url += `is_wishlisted=${wish}&`;
      const res = await apiClient.get<ApiListResponse<Product> | Product[]>(url);
      setProducts(Array.isArray(res.data) ? res.data : res.data.results);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [searchParams]);

  /* ── Fetch Companies ── */
  const fetchCompanies = useCallback(async () => {
    setLoading(true);
    try {
      const q = searchParams.get('search');
      const url = q ? `/companies/?search=${encodeURIComponent(q)}` : '/companies/';
      const res = await apiClient.get<ApiListResponse<Company> | Company[]>(url);
      setCompanies(Array.isArray(res.data) ? res.data : res.data.results);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [searchParams]);

  /* ── Categories (once) ── */
  useEffect(() => {
    apiClient.get<ApiListResponse<Category> | Category[]>('/categories/')
      .then(res => setCategories(Array.isArray(res.data) ? res.data : res.data.results))
      .catch(console.error);
  }, []);

  /* ── Debounce search input ── */
  useEffect(() => {
    const t = setTimeout(() => {
      if (searchTerm !== (searchParams.get('search') || '')) {
        const p = new URLSearchParams(searchParams);
        if (searchTerm) { p.set('search', searchTerm); } else { p.delete('search'); }
        setSearchParams(p);
      }
    }, 480);
    return () => clearTimeout(t);
  }, [searchTerm, searchParams, setSearchParams]);

  /* ── Fetch on tab / params change ── */
  useEffect(() => {
    if (tab === 'products') fetchProducts();
    else fetchCompanies();
  }, [tab, fetchProducts, fetchCompanies]);

  /* ── Tab switch ── */
  const switchTab = (t: Tab) => {
    haptic('light');
    setTab(t);
    const p = new URLSearchParams(searchParams);
    p.set('tab', t);
    // Clear category when switching to companies (category filter doesn't apply)
    if (t === 'companies') p.delete('category');
    setSearchParams(p);
  };

  const toggleCategory = (id: number) => {
    const p = new URLSearchParams(searchParams);
    if (activeCategory === id.toString()) { p.delete('category'); } else { p.set('category', id.toString()); }
    setSearchParams(p);
    haptic('light');
  };

  const clearAll = () => {
    setSearchTerm('');
    setSearchParams(new URLSearchParams([['tab', tab]]));
  };

  const totalCount = tab === 'products' ? products.length : companies.length;

  return (
    <div style={{ background: '#FFFBF6' }} className="min-h-screen">
      <style>{`@keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}`}</style>

      {/* ── Sticky Header ── */}
      <div
        className="sticky z-30 px-4 pt-4 pb-2 space-y-3"
        style={{
          top: 0,
          background: 'rgba(255,251,246,0.95)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(26,26,46,0.05)',
        }}
      >
        {/* Search input */}
        <div className="relative">
          <div
            className="w-full h-[52px] flex items-center gap-3 px-5 rounded-[18px]"
            style={{
              background: '#fff',
              boxShadow: '0 4px 20px rgba(26,26,46,0.07)',
              border: '1.5px solid rgba(255,107,53,0.12)',
            }}
          >
            <Search size={20} color="#FF6B35" strokeWidth={2.5} className="flex-shrink-0" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder={tab === 'products' ? 'Mahsulot qidiring...' : 'Kompaniya qidiring...'}
              className="flex-1 bg-transparent text-[14px] font-semibold text-[#1A1A2E] placeholder-[#C0C0CE] outline-none"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="text-[#C0C0CE] active:scale-90 transition-transform">
                <X size={18} />
              </button>
            )}
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="flex gap-2">
          <button
            onClick={() => switchTab('products')}
            className="flex-1 flex items-center justify-center gap-2 h-[40px] rounded-[14px] text-[13px] font-black transition-all active:scale-95"
            style={tab === 'products'
              ? { background: 'linear-gradient(135deg,#FF6B35,#FF2D55)', color: '#fff', boxShadow: '0 4px 14px rgba(255,107,53,0.28)' }
              : { background: '#fff', color: '#8A8A99', border: '1.5px solid rgba(26,26,46,0.08)' }
            }
          >
            <LayoutGrid size={15} />
            Mahsulotlar
          </button>
          <button
            onClick={() => switchTab('companies')}
            className="flex-1 flex items-center justify-center gap-2 h-[40px] rounded-[14px] text-[13px] font-black transition-all active:scale-95"
            style={tab === 'companies'
              ? { background: 'linear-gradient(135deg,#FF6B35,#FF2D55)', color: '#fff', boxShadow: '0 4px 14px rgba(255,107,53,0.28)' }
              : { background: '#fff', color: '#8A8A99', border: '1.5px solid rgba(26,26,46,0.08)' }
            }
          >
            <Building2 size={15} />
            Kompaniyalar
          </button>
        </div>

        {/* ── Category chips (only on products tab) ── */}
        {tab === 'products' && (
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-0.5 snap-x">
            <button
              onClick={clearAll}
              className="flex-shrink-0 snap-start px-4 py-2 rounded-full text-[12px] font-black whitespace-nowrap transition-all active:scale-95"
              style={(!activeCategory && !searchTerm)
                ? { background: 'linear-gradient(135deg,#FF6B35,#FF2D55)', color: '#fff', boxShadow: '0 4px 12px rgba(255,107,53,0.28)' }
                : { background: '#fff', color: '#8A8A99', border: '1.5px solid rgba(26,26,46,0.08)' }
              }
            >
              Barchasi
            </button>
            <button
              onClick={() => {
                const p = new URLSearchParams(searchParams);
                if (p.get('is_wishlisted')) { p.delete('is_wishlisted'); } else { p.set('is_wishlisted', 'true'); }
                setSearchParams(p);
                haptic('light');
              }}
              className="flex-shrink-0 snap-start px-4 py-2 rounded-full text-[12px] font-black whitespace-nowrap transition-all active:scale-95 flex items-center gap-1.5"
              style={searchParams.get('is_wishlisted') === 'true'
                ? { background: 'rgba(255,45,85,0.12)', color: '#FF2D55', border: '1.5px solid #FF2D55' }
                : { background: '#fff', color: '#8A8A99', border: '1.5px solid rgba(26,26,46,0.08)' }
              }
            >
              <Heart size={14} fill={searchParams.get('is_wishlisted') === 'true' ? '#FF2D55' : 'transparent'} />
              Sevimli
            </button>
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => toggleCategory(cat.id)}
                className="flex-shrink-0 snap-start px-4 py-2 rounded-full text-[12px] font-black whitespace-nowrap transition-all active:scale-95"
                style={activeCategory === cat.id.toString()
                  ? { background: 'linear-gradient(135deg,#FF6B35,#FF2D55)', color: '#fff', boxShadow: '0 4px 12px rgba(255,107,53,0.28)' }
                  : { background: '#fff', color: '#8A8A99', border: '1.5px solid rgba(26,26,46,0.08)' }
                }
              >
                {cat.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Result count row ── */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          {tab === 'products' ? <LayoutGrid size={14} color="#FF6B35" /> : <Building2 size={14} color="#FF6B35" />}
          <span className="text-[11px] font-black uppercase tracking-widest text-[#8A8A99]">
            {loading ? '...' : `${totalCount} ta ${tab === 'products' ? 'mahsulot' : 'kompaniya'}`}
          </span>
        </div>
        {(activeCategory || searchTerm) && (
          <button
            onClick={clearAll}
            className="flex items-center gap-1 text-[11px] font-black text-[#FF2D55] uppercase tracking-widest active:scale-95 transition-transform"
          >
            <SlidersHorizontal size={12} /> Tozalash
          </button>
        )}
      </div>

      {/* ── Content ── */}
      <div className="px-4 pb-10">

        {/* PRODUCTS TAB */}
        {tab === 'products' && (
          loading ? (
            <div className="grid grid-cols-2 gap-3">
              {[1,2,3,4,5,6].map(i => <CardSkeleton key={i} />)}
            </div>
          ) : products.length > 0 ? (
            <div className="grid grid-cols-2 gap-3">
              {products.map(p => (
                <ProductCard
                  key={p.id}
                  product={p}
                  onToggleWishlist={async id => {
                    await apiClient.post(`/products/${id}/toggle_wishlist/`);
                    setProducts(prev => prev.map(pr => pr.id === id ? { ...pr, is_wishlisted: !pr.is_wishlisted } : pr));
                  }}
                  isWishlisted={p.is_wishlisted}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<LayoutGrid size={32} color="#FF6B35" strokeWidth={1.5} />}
              title="Mahsulot topilmadi"
              subtitle="Boshqa kategoriya yoki qidiruv so'zi bilan urinib ko'ring"
              onClear={clearAll}
            />
          )
        )}

        {/* COMPANIES TAB */}
        {tab === 'companies' && (
          loading ? (
            <div className="flex flex-col gap-3">
              {[1,2,3,4].map(i => <CompanySkeleton key={i} />)}
            </div>
          ) : companies.length > 0 ? (
            <div className="flex flex-col gap-3">
              {companies.map(c => (
                <CompanyCard key={c.id} company={c} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Building2 size={32} color="#FF6B35" strokeWidth={1.5} />}
              title="Kompaniya topilmadi"
              subtitle={searchTerm ? `"${searchTerm}" bo'yicha kompaniya yo'q` : 'Hozircha kompaniya mavjud emas'}
              onClear={searchTerm ? clearAll : undefined}
            />
          )
        )}
      </div>
    </div>
  );
};

/* ── Empty State ─────────────────────────────────────────────── */
interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onClear?: () => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, subtitle, onClear }) => (
  <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
    <div
      className="w-20 h-20 rounded-[24px] flex items-center justify-center"
      style={{ background: 'rgba(255,107,53,0.08)' }}
    >
      {icon}
    </div>
    <div>
      <h3 className="text-[18px] font-black text-[#1A1A2E] mb-1">{title}</h3>
      <p className="text-[13px] text-[#B0B0BF] font-medium leading-relaxed">{subtitle}</p>
    </div>
    {onClear && (
      <button
        onClick={onClear}
        className="px-6 py-3 rounded-[16px] text-[13px] font-black text-white active:scale-95 transition-transform"
        style={{ background: 'linear-gradient(135deg,#FF6B35,#FF2D55)', boxShadow: '0 6px 20px rgba(255,107,53,0.28)' }}
      >
        Filtrlarni tozalash
      </button>
    )}
  </div>
);

export default SearchPage;
