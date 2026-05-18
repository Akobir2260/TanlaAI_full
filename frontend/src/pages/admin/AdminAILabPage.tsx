import { useEffect, useState, useCallback } from "react";
import {
  Search,
  FlaskConical as Beaker,
  Upload,
  Send,
  Trash2,
  ChevronRight,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Info,
  Clock,
  ExternalLink,
  Plus,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import apiClient from "../../api/client";
import { cn } from "../../utils/cn";

type Product = {
  id: number;
  name: string;
  image: string | null;
  image_no_bg: string | null;
  ai_status: string;
};

type PipelineMeta = {
  detection_method?: string;
  final_result?: string;
  image_edit_engine?: string;
  mode?: string;
  [key: string]: unknown;
};

type AITestMetadata = {
  pipeline?: PipelineMeta;
  [key: string]: unknown;
};

type AITest = {
  id: number;
  door: number;
  door_details: Product;
  room_image: string;
  prompt: string | null;
  result_image: string | null;
  metadata: AITestMetadata;
  created_at: string;
};

const MEDIA_BASE = import.meta.env.VITE_BACKEND_ORIGIN || "";

export default function AdminAILabPage() {
  const [tests, setTests] = useState<AITest[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  // Selection
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showProductPicker, setShowProductPicker] = useState(false);

  // Test Data
  const [roomFile, setRoomFile] = useState<File | null>(null);
  const [roomPreview, setRoomPreview] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");

  // UI State
  const [activeTab, setActiveTab] = useState<"create" | "history">("create");
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const fetchTests = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get("admin/ai-tests/");
      setTests(data.results ?? data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchProducts = useCallback(async (q = "") => {
    try {
      const { data } = await apiClient.get("admin/products/", {
        params: { search: q },
      });
      setProducts(data.results ?? data);
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    fetchTests();
    fetchProducts();
  }, [fetchTests, fetchProducts]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (showProductPicker) fetchProducts(search);
    }, 400);
    return () => clearTimeout(t);
  }, [search, showProductPicker, fetchProducts]);

  const handleRoomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setRoomFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setRoomPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const showToast = (
    message: string,
    type: "success" | "error" = "success",
  ) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleRunTest = async () => {
    if (!selectedProduct || !roomFile) {
      showToast("Eshik va rasm tanlanishi shart!", "error");
      return;
    }

    setRunning(true);
    try {
      // 1. Create the test entry first to get an ID
      const fd = new FormData();
      fd.append("door", String(selectedProduct.id));
      fd.append("room_image", roomFile);
      if (prompt.trim()) fd.append("prompt", prompt.trim());

      const { data: testObj } = await apiClient.post("admin/ai-tests/", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      // 2. Run the actual AI pipeline
      const { data: result } = await apiClient.post(
        `admin/ai-tests/${testObj.id}/run_test/`,
      );

      setTests((prev) => [result, ...prev]);
      setActiveTab("history");
      showToast("Test muvaffaqiyatli yakunlandi!");

      // Reset form
      setSelectedProduct(null);
      setRoomFile(null);
      setRoomPreview(null);
      setPrompt("");
    } catch (err: unknown) {
      console.error(err);
      const e = err as { response?: { data?: { error?: string } } };
      showToast(
        e.response?.data?.error || "AI Testida xatolik yuz berdi",
        "error",
      );
    } finally {
      setRunning(false);
    }
  };

  const handleDeleteTest = async (id: number) => {
    if (!confirm("Ushbu test natijasini o'chirmoqchimisiz?")) return;
    try {
      await apiClient.delete(`admin/ai-tests/${id}/`);
      setTests((prev) => prev.filter((t) => t.id !== id));
      showToast("O'chirildi");
    } catch {
      showToast("Xatolik", "error");
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pb-6 border-b border-slate-200/60">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 bg-sky-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-sky-600/20">
              <Beaker size={20} />
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              AI Laboratory
            </h1>
          </div>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest ml-14">
            Vizualizatsiya pipeline'ni test qilish va debug
          </p>
        </div>

        <div className="flex bg-white p-1 rounded-2xl shadow-sm border border-slate-100">
          <button
            onClick={() => setActiveTab("create")}
            className={cn(
              "px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all",
              activeTab === "create"
                ? "bg-slate-900 text-white shadow-lg"
                : "text-slate-400 hover:text-slate-600",
            )}
          >
            Yangi Test
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={cn(
              "px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all",
              activeTab === "history"
                ? "bg-slate-900 text-white shadow-lg"
                : "text-slate-400 hover:text-slate-600",
            )}
          >
            Tarix ({tests.length})
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "create" ? (
          <motion.div
            key="create"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-8"
          >
            {/* Left Column: Form */}
            <div className="lg:col-span-2 space-y-8">
              <div className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-sm space-y-8">
                {/* Step 1: Select Door */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-black text-slate-800 flex items-center gap-3">
                      <span className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs text-slate-500">
                        1
                      </span>
                      Eshik tanlash
                    </h3>
                    {selectedProduct && (
                      <button
                        onClick={() => setSelectedProduct(null)}
                        className="text-[10px] font-bold text-red-500 uppercase tracking-widest hover:underline"
                      >
                        Almashtirish
                      </button>
                    )}
                  </div>

                  {!selectedProduct ? (
                    <button
                      onClick={() => setShowProductPicker(true)}
                      className="w-full flex flex-col items-center justify-center py-12 border-2 border-dashed border-slate-100 rounded-[24px] hover:border-sky-300 hover:bg-sky-50/30 transition-all group"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center group-hover:bg-sky-100 group-hover:text-sky-600 transition-all mb-4">
                        <Plus size={24} />
                      </div>
                      <p className="text-sm font-bold text-slate-500 group-hover:text-sky-600">
                        Katalogdan eshikni tanlang
                      </p>
                    </button>
                  ) : (
                    <div className="flex items-center gap-6 p-4 bg-slate-50 rounded-[20px] border border-slate-100">
                      <div className="w-20 h-28 bg-white rounded-xl border border-slate-200 p-2 flex items-center justify-center overflow-hidden flex-shrink-0">
                        <img
                          src={
                            selectedProduct.image?.startsWith("http")
                              ? selectedProduct.image
                              : `${MEDIA_BASE}${selectedProduct.image}`
                          }
                          className="max-w-full max-h-full object-contain mix-blend-multiply"
                          alt={selectedProduct.name}
                        />
                      </div>
                      <div>
                        <p className="text-base font-black text-slate-800 mb-1">
                          {selectedProduct.name}
                        </p>
                        <span
                          className={cn(
                            "inline-block px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider",
                            selectedProduct.ai_status === "completed"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-amber-100 text-amber-700",
                          )}
                        >
                          AI {selectedProduct.ai_status}
                        </span>
                      </div>
                      <div className="ml-auto">
                        <div className="p-3 bg-emerald-500 text-white rounded-full">
                          <CheckCircle2 size={18} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Step 2: Upload Room */}
                <div className="space-y-4">
                  <h3 className="text-lg font-black text-slate-800 flex items-center gap-3">
                    <span className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs text-slate-500">
                      2
                    </span>
                    Xona rasmi
                  </h3>

                  <div className="relative group">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleRoomChange}
                      className="absolute inset-0 opacity-0 cursor-pointer z-10"
                    />
                    {!roomPreview ? (
                      <div className="w-full h-64 border-2 border-dashed border-slate-100 rounded-[24px] flex flex-col items-center justify-center bg-slate-50/50 group-hover:border-sky-300 group-hover:bg-sky-50 transition-all">
                        <Upload
                          className="text-slate-300 group-hover:text-sky-500 mb-4 transition-all"
                          size={32}
                        />
                        <p className="text-sm font-bold text-slate-400 group-hover:text-sky-600">
                          Rasmni yuklang yoki bu yerga tashlang
                        </p>
                        <p className="text-[10px] text-slate-300 font-bold uppercase mt-2">
                          PNG, JPG gacha 10MB
                        </p>
                      </div>
                    ) : (
                      <div className="w-full h-80 rounded-[24px] overflow-hidden relative shadow-lg">
                        <img
                          src={roomPreview}
                          className="w-full h-full object-cover"
                          alt="Room Preview"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                          <p className="text-white text-xs font-black uppercase tracking-widest">
                            Rasmni almashtirish
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Step 3: Test Notes */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-black text-slate-800 flex items-center gap-3">
                      <span className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs text-slate-500">
                        3
                      </span>
                      Test Eslatmasi (Ixtiyoriy)
                    </h3>
                    <div className="flex items-center gap-2 group cursor-help">
                      <Info
                        size={14}
                        className="text-slate-300 group-hover:text-sky-500 transition-colors"
                      />
                      <span className="text-[10px] font-bold text-slate-300 group-hover:text-slate-500 uppercase tracking-widest transition-colors">
                        Yordam
                      </span>
                    </div>
                  </div>

                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Masalan: ochilish chap tomonga siljib ketdi yoki pastki shadow kuchsiz..."
                    className="w-full h-32 p-6 bg-slate-50 border border-slate-100 rounded-[24px] text-sm font-medium focus:outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 transition-all placeholder:text-slate-300"
                  />
                  <p className="text-[10px] text-slate-400 font-medium px-2 leading-relaxed">
                    * Bu maydon kreativ prompt emas. Pipeline xona va eshik
                    dizaynini lock qiladi; bu yerga faqat debug note yoki
                    kuzatuv yozuvi saqlanadi.
                  </p>
                </div>

                <div className="pt-4">
                  <button
                    onClick={handleRunTest}
                    disabled={running || !selectedProduct || !roomFile}
                    className={cn(
                      "w-full py-5 rounded-[24px] text-base font-black uppercase tracking-[0.1em] transition-all flex items-center justify-center gap-4 shadow-xl",
                      running || !selectedProduct || !roomFile
                        ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                        : "bg-sky-600 text-white hover:bg-sky-700 active:scale-[0.98] shadow-sky-600/20",
                    )}
                  >
                    {running ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        AI Pipeline ishga tushirildi...
                      </>
                    ) : (
                      <>
                        <Send size={20} />
                        Vizualizatsiyani boshlash
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column: Tips / Sidebar */}
            <div className="space-y-6">
              <div className="bg-slate-900 rounded-[32px] p-8 text-white shadow-2xl overflow-hidden relative">
                <div className="relative z-10">
                  <h4 className="text-sm font-black uppercase tracking-widest text-sky-400 mb-6 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-sky-500 rounded-full animate-blink" />
                    Lab Qo'llanmasi
                  </h4>
                  <ul className="space-y-6">
                    <li className="flex gap-4">
                      <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                        <Clock size={16} className="text-sky-300" />
                      </div>
                      <div>
                        <p className="text-xs font-bold mb-1">Kutish vaqti</p>
                        <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
                          Test jarayoni 10-30 soniya olishi mumkin. Brauzerni
                          yopmang.
                        </p>
                      </div>
                    </li>
                    <li className="flex gap-4">
                      <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                        <Beaker size={16} className="text-sky-300" />
                      </div>
                      <div>
                        <p className="text-xs font-bold mb-1">Eksperimentlar</p>
                        <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
                          Siz turli xil yorug'lik va burchakdagi xonalarni sinab
                          ko'rishingiz mumkin.
                        </p>
                      </div>
                    </li>
                  </ul>
                </div>
                {/* Background decoration */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/10 blur-3xl -mr-16 -mt-16 rounded-full" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-500/10 blur-3xl -ml-16 -mb-16 rounded-full" />
              </div>

              <div className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-sm">
                <h4 className="text-[11px] font-black uppercase tracking-widest text-[#0067a5] mb-6">
                  Oxirgi Testlar
                </h4>
                <div className="space-y-5">
                  {tests.slice(0, 3).map((t) => (
                    <div
                      key={t.id}
                      className="flex items-center gap-4 group cursor-pointer"
                      onClick={() => setActiveTab("history")}
                    >
                      <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 overflow-hidden">
                        {t.result_image ? (
                          <img
                            src={
                              t.result_image.startsWith("http")
                                ? t.result_image
                                : `${MEDIA_BASE}/media/${t.result_image}`
                            }
                            className="w-full h-full object-cover"
                            alt="Run"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-300">
                            <Clock size={16} />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-black text-slate-700 truncate">
                          {t.door_details.name}
                        </p>
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight mt-0.5">
                          {new Date(t.created_at).toLocaleTimeString()}
                        </p>
                      </div>
                      <ChevronRight
                        size={14}
                        className="text-slate-300 group-hover:text-slate-600 transition-all group-hover:translate-x-1"
                      />
                    </div>
                  ))}
                  {tests.length === 0 && (
                    <p className="text-center text-[10px] text-slate-300 font-bold uppercase py-4">
                      Tarix bo'sh
                    </p>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="history"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {loading && tests.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-32 text-slate-300">
                <div className="w-12 h-12 border-4 border-slate-200 border-t-sky-600 rounded-full animate-spin mb-6" />
                <p className="text-xs font-black uppercase tracking-widest text-slate-400">
                  Tarix yuklanmoqda...
                </p>
              </div>
            ) : tests.length === 0 ? (
              <div className="bg-white rounded-[40px] border border-slate-100 p-24 text-center">
                <ImageIcon size={64} className="mx-auto text-slate-100 mb-6" />
                <h5 className="text-lg font-black text-slate-400 mb-2">
                  Siz hali test amalga oshirmadingiz
                </h5>
                <button
                  onClick={() => setActiveTab("create")}
                  className="text-sky-600 font-black text-xs uppercase tracking-widest hover:underline"
                >
                  Laboratoriyani boshlash
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                {tests.map((t) => (
                  <div
                    key={t.id}
                    className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden flex flex-col group hover:shadow-xl transition-all hover:-translate-y-1"
                  >
                    <div className="aspect-video relative overflow-hidden bg-slate-50">
                      {t.result_image ? (
                        <img
                          src={
                            t.result_image.startsWith("http")
                              ? t.result_image
                              : `${MEDIA_BASE}/media/${t.result_image}`
                          }
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                          alt="Result"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 gap-4">
                          <Clock size={32} />
                          <p className="text-[10px] font-black uppercase tracking-widest">
                            Natija kutilmoqda
                          </p>
                        </div>
                      )}
                      <div className="absolute top-4 left-4 bg-white/90 backdrop-blur shadow-xl rounded-xl px-3 py-1.5 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span className="text-[10px] font-black text-slate-800">
                          #{t.id} TEST
                        </span>
                      </div>
                      <button
                        onClick={() => handleDeleteTest(t.id)}
                        className="absolute top-4 right-4 w-10 h-10 bg-white/20 hover:bg-red-500 backdrop-blur hover:text-white rounded-xl flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <div className="p-6 space-y-4 flex-1 flex flex-col">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">
                            Eshik
                          </p>
                          <p className="text-sm font-black text-slate-800 truncate">
                            {t.door_details.name}
                          </p>
                          {t.metadata?.pipeline?.detection_method && (
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">
                              Locked scene ·{" "}
                              {String(t.metadata.pipeline.detection_method)}
                            </p>
                          )}
                        </div>
                        <div className="w-10 h-14 bg-slate-50 rounded-lg flex-shrink-0 border border-slate-100 p-1 flex items-center justify-center">
                          <img
                            src={
                              t.door_details.image?.startsWith("http")
                                ? t.door_details.image
                                : `${MEDIA_BASE}${t.door_details.image}`
                            }
                            className="max-w-full max-h-full object-contain mix-blend-multiply"
                            alt="Door"
                          />
                        </div>
                      </div>

                      {t.prompt && (
                        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">
                            Test Note
                          </p>
                          <p className="text-[11px] text-slate-600 font-medium italic line-clamp-2">
                            "{t.prompt}"
                          </p>
                        </div>
                      )}

                      <div className="mt-auto pt-4 flex items-center justify-between border-t border-slate-50">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black px-2 py-0.5 bg-sky-100 text-sky-700 rounded-md">
                            {t.metadata?.pipeline?.final_result ===
                            "ai_masked_refine"
                              ? "AI refine"
                              : "OpenCV lock"}
                          </span>
                          <span className="text-[9px] text-slate-300 font-bold uppercase tracking-widest">
                            {new Date(t.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <a
                          href={
                            t.result_image?.startsWith("http")
                              ? t.result_image
                              : `${MEDIA_BASE}/media/${t.result_image}`
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-10 h-10 bg-slate-100 hover:bg-sky-50 text-slate-400 hover:text-sky-600 rounded-xl flex items-center justify-center transition-all"
                        >
                          <ExternalLink size={16} />
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Product Picker Modal */}
      {showProductPicker && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-md z-[80] flex items-center justify-center p-4"
          onClick={() => setShowProductPicker(false)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-[40px] w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-8 border-b border-slate-100">
              <div className="flex items-center justify-between mb-6">
                <h4 className="text-xl font-black text-slate-900">
                  Eshik tanlash
                </h4>
                <button
                  onClick={() => setShowProductPicker(false)}
                  className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-all"
                >
                  <Trash2 size={18} className="rotate-45" />{" "}
                  {/* Just an X icon trick */}
                </button>
              </div>
              <div className="relative">
                <Search
                  size={18}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"
                />
                <input
                  type="text"
                  autoFocus
                  placeholder="Nomi bo'yicha qidirish..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 transition-all"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {products.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setSelectedProduct(p);
                    setShowProductPicker(false);
                  }}
                  className="w-full flex items-center gap-6 p-4 hover:bg-slate-50 rounded-2xl transition-all group border border-transparent hover:border-slate-100"
                >
                  <div className="w-14 h-20 bg-white rounded-lg border border-slate-100 p-1 flex items-center justify-center shadow-sm">
                    <img
                      src={
                        p.image?.startsWith("http")
                          ? p.image
                          : `${MEDIA_BASE}${p.image}`
                      }
                      className="max-w-full max-h-full object-contain mix-blend-multiply"
                      alt="p"
                    />
                  </div>
                  <div className="text-left flex-1 min-w-0">
                    <p className="text-sm font-black text-slate-800 mb-1 group-hover:text-sky-600 transition-colors">
                      {p.name}
                    </p>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      {p.ai_status}
                    </span>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                    <ChevronRight size={16} className="text-sky-600" />
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        </div>
      )}

      {/* Global Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className={cn(
              "fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-4 px-8 py-4 rounded-[24px] shadow-2xl border-2",
              toast.type === "success"
                ? "bg-emerald-900 border-emerald-800 text-white"
                : "bg-red-900 border-red-800 text-white",
            )}
          >
            {toast.type === "success" ? (
              <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center flex-shrink-0">
                <CheckCircle2 size={18} className="text-white" />
              </div>
            ) : (
              <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0">
                <AlertCircle size={18} className="text-white" />
              </div>
            )}
            <span className="text-sm font-black tracking-tight">
              {toast.message}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
