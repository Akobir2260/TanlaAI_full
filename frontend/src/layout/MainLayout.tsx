import React, { useEffect } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Store, Search, Percent, User, Building2,
  LayoutDashboard, Inbox, PlusCircle, Building, CreditCard
} from 'lucide-react';
import { useTelegram } from '../contexts/useTelegram';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/* ── Root paths per role ──────────────────────────────────────── */
const USER_ROOT_PATHS   = new Set(['/', '/search', '/discounts', '/companies', '/profile']);
const SELLER_ROOT_PATHS = new Set(['/creator', '/creator/leads', '/bozor', '/profile']);

/* ── Nav items ────────────────────────────────────────────────── */
const userNavItems = [
  { to: '/',          icon: Store,     label: "Do'kon"  },
  { to: '/search',    icon: Search,    label: 'Qidiruv' },
  { to: '/discounts', icon: Percent,   label: 'Aksiya'  },
  { to: '/companies', icon: Building,  label: 'Kampaniyalar' },
  { to: '/profile',   icon: User,      label: 'Profil'  },
];

/* Seller nav — 5 items with ➕ center */
const sellerNavLeft  = [
  { to: '/creator',       icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/creator/leads', icon: Inbox,           label: 'Leadlar'   },
];
const sellerNavRight = [
  { to: '/bozor',          icon: Store,     label: 'Bozor'  },
  { to: '/profile',        icon: User,      label: 'Profil' },
];

/* ── Nav Item Component ───────────────────────────────────────── */
const NavItem: React.FC<{
  to: string;
  icon: React.ElementType;
  label: string;
  haptic: (t: 'light' | 'medium' | 'soft') => void;
  end?: boolean;
}> = ({ to, icon: Icon, label, haptic, end }) => (
  <NavLink
    to={to}
    end={end}
    onClick={() => haptic('light')}
    className="flex flex-col items-center justify-center min-w-[52px] py-2 active:scale-90 transition-transform"
  >
    {({ isActive }) => (
      <div className="flex flex-col items-center gap-1">
        <div
          className="w-10 h-8 rounded-xl flex items-center justify-center transition-all duration-200"
          style={isActive ? {
            background: 'linear-gradient(135deg, #FF6B35, #FF2D55)',
            boxShadow: '0 4px 12px rgba(255,107,53,0.35)'
          } : {}}
        >
          <Icon
            size={18}
            strokeWidth={isActive ? 2.5 : 1.8}
            className={isActive ? 'text-white' : 'text-[#B8B8C8]'}
          />
        </div>
        <span
          className="text-[9px] font-black uppercase tracking-widest"
          style={{ color: isActive ? '#FF6B35' : '#C0C0CE' }}
        >
          {label}
        </span>
      </div>
    )}
  </NavLink>
);

/* ── Main Layout ──────────────────────────────────────────────── */
const MainLayout: React.FC = () => {
  const { haptic, profile, webApp, ready, viewMode } = useTelegram();
  const location = useLocation();
  const navigate  = useNavigate();

  const isSeller  = viewMode === 'seller';
  const rootPaths = isSeller ? SELLER_ROOT_PATHS : USER_ROOT_PATHS;

  /* ── Seller Redirect & Subscription Guard ── */
  useEffect(() => {
    if (!ready || !profile) return;
    
    const isSeller = profile.role === 'COMPANY' && profile.has_company;
    const isUnpaid = isSeller && 
                     (profile.company_status === 'pending_payment' || profile.company_status === 'expired') && 
                     !profile.company_is_vip;

    // 1. If unpaid, force to subscription
    if (isUnpaid && location.pathname !== '/subscription') {
      navigate('/subscription', { replace: true });
      return;
    }

    // 2. If seller enters marketplace (root or other user paths), redirect to dashboard
    // We allow profile and subscription pages for both
    // const marketplacePaths = ['/', '/search', '/discounts', '/companies'];
    // if (isSeller && marketplacePaths.includes(location.pathname)) {
    //   navigate('/creator', { replace: true });
    // }
  }, [ready, profile, location.pathname, navigate]);

  /* ── Telegram native Back Button ── */
  useEffect(() => {
    if (!webApp?.isVersionAtLeast?.('6.1')) return;

    const isRoot = rootPaths.has(location.pathname);

    if (isRoot) {
      webApp.BackButton.hide();
    } else {
      webApp.BackButton.show();
      const handler = () => { haptic('light'); navigate(-1); };
      webApp.BackButton.onClick(handler);
      return () => webApp.BackButton.offClick(handler);
    }
  }, [location.pathname, webApp, navigate, haptic, rootPaths]);

  const isOrderPage = location.pathname.includes('/order');
  const isVisualizePage = location.pathname.includes('/visualize') || location.pathname.includes('/ai-generate');
  const shouldHideBottomBar = isOrderPage || isVisualizePage;

  return (
    <div className="min-h-screen bg-[#FFFBF6] text-[#1A1A2E] flex overflow-x-hidden" style={{ fontFamily: 'Manrope, sans-serif' }}>

      {/* ── Desktop Sidebar (lg+) ──────────────────────────── */}
      <aside className="hidden lg:flex fixed top-0 left-0 h-full w-[260px] bg-[#1A1A2E] flex-col z-[70] shadow-2xl">

        {/* Logo */}
        <div className="px-8 py-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #FF6B35, #FF2D55)', boxShadow: '0 8px 24px rgba(255,107,53,0.35)' }}>
              <Store size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black text-white tracking-tight">Tanla</h1>
              <p className="text-[9px] uppercase tracking-[0.25em] text-white/40 font-bold">
                {isSeller ? 'Seller Panel' : 'Home Boutique'}
              </p>
            </div>
          </div>
        </div>

        <div className="mx-6 h-px bg-white/5" />

        {/* Sidebar Nav */}
        <nav className="flex-1 py-6 px-4 space-y-1 overflow-y-auto">
          {(isSeller
            ? [...sellerNavLeft, ...sellerNavRight]
            : userNavItems
          ).map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/' || item.to === '/creator'}
              onClick={() => haptic('light')}
              className={({ isActive }) => cn(
                'flex items-center gap-3.5 px-5 py-3.5 rounded-2xl text-[13px] font-bold transition-all duration-200',
                isActive ? 'text-white' : 'text-white/45 hover:bg-white/5 hover:text-white/80'
              )}
              style={({ isActive }) => isActive ? {
                background: 'linear-gradient(135deg, #FF6B35, #FF2D55)',
                boxShadow: '0 6px 20px rgba(255,107,53,0.30)'
              } : {}}
            >
              {({ isActive }) => (
                <>
                  <item.icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                  <span>{item.label}</span>
                  {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white/60" />}
                </>
              )}
            </NavLink>
          ))}

          {/* Seller: Add product button */}
          {isSeller && (
            <button
              onClick={() => { haptic('medium'); navigate('/creator/product/add'); }}
              className="w-full flex items-center gap-3.5 px-5 py-3.5 rounded-2xl text-[13px] font-bold text-white mt-2 active:scale-95 transition-transform"
              style={{ background: 'linear-gradient(135deg, #FF6B35, #FF2D55)', boxShadow: '0 6px 20px rgba(255,107,53,0.28)' }}
            >
              <PlusCircle size={18} />
              <span>Mahsulot qo'shish</span>
            </button>
          )}
        </nav>



        {/* Bottom link */}
        <div className="p-4 border-t border-white/5">
          {isSeller && (
            <NavLink
              to="/creator/studio/edit"
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-[12px] font-black transition-all hover:bg-white/15 bg-white/8 text-white/70 hover:text-white"
            >
              <Building2 size={16} />
              Kompaniyani tahrirlash
            </NavLink>
          )}
        </div>
      </aside>

      {/* ── Main Area ─────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-[260px]">

        {/* Mobile/Tablet Top Header */}
        <header
          className="fixed top-0 left-0 right-0 lg:hidden z-[60]"
          style={{
            background: 'rgba(255,251,246,0.92)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderBottom: '1px solid rgba(0,0,0,0.06)',
            paddingTop: 'var(--sat)',
          }}
        >
          <div className="flex items-center justify-between px-4 h-16">
            {/* Logo */}
            <div className="flex items-center gap-2.5">
              <div
                className="w-9 h-9 rounded-[12px] flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #FF6B35, #FF2D55)', boxShadow: '0 4px 16px rgba(255,107,53,0.30)' }}
              >
                <Store size={17} className="text-white" />
              </div>
              <div>
                <span className="text-[20px] font-black text-[#1A1A2E] tracking-tighter">Tanla</span>
                {isSeller && (
                  <span
                    className="ml-2 text-[9px] font-black text-white px-2 py-0.5 rounded-full"
                    style={{ background: 'linear-gradient(135deg,#FF6B35,#FF2D55)' }}
                  >
                    SELLER
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">

              {isSeller && (
                <button
                  onClick={() => { haptic('medium'); navigate('/creator/product/add'); }}
                  className="hidden md:flex lg:hidden items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-black text-white"
                  style={{ background: 'linear-gradient(135deg,#FF6B35,#FF2D55)' }}
                >
                  <PlusCircle size={13} /> Qo'shish
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main
          className="pb-32 min-h-screen lg:pb-12"
          style={{ paddingTop: 'calc(4rem + var(--sat))' }}
        >
          <div className="max-w-screen-xl mx-auto w-full">
            {/* Status-based blocking overlays for Companies */}
            {profile?.role === 'COMPANY' && 
             profile.has_company && 
             !profile.company_is_vip && 
             profile.company_status !== 'active' && 
             location.pathname !== '/subscription' ? (
              <div className="px-6 py-20 flex flex-col items-center justify-center text-center">
                 {profile.company_status === 'review' || profile.company_status === 'waiting_confirmation' ? (
                   <>
                     <div className="w-20 h-20 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mb-6 animate-pulse">
                        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                     </div>
                     <h2 className="text-xl font-black text-slate-800 mb-2">Tasdiqlanish kutilmoqda</h2>
                     <p className="text-slate-500 text-sm font-medium leading-relaxed mb-8">
                       To'lovingiz tekshirilmoqda. Admin tasdiqlashi bilan barcha imkoniyatlar ochiladi.
                     </p>
                   </>
                 ) : profile.company_status === 'blocked' ? (
                   <>
                     <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-6">
                        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                     </div>
                     <h2 className="text-xl font-black text-slate-800 mb-2">Kirish cheklangan</h2>
                     <p className="text-slate-500 text-sm font-medium leading-relaxed mb-8">
                       Sizning do'koningiz admin tomonidan bloklangan.
                     </p>
                   </>
                 ) : (
                   <div className="flex flex-col items-center">
                     <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-6">
                        <CreditCard size={32} />
                     </div>
                     <h2 className="text-xl font-black text-slate-800 mb-2">Obuna faol emas</h2>
                     <p className="text-slate-500 text-sm font-medium leading-relaxed mb-8">
                       Davom etish uchun obunani faollashtiring.
                     </p>
                     <button 
                       onClick={() => navigate('/subscription')}
                       className="px-8 py-3 bg-[#FF6B35] text-white rounded-xl font-bold active:scale-95 transition-all shadow-lg shadow-orange-500/20"
                     >
                       To'lov sahifasiga o'tish
                     </button>
                   </div>
                 )}
              </div>
            ) : (
              <Outlet />
            )}
          </div>
        </main>

        {/* ── Mobile Bottom Nav ─────────────────────────── */}
        {!shouldHideBottomBar && (
          <footer
            className="fixed bottom-0 left-0 right-0 z-[9999] md:hidden"
            style={{
              background: 'rgba(255,251,246,0.97)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              borderTop: '1px solid rgba(0,0,0,0.06)',
              boxShadow: '0 -8px 32px rgba(0,0,0,0.06)',
              height: 'calc(68px + var(--sab))',
              paddingBottom: 'var(--sab)',
            }}
          >
            {isSeller ? (
              /* ── SELLER NAV ─────────────────────────────── */
              <div className="flex justify-around items-center h-[68px] px-2">
  
                {/* Left items */}
                {sellerNavLeft.map(item => (
                  <NavItem key={item.to} to={item.to} icon={item.icon} label={item.label} haptic={haptic} end={item.to === '/creator'} />
                ))}
  
                {/* Center ➕ button */}
                <button
                  onClick={() => { haptic('medium'); navigate('/creator/product/add'); }}
                  className="flex flex-col items-center justify-center active:scale-90 transition-transform -mt-5"
                  style={{ minWidth: '64px' }}
                >
                  <div
                    className="w-14 h-14 rounded-[20px] flex items-center justify-center"
                    style={{
                      background: 'linear-gradient(135deg, #FF6B35, #FF2D55)',
                      boxShadow: '0 8px 24px rgba(255,107,53,0.45)',
                    }}
                  >
                    <PlusCircle size={26} className="text-white" strokeWidth={2} />
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-widest text-[#FF6B35] mt-1">Qo'shish</span>
                </button>
  
                {/* Right items */}
                {sellerNavRight.map(item => (
                  <NavItem key={item.to} to={item.to} icon={item.icon} label={item.label} haptic={haptic} end={false} />
                ))}
              </div>
            ) : (
              /* ── USER NAV ───────────────────────────────── */
              <div className="flex justify-around items-center h-[68px]">
                {userNavItems.map(item => (
                  <NavItem key={item.to} to={item.to} icon={item.icon} label={item.label} haptic={haptic} end={item.to === '/'} />
                ))}
              </div>
            )}
          </footer>
        )}
      </div>
    </div>
  );
};

export default MainLayout;
