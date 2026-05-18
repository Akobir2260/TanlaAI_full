import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Settings,
  Bot,
  Crosshair,
  Users,
  Save,
  RefreshCcw,
  Check,
  Activity,
  ChevronRight,
  Image as ImageIcon,
} from "lucide-react";
import apiClient from "../api/client";
import { cn } from "../utils/cn";

type SettingsState = {
  // General
  platform_name: string;
  platform_logo: string;
  default_language: string;
  timezone: string;
  currency: string;
  
  // AI & Images
  ai_provider: string;
  ai_storage_channel_id: string;
  auto_delete_results_hours: number;
  image_quality: string;
  enable_bg_removal: boolean;
  bg_removal_mode: string;
  max_image_size: number;
  
  // Billing & SaaS
  monthly_price: number;
  subscription_days: number;
  card_number: string;
  card_holder: string;
  require_manual_approval: boolean;

  server_due_date: string | null;
  server_cost: number;
  server_note: string;
  ai_due_date: string | null;
  ai_cost_per_request: number;
  usd_to_uzs_rate: number;
  ai_monthly_budget_uzs: number;
  lead_price_usd: number;

  // Visualization
  default_door_height_ratio: number;
  placement_mode: string;
  allow_window_placement: boolean;
  snap_to_wall: boolean;

  // CRM
  auto_create_lead: boolean;
  notify_admin: boolean;
  auto_followup_minutes: number;
};

const tabs = [
  { id: "general", label: "Umumiy", icon: Settings, color: "text-indigo-500", bg: "bg-indigo-50" },
  { id: "billing", label: "Hisob-kitob", icon: Activity, color: "text-rose-500", bg: "bg-rose-50" },
  { id: "ai", label: "AI & Tasvirlar", icon: Bot, color: "text-emerald-500", bg: "bg-emerald-50" },
  { id: "viz", label: "Vizualizatsiya", icon: Crosshair, color: "text-sky-500", bg: "bg-sky-50" },
  { id: "crm", label: "CRM & Leads", icon: Users, color: "text-amber-500", bg: "bg-amber-50" },
];

export default function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState("general");
  const [settings, setSettings] = useState<SettingsState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const [settingsRes, billingRes] = await Promise.allSettled([
        apiClient.get("/admin/system-settings/"),
        apiClient.get("/admin/billing/")
      ]);

      const data: any = {};
      if (settingsRes.status === 'fulfilled') {
        Object.assign(data, settingsRes.value.data);
      } else {
        console.error("Settings load failed", settingsRes.reason);
      }

      if (billingRes.status === 'fulfilled') {
        Object.assign(data, billingRes.value.data);
      } else {
        console.error("Billing load failed", billingRes.reason);
      }

      setSettings(data);
    } catch (e) {
      console.error("Critical settings load error", e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    setStatus("idle");
    try {
      await Promise.all([
        apiClient.post("/admin/system-settings/", settings),
        apiClient.post("/admin/billing/", settings)
      ]);
      setStatus("success");
      setTimeout(() => setStatus("idle"), 3000);
    } catch (e) {
      console.error("Save failed", e);
      setStatus("error");
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (
    key: keyof SettingsState,
    value: SettingsState[keyof SettingsState],
  ) => {
    setSettings((prev) => (prev ? { ...prev, [key]: value } : null));
  };

  if (loading && !settings) {
    return (
      <div className="h-96 flex flex-col items-center justify-center gap-4">
        <RefreshCcw className="w-8 h-8 text-[#0067a5] animate-spin" />
        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">
          Tizim yuklanmoqda...
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-100 pb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Tizim Sozlamalari</h1>
          <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1">
            Platforma boshqaruvi va SaaS nazorati
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className={cn(
            "flex items-center justify-center gap-3 px-10 py-4 rounded-[20px] text-sm font-black transition-all active:scale-95 shadow-2xl disabled:opacity-50",
            status === "success"
              ? "bg-emerald-500 text-white shadow-emerald-200"
              : status === "error"
              ? "bg-rose-500 text-white shadow-rose-200"
              : "bg-[#0067a5] hover:bg-[#005a91] text-white shadow-blue-900/20",
          )}
        >
          {saving ? (
            <RefreshCcw className="w-4 h-4 animate-spin" />
          ) : status === "success" ? (
            <Check className="w-4 h-4" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {status === "success" ? "Saqlandi!" : status === "error" ? "Xato!" : "O'zgarishlarni Saqlash"}
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-10">
        {/* Sidebar Tabs */}
        <aside className="lg:w-72 space-y-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "w-full flex items-center justify-between px-5 py-5 rounded-[24px] transition-all duration-500 group",
                  isActive
                    ? "bg-white text-slate-900 shadow-xl shadow-slate-200/50 border border-slate-100 ring-1 ring-slate-100/50"
                    : "text-slate-500 hover:bg-slate-50",
                )}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={cn(
                      "w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-500",
                      isActive ? tab.bg : "bg-slate-50 group-hover:bg-white",
                    )}
                  >
                    <Icon size={22} className={isActive ? tab.color : "text-slate-400"} />
                  </div>
                  <span className="text-[15px] font-black tracking-tight">
                    {tab.label}
                  </span>
                </div>
                <ChevronRight size={16} className={cn("transition-transform duration-500", isActive ? "translate-x-0 opacity-100" : "-translate-x-4 opacity-0")} />
              </button>
            );
          })}
        </aside>

        {/* Tab Content */}
        <main className="flex-1 bg-white rounded-[48px] shadow-sm border border-slate-100/60 p-8 md:p-12">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="space-y-12"
            >
              {activeTab === "general" && settings && (
                <div className="space-y-10">
                  <header>
                    <h2 className="text-2xl font-black tracking-tight text-slate-900">Platforma Ma'lumotlari</h2>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Asosiy brending va til sozlamalari</p>
                  </header>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <Field
                      label="Platforma Nomi"
                      value={settings.platform_name}
                      onChange={(v) => updateSetting("platform_name", v)}
                    />
                    <Field
                      label="Platforma Logosi (URL)"
                      value={settings.platform_logo}
                      placeholder="https://example.com/logo.png"
                      onChange={(v) => updateSetting("platform_logo", v)}
                      icon={ImageIcon}
                    />
                    <SelectField
                      label="Asosiy Til"
                      value={settings.default_language}
                      onChange={(v) => updateSetting("default_language", v)}
                      options={[
                        { v: "uz", l: "O'zbekcha" },
                        { v: "ru", l: "Ruscha" },
                        { v: "en", l: "Inglizcha" },
                      ]}
                    />
                    <Field
                      label="Valyuta"
                      value={settings.currency}
                      onChange={(v) => updateSetting("currency", v)}
                    />
                  </div>
                </div>
              )}

              {activeTab === "billing" && settings && (
                <div className="space-y-10">
                  <header>
                    <h2 className="text-2xl font-black tracking-tight text-slate-900">Hisob-kitob & Moliya</h2>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">SaaS xarajatlari va monetizatsiya</p>
                  </header>
                  
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                    {/* SaaS Monetization */}
                    <div className="p-8 bg-blue-50/30 rounded-[32px] border border-blue-100/50 space-y-8">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                          <Activity size={20} className="text-blue-600" />
                        </div>
                        <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-500">SaaS Monetizatsiya</h3>
                      </div>
                      <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                          <Field
                            label="Obuna Narxi (so'm)"
                            type="number"
                            value={settings.monthly_price}
                            onChange={(v) => updateSetting("monthly_price", Number(v))}
                          />
                          <Field
                            label="Muddati (Kun)"
                            type="number"
                            value={settings.subscription_days}
                            onChange={(v) => updateSetting("subscription_days", Number(v))}
                          />
                        </div>
                        <Field
                          label="Admin Karta Raqami"
                          value={settings.card_number}
                          onChange={(v) => updateSetting("card_number", v)}
                          placeholder="8600 ...."
                        />
                        <Field
                          label="Karta Egasi"
                          value={settings.card_holder}
                          onChange={(v) => updateSetting("card_holder", v)}
                          placeholder="F.I.SH"
                        />
                        <ToggleField
                          label="Admin Tasdiqlashi"
                          sub="To'lovdan keyin admin tasdiqlashi shartmi?"
                          value={settings.require_manual_approval}
                          onChange={(v) => updateSetting("require_manual_approval", v)}
                        />
                      </div>
                    </div>

                    {/* Server tracking */}
                    <div className="p-8 bg-slate-50/50 rounded-[32px] border border-slate-100 space-y-8">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                          <Settings size={20} className="text-slate-600" />
                        </div>
                        <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-500">Kompaniya Serveri</h3>
                      </div>
                      <div className="space-y-6">
                        <Field
                          label="Oylik Narxi (UZS)"
                          type="number"
                          value={settings.server_cost}
                          onChange={(v) => updateSetting("server_cost", Number(v))}
                        />
                        <Field
                          label="Keyingi To'lov Sanasi"
                          type="date"
                          value={settings.server_due_date || ""}
                          onChange={(v) => updateSetting("server_due_date", v)}
                        />
                        <Field
                          label="Server haqida eslatma"
                          value={settings.server_note}
                          onChange={(v) => updateSetting("server_note", v)}
                        />
                      </div>
                    </div>

                    <div className="p-8 bg-slate-50/50 rounded-[32px] border border-slate-100 space-y-8 xl:col-span-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                          <Bot size={20} className="text-indigo-500" />
                        </div>
                        <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-500">AI & Budjet</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <Field
                          label="AI so'rov (USD)"
                          type="number"
                          step="0.0001"
                          value={settings.ai_cost_per_request}
                          onChange={(v) => updateSetting("ai_cost_per_request", Number(v))}
                        />
                        <Field
                          label="Oylik AI Limit (UZS)"
                          type="number"
                          value={settings.ai_monthly_budget_uzs}
                          onChange={(v) => updateSetting("ai_monthly_budget_uzs", Number(v))}
                        />
                        <Field
                          label="Lead Narxi (USD)"
                          type="number"
                          step="0.1"
                          value={settings.lead_price_usd}
                          onChange={(v) => updateSetting("lead_price_usd", Number(v))}
                        />
                        <Field
                          label="USD kursi (1$)"
                          type="number"
                          value={settings.usd_to_uzs_rate}
                          onChange={(v) => updateSetting("usd_to_uzs_rate", Number(v))}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "ai" && settings && (
                <div className="space-y-10">
                  <header>
                    <h2 className="text-2xl font-black tracking-tight text-slate-900">AI & Tasvirlar</h2>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Render rejimlari va saqlash</p>
                  </header>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <SelectField
                      label="AI Provayder"
                      value={settings.ai_provider}
                      onChange={(v) => updateSetting("ai_provider", v)}
                      options={[
                        { v: "gemini_direct", l: "Gemini Direct (V5)" },
                        { v: "openai", l: "OpenAI DALL-E 3" },
                      ]}
                    />
                    <SelectField
                      label="Natija Sifati"
                      value={settings.image_quality}
                      onChange={(v) => updateSetting("image_quality", v)}
                      options={[
                        { v: "high", l: "Premium (HD)" },
                        { v: "medium", l: "Optimal" },
                        { v: "low", l: "Tezkor" },
                      ]}
                    />
                    <Field
                      label="Autodelete: Natijalarni o'chirish (Soat)"
                      type="number"
                      value={settings.auto_delete_results_hours}
                      onChange={(v) => updateSetting("auto_delete_results_hours", Number(v))}
                    />
                    <Field
                      label="Maksimal Tasvir Hajmi (px)"
                      type="number"
                      value={settings.max_image_size}
                      onChange={(v) => updateSetting("max_image_size", Number(v))}
                    />
                  </div>
                  
                  <div className="space-y-4">
                    <ToggleField
                      label="Telegramga Yuklash (Permanent Storage)"
                      sub="Natijalarni arxivlash uchun maxsus kanalga yuborish"
                      value={!!settings.ai_storage_channel_id}
                      onChange={(v) => updateSetting("ai_storage_channel_id", v ? "-100..." : "")}
                    />
                    {settings.ai_storage_channel_id && (
                      <div className="ml-8 pt-2">
                        <Field
                          label="Telegram Channel ID"
                          value={settings.ai_storage_channel_id}
                          onChange={(v) => updateSetting("ai_storage_channel_id", v)}
                          placeholder="-100123456789"
                        />
                      </div>
                    )}
                    <ToggleField
                      label="Fonni Avtomatik O'chirish"
                      sub="Yangi mahsulotlar uchun SAM modelini qo'llash"
                      value={settings.enable_bg_removal}
                      onChange={(v) => updateSetting("enable_bg_removal", v)}
                    />
                  </div>
                </div>
              )}

              {activeTab === "viz" && settings && (
                <div className="space-y-10">
                  <header>
                    <h2 className="text-2xl font-black tracking-tight text-slate-900">Vizualizatsiya Normalari</h2>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">AI render algoritmi sozlamalari</p>
                  </header>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <Field
                      label="Eshik Balandligi Nisbati (0.0 - 1.0)"
                      type="number"
                      step="0.01"
                      value={settings.default_door_height_ratio}
                      onChange={(v) => updateSetting("default_door_height_ratio", parseFloat(v))}
                    />
                    <SelectField
                      label="AI Ishlash Rejimi"
                      value={settings.placement_mode}
                      onChange={(v) => updateSetting("placement_mode", v)}
                      options={[
                        { v: "auto", l: "Faqat almashtirish (Seniki)" },
                        { v: "manual", l: "Qo'lda joylashtirish" },
                      ]}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <ToggleField
                      label="Devorga Yopishish (Snap-to-wall)"
                      value={settings.snap_to_wall}
                      onChange={(v) => updateSetting("snap_to_wall", v)}
                    />
                    <ToggleField
                      label="Oynada ham vizualizatsiya"
                      value={settings.allow_window_placement}
                      onChange={(v) => updateSetting("allow_window_placement", v)}
                    />
                  </div>
                </div>
              )}

              {activeTab === "crm" && settings && (
                <div className="space-y-10">
                  <header>
                    <h2 className="text-2xl font-black tracking-tight text-slate-900">CRM & Leads</h2>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Sotuv voronkasi va avtomatizatsiya</p>
                  </header>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <Field
                      label="Auto Follow-up (Daqiqa)"
                      type="number"
                      value={settings.auto_followup_minutes}
                      onChange={(v) => updateSetting("auto_followup_minutes", Number(v))}
                    />
                  </div>
                  <div className="space-y-4">
                    <ToggleField
                      label="Avtomatik Lead Yaratish"
                      sub="Foydalanuvchi vizualizatsiya qilganda lead ochish"
                      value={settings.auto_create_lead}
                      onChange={(v) => updateSetting("auto_create_lead", v)}
                    />
                    <ToggleField
                      label="Adminni Ogohlantirish"
                      sub="Yangi so'rovlar haqida Telegram botga xabar yuborish"
                      value={settings.notify_admin}
                      onChange={(v) => updateSetting("notify_admin", v)}
                    />
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  step,
  placeholder,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  type?: string;
  step?: string;
  placeholder?: string;
  icon?: React.ElementType;
}) {
  return (
    <div className="space-y-2.5">
      <label className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-400 ml-1">
        {label}
      </label>
      <div className="relative group">
        {Icon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-[#0067a5] transition-colors">
            <Icon size={18} />
          </div>
        )}
        <input
          type={type}
          step={step}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            "w-full bg-slate-50/50 border border-slate-100/80 rounded-2xl px-5 py-4 text-sm font-bold text-slate-800 outline-none transition-all",
            "focus:bg-white focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500/20",
            Icon && "pl-12"
          )}
        />
      </div>
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  options: { v: string | number; l: string }[];
}) {
  return (
    <div className="space-y-2.5">
      <label className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-400 ml-1">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-slate-50/50 border border-slate-100/80 rounded-2xl px-5 py-4 text-sm font-bold text-slate-800 outline-none transition-all focus:bg-white focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500/20 appearance-none"
      >
        {options.map((opt) => (
          <option key={opt.v} value={opt.v}>
            {opt.l}
          </option>
        ))}
      </select>
    </div>
  );
}

function ToggleField({
  label,
  sub,
  value,
  onChange,
}: {
  label: string;
  sub?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between p-6 bg-slate-50/50 rounded-3xl border border-slate-100 hover:border-blue-100 hover:bg-white transition-all cursor-pointer group" onClick={() => onChange(!value)}>
      <div>
        <h4 className="font-black text-slate-800 text-sm group-hover:text-[#0067a5] transition-colors">
          {label}
        </h4>
        {sub && (
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight mt-1">
            {sub}
          </p>
        )}
      </div>
      <button
        className={cn(
          "w-12 h-7 rounded-full relative transition-all duration-500 shadow-inner",
          value ? "bg-[#0067a5]" : "bg-slate-200",
        )}
      >
        <div
          className={cn(
            "absolute top-1 w-5 h-5 bg-white rounded-full transition-all duration-500 shadow-md",
            value ? "left-6" : "left-1",
          )}
        />
      </button>
    </div>
  );
}
