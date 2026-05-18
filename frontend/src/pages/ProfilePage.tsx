import React, { useEffect, useState } from 'react';
import { Heart, User, ChevronRight, LayoutDashboard, Store, CreditCard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/client';
import type { ApiListResponse, Product, WishlistItem } from '../types';
import { useTelegram } from '../contexts/useTelegram';
import ProductCard from '../components/ProductCard';

const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const [wishlist, setWishlist] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const { user: tgUser, haptic, profile, refreshProfile, viewMode, setViewMode } = useTelegram();

  const hasCompany = Boolean(profile?.has_company);
  const isVerifiedSeller = profile?.role === 'COMPANY' && hasCompany && profile?.company_status === 'active';

  useEffect(() => {
    refreshProfile();
    
    const fetchWishlist = async () => {
      try {
        const response = await apiClient.get<ApiListResponse<WishlistItem> | WishlistItem[]>('/wishlist/');
        const items = Array.isArray(response.data) ? response.data : response.data.results;
        setWishlist(items.map(item => item.product_details));
      } catch (error) {
        console.error('Error fetching wishlist:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchWishlist();
  }, []);

  const handleToggleWishlist = async (productId: number) => {
    try {
      await apiClient.post(`/products/${productId}/toggle_wishlist/`);
      setWishlist(prev => prev.filter(p => p.id !== productId));
      haptic('soft');
    } catch (error) {
      console.error('Error toggling wishlist:', error);
    }
  };

  return (
    <div style={{ background: '#FFFBF6', minHeight: '100vh' }} className="pb-28">
      <style>{`@keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}`}</style>

      {/* ── User card ── */}
      <div className="px-4 pt-6 pb-5">
        <div
          className="flex items-center gap-4 p-4 rounded-[24px]"
          style={{ background: '#fff', boxShadow: '0 4px 20px rgba(26,26,46,0.07)' }}
        >
          {/* Avatar */}
          <div
            className="w-[68px] h-[68px] rounded-[20px] flex items-center justify-center overflow-hidden flex-shrink-0"
            style={{
              background: tgUser?.photo_url ? undefined : 'linear-gradient(135deg, #FF6B35, #FF2D55)',
              boxShadow: '0 6px 20px rgba(255,107,53,0.22)',
            }}
          >
            {tgUser?.photo_url ? (
              <img src={tgUser.photo_url} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <User size={28} className="text-white" />
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h3 className="text-[20px] font-black text-[#1A1A2E] leading-none tracking-tight truncate">
              {tgUser?.first_name || 'Foydalanuvchi'}
              {tgUser?.last_name ? ` ${tgUser.last_name}` : ''}
            </h3>
            {tgUser?.username && (
              <p className="text-[12px] text-[#B0B0BF] font-bold mt-0.5">@{tgUser.username}</p>
            )}
            <div className="flex items-center gap-1.5 mt-4">
              {/* Segmented Control Switch */}
              {hasCompany && (
                <div className="flex p-1 bg-[#F5F0EB] rounded-2xl w-full max-w-[240px]">
                  <button
                    onClick={() => { haptic('soft'); setViewMode('buyer'); }}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-[11px] font-black uppercase tracking-tight transition-all ${
                      viewMode === 'buyer' 
                        ? 'bg-white text-[#1A1A2E] shadow-sm' 
                        : 'text-[#B0B0BF]'
                    }`}
                  >
                    <User size={14} />
                    Xaridor
                  </button>
                  <button
                    onClick={() => { haptic('soft'); setViewMode('seller'); navigate('/creator'); }}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-[11px] font-black uppercase tracking-tight transition-all ${
                      viewMode === 'seller' 
                        ? 'bg-gradient-to-br from-[#FF6B35] to-[#FF2D55] text-white shadow-md' 
                        : 'text-[#B0B0BF]'
                    }`}
                    style={viewMode === 'seller' ? { background: 'linear-gradient(135deg, #FF6B35, #FF2D55)' } : {}}
                  >
                    <LayoutDashboard size={14} />
                    Sotuvchi
                  </button>
                </div>
              )}
              {!hasCompany && (
                <div
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-white"
                  style={{ background: 'linear-gradient(135deg, #00C9B1, #0096FF)' }}
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-white/60" />
                  Xaridor
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Quick actions ── */}
      <div className="px-4 space-y-2.5 mb-6">
        <button
          onClick={() => { haptic('light'); navigate('/wishlist'); }}
          className="w-full flex items-center justify-between p-4 rounded-[20px] active:scale-[0.97] transition-transform"
          style={{ background: '#fff', boxShadow: '0 4px 16px rgba(26,26,46,0.06)' }}
        >
          <div className="flex items-center gap-3.5">
            <div
              className="w-11 h-11 rounded-[14px] flex items-center justify-center"
              style={{ background: 'rgba(255,45,85,0.08)' }}
            >
              <Heart size={20} color="#FF2D55" />
            </div>
            <div>
              <p className="text-[14px] font-black text-[#1A1A2E]">Sevimli mahsulotlar</p>
              <p className="text-[10px] font-bold text-[#B0B0BF] uppercase tracking-widest">
                {loading ? '...' : `${wishlist.length} ta saqlangan`}
              </p>
            </div>
          </div>
          <ChevronRight size={16} color="#C0C0CE" />
        </button>


        {/* Seller/Company Actions */}
        {hasCompany ? (
          <div className="space-y-2.5">
            <button
              onClick={() => { haptic('light'); navigate('/creator'); }}
              className="w-full flex items-center justify-between p-4 rounded-[20px] active:scale-[0.97] transition-transform"
              style={{ background: '#fff', boxShadow: '0 4px 16px rgba(26,26,46,0.06)' }}
            >
              <div className="flex items-center gap-3.5">
                <div
                  className="w-11 h-11 rounded-[14px] flex items-center justify-center"
                  style={{ background: 'rgba(255,107,53,0.08)' }}
                >
                  <LayoutDashboard size={20} color="#FF6B35" />
                </div>
                <div>
                  <p className="text-[14px] font-black text-[#1A1A2E]">Dashboardga kirish</p>
                  <p className="text-[10px] font-bold text-[#B0B0BF] uppercase tracking-widest">
                    {isVerifiedSeller ? 'Sotuvchi paneli' : 
                     profile?.company_status === 'review' ? 'To\'lov tekshirilmoqda' : 'Kompaniya paneli'}
                  </p>
                </div>
              </div>
              <ChevronRight size={16} color="#C0C0CE" />
            </button>

            {profile?.company_status === 'pending' && (
              <button
                onClick={() => { haptic('light'); navigate('/subscription'); }}
                className="w-full flex items-center justify-between p-4 rounded-[20px] active:scale-[0.97] transition-transform border-2 border-dashed border-orange-200"
                style={{ background: 'rgba(255,107,53,0.02)' }}
              >
                <div className="flex items-center gap-3.5">
                  <div
                    className="w-11 h-11 rounded-[14px] flex items-center justify-center"
                    style={{ background: 'rgba(255,107,53,0.1)' }}
                  >
                    <CreditCard size={20} color="#FF6B35" />
                  </div>
                  <div className="text-left">
                    <p className="text-[14px] font-black text-[#1A1A2E]">Obunani faollashtirish</p>
                    <p className="text-[10px] font-bold text-orange-600 uppercase tracking-widest">To'lov qilish kerak</p>
                  </div>
                </div>
                <ChevronRight size={16} color="#FF6B35" />
              </button>
            )}
          </div>
        ) : (
          <button
            onClick={() => { haptic('light'); navigate('/company/create'); }}
            className="w-full flex items-center justify-between p-4 rounded-[20px] active:scale-[0.97] transition-transform"
            style={{ background: '#fff', boxShadow: '0 4px 16px rgba(26,26,46,0.06)' }}
          >
            <div className="flex items-center gap-3.5">
              <div
                className="w-11 h-11 rounded-[14px] flex items-center justify-center"
                style={{ background: 'rgba(0,201,177,0.08)' }}
              >
                <Store size={20} color="#00C9B1" />
              </div>
              <div>
                <p className="text-[14px] font-black text-[#1A1A2E]">Kampaniya ochish</p>
                <p className="text-[10px] font-bold text-[#B0B0BF] uppercase tracking-widest">Biz bilan ishlashni boshlang</p>
              </div>
            </div>
            <ChevronRight size={16} color="#C0C0CE" />
          </button>
        )}
      </div>

      {/* ── Wishlist preview ── */}
      {!loading && wishlist.length > 0 && (
        <section className="px-4 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: 'rgba(255,45,85,0.08)' }}
              >
                <Heart size={16} color="#FF2D55" />
              </div>
              <h2 className="text-[18px] font-black text-[#1A1A2E] tracking-tight">Sevimlilar</h2>
            </div>
            <button
              onClick={() => navigate('/wishlist')}
              className="text-[11px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg active:scale-95 transition-transform"
              style={{ color: '#FF2D55', background: 'rgba(255,45,85,0.06)' }}
            >
              Barchasi <ChevronRight size={12} className="inline" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {wishlist.slice(0, 4).map(product => (
              <ProductCard
                key={product.id}
                product={product}
                isWishlisted={true}
                onToggleWishlist={handleToggleWishlist}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── Wishlist skeleton ── */}
      {loading && (
        <div className="px-4 grid grid-cols-2 gap-3">
          {[1,2].map(i => (
            <div
              key={i}
              className="rounded-[22px]"
              style={{
                height: 240,
                background: 'linear-gradient(90deg,#f0ede8 25%,#e8e4de 50%,#f0ede8 75%)',
                backgroundSize: '200% 100%',
                animation: 'shimmer 1.4s infinite',
              }}
            />
          ))}
        </div>
      )}

      {/* ── Empty wishlist ── */}
      {!loading && wishlist.length === 0 && (
        <div className="px-4">
          <div
            className="rounded-[22px] p-10 text-center"
            style={{
              background: '#fff',
              boxShadow: '0 4px 16px rgba(26,26,46,0.06)',
              border: '2px dashed rgba(26,26,46,0.06)',
            }}
          >
            <Heart size={36} color="#E0E0E8" className="mx-auto mb-3" />
            <p className="text-[14px] font-bold text-[#B0B0BF] mb-3">Sevimlilar bo'sh</p>
            <button
              onClick={() => { haptic('light'); navigate('/search'); }}
              className="text-[13px] font-black text-white px-6 py-2.5 rounded-[14px] active:scale-95 transition-transform"
              style={{ background: 'linear-gradient(135deg, #FF6B35, #FF2D55)' }}
            >
              Qidirishni boshlash
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;
