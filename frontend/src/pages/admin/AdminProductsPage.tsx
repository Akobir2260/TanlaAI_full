import { useEffect, useState, useCallback, useRef } from 'react';
import { Search, Trash2, AlertCircle, Package, Plus, Pencil, X, Eye, RefreshCw, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import apiClient from '../../api/client';
import { cn } from '../../utils/cn';

type ProductImage = {
  id: number;
  image: string;
  is_main: boolean;
  order: number;
};

type Product = {
  id: number;
  name: string;
  description: string;
  price: string | null;
  price_per_m2: string | null;
  image: string | null;
  images: ProductImage[];
  category: number | null;
  category_name: string;
  ai_status: string;
  ai_error: string | null;
  owner_details: { first_name: string; last_name: string } | null;
  company_details: { name: string } | null;
  company: number | null;
  original_image: string | null;
  image_no_bg: string | null;
  height: string | null;
  width: string | null;
  lead_time_days: number | null;
  is_featured: boolean;
  is_on_sale: boolean;
  discount_price: string | null;
  sale_end_date: string | null;
};

type Category = { id: number; name: string };
type Company = { id: number; name: string };

const MEDIA_BASE = import.meta.env.VITE_BACKEND_ORIGIN || '';

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<number | null>(null);
  
  // Selection
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [saving, setSaving] = useState(false);
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null);
  const [reprocessing, setReprocessing] = useState<number | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const pollInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  // Form fields
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formCat, setFormCat] = useState('');
  const [formComp, setFormComp] = useState('');
  const [formImage, setFormImage] = useState<File | null>(null);
  // Gallery images
  const [formGalleryFiles, setFormGalleryFiles] = useState<File[]>([]);
  const [formGalleryPreviews, setFormGalleryPreviews] = useState<string[]>([]);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // Extended form fields (matching web app)
  const [formPricingType, setFormPricingType] = useState<'total' | 'per_m2'>('total');
  const [formPricePerM2, setFormPricePerM2] = useState('');
  const [formHeight, setFormHeight] = useState('');
  const [formWidth, setFormWidth] = useState('');
  const [formLeadTime, setFormLeadTime] = useState('3');
  const [formIsFeatured, setFormIsFeatured] = useState(false);
  const [formIsOnSale, setFormIsOnSale] = useState(false);
  const [formDiscountPrice, setFormDiscountPrice] = useState('');
  const [formSaleEndDate, setFormSaleEndDate] = useState('');

  const fetchProducts = useCallback(async (q = '') => {
    setLoading(true);
    try {
      const { data } = await apiClient.get('admin/products/', { params: q ? { search: q } : {} });
      const results = data.results ?? data;
      setProducts(results);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchDependencies = async () => {
    const [catRes, compRes] = await Promise.all([
      apiClient.get('admin/categories/'),
      apiClient.get('admin/companies/'),
    ]);
    setCategories(catRes.data.results ?? catRes.data);
    setCompanies(compRes.data.results ?? compRes.data);
  };

  useEffect(() => {
    fetchProducts();
    fetchDependencies();
  }, [fetchProducts]);

  useEffect(() => {
    const t = setTimeout(() => fetchProducts(search), 400);
    return () => clearTimeout(t);
  }, [search, fetchProducts]);

  const resetGallery = () => {
    setFormGalleryFiles([]);
    setFormGalleryPreviews([]);
  };

  const openCreate = () => {
    setEditing(null);
    setFormName('');
    setFormDesc('');
    setFormPrice('');
    setFormCat('');
    setFormComp('');
    setFormImage(null);
    resetGallery();
    setFormPricingType('total');
    setFormPricePerM2('');
    setFormHeight('');
    setFormWidth('');
    setFormLeadTime('3');
    setFormIsFeatured(false);
    setFormIsOnSale(false);
    setFormDiscountPrice('');
    setFormSaleEndDate('');
    setShowForm(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    setFormName(p.name);
    setFormDesc(p.description || '');
    setFormPrice(p.price || '');
    setFormCat(String(p.category || ''));
    setFormComp(String(p.company || ''));
    setFormImage(null);
    resetGallery();
    setFormPricingType(p.price_per_m2 && !p.price ? 'per_m2' : 'total');
    setFormPricePerM2(p.price_per_m2 || '');
    setFormHeight(p.height || '');
    setFormWidth(p.width || '');
    setFormLeadTime(p.lead_time_days != null ? String(p.lead_time_days) : '3');
    setFormIsFeatured(Boolean(p.is_featured));
    setFormIsOnSale(Boolean(p.is_on_sale));
    setFormDiscountPrice(p.discount_price || '');
    setFormSaleEndDate(p.sale_end_date || '');
    setShowForm(true);
  };

  const MAX_GALLERY = 4;

  const handleGalleryAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const existing = formGalleryFiles.length;
    const allowed = MAX_GALLERY - existing;
    if (allowed <= 0) { alert(`Maksimal ${MAX_GALLERY} ta rasm yuklash mumkin`); return; }
    const newFiles = [...formGalleryFiles, ...files.slice(0, allowed)];
    setFormGalleryFiles(newFiles);
    setFormGalleryPreviews(newFiles.map(f => URL.createObjectURL(f)));
    if (galleryInputRef.current) galleryInputRef.current.value = '';
  };

  const removeGalleryItem = (idx: number) => {
    const files = formGalleryFiles.filter((_, i) => i !== idx);
    setFormGalleryFiles(files);
    setFormGalleryPreviews(files.map(f => URL.createObjectURL(f)));
  };

  const handleSubmit = async () => {
    if (!formName.trim() || !formCat) return;
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('name', formName.trim());
      fd.append('description', formDesc.trim());
      fd.append('category', formCat);
      if (formComp) fd.append('company', formComp);

      // Pricing
      if (formPricingType === 'total') {
        fd.append('price', formPrice);
        fd.append('price_per_m2', '');
        fd.append('height', formHeight);
        fd.append('width', formWidth);
      } else {
        fd.append('price', '');
        fd.append('price_per_m2', formPricePerM2);
        fd.append('height', '');
        fd.append('width', '');
      }

      // Lead time
      const leadNum = parseInt(formLeadTime || '0', 10);
      if (!Number.isNaN(leadNum) && leadNum > 0) {
        fd.append('lead_time_days', String(leadNum));
      }

      // Featured
      fd.append('is_featured', String(formIsFeatured));

      // Sale
      fd.append('is_on_sale', String(formIsOnSale));
      if (formIsOnSale) {
        fd.append('discount_price', formDiscountPrice);
        fd.append('sale_end_date', formSaleEndDate);
      } else {
        fd.append('discount_price', '');
        fd.append('sale_end_date', '');
      }

      if (formImage) fd.append('image', formImage);

      // Gallery images (up to 4)
      formGalleryFiles.forEach((f, i) => {
        fd.append('gallery_images', f);
        if (i === 0) fd.append('gallery_main_index', '0');
      });

      if (editing) {
        await apiClient.patch(`admin/products/${editing.id}/`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        await apiClient.post('admin/products/', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }
      setShowForm(false);
      fetchProducts(search);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Bu mahsulotni o'chirmoqchimisiz?")) return;
    setDeleting(id);
    try {
      await apiClient.delete(`admin/products/${id}/`);
      setProducts((p) => p.filter((x) => x.id !== id));
      setSelectedIds(prev => prev.filter(x => x !== id));
    } finally {
      setDeleting(null);
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`${selectedIds.length} ta mahsulotni o'chirmoqchimisiz?`)) return;
    setLoading(true);
    try {
      await Promise.all(selectedIds.map(id => apiClient.delete(`admin/products/${id}/`)));
      fetchProducts(search);
      setSelectedIds([]);
      showToast("Mahsulotlar o'chirildi.");
    } catch {
      showToast("Ba'zi mahsulotlarni o'chirishda xatolik yuz berdi", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleBulkReprocess = async () => {
    if (!confirm(`${selectedIds.length} ta mahsulotni SI orqali qayta ishlamoqchimisiz?`)) return;
    setLoading(true);
    try {
      await Promise.all(selectedIds.map(id => apiClient.post(`admin/products/${id}/reprocess_ai/`)));
      fetchProducts(search);
      setSelectedIds([]);
      showToast("SI qayta ishlash boshlandi.");
    } catch {
      showToast("Xatolik yuz berdi", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleReprocess = async (id: number) => {
    setReprocessing(id);
    try {
      await apiClient.post(`admin/products/${id}/reprocess_ai/`);
      setProducts(prev => prev.map(p => p.id === id ? { ...p, ai_status: 'processing', ai_error: null } : p));
      if (viewingProduct?.id === id) {
        setViewingProduct({ ...viewingProduct, ai_status: 'processing', ai_error: null });
      }
      showToast("Qayta ishlash boshlandi...");
      startPolling(id);
    } catch (err) {
      console.error("Reprocess failed", err);
      showToast("Xatolik yuz berdi", "error");
    } finally {
      setReprocessing(null);
    }
  };

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const startPolling = (id: number) => {
    if (pollInterval.current) clearInterval(pollInterval.current);
    pollInterval.current = setInterval(async () => {
      try {
        const { data } = await apiClient.get(`admin/products/${id}/`);
        if (data.ai_status !== 'processing') {
          if (pollInterval.current) clearInterval(pollInterval.current);
          
          setProducts(prev => prev.map(p => p.id === id ? data : p));
          if (viewingProduct?.id === id) {
            setViewingProduct(data);
          }
          
          if (data.ai_status === 'completed') {
            showToast("Tayyor! AI natijasi yangilandi.");
          } else if (data.ai_status === 'error') {
            showToast("AI ishlashida xatolik yuz berdi", "error");
          }
        }
      } catch {
        if (pollInterval.current) clearInterval(pollInterval.current);
      }
    }, 3000);
  };

  useEffect(() => {
    return () => { if (pollInterval.current) clearInterval(pollInterval.current); };
  }, []);

  const toggleSelectAll = () => {
    if (selectedIds.length === products.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(products.map(p => p.id));
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const statusBadge = (p: Product) => {
    const s = p.ai_status;
    const map: Record<string, { bg: string; text: string; label: string }> = {
      completed: { bg: 'bg-[#d1fae5]', text: 'text-[#065f46]', label: 'AI Ready' },
      processing: { bg: 'bg-[#fef3c7]', text: 'text-[#92400e]', label: 'Processing' },
      error: { bg: 'bg-[#fee2e2]', text: 'text-[#991b1b]', label: 'AI Failed' },
      none: { bg: 'bg-slate-100', text: 'text-slate-500', label: 'No AI' },
    };
    const c = map[s] || map.none;
    return (
      <div className="flex flex-col gap-1 items-start">
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${c.bg} ${c.text}`}>
          {s === 'error' && <AlertCircle size={10} />}
          {c.label}
        </span>
        {p.ai_error && (
          <button 
            onClick={() => alert(p.ai_error)}
            className="text-[9px] text-red-400 hover:text-red-600 underline font-bold"
          >
            Xatolikni ko'rish
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Products Catalog</h1>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Barcha mahsulotlar ro'yxati</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-72">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
            <input
              type="text"
              placeholder="Mahsulotlarni qidiring..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white border border-slate-100 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-sky-500/10 shadow-sm transition-all"
            />
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 bg-[#0067a5] hover:bg-[#005a91] text-white px-6 py-3 rounded-2xl text-sm font-bold transition-all shadow-xl shadow-blue-900/10 whitespace-nowrap active:scale-95"
          >
            <Plus size={18} /> Yangi Qo'shish
          </button>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      <AnimatePresence>
        {selectedIds.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex items-center justify-between bg-slate-900 text-white px-6 py-4 rounded-3xl shadow-2xl"
          >
            <div className="flex items-center gap-4">
              <span className="text-sm font-bold">{selectedIds.length} ta tanlandi</span>
              <div className="h-4 w-px bg-white/20" />
              <button 
                onClick={handleBulkReprocess}
                className="flex items-center gap-2 px-4 py-1.5 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-bold transition-all"
              >
                <RefreshCw size={14} /> SI Qayta Ishlash
              </button>
            </div>
            <button 
              onClick={handleBulkDelete}
              className="flex items-center gap-2 px-6 py-2 bg-red-500 hover:bg-red-600 rounded-xl text-xs font-black transition-all shadow-lg shadow-red-500/20"
            >
              <Trash2 size={14} /> Tanlanganlarni O'chirish
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Table Container */}
      <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-4 text-left w-10">
                  <input 
                    type="checkbox" 
                    checked={selectedIds.length === products.length && products.length > 0}
                    onChange={toggleSelectAll}
                    className="w-5 h-5 rounded-lg border-slate-200 text-[#0067a5] focus:ring-sky-500/20"
                  />
                </th>
                <th className="text-left text-[10px] uppercase tracking-[0.15em] text-slate-400 font-black px-4 py-4">Mahsulot</th>
                <th className="text-left text-[10px] uppercase tracking-[0.15em] text-slate-400 font-black px-4 py-4">Narxi</th>
                <th className="text-left text-[10px] uppercase tracking-[0.15em] text-slate-400 font-black px-4 py-4">Kategoriya</th>
                <th className="text-left text-[10px] uppercase tracking-[0.15em] text-slate-400 font-black px-4 py-4">SI Holati</th>
                <th className="text-left text-[10px] uppercase tracking-[0.15em] text-slate-400 font-black px-4 py-4">Egasi</th>
                <th className="text-right text-[10px] uppercase tracking-[0.15em] text-slate-400 font-black px-6 py-4">Amallar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading && products.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-24">
                    <div className="w-10 h-10 border-4 border-[#0067a5] border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-slate-400 text-xs font-bold mt-4 animate-pulse">Ma'lumotlar yuklanmoqda...</p>
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-24">
                    <Package size={48} className="mx-auto text-slate-200 mb-4" />
                    <p className="text-slate-500 text-sm font-bold">Mahsulotlar topilmadi</p>
                    <p className="text-slate-400 text-xs mt-1">Yangi mahsulot qo'shib ko'ring</p>
                  </td>
                </tr>
              ) : (
                products.map((p) => (
                  <tr key={p.id} className={cn(
                    "group transition-all hover:bg-slate-50/50",
                    selectedIds.includes(p.id) ? "bg-sky-50/30" : ""
                  )}>
                    <td className="px-6 py-4">
                      <input 
                        type="checkbox" 
                        checked={selectedIds.includes(p.id)}
                        onChange={() => toggleSelect(p.id)}
                        className="w-5 h-5 rounded-lg border-slate-200 text-[#0067a5] focus:ring-sky-500/20"
                      />
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-4">
                        <div className="flex flex-col gap-1">
                          {/* Main image — prefer gallery is_main, fallback original_image, then image */}
                          {(() => {
                            const mainImg = p.images?.find(i => i.is_main)?.image
                              || p.original_image
                              || p.image;
                            const src = mainImg
                              ? (mainImg.startsWith('http') ? mainImg : `${MEDIA_BASE}${mainImg}`)
                              : null;
                            return (
                              <div className="w-[72px] h-[80px] rounded-xl bg-[#f5f5f7] border border-slate-100 flex items-center justify-center p-1 flex-shrink-0 shadow-sm overflow-hidden relative">
                                {src ? (
                                  <img src={src} alt={p.name} className="w-full h-full object-contain mix-blend-multiply" />
                                ) : (
                                  <Package size={20} className="text-slate-200" />
                                )}
                              </div>
                            );
                          })()}
                          {/* Gallery strip */}
                          {p.images && p.images.length > 0 && (
                            <div className="flex gap-1">
                              {p.images.slice(0, 3).map(img => (
                                <div key={img.id} className="relative w-[21px] h-[21px] rounded-md overflow-hidden border border-slate-200 flex-shrink-0">
                                  <img
                                    src={img.image.startsWith('http') ? img.image : `${MEDIA_BASE}${img.image}`}
                                    alt=""
                                    className="w-full h-full object-cover"
                                  />
                                  {img.is_main && (
                                    <div className="absolute inset-0 bg-emerald-500/40 flex items-center justify-center">
                                      <span className="text-white text-[6px] font-black">★</span>
                                    </div>
                                  )}
                                </div>
                              ))}
                              {p.images.length > 3 && (
                                <div className="w-[21px] h-[21px] rounded-md bg-slate-100 flex items-center justify-center text-[8px] font-black text-slate-400">
                                  +{p.images.length - 3}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-black text-slate-800 truncate mb-1">{p.name}</p>
                          <p className="text-[11px] text-slate-400 font-bold uppercase tracking-tight line-clamp-2 max-w-[200px] leading-relaxed">
                            {p.description || "Tavsif yo'q"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-black text-slate-700">
                          {p.price ? Number(p.price).toLocaleString() : '—'}
                        </span>
                        <span className="text-[10px] font-black text-[#0067a5] uppercase tracking-widest mt-0.5">CYM</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="px-3 py-1 bg-slate-100 rounded-lg text-[10px] font-black text-slate-500 uppercase tracking-widest">
                        {p.category_name || 'ESHIK'}
                      </span>
                    </td>
                    <td className="px-4 py-4">{statusBadge(p)}</td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-sky-50 text-[#0067a5] flex items-center justify-center text-[11px] font-black shadow-sm ring-1 ring-sky-100">
                          {p.owner_details?.first_name?.charAt(0) || 'P'}
                        </div>
                        <span className="text-xs font-bold text-slate-600 truncate max-w-[100px]">
                          {p.owner_details?.first_name || 'Platform'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-all">
                        <button
                          onClick={() => handleReprocess(p.id)}
                          disabled={reprocessing === p.id}
                          className="p-2.5 text-amber-500 hover:bg-amber-50 rounded-xl transition-all disabled:opacity-30"
                          title="SI Qayta Ishlash"
                        >
                          <RefreshCw size={18} className={reprocessing === p.id ? 'animate-spin' : ''} />
                        </button>
                        <button
                          onClick={() => setViewingProduct(p)}
                          className="p-2.5 text-emerald-500 hover:bg-emerald-50 rounded-xl transition-all"
                          title="Ko'rish"
                        >
                          <Eye size={18} />
                        </button>
                        <button
                          onClick={() => openEdit(p)}
                          className="p-2.5 text-sky-600 hover:bg-sky-50 rounded-xl transition-all"
                          title="Tahrirlash"
                        >
                          <Pencil size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(p.id)}
                          disabled={deleting === p.id}
                          className="p-2.5 text-red-500 hover:bg-red-50 rounded-xl transition-all disabled:opacity-30"
                          title="O'chirish"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* View Product Modal */}
      {viewingProduct && (
        <div className="fixed inset-0 bg-black/80 z-[70] flex items-center justify-center p-4 backdrop-blur-xl" onClick={() => setViewingProduct(null)}>
          <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-5xl p-10 space-y-10 overflow-y-auto max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight">{viewingProduct.name}</h2>
                <div className="flex items-center gap-4 mt-2">
                  <span className="px-3 py-1 bg-slate-100 rounded-lg text-[10px] font-black text-slate-500 uppercase tracking-widest">{viewingProduct.category_name}</span>
                  <div className="w-1 h-1 bg-slate-300 rounded-full" />
                  <span className="text-sm font-bold text-[#0067a5]">{Number(viewingProduct.price || 0).toLocaleString()} CYM</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => handleReprocess(viewingProduct.id)}
                  disabled={reprocessing === viewingProduct.id}
                  className="flex items-center gap-3 px-6 py-3.5 bg-sky-50 text-[#0067a5] hover:bg-sky-100 rounded-2xl text-sm font-black transition-all disabled:opacity-50 shadow-sm"
                >
                  <RefreshCw size={20} className={reprocessing === viewingProduct.id ? 'animate-spin' : ''} />
                  Yangilash
                </button>
                <button onClick={() => setViewingProduct(null)} className="w-14 h-14 bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-full flex items-center justify-center transition-all">
                  <X size={28} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div className="space-y-4">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Original Holati</span>
                <div className="aspect-[3/4] rounded-[32px] bg-[#f5f5f7] border-4 border-white shadow-xl overflow-hidden group relative">
                  {(viewingProduct.original_image || viewingProduct.image) && (
                    <img 
                      src={((viewingProduct.original_image || viewingProduct.image) ?? '').startsWith('http') ? (viewingProduct.original_image || viewingProduct.image) ?? '' : `${MEDIA_BASE}${viewingProduct.original_image || viewingProduct.image}`}
                      className="w-full h-full object-contain mix-blend-multiply"
                      alt="Original"
                    />
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-sky-600">SI Natijasi (HD Isolation)</span>
                  {statusBadge(viewingProduct)}
                </div>
                <div className="aspect-[3/4] rounded-[32px] bg-[#f8f9fa] border-4 border-white shadow-xl overflow-hidden relative border-dashed border-sky-100">
                  {viewingProduct.image_no_bg ? (
                    <img 
                      src={viewingProduct.image_no_bg.startsWith('http') ? viewingProduct.image_no_bg : `${MEDIA_BASE}${viewingProduct.image_no_bg}`}
                      className="w-full h-full object-contain relative z-10"
                      alt="Processed"
                    />
                  ) : viewingProduct.ai_status === 'error' ? (
                    <div className="w-full h-full flex flex-col items-center justify-center text-red-400 p-8 text-center bg-red-50/20">
                      <AlertCircle size={48} className="mb-4" />
                      <p className="font-black text-sm uppercase tracking-widest mb-2">SI Xatoga Uchradi</p>
                      <p className="text-xs font-medium leading-relaxed opacity-70 mb-6">{viewingProduct.ai_error || "Noma'lum texnik xatolik"}</p>
                      <button 
                        onClick={() => handleReprocess(viewingProduct.id)}
                        className="px-6 py-2.5 bg-red-500 text-white rounded-xl text-xs font-black shadow-lg shadow-red-500/20 active:scale-95 transition-all"
                      >
                        Qayta Urinish
                      </button>
                    </div>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 gap-4">
                      <Package size={48} />
                      <p className="font-bold text-xs">Hali ishlov berilmagan</p>
                    </div>
                  )}
                  
                  {viewingProduct.ai_status === 'processing' && (
                    <div className="absolute inset-0 z-20 bg-white/70 backdrop-blur-md flex flex-col items-center justify-center gap-6">
                      <div className="w-16 h-16 border-[6px] border-[#0067a5] border-t-transparent rounded-full animate-spin" />
                      <div className="text-center">
                        <p className="text-slate-900 text-sm font-black uppercase tracking-[0.2em] mb-1">AI Ishlov bermoqda</p>
                        <p className="text-slate-400 text-[10px] font-bold">Kuting, natija yaqin...</p>
                      </div>
                    </div>
                  )}
                  <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#000 2px, transparent 0)', backgroundSize: '12px 12px' }} />
                </div>
              </div>
            </div>

            <div className="bg-[#f8f9fa] p-8 rounded-[32px] border border-slate-100">
              <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-[#0067a5] rounded-full" />
                Tavsif va Meta
              </h4>
              <p className="text-sm text-slate-500 font-medium leading-relaxed">{viewingProduct.description || "Ushbu mahsulot uchun batafsil tavsif kiritilmagan."}</p>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className={cn(
              "fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-4 px-8 py-4 rounded-[24px] shadow-2xl border-2",
              toast.type === 'success' ? 'bg-emerald-900 border-emerald-800 text-white' : 'bg-red-900 border-red-800 text-white'
            )}
          >
            {toast.type === 'success' ? (
              <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center"><CheckCircle2 size={18} className="text-white" /></div>
            ) : (
              <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center"><AlertCircle size={18} className="text-white" /></div>
            )}
            <span className="text-sm font-black tracking-tight">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>


      {/* Product Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-2xl p-8 space-y-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                  {editing ? 'Mahsulotni tahrirlash' : 'Yangi mahsulot'}
                </h2>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Barcha maydonlarni to'ldiring</p>
              </div>
              <button onClick={() => setShowForm(false)} className="w-10 h-10 bg-slate-50 hover:bg-red-50 hover:text-red-500 text-slate-400 rounded-full flex items-center justify-center transition-all">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-6">
              {/* Name */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2">Mahsulot nomi</label>
                <input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-100 rounded-[20px] px-5 py-3.5 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 transition-all"
                  placeholder="Masalan: Viktoriya eman eshik"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2">Tavsif</label>
                <textarea
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  rows={3}
                  className="w-full bg-slate-50 border border-slate-100 rounded-[24px] px-5 py-3.5 text-sm font-medium focus:outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 transition-all"
                  placeholder="Mahsulot haqida ma'lumot..."
                />
              </div>

              {/* Category + Company */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2">Kategoriya</label>
                  <select
                    value={formCat}
                    onChange={(e) => setFormCat(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-100 rounded-[20px] px-5 py-3.5 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 transition-all appearance-none"
                  >
                    <option value="">Tanlang...</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2">Kompaniya</label>
                  <select
                    value={formComp}
                    onChange={(e) => setFormComp(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-100 rounded-[20px] px-5 py-3.5 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 transition-all appearance-none"
                  >
                    <option value="">Platform mahsuloti</option>
                    {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>

              {/* Pricing Section */}
              <div className="bg-slate-50/80 p-6 rounded-[28px] border border-slate-100 space-y-4">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Narxlash</p>

                {/* Pricing type toggle */}
                <div className="flex p-1 bg-white rounded-2xl border border-slate-100">
                  <button type="button" onClick={() => setFormPricingType('total')} className={cn("flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", formPricingType === 'total' ? "bg-slate-900 text-white shadow-md" : "text-slate-400")}>Qat'iy narx</button>
                  <button type="button" onClick={() => setFormPricingType('per_m2')} className={cn("flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", formPricingType === 'per_m2' ? "bg-slate-900 text-white shadow-md" : "text-slate-400")}>m² uchun</button>
                </div>

                {formPricingType === 'total' ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2">Umumiy narx (UZS)</label>
                      <input
                        type="number"
                        value={formPrice}
                        onChange={(e) => setFormPrice(e.target.value)}
                        className="w-full bg-white border border-slate-100 rounded-[20px] px-5 py-3.5 text-lg font-black focus:outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 transition-all"
                        placeholder="0"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[9px] font-bold text-slate-400 uppercase ml-1 mb-1">Balandligi (sm)</label>
                        <input type="number" value={formHeight} onChange={(e) => setFormHeight(e.target.value)} className="w-full bg-white border border-slate-100 rounded-xl py-3 px-4 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-sky-500/10" />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-400 uppercase ml-1 mb-1">Kengligi (sm)</label>
                        <input type="number" value={formWidth} onChange={(e) => setFormWidth(e.target.value)} className="w-full bg-white border border-slate-100 rounded-xl py-3 px-4 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-sky-500/10" />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2">1 m² uchun narx (UZS)</label>
                    <input
                      type="number"
                      value={formPricePerM2}
                      onChange={(e) => setFormPricePerM2(e.target.value)}
                      className="w-full bg-white border border-slate-100 rounded-[20px] px-5 py-3.5 text-lg font-black focus:outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 transition-all"
                      placeholder="0"
                    />
                  </div>
                )}
              </div>

              {/* Lead Time */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2">Tayyor bo'lish muddati (kun)</label>
                <input
                  type="number"
                  min={1}
                  value={formLeadTime}
                  onChange={(e) => setFormLeadTime(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-100 rounded-[20px] px-5 py-3.5 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 transition-all"
                  placeholder="Masalan: 3"
                />
              </div>

              {/* Sale section */}
              <div className="bg-red-50/50 border border-red-100/50 p-6 rounded-[28px] space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-red-500">Chegirma</p>
                    <p className="text-xs text-slate-400 mt-0.5">Aksiyaviy narx berish</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={formIsOnSale}
                    onChange={(e) => setFormIsOnSale(e.target.checked)}
                    className="h-5 w-5 rounded border-slate-200 text-red-500 focus:ring-red-500/20"
                  />
                </div>
                {formIsOnSale && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2">Chegirma narxi (UZS)</label>
                      <input type="number" value={formDiscountPrice} onChange={(e) => setFormDiscountPrice(e.target.value)} placeholder="0" className="w-full bg-white border border-red-100 rounded-[20px] px-5 py-3.5 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-red-500/10" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2">Aksiya tugash sanasi</label>
                      <input type="datetime-local" value={formSaleEndDate} onChange={(e) => setFormSaleEndDate(e.target.value)} className="w-full bg-white border border-red-100 rounded-[20px] px-5 py-3.5 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-red-500/10" />
                    </div>
                  </div>
                )}
              </div>

              {/* Featured toggle */}
              <div className="bg-slate-50 border border-slate-100 rounded-[20px] p-5 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Asosiy vitrina</p>
                  <p className="text-xs text-slate-400 mt-0.5">Bosh sahifada ko'rsatish</p>
                </div>
                <input
                  type="checkbox"
                  checked={formIsFeatured}
                  onChange={(e) => setFormIsFeatured(e.target.checked)}
                  className="h-5 w-5 rounded border-slate-200 text-[#0067a5] focus:ring-sky-500/20"
                />
              </div>

              {/* Image */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2">Mahsulot rasmi</label>
                <label className="flex items-center justify-between w-full bg-slate-50 border border-slate-200 border-dashed rounded-[20px] px-5 py-3.5 cursor-pointer hover:bg-sky-50 hover:border-sky-200 transition-all">
                  <span className="text-xs font-bold text-slate-500">{formImage ? formImage.name : 'Asosiy rasm tanlash...'}</span>
                  <Plus size={18} className="text-slate-400" />
                  <input type="file" accept="image/*" onChange={(e) => setFormImage(e.target.files?.[0] ?? null)} className="hidden" />
                </label>
              </div>

              {/* Gallery images */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2">
                  Gallery rasmlari (max 4)
                  {editing && editing.images?.length > 0 && (
                    <span className="ml-2 text-emerald-500">• Mavjud: {editing.images.length} ta</span>
                  )}
                </label>

                {/* Existing gallery (edit mode) */}
                {editing && editing.images?.length > 0 && (
                  <div className="flex gap-2 flex-wrap mb-3">
                    {editing.images.map(img => (
                      <div key={img.id} className="relative w-16 h-16">
                        <img
                          src={img.image.startsWith('http') ? img.image : `${MEDIA_BASE}${img.image}`}
                          alt=""
                          className="w-full h-full object-cover rounded-xl border-2 border-slate-200"
                        />
                        {img.is_main && (
                          <span className="absolute -top-1 -left-1 bg-emerald-500 text-white text-[8px] font-black px-1 py-0.5 rounded-full">
                            MAIN
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* New gallery uploads */}
                <div className="flex gap-2 flex-wrap">
                  {formGalleryPreviews.map((src, i) => (
                    <div key={i} className="relative w-16 h-16">
                      <img src={src} alt="" className="w-full h-full object-cover rounded-xl border-2 border-blue-300" />
                      {i === 0 && (
                        <span className="absolute -top-1 -left-1 bg-blue-500 text-white text-[8px] font-black px-1 py-0.5 rounded-full">MAIN</span>
                      )}
                      <button
                        type="button"
                        onClick={() => removeGalleryItem(i)}
                        className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center text-[10px] font-black"
                      >×</button>
                    </div>
                  ))}
                  {formGalleryFiles.length < 4 && (
                    <label className="w-16 h-16 border-2 border-dashed border-slate-300 rounded-xl flex items-center justify-center cursor-pointer hover:border-blue-400 transition-colors">
                      <Plus size={20} className="text-slate-400" />
                      <input
                        ref={galleryInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleGalleryAdd}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
                <p className="text-[10px] text-slate-400 mt-1.5 ml-1">1-rasm avtomatik PRIMARY (AI uchun) deb belgilanadi</p>
              </div>

              {/* Submit */}
              <button
                onClick={handleSubmit}
                disabled={saving || !formName.trim() || !formCat}
                className="w-full h-14 bg-slate-900 text-white font-black rounded-[20px] uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/10 disabled:opacity-50 active:scale-[0.98]"
              >
                {saving ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>{editing ? "O'zgarishlarni saqlash" : 'Yangi mahsulot yaratish'}</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
