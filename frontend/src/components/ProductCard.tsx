import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Heart, Phone, Flame, Building2 } from 'lucide-react';
import type { Product } from '../types';
import { useTelegram } from '../contexts/useTelegram';
import { getMediaUrl } from '../utils/media';

interface Props {
  product: Product;
  onToggleWishlist?: (id: number) => void;
  isWishlisted?: boolean;
  variant?: 'grid' | 'horizontal';
}

const ProductCard: React.FC<Props> = ({
  product,
  onToggleWishlist,
  isWishlisted,
  variant = 'grid',
}) => {
  const { haptic, webApp } = useTelegram();
  const navigate = useNavigate();
  const hasSale = product.is_on_sale && Boolean(product.discount_price);
  const company = product.company_details;

  // PRIMARY image: is_main from gallery → original_image → image (may be AI-processed)
  const primaryImage =
    product.images?.find(i => i.is_main)?.image ||
    product.original_image ||
    product.image;

  const fmt = (v?: string, suffix = '') =>
    v ? `${Number(v).toLocaleString()} so'm${suffix}` : null;

  const basePriceValue = product.price ?? product.price_per_m2 ?? 0;
  const basePrice = product.price
    ? fmt(product.price)
    : fmt(product.price_per_m2, " / m²");
    
  const salePrice = product.price
    ? fmt(product.discount_price)
    : fmt(product.discount_price, " / m²");

  let discountPct = 0;
  if (hasSale && basePriceValue && product.discount_price) {
    discountPct = Math.round(
      (1 - Number(product.discount_price) / Number(basePriceValue)) * 100
    );
  }

  const handleCall = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!company?.phone) return;
    haptic('light');
    const uri = `tel:${company.phone}`;
    if (webApp?.openLink) webApp.openLink(uri);
    else window.location.href = uri;
  };

  /* ── Horizontal variant (sale strip) ── */
  if (variant === 'horizontal') {
    return (
      <NavLink
        to={`/product/${product.id}`}
        className="flex-shrink-0 w-[160px] flex flex-col bg-white rounded-[20px] overflow-hidden active:scale-[0.97] transition-transform"
        style={{ boxShadow: '0 4px 20px rgba(26,26,46,0.08)' }}
      >
        <div className="relative h-[130px] overflow-hidden bg-[#f5f0eb]">
          <img
            src={getMediaUrl(primaryImage) || 'https://via.placeholder.com/300'}
            alt={product.name}
            className="w-full h-full object-cover"
          />
          {hasSale && discountPct > 0 && (
            <span
              className="absolute top-2.5 left-2.5 text-white text-[10px] font-black px-2 py-0.5 rounded-full"
              style={{ background: '#FF2D55' }}
            >
              -{discountPct}%
            </span>
          )}
          {onToggleWishlist && (
            <button
              onClick={(e) => { e.preventDefault(); onToggleWishlist(product.id); haptic('soft'); }}
              className="absolute top-2 right-2 w-7 h-7 bg-white rounded-full flex items-center justify-center active:scale-90 transition-transform"
              style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}
            >
              <Heart size={13} className={isWishlisted ? 'fill-[#FF2D55] text-[#FF2D55]' : 'text-[#C0C0CE]'} />
            </button>
          )}
          {/* Company logo badge */}
          {company && (
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); haptic('light'); navigate(`/company/${company.id}`); }}
              className="absolute bottom-2 right-2 w-7 h-7 rounded-full overflow-hidden border-2 border-white active:scale-90 transition-transform"
              style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.18)' }}
              title={company.name}
            >
              {company.logo ? (
                <img src={getMediaUrl(company.logo)} alt={company.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white text-[9px] font-black"
                  style={{ background: 'linear-gradient(135deg,#FF6B35,#FF2D55)' }}>
                  {company.name.charAt(0).toUpperCase()}
                </div>
              )}
            </button>
          )}
        </div>
        <div className="p-3 flex flex-col gap-1">
          <p className="text-[12px] font-bold text-[#1A1A2E] line-clamp-2 leading-snug">{product.name}</p>
          <p className="text-[13px] font-black" style={{ color: '#FF6B35' }}>{salePrice || basePrice || 'Kelishilgan'}</p>
          {hasSale && basePrice && salePrice && (
            <p className="text-[10px] text-[#C0C0CE] line-through">{basePrice}</p>
          )}
        </div>
      </NavLink>
    );
  }

  /* ── Default grid variant ── */
  return (
    <div
      className="bg-white rounded-[22px] flex flex-col overflow-hidden active:scale-[0.97] transition-transform"
      style={{ boxShadow: '0 4px 20px rgba(26,26,46,0.07)' }}
    >
      {/* Image */}
      <NavLink to={`/product/${product.id}`} className="block">
        <div className="relative h-[160px] sm:h-[180px] overflow-hidden bg-[#f5f0eb]">
          <img
            src={getMediaUrl(primaryImage) || 'https://via.placeholder.com/300'}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
          />
          {/* Badges */}
          <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5">
            {hasSale && discountPct > 0 && (
              <span className="text-white text-[10px] font-black px-2 py-0.5 rounded-full"
                style={{ background: 'linear-gradient(135deg,#FF6B35,#FF2D55)' }}>
                -{discountPct}%
              </span>
            )}
            {product.is_featured && (
              <span className="text-white text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-0.5"
                style={{ background: '#FFB800' }}>
                <Flame size={9} className="fill-white" /> TOP
              </span>
            )}
          </div>
          {/* Wishlist */}
          {onToggleWishlist && (
            <button
              onClick={(e) => { e.preventDefault(); onToggleWishlist(product.id); haptic('soft'); }}
              className="absolute top-2.5 right-2.5 w-8 h-8 bg-white rounded-full flex items-center justify-center active:scale-90 transition-transform"
              style={{ boxShadow: '0 2px 10px rgba(0,0,0,0.14)' }}
            >
              <Heart size={15} className={isWishlisted ? 'fill-[#FF2D55] text-[#FF2D55]' : 'text-[#C0C0CE]'} />
            </button>
          )}
          {/* Availability */}
          <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1 text-white text-[9px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(0,180,140,0.88)', backdropFilter: 'blur(6px)' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-white inline-block" />
            Mavjud
          </div>
          {/* Company logo badge — clickable */}
          {company && (
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); haptic('light'); navigate(`/company/${company.id}`); }}
              className="absolute bottom-2.5 right-2.5 w-8 h-8 rounded-full overflow-hidden border-2 border-white active:scale-90 transition-transform"
              style={{ boxShadow: '0 2px 10px rgba(0,0,0,0.22)' }}
              title={company.name}
            >
              {company.logo ? (
                <img src={getMediaUrl(company.logo)} alt={company.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white text-[10px] font-black"
                  style={{ background: 'linear-gradient(135deg,#FF6B35,#FF2D55)' }}>
                  {company.name.charAt(0).toUpperCase()}
                </div>
              )}
            </button>
          )}
        </div>
      </NavLink>

      {/* Body */}
      <div className="p-3.5 flex flex-col flex-1">
        <NavLink to={`/product/${product.id}`}>
          <h3 className="text-[13px] font-bold text-[#1A1A2E] leading-snug line-clamp-2 mb-1">{product.name}</h3>
        </NavLink>

        {/* Company name */}
        {company && (
          <button
            onClick={() => { haptic('light'); navigate(`/company/${company.id}`); }}
            className="flex items-center gap-1 mb-2 active:opacity-70 transition-opacity text-left w-fit"
          >
            <Building2 size={10} color="#FF6B35" />
            <span className="text-[11px] font-bold text-[#FF6B35] truncate max-w-[120px]">{company.name}</span>
          </button>
        )}

        <div className="mb-3">
          <p className="text-[15px] font-black leading-none" style={{ color: hasSale ? '#FF6B35' : '#1A1A2E' }}>
            {salePrice || basePrice || 'Kelishilgan'}
          </p>
          {hasSale && basePrice && salePrice && (
            <p className="text-[10px] text-[#C0C0CE] line-through mt-0.5">{basePrice}</p>
          )}
        </div>

        <button
          onClick={handleCall}
          disabled={!company?.phone}
          className="mt-auto w-full flex items-center justify-center gap-1.5 py-2.5 rounded-[14px] text-[12px] font-black text-white disabled:opacity-40 active:scale-95 transition-transform"
          style={{ background: 'linear-gradient(135deg,#FF6B35,#FF2D55)', boxShadow: '0 4px 14px rgba(255,107,53,0.28)' }}
        >
          <Phone size={13} className="fill-white" />
          Qo'ng'iroq
        </button>
      </div>
    </div>
  );
};

export default ProductCard;
