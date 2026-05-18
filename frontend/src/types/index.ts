export interface Category {
  id: number;
  name: string;
  icon?: string;
}

export interface ApiListResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface Company {
  id: number;
  name: string;
  description: string;
  phone?: string;
  location: string;
  latitude?: number;
  longitude?: number;
  telegram_link?: string;
  instagram_link?: string;
  youtube_link?: string;
  logo?: string;
  status: 'trial' | 'pending' | 'review' | 'active' | 'blocked' | 'pending_payment' | 'waiting_confirmation' | 'expired';
  is_currently_active: boolean;
  is_active?: boolean;
  trial_ends_at?: string | null;
  subscription_deadline?: string | null;
  created_at?: string;
  product_count?: number;
  ai_usage?: number;
  wishlist_count?: number;
  score?: number;
  is_vip?: boolean;
}

export interface TelegramUser {
  id: number;
  telegram_id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  role: 'USER' | 'COMPANY';
  has_company: boolean;
  company_status?: 'trial' | 'pending' | 'review' | 'active' | 'blocked' | 'pending_payment' | 'waiting_confirmation' | 'expired' | null;
  company_is_vip?: boolean;
  company_id?: number | null;
}


export interface ProductImage {
  id: number;
  image: string;
  is_main: boolean;
  order: number;
}

export interface Product {
  id: number;
  name: string;
  description: string;
  price?: string;
  image?: string;
  category: number;
  category_name: string;
  company_name?: string;
  company?: number;
  owner?: number;
  is_featured: boolean;
  is_on_sale: boolean;
  discount_price?: string;
  is_wishlisted?: boolean;
  sale_end_date?: string;
  height?: string;
  width?: string;
  price_per_m2?: string;
  lead_time_days?: number;
  ai_status: 'none' | 'processing' | 'completed' | 'error';
  original_image?: string;   // original before AI bg-removal
  image_no_bg?: string;      // AI-processed (bg removed)
  company_details?: Company;
  owner_details?: TelegramUser;
  images?: ProductImage[];
}

export interface Banner {
  id: number;
  title: string;
  subtitle: string;
  image: string;
  order: number;
}

export interface WishlistItem {
  id: number;
  user: number;
  product: number;
  created_at: string;
  product_details: Product;
}

export type LeadType = 'call' | 'telegram' | 'measurement' | 'visualize';

export interface LeadRequest {
  id: number;
  user: number;
  product: number;
  company?: number | null;
  ai_result?: number | null;
  lead_type: LeadType;
  message: string;
  phone: string;
  status: string;
  price_info: string;
  width_cm?: number | null;
  height_cm?: number | null;
  calculated_price?: string | null;
  address_text?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  created_at: string;
  is_processed: boolean;
  product_name?: string;
  product_image?: string;
  user_details?: TelegramUser;
  ai_result_details?: AIResult;
}

export interface AIResult {
  id: number;
  user: number;
  product: number;
  image: string;
  input_image?: string | null;
  status: 'pending' | 'processing' | 'done' | 'error';
  created_at: string;
  product_details?: Product;
}

export interface Payment {
  id: number;
  company: number;
  company_name?: string;
  amount: number;
  months: number;
  screenshot: string | null;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string;
  note?: string;
  reviewed_at?: string;
  reviewed_by_name?: string;
  created_at: string;
}
