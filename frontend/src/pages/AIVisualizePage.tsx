import React, { useState, useEffect, useRef } from "react";
import { isAxiosError } from "axios";
import { useParams, useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  Camera,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  RefreshCcw,
  Share2,
  ShoppingBag,
  ArrowLeftRight,
  Wand2,
  ImageIcon,
  Send,
} from "lucide-react";
import apiClient from "../api/client";
import type { Product } from "../types";
import { useTelegram } from "../contexts/useTelegram";

interface AIUploadResponse {
  status: "ok" | "error" | "processing" | "preparing";
  message?: string;
  code?: string;
  limit?: number;
  request_id?: string;
}

interface RoomAnalysisSummary {
  door_found: boolean;
  geometry_source: string;
  detection_method: string;
  wall_angle: number;
  design_dna: string;
  preserve_elements: string[];
  lighting: {
    direction: string;
    warmth: string;
    intensity: number;
  };
}

interface GenerationMeta {
  engine?: string;
  model?: string;
  mode?: string;
  product_description?: string;
  response_text?: string;
}

interface PipelineMeta {
  version?: string;
  room_analysis_engine?: string;
  image_edit_engine?: string;
  model?: string;
  mode?: string;
  detection_method?: string;
  post_processed?: boolean;
  annotation_box?: number[];
}

interface AIPollResponse {
  status: "done" | "error" | "processing" | "pending";
  image_url?: string;
  message?: string;
  analysis?: RoomAnalysisSummary;
  generation_prompt?: string;
  generation_meta?: GenerationMeta;
  pipeline?: PipelineMeta;
}

// Progress steps for loading state (reflects Gemini Direct v5 pipeline)
const LOADING_STEPS = [
  { label: "Rasmlar yuklanmoqda...", duration: 2500 },
  { label: "Xona va eshik o'lchami aniqlanmoqda...", duration: 5000 },
  { label: "AI yordamida realistik o'rnatilmoqda...", duration: 10000 },
  { label: "Yorug'lik va soya moslashtirilmoqda...", duration: 4000 },
  { label: "Natija tayyorlanmoqda...", duration: 3000 },
];

const AIVisualizePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [status, setStatus] = useState<
    "idle" | "uploading" | "processing" | "done" | "error"
  >("idle");
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<RoomAnalysisSummary | null>(null);
  const [pipelineMeta, setPipelineMeta] = useState<PipelineMeta | null>(null);
  const [currentRequestId, setCurrentRequestId] = useState<string | null>(null);
  const [loadingStep, setLoadingStep] = useState(0);
  const [showBeforeAfter, setShowBeforeAfter] = useState(false);
  const [sliderPos, setSliderPos] = useState(20);
  const sliderRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollTimeoutRef = useRef<number | null>(null);
  const retryTimeoutRef = useRef<number | null>(null);
  const loadingStepTimerRef = useRef<number | null>(null);
  const { haptic, webApp } = useTelegram();
  const [isSaving, setIsSaving] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  // Loading step progression
  useEffect(() => {
    if (status === "uploading" || status === "processing") {
      setLoadingStep(0);
      let currentStep = 0;
      const advanceStep = () => {
        currentStep++;
        if (currentStep < LOADING_STEPS.length) {
          setLoadingStep(currentStep);
          loadingStepTimerRef.current = window.setTimeout(
            advanceStep,
            LOADING_STEPS[currentStep].duration,
          );
        }
      };
      loadingStepTimerRef.current = window.setTimeout(
        advanceStep,
        LOADING_STEPS[0].duration,
      );
    } else {
      if (loadingStepTimerRef.current) {
        window.clearTimeout(loadingStepTimerRef.current);
      }
    }
    return () => {
      if (loadingStepTimerRef.current) {
        window.clearTimeout(loadingStepTimerRef.current);
      }
    };
  }, [status]);

  const startPolling = React.useCallback(
    (productId: number, requestId?: string) => {
      const poll = async () => {
        try {
          const response = await apiClient.get<AIPollResponse>(
            `/products/${productId}/ai-generate/result/`,
            {
              params: requestId ? { request_id: requestId } : undefined,
            },
          );
          if (response.data.status === "done") {
            setResultImage(response.data.image_url ?? null);
            setAnalysis(response.data.analysis ?? null);
            setPipelineMeta(response.data.pipeline ?? null);
            setStatus("done");
            haptic("heavy");
          } else if (response.data.status === "error") {
            setStatus("error");
            setError(response.data.message || "AI processing failed");
          } else {
            pollTimeoutRef.current = window.setTimeout(poll, 3000);
          }
        } catch (err) {
          console.error("Polling error:", err);
          setStatus("error");
          setError("Connection lost while processing");
        }
      };

      void poll();
    },
    [haptic],
  );

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const response = await apiClient.get<Product>(`/products/${id}/`);
        setProduct(response.data);
      } catch (err) {
        console.error("Error fetching product:", err);
      }
    };

    void fetchProduct();

    return () => {
      if (pollTimeoutRef.current) window.clearTimeout(pollTimeoutRef.current);
      if (retryTimeoutRef.current) window.clearTimeout(retryTimeoutRef.current);
    };
  }, [id, startPolling]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
      setPreview(URL.createObjectURL(file));
      setStatus("idle");
      setError(null);
      setAnalysis(null);
      setPipelineMeta(null);
      setCurrentRequestId(null);
      haptic("light");
    }
  };

  const handleUpload = async () => {
    if (!image || !product) return;
    setStatus("uploading");
    haptic("medium");

    const formData = new FormData();
    formData.append("room_photo", image);
    
    console.log("DEBUG [AI]: Starting upload for product:", product.id);
    console.log("DEBUG [AI]: Room image file:", image.name, image.size, image.type);

    try {
      const response = await apiClient.post<AIUploadResponse>(
        `/products/${product.id}/ai-generate/`,
        formData,
      );

      if (
        response.data.status === "ok" ||
        response.data.status === "processing"
      ) {
        setCurrentRequestId(response.data.request_id ?? null);
        setStatus("processing");
        setError(null);
        startPolling(product.id, response.data.request_id);
      } else if (response.data.status === "preparing") {
        setStatus("processing");
        setError("Mahsulot tayyorlanmoqda...");
        retryTimeoutRef.current = window.setTimeout(() => {
          void handleUpload();
        }, 5000);
      } else {
        setStatus("error");
        setError(response.data.message || "Server error");
      }
    } catch (error: unknown) {
      setStatus("error");
      let msg = "Rasmni yuklashda xatolik";
      if (isAxiosError<{ message?: string; error?: string }>(error)) {
        msg =
          error.response?.data?.message ||
          error.response?.data?.error ||
          `Server xatoligi (${error.response?.status})`;
      } else if (error instanceof Error) {
        msg = error.message;
      }
      setError(msg);
    }
  };

  // Before/After slider logic
  const handleSliderMove = (clientX: number) => {
    if (!sliderRef.current) return;
    const rect = sliderRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const pct = Math.min(100, Math.max(0, (x / rect.width) * 100));
    setSliderPos(pct);
  };

  const handleMouseDown = () => {
    isDragging.current = true;
  };
  const handleMouseUp = () => {
    isDragging.current = false;
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging.current) handleSliderMove(e.clientX);
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    handleSliderMove(e.touches[0].clientX);
  };

  const resetAll = () => {
    setStatus("idle");
    setPreview(null);
    setImage(null);
    setResultImage(null);
    setError(null);
    setAnalysis(null);
    setPipelineMeta(null);
    setCurrentRequestId(null);
    setShowBeforeAfter(false);
    setSliderPos(20);
    setIsSaving(false);
    setIsSharing(false);
  };

  const handleSave = async () => {
    if (!currentRequestId) return;
    setIsSaving(true);
    haptic("medium");
    
    try {
      await apiClient.post(`/ai-results/${currentRequestId}/send-to-bot/`);
      alert("✅ Rasmlar Telegram botingizga yuborildi!");
    } catch (err) {
      console.error("Save error:", err);
      alert("Botga yuborishda xatolik yuz berdi");
    } finally {
      setIsSaving(false);
    }
  };

  const handleShare = async () => {
    if (!currentRequestId || !product) return;
    setIsSharing(true);
    haptic("medium");

    try {
      const res = await apiClient.post<{ share_url: string }>(`/ai-results/${currentRequestId}/create-share/`);
      const { share_url } = res.data;

      const shareText = `${product.name} vizualizatsiyasi ✨`;
      const telegramShareUrl = `https://t.me/share/url?url=${encodeURIComponent(share_url)}&text=${encodeURIComponent(shareText)}`;

      if (webApp?.openTelegramLink) {
        webApp.openTelegramLink(telegramShareUrl);
      } else {
        window.open(telegramShareUrl, '_blank');
      }
    } catch (err) {
      console.error("Share error:", err);
      alert("Ulashishda xatolik yuz berdi");
    } finally {
      setIsSharing(false);
    }
  };

  const isLoading = status === "uploading" || status === "processing";
  const currentLoadingLabel =
    LOADING_STEPS[loadingStep]?.label ?? "Ishlanmoqda...";

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white pb-44">
      {/* ─── HEADER ─── */}
      <div className="relative px-5 pt-8 pb-4 text-center space-y-1">
        {/* Back Button */}
        <button 
          onClick={() => { haptic('light'); navigate(-1); }}
          className="absolute left-5 top-8 w-10 h-10 rounded-full flex items-center justify-center bg-white shadow-sm border border-slate-100 active:scale-90 transition-transform"
        >
          <ChevronLeft size={20} className="text-slate-700" />
        </button>

        <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest mb-3">
          <Sparkles size={12} />
          Gemini AI
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900 leading-tight">
          Xonangizga eshikni
          <br />
          vizual o'rnating
        </h1>
        <p className="text-xs text-slate-400 font-medium pt-1">
          Xona rasmingizni yuklang — AI eshikni o'rnatib ko'rsatadi
        </p>
      </div>

      {/* ─── PRODUCT + ROOM CARDS ─── */}
      {product && (
        <div className="px-5 mt-2">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="flex items-stretch">
              {/* Door card */}
              <div className="flex-1 flex flex-col items-center justify-center p-4 gap-2 border-r border-slate-100">
                <div className="w-20 h-20 rounded-2xl overflow-hidden bg-slate-50 border border-slate-100 shadow-sm">
                  {product.image ? (
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                      <ImageIcon size={24} />
                    </div>
                  )}
                </div>
                <div className="text-center">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Eshik
                  </p>
                  <p className="text-xs font-bold text-slate-800 mt-0.5 line-clamp-2">
                    {product.name}
                  </p>
                </div>
              </div>

              {/* Arrow */}
              <div className="flex items-center justify-center w-10 flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <ArrowLeftRight size={14} className="text-primary" />
                </div>
              </div>

              {/* Room card */}
              <div
                className="flex-1 flex flex-col items-center justify-center p-4 gap-2 cursor-pointer active:bg-primary/5 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="w-20 h-20 rounded-2xl overflow-hidden bg-primary/5 border-2 border-dashed border-primary/20 flex items-center justify-center">
                  {preview ? (
                    <img
                      src={preview}
                      alt="Xona"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Camera size={28} className="text-primary/40" />
                  )}
                </div>
                <div className="text-center">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Xona
                  </p>
                  <p className="text-xs font-bold text-primary mt-0.5">
                    {preview ? "Rasm tanlandi ✓" : "Rasm yuklash"}
                  </p>
                </div>
              </div>
            </div>
          </div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept="image/*"
          />
        </div>
      )}

      {/* ─── IDLE: Upload area + dimensions ─── */}
      {status === "idle" && (
        <div className="px-5 mt-5 space-y-4">
          {/* Upload zone */}
          {!preview ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-primary/20 bg-primary/3 rounded-[32px] aspect-[4/3] flex flex-col items-center justify-center cursor-pointer active:scale-[0.98] transition-all relative overflow-hidden group"
            >
              <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center shadow-lg mb-5 text-primary group-active:scale-95 transition-transform">
                <Camera size={32} />
              </div>
              <p className="text-base font-bold text-slate-800">
                Xona rasmini yuklang
              </p>
              <p className="text-xs text-slate-400 mt-2 px-10 text-center leading-relaxed">
                Eshik ko'rinadigan xona rasmi eng yaxshi natija beradi
              </p>
              <div className="flex gap-2 mt-4 flex-wrap justify-center px-6">
                {["JPG", "PNG", "HEIC"].map((fmt) => (
                  <span
                    key={fmt}
                    className="text-[10px] font-bold bg-white/80 border border-slate-100 rounded-full px-2.5 py-1 text-slate-500"
                  >
                    {fmt}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div className="relative rounded-[32px] overflow-hidden shadow-lg">
           <img src={preview} alt="Xona rasmi" className="w-full h-auto block max-h-[70vh] object-contain" />

              <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm text-slate-800 text-xs font-bold px-4 py-2 rounded-full shadow-lg active:scale-95 transition-all flex items-center gap-2"
              >
                <Camera size={14} />
                O'zgartirish
              </button>
              <div className="absolute top-4 left-4 bg-green-500 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-md">
                <CheckCircle2 size={10} />
                Rasm tanlandi
              </div>
            </div>
          )}

          {/* CTA button */}
          {preview && (
            <button
              onClick={handleUpload}
              className="w-full bg-primary text-white font-black py-5 rounded-[24px] shadow-xl shadow-primary/30 active:scale-[0.97] transition-all flex items-center justify-center gap-3 text-base animate-in fade-in slide-in-from-bottom-4 duration-300"
            >
              <Wand2 size={22} fill="white" />
              AI bilan vizualizatsiya qilish
            </button>
          )}
        </div>
      )}

      {/* ─── LOADING ─── */}
      {isLoading && (
        <div className="px-5 mt-5">
          <div className="bg-white rounded-[40px] overflow-hidden shadow-xl border border-slate-100">
            {/* Animated preview area */}
            <div className="relative aspect-[4/3] bg-gradient-to-br from-primary/5 via-slate-50 to-primary/10 overflow-hidden">
              {/* Shimmer overlay */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent animate-[shimmer_2s_infinite] -translate-x-full" />

              {/* Preview images blended */}
              {preview && product?.image && (
                <>
                  <img
                    src={preview}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover opacity-30"
                  />
                  <div className="absolute inset-0 backdrop-blur-sm" />
                </>
              )}

              {/* Center icon */}
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                <div className="relative">
                  <div className="w-24 h-24 border-4 border-primary/15 border-t-primary rounded-full animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-16 h-16 border-4 border-primary/10 border-b-primary/60 rounded-full animate-spin animate-reverse" />
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Sparkles
                      size={28}
                      className="text-primary animate-pulse"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Steps */}
            <div className="p-6 space-y-5">
              <div>
                <p className="text-lg font-extrabold text-slate-900">
                  {currentLoadingLabel}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  ⏳ AI ishlayapti, iltimos kuting...
                </p>
              </div>

              {/* Step indicators */}
              <div className="space-y-2.5">
                {LOADING_STEPS.map((step, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-500 ${
                        i < loadingStep
                          ? "bg-green-500 text-white"
                          : i === loadingStep
                            ? "bg-primary text-white animate-pulse"
                            : "bg-slate-100 text-slate-300"
                      }`}
                    >
                      {i < loadingStep ? (
                        <CheckCircle2 size={12} />
                      ) : (
                        <span className="text-[8px] font-black">{i + 1}</span>
                      )}
                    </div>
                    <span
                      className={`text-xs font-bold transition-colors duration-300 ${
                        i <= loadingStep ? "text-slate-700" : "text-slate-300"
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                ))}
              </div>

              {/* Progress bar */}
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full transition-all duration-700"
                  style={{
                    width: `${((loadingStep + 1) / LOADING_STEPS.length) * 100}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── RESULT ─── */}
      {status === "done" && resultImage && (
        <div className="px-5 mt-5 space-y-5 animate-in fade-in zoom-in-95 duration-500">
          {/* Success badge */}
          <div className="flex flex-col items-center gap-2 bg-green-50 border border-green-100 rounded-2xl py-3 px-4">
            <div className="flex items-center justify-center gap-2">
              <CheckCircle2 size={18} className="text-green-500" />
              <p className="text-sm font-bold text-green-700">
                Vizualizatsiya tayyor!
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-1.5">
              {pipelineMeta?.image_edit_engine && (
                <span className="text-[10px] font-black bg-green-500/10 text-green-600 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  {pipelineMeta.image_edit_engine}
                </span>
              )}
              {pipelineMeta?.model && (
                <span className="text-[10px] font-semibold bg-blue-500/10 text-blue-600 px-2 py-0.5 rounded-full tracking-wide">
                  {pipelineMeta.model}
                </span>
              )}
              {pipelineMeta?.post_processed && (
                <span className="text-[10px] font-black bg-purple-500/10 text-purple-600 px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                  <Wand2 size={9} />
                  Yaxshilangan
                </span>
              )}
              {pipelineMeta?.detection_method && (
                <span className="text-[10px] font-semibold bg-slate-500/10 text-slate-500 px-2 py-0.5 rounded-full tracking-wide">
                  {pipelineMeta.detection_method}
                </span>
              )}
            </div>
          </div>

          {/* Result image / Before-After slider */}
          {showBeforeAfter && preview ? (
            <div
              ref={sliderRef}
              className="relative rounded-[32px] overflow-hidden cursor-col-resize shadow-2xl select-none"
              onMouseDown={handleMouseDown}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onMouseMove={handleMouseMove}
              onTouchMove={handleTouchMove}
            >
              {/* Ghost image: faqat container balandligini belgilash uchun (ko'rinmaydi) */}
              <img
                src={resultImage}
                alt=""
                aria-hidden="true"
                className="absolute inset-0 w-full h-full object-contain"
              />

              {/* KEYIN (AI natija) — to'liq yopadi */}
              <img
                src={resultImage}
                alt="Natija"
                className="absolute inset-0 w-full h-full object-cover"
              />

              {/* OLDIN (original xona) — chapdan kesib ko'rsatadi */}
              <div
                className="absolute inset-0 overflow-hidden"
                style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}
              >
                <img
                  src={preview}
                  alt="Asl rasm"
                  className="absolute inset-0 w-full h-full object-cover"
                />
              </div>

              {/* Divider line */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_8px_rgba(0,0,0,0.4)]"
                style={{ left: `${sliderPos}%` }}
              >
                <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-10 h-10 bg-white rounded-full shadow-xl flex items-center justify-center border-2 border-white/80">
                  <ArrowLeftRight size={16} className="text-slate-700" />
                </div>
              </div>

              {/* Labels */}
              <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-sm text-white text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-wider">
                Oldin
              </div>
              <div className="absolute top-4 right-4 bg-primary/90 backdrop-blur-sm text-white text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-wider">
                Keyin
              </div>
            </div>
          ) : (
            <div className="relative rounded-[32px] overflow-hidden shadow-2xl">
              <img
                src={resultImage}
                alt="AI natijasi"
                className="w-full h-auto block"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
            </div>
          )}

          {/* Toggle before/after */}
          {preview && (
            <button
              onClick={() => setShowBeforeAfter(!showBeforeAfter)}
              className={`w-full py-3 rounded-2xl border text-sm font-bold flex items-center justify-center gap-2 active:scale-[0.97] transition-all ${
                showBeforeAfter
                  ? "bg-primary/10 border-primary/20 text-primary"
                  : "bg-white border-slate-200 text-slate-600"
              }`}
            >
              <ArrowLeftRight size={16} />
              {showBeforeAfter
                ? "Faqat natijani ko'rish"
                : "Oldin / Keyin solishtirish"}
            </button>
          )}

          {/* Action buttons */}
          <div className="space-y-4">
            {/* Primary Action: Purchase/Contact */}
            <button
              onClick={() => {
                if (product) {
                  navigate(`/product/${product.id}/order?ai_id=${currentRequestId || ''}`);
                  haptic("medium");
                }
              }}
              className="w-full flex items-center justify-center gap-3 py-5 bg-primary text-white rounded-[24px] font-black shadow-xl shadow-primary/25 active:scale-[0.97] transition-all text-base"
            >
              <ShoppingBag size={20} fill="white" />
              Sotib olish / Buyurtma berish
            </button>

            {/* Secondary Actions: Save & Share */}
            <div className="grid grid-cols-2 gap-3">
              <button
                disabled={isSaving}
                onClick={handleSave}
                className="flex items-center justify-center gap-2 py-4 bg-white text-slate-700 border-2 border-slate-100 rounded-2xl text-xs font-bold active:scale-95 transition-all shadow-sm disabled:opacity-50"
              >
                {isSaving ? (
                  <RefreshCcw size={18} className="animate-spin text-slate-400" />
                ) : (
                  <>
                    <Send size={18} className="text-primary" />
                    Botga yuborish
                  </>
                )}
              </button>

              <button
                disabled={isSharing}
                onClick={handleShare}
                className="flex items-center justify-center gap-2 py-4 bg-white text-slate-700 border-2 border-slate-100 rounded-2xl text-xs font-bold active:scale-95 transition-all shadow-sm disabled:opacity-50"
              >
                {isSharing ? (
                  <RefreshCcw size={18} className="animate-spin text-slate-400" />
                ) : (
                  <>
                    <Share2 size={18} className="text-blue-500" />
                    Ulashish
                  </>
                )}
              </button>
            </div>

            {/* Home Action */}
            <button
              onClick={() => {
                haptic("medium");
                navigate('/');
              }}
              className="w-full py-4 bg-slate-50 text-slate-500 rounded-2xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all border border-slate-100/50 flex items-center justify-center gap-2"
            >
              <RefreshCcw size={14} />
              Bosh sahifaga qaytish
            </button>
          </div>

          {/* Analysis card */}
          {analysis && (
            <div className="bg-white rounded-3xl border border-slate-100 p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-primary">
                    AI tahlili
                  </p>
                  <h3 className="text-base font-extrabold text-slate-900 mt-0.5">
                    Xona konteksti
                  </h3>
                </div>
              </div>
              {analysis.design_dna && (
                <p className="text-sm text-slate-600 leading-relaxed">
                  {analysis.design_dna}
                </p>
              )}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-2xl bg-slate-50 px-4 py-3">
                  <p className="text-slate-400 font-black uppercase tracking-wider text-[9px]">
                    Rakurs
                  </p>
                  <p className="mt-1 font-bold text-slate-800">
                    {analysis.wall_angle}°
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-50 px-4 py-3">
                  <p className="text-slate-400 font-black uppercase tracking-wider text-[9px]">
                    Yorug'lik
                  </p>
                  <p className="mt-1 font-bold text-slate-800">
                    {analysis.lighting.direction}
                  </p>
                </div>
              </div>
              {analysis.preserve_elements.length > 0 && (
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                    Saqlangan elementlar
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {analysis.preserve_elements.map((item) => (
                      <span
                        key={item}
                        className="bg-primary/8 text-primary text-[10px] font-bold px-2.5 py-1 rounded-full"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}


          {/* Retry button */}
          <button
            onClick={resetAll}
            className="w-full flex items-center justify-center gap-2 py-4 bg-slate-50 text-slate-600 rounded-2xl border border-slate-200 text-sm font-bold active:scale-95 transition-all"
          >
            <RefreshCcw size={15} />
            Boshqa rasm bilan sinash
          </button>
        </div>
      )}

      {/* ─── ERROR ─── */}
      {status === "error" && (
        <div className="px-5 mt-5">
          <div className="bg-white rounded-[40px] border border-red-50 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-br from-red-50 to-orange-50 aspect-[4/3] flex flex-col items-center justify-center p-10 text-center">
              <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center shadow-lg mb-6 text-red-400">
                <AlertCircle size={36} />
              </div>
              <h3 className="text-xl font-extrabold text-slate-900 mb-2">
                Xatolik yuz berdi
              </h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                {error || "Noma'lum xatolik. Qayta urinib ko'ring."}
              </p>
            </div>
            <div className="p-5 space-y-3">
              <button
                onClick={resetAll}
                className="w-full py-4 bg-primary text-white font-bold rounded-2xl active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <RefreshCcw size={16} />
                Qayta urinish
              </button>
              <p className="text-center text-[10px] text-slate-400">
                Muammo davom etsa, boshqa rasm bilan sinab ko'ring
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIVisualizePage;
