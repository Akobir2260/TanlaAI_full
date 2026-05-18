import { useEffect, useState, useCallback } from 'react';
import { Plus, Pencil, Trash2, X, FolderTree } from 'lucide-react';
import apiClient from '../../api/client';

type Category = {
  id: number;
  name: string;
  icon: string | null;
  product_count?: number;
};

const MEDIA_BASE = import.meta.env.VITE_BACKEND_ORIGIN || '';

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [formName, setFormName] = useState('');
  const [formIcon, setFormIcon] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get('admin/categories/');
      setCategories(data.results ?? data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const openCreate = () => {
    setEditing(null);
    setFormName('');
    setFormIcon(null);
    setShowForm(true);
  };

  const openEdit = (cat: Category) => {
    setEditing(cat);
    setFormName(cat.name);
    setFormIcon(null);
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!formName.trim()) return;
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('name', formName.trim());
      if (formIcon) fd.append('icon', formIcon);

      if (editing) {
        await apiClient.patch(`admin/categories/${editing.id}/`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        await apiClient.post('admin/categories/', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }
      setShowForm(false);
      fetchCategories();
    } catch (err) {
      console.error('Error saving category:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Ushbu kategoriyani o'chirishni xohlaysizmi?")) return;
    try {
      await apiClient.delete(`admin/categories/${id}/`);
      setCategories((c) => c.filter((x) => x.id !== id));
    } catch (err) {
      console.error('Error deleting category:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Categories</h1>
          <p className="text-sm text-slate-500">Organize your shop structure</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-lg shadow-emerald-600/20"
        >
          <Plus size={18} /> New Category
        </button>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-6 h-6 border-4 border-sky-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : categories.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-16 text-center">
          <FolderTree size={48} className="mx-auto text-slate-200 mb-3" />
          <p className="text-slate-500">Hali kategoriya yo{"'"}q</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 hover:shadow-md transition-all group"
            >
              <div className="flex items-start gap-4">
                {cat.icon ? (
                  <img
                    src={cat.icon.startsWith('http') ? cat.icon : `${MEDIA_BASE}${cat.icon}`}
                    alt={cat.name}
                    className="w-16 h-16 rounded-xl object-cover bg-slate-100"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-slate-100 flex items-center justify-center">
                    <FolderTree size={24} className="text-slate-300" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-slate-800">{cat.name}</h3>
                  <p className="text-xs text-emerald-600 font-semibold mt-1">
                    • {cat.product_count ?? 0} Products
                  </p>
                </div>
              </div>
              <div className="flex gap-2 mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => openEdit(cat)}
                  className="flex-1 flex items-center justify-center gap-1 py-2 text-xs font-semibold text-sky-600 bg-sky-50 rounded-lg hover:bg-sky-100 transition-colors"
                >
                  <Pencil size={14} /> Tahrirlash
                </button>
                <button
                  onClick={() => handleDelete(cat.id)}
                  className="flex items-center justify-center gap-1 px-3 py-2 text-xs font-semibold text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800">
                {editing ? 'Kategoriyani tahrirlash' : 'Yangi kategoriya'}
              </h2>
              <button onClick={() => setShowForm(false)} className="p-1 hover:bg-slate-100 rounded-lg">
                <X size={20} />
              </button>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nomi</label>
              <input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                placeholder="Kategoriya nomi"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Icon rasm</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setFormIcon(e.target.files?.[0] ?? null)}
                className="w-full text-sm text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-slate-100 file:text-slate-700 file:font-semibold file:text-sm hover:file:bg-slate-200"
              />
            </div>
            <button
              onClick={handleSubmit}
              disabled={saving || !formName.trim()}
              className="w-full bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-xl py-2.5 text-sm transition-colors disabled:opacity-50"
            >
              {saving ? 'Saqlanmoqda...' : editing ? 'Saqlash' : 'Yaratish'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
