// Re-deployment trigger: April 25th version restoration
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Navigate } from 'react-router-dom';
import RequireCompany from './components/RequireCompany';
import { TelegramProvider } from './contexts/TelegramContext';
import MainLayout from './layout/MainLayout';
import AdminLayout from './layout/AdminLayout';
import HomePage from './pages/HomePage';
import SearchPage from './pages/SearchPage';
import CompanyListPage from './pages/CompanyListPage';
import DiscountsPage from './pages/DiscountsPage';
import ProfilePage from './pages/ProfilePage';
import ProductDetailPage from './pages/ProductDetailPage';
import AIVisualizePage from './pages/AIVisualizePage';
import SharePage from './pages/SharePage';
import CreatorDashboard from './pages/CreatorDashboard';
import ProductFormPage from './pages/ProductFormPage';
import CompanyEditPage from './pages/CompanyEditPage';
import LeadListView from './pages/LeadListView';
import WishlistPage from './pages/WishlistPage';
import BozorPage from './pages/BozorPage';
import CompanyDetailPage from './pages/CompanyDetailPage';
import AdminLoginPage from './pages/AdminLoginPage';
import AdminSystemPage from './pages/AdminSystemPage';
import OrderPage from './pages/OrderPage';
import CompanyCreatePage from './pages/CompanyCreatePage';
import SubscriptionPage from './pages/SubscriptionPage';

// Admin pages
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import AdminProductsPage from './pages/admin/AdminProductsPage';
import AdminCategoriesPage from './pages/admin/AdminCategoriesPage';
import AdminPromotionsPage from './pages/admin/AdminPromotionsPage';
import AdminCompaniesPage from './pages/admin/AdminCompaniesPage';
import AdminUsersPage from './pages/admin/AdminUsersPage';
import AdminBannersPage from './pages/admin/AdminBannersPage';
import AdminLeadsPage from './pages/admin/AdminLeadsPage';
import AdminAIResultsPage from './pages/admin/AdminAIResultsPage';
import AdminAILabPage from './pages/admin/AdminAILabPage';
import AdminPaymentsPage from './pages/admin/AdminPaymentsPage';

function App() {
  return (
    <Router>
      <TelegramProvider>
        <Routes>
          {/* Public Top-Level Pages */}
          <Route path="/share/:id" element={<SharePage />} />

          {/* Admin Panel */}
          <Route path="/adminka/login" element={<AdminLoginPage />} />
          <Route path="/adminka" element={<AdminLayout />}>
            <Route index element={<AdminDashboardPage />} />
            <Route path="products" element={<AdminProductsPage />} />
            <Route path="categories" element={<AdminCategoriesPage />} />
            <Route path="promotions" element={<AdminPromotionsPage />} />
            <Route path="companies" element={<AdminCompaniesPage />} />
            <Route path="users" element={<AdminUsersPage />} />
            <Route path="banners" element={<AdminBannersPage />} />
            <Route path="leads" element={<AdminLeadsPage />} />
            <Route path="payments" element={<AdminPaymentsPage />} />
            <Route path="ai-results" element={<AdminAIResultsPage />} />
            <Route path="ai-lab" element={<AdminAILabPage />} />
            <Route path="system" element={<AdminSystemPage />} />
          </Route>

          {/* Legacy /admin -> /adminka redirects */}
          <Route path="/admin" element={<Navigate to="/adminka" replace />} />
          <Route path="/admin/*" element={<Navigate to="/adminka" replace />} />

          {/* User-facing App */}
          <Route element={<MainLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/companies" element={<CompanyListPage />} />
            <Route path="/discounts" element={<DiscountsPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/subscription" element={<SubscriptionPage />} />

            <Route path="/wishlist" element={<WishlistPage />} />
            <Route path="/product/:id" element={<ProductDetailPage />} />

            <Route path="/product/:id/visualize" element={<AIVisualizePage />} />
            <Route path="/product/:id/ai-generate" element={<AIVisualizePage />} />
            <Route path="/product/:id/edit" element={<RequireCompany><ProductFormPage /></RequireCompany>} />
            <Route path="/product/:id/order" element={<OrderPage />} />
            
            <Route path="/company/create" element={<CompanyCreatePage />} />
            <Route path="/company/:id" element={<CompanyDetailPage />} />
            
            {/* Creator Dashboard Routes — faqat kompaniyasi bor foydalanuvchilar uchun */}
            <Route path="/creator" element={<RequireCompany><CreatorDashboard /></RequireCompany>} />
            <Route path="/creator/studio" element={<RequireCompany><CreatorDashboard /></RequireCompany>} />
            <Route path="/creator/studio/edit" element={<RequireCompany><CompanyEditPage /></RequireCompany>} />
            <Route path="/creator/product/add" element={<RequireCompany><ProductFormPage /></RequireCompany>} />
            <Route path="/creator/product/edit/:id" element={<RequireCompany><ProductFormPage /></RequireCompany>} />
            <Route path="/creator/leads" element={<RequireCompany><LeadListView /></RequireCompany>} />
            <Route path="/bozor" element={<BozorPage />} />
          </Route>

          {/* Catch-all: unknown routes -> home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </TelegramProvider>
    </Router>
  );
}

export default App;
