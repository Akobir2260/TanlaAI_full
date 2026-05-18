import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Building2, MapPin, MessageCircle, Phone, Play,
  Package, Flame,
} from 'lucide-react';
import apiClient from '../api/client';
import type { ApiListResponse, Company, Product } from '../types';
import { useTelegram } from '../contexts/useTelegram';
import ProductCard from '../components/ProductCard';
import { getMediaUrl } from '../utils/media';

const openLink = (url: string) => {
  try {
    const tg = (window as Window & { Telegram?: { WebApp?: { openLink?: (url: string) => void } } }).Telegram?.WebApp;
    if (tg?.openLink) tg.openLink(url);
    else window.open(url, '_blank');
  } catch { window.open(url, '_blank'); }
};

const formatTelegramUrl = (link: string) =>
  link.startsWith('http') ? link : `https://t.me/${link.replace('@', '')}`;

const formatInstagramUrl = (link: string) =>
  link.startsWith('http') ? link : `https://instagram.com/${link.replace('@', '')}`;

/* ── Product skeleton ── */
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

const CompanyDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { haptic } = useTelegram();
  const [company, setCompany] = useState<Company | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCompany = async () => {
      try {
        const [companyRes, productsRes] = await Promise.all([
          apiClient.get<Company>(`/companies/${id}/`),
          apiClient.get<ApiListResponse<Product> | Product[]>(`/products/?company=${id}`),
        ]);
        setCompany(companyRes.data);
        setProducts(Array.isArray(productsRes.data) ? productsRes.data : productsRes.data.results);
      } catch (error) {
        console.error('Error fetching company detail:', error);
      } finally {
        setLoading(false);
      }
    };
    void fetchCompany();
  }, [id]);

  if (loading) {
    return (
      <div style={{ background: '#FFFBF6' }} className="min-h-screen">
        <style>{`@keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}`}</style>
        <div className="px-4 pt-8 pb-6">
          <div className="w-24 h-24 rounded-[28px] bg-[#f0ede8] mx-auto mb-4" style={{ animation: 'shimmer 1.4s infinite' }} />
          <div className="h-6 bg-[#f0ede8] rounded-full w-40 mx-auto mb-2" style={{ animation: 'shimmer 1.4s infinite' }} />
          <div className="h-4 bg-[#f0ede8] rounded-full w-24 mx-auto" style={{ animation: 'shimmer 1.4s infinite' }} />
        </div>
        <div className="px-4 grid grid-cols-2 gap-3">
          {[1,2,3,4].map(i => <CardSkeleton key={i} />)}
        </div>
      </div>
    );
  }

  if (!company) {
    return (
      <div style={{ background: '#FFFBF6' }} className="min-h-screen flex flex-col items-center justify-center gap-4 p-8 text-center">
        <div className="w-20 h-20 rounded-[24px] bg-[rgba(255,107,53,0.08)] flex items-center justify-center">
          <Building2 size={32} color="#FF6B35" strokeWidth={1.5} />
        </div>
        <h3 className="text-[18px] font-black text-[#1A1A2E]">Kompaniya topilmadi</h3>
        <button
          onClick={() => navigate(-1)}
          className="px-6 py-3 rounded-[16px] text-[13px] font-black text-white"
          style={{ background: 'linear-gradient(135deg,#FF6B35,#FF2D55)' }}
        >
          Orqaga
        </button>
      </div>
    );
  }

  if (!company.is_currently_active) {
    return (
      <div style={{ background: '#FFFBF6' }} className="min-h-screen flex flex-col items-center justify-center gap-4 p-8 text-center">
        <div className="w-20 h-20 rounded-[24px] bg-[rgba(255,107,53,0.08)] flex items-center justify-center">
          <Building2 size={32} color="#FF6B35" strokeWidth={1.5} />
        </div>
        <h3 className="text-[18px] font-black text-[#1A1A2E]">{company.name}</h3>
        <p className="text-[13px] text-[#B0B0BF]">Bu kompaniya hozircha faol emas.</p>
        <button
          onClick={() => navigate(-1)}
          className="px-6 py-3 rounded-[16px] text-[13px] font-black text-white"
          style={{ background: 'linear-gradient(135deg,#FF6B35,#FF2D55)' }}
        >
          Orqaga
        </button>
      </div>
    );
  }

  return (
    <div style={{ background: '#FFFBF6' }} className="min-h-screen pb-28">
      <style>{`@keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}`}</style>

      {/* ── Hero / Company Info ── */}
      <div
        className="px-4 pt-8 pb-6 text-center"
        style={{
          background: 'linear-gradient(180deg, rgba(255,107,53,0.06) 0%, rgba(255,251,246,0) 100%)',
        }}
      >
        {/* Logo */}
        <div
          className="w-24 h-24 rounded-[28px] overflow-hidden mx-auto mb-4 border-4 border-white"
          style={{ boxShadow: '0 8px 32px rgba(255,107,53,0.18)' }}
        >
          {company.logo ? (
            <img src={getMediaUrl(company.logo)} alt={company.name} className="w-full h-full object-cover" />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center text-white text-[32px] font-black"
              style={{ background: 'linear-gradient(135deg,#FF6B35,#FF2D55)' }}
            >
              {company.name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        {/* Name + badges */}
        <div className="flex items-center justify-center gap-2 mb-1">
          <h1 className="text-[22px] font-black text-[#1A1A2E]">{company.name}</h1>
          {company.is_vip && (
            <span
              className="text-[9px] font-black text-white px-2 py-0.5 rounded-full"
              style={{ background: 'linear-gradient(135deg,#FFB800,#FF9500)' }}
            >
              HAMKOR
            </span>
          )}
          {company.is_currently_active && (
            <span
              className="text-[9px] font-black text-white px-2 py-0.5 rounded-full"
              style={{ background: 'linear-gradient(135deg,#00B48C,#00D4AA)' }}
            >
              FAOL
            </span>
          )}
        </div>

        {/* Location */}
        {company.location && (
          <div className="flex items-center justify-center gap-1 mb-3">
            <MapPin size={13} color="#FF6B35" />
            <span className="text-[13px] text-[#8A8A99] font-medium">{company.location}</span>
          </div>
        )}

        {/* Stats row */}
        <div className="flex justify-center gap-4 mb-4">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1">
              <Package size={13} color="#FF6B35" />
              <span className="text-[15px] font-black text-[#1A1A2E]">{products.length}</span>
            </div>
            <p className="text-[10px] text-[#C0C0CE] font-bold uppercase tracking-wider mt-0.5">Mahsulot</p>
          </div>
          {(company.ai_usage ?? 0) > 0 && (
            <div className="text-center">
              <div className="flex items-center justify-center gap-1">
                <Flame size={13} color="#FFB800" />
                <span className="text-[15px] font-black text-[#1A1A2E]">{company.ai_usage}</span>
              </div>
              <p className="text-[10px] text-[#C0C0CE] font-bold uppercase tracking-wider mt-0.5">AI vizual</p>
            </div>
          )}
        </div>

        {/* Description */}
        {company.description && (
          <p className="text-[13px] text-[#8A8A99] leading-relaxed max-w-xs mx-auto mb-4">
            {company.description}
          </p>
        )}

        {/* Contact buttons */}
        <div className="flex flex-wrap justify-center gap-2">
          {company.phone && (
            <button
              onClick={() => { haptic('medium'); openLink(`tel:${company.phone}`); }}
              className="flex items-center gap-2 px-5 py-3 rounded-[16px] text-[13px] font-black text-white active:scale-95 transition-transform"
              style={{ background: 'linear-gradient(135deg,#34C759,#30D158)', boxShadow: '0 6px 20px rgba(52,199,89,0.28)' }}
            >
              <Phone size={15} className="fill-white" />
              Qo'ng'iroq
            </button>
          )}
          {company.telegram_link && (
            <button
              onClick={() => { haptic('light'); openLink(formatTelegramUrl(company.telegram_link!)); }}
              className="flex items-center gap-2 px-5 py-3 rounded-[16px] text-[13px] font-black active:scale-95 transition-transform"
              style={{ background: 'rgba(0,136,204,0.1)', color: '#0088cc' }}
            >
              <MessageCircle size={15} />
              Telegram
            </button>
          )}
          {company.instagram_link && (
            <button
              onClick={() => { haptic('light'); openLink(formatInstagramUrl(company.instagram_link!)); }}
              className="flex items-center gap-2 px-5 py-3 rounded-[16px] text-[13px] font-black active:scale-95 transition-transform"
              style={{ background: 'rgba(228,64,95,0.1)', color: '#E4405F' }}
            >
              <span className="text-[13px]">📸</span>
              Instagram
            </button>
          )}
          {company.youtube_link && (
            <button
              onClick={() => { haptic('light'); openLink(company.youtube_link!); }}
              className="flex items-center gap-2 px-5 py-3 rounded-[16px] text-[13px] font-black active:scale-95 transition-transform"
              style={{ background: 'rgba(255,0,0,0.1)', color: '#FF0000' }}
            >
              <Play size={15} />
              YouTube
            </button>
          )}
        </div>
      </div>

      {/* ── Divider ── */}
      <div className="mx-4 h-px bg-[rgba(26,26,46,0.06)] mb-5" />

      {/* ── Products section ── */}
      <div className="px-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[17px] font-black text-[#1A1A2E]">Mahsulotlar</h2>
          <span
            className="text-[10px] font-black text-[#FF6B35] px-3 py-1 rounded-full"
            style={{ background: 'rgba(255,107,53,0.1)' }}
          >
            {products.length} ta
          </span>
        </div>

        {products.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {products.map(product => (
              <ProductCard
                key={product.id}
                product={product}
                isWishlisted={product.is_wishlisted}
              />
            ))}
          </div>
        ) : (
          <div
            className="flex flex-col items-center justify-center py-16 text-center gap-3 rounded-[24px]"
            style={{ background: 'rgba(26,26,46,0.03)', border: '1.5px dashed rgba(26,26,46,0.1)' }}
          >
            <Package size={28} color="#C0C0CE" strokeWidth={1.5} />
            <p className="text-[13px] text-[#B0B0BF] font-medium">Hali mahsulot yo'q</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CompanyDetailPage;
