import React from 'react';
import { Navigate } from 'react-router-dom';
import { useTelegram } from '../contexts/useTelegram';

/**
 * Route guard: faqat kompaniyasi bor foydalanuvchilarni o'tkazadi.
 *
 * - Auth hali yuklanmagan bo'lsa (ready=false) → spinner ko'rsatadi
 * - ready=true, lekin has_company=false → / ga yo'naltiradi
 * - ready=true, has_company=true → sahifani ko'rsatadi
 */
const RequireCompany: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile, ready } = useTelegram();

  // Auth hali yuklanmoqda — bo'sh ekran ko'rsatamiz (flash oldini olish uchun)
  if (!ready) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: '#FFFBF6' }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            border: '3px solid #e8e0d8',
            borderTopColor: '#0067a5',
            animation: 'spin 0.7s linear infinite',
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Auth tayyor, lekin kompaniya yo'q -> profilga yoki bosh sahifaga
  if (!profile?.has_company) {
    return <Navigate to="/" replace />;
  }

  // Kompaniya bor, lekin statusga qarab check qilamiz
  // VIP hamkorlar to'lov sahifasidan o'tib keta oladi
  if ((profile.company_status === 'pending_payment' || profile.company_status === 'waiting_confirmation') && !profile.company_is_vip) {
    return <Navigate to="/subscription" replace />;
  }

  // Trial tugagan — subscription sahifasiga yo'naltir
  if (profile.company_status === 'expired' && !profile.company_is_vip) {
    return <Navigate to="/subscription" replace />;
  }

  if (profile.company_status === 'review') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center" style={{ background: '#FFFBF6' }}>
        <div className="w-20 h-20 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mb-6 animate-pulse">
           <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
        </div>
        <h2 className="text-xl font-black text-slate-800 mb-2">Tasdiqlanish kutilmoqda</h2>
        <p className="text-slate-500 text-sm font-medium leading-relaxed mb-8">
          To'lovingiz tekshirilmoqda. Admin tasdiqlashi bilan barcha imkoniyatlar ochiladi.
        </p>
        <button onClick={() => window.location.reload()} className="px-8 py-3 bg-slate-900 text-white rounded-xl font-bold active:scale-95 transition-all">
          Yangilash
        </button>
      </div>
    );
  }

  if (profile.company_status === 'blocked') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center" style={{ background: '#FFFBF6' }}>
        <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-6">
           <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
        </div>
        <h2 className="text-xl font-black text-slate-800 mb-2">Kirish cheklangan</h2>
        <p className="text-slate-500 text-sm font-medium leading-relaxed mb-8">
          Sizning do'koningiz admin tomonidan bloklangan. Iltimos, qo'llab-quvvatlash xizmati bilan bog'laning.
        </p>
      </div>
    );
  }

  return <>{children}</>;
};

export default RequireCompany;
