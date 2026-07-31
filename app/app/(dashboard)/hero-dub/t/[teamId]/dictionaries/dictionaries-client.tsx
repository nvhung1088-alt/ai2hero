'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  Plus,
  Edit,
  Trash2,
  Sparkles,
  ArrowLeft,
  Search,
  CheckCircle2,
  Globe,
  UserCheck,
  Tag,
  FileText
} from 'lucide-react';
import { DubDictionary } from '@/lib/db/schema';
import {
  createDubDictionaryAction,
  updateDubDictionaryAction,
  deleteDubDictionaryAction
} from '@/lib/db/hero-dub-dictionary-actions';

interface DictionariesClientProps {
  teamId: number;
  team: any;
  initialDictionaries: DubDictionary[];
}

export default function DictionariesClient({
  teamId,
  team,
  initialDictionaries
}: DictionariesClientProps) {
  const [dictionaries, setDictionaries] = useState<DubDictionary[]>(initialDictionaries);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDict, setSelectedDict] = useState<DubDictionary | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form State
  const [formName, setFormName] = useState('');
  const [formKeywords, setFormKeywords] = useState('');
  const [formPrompt, setFormPrompt] = useState('');
  const [formGenreKey, setFormGenreKey] = useState('custom');

  const filteredDicts = dictionaries.filter(d =>
    d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.keywords.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenCreate = () => {
    setSelectedDict(null);
    setFormName('');
    setFormKeywords('');
    setFormPrompt('');
    setFormGenreKey('custom');
    setIsCreating(true);
    setIsEditing(false);
  };

  const handleOpenEdit = (dict: DubDictionary) => {
    if (dict.isGlobal) {
      alert('Từ điển hệ thống không thể sửa trực tiếp. Bạn có thể tạo từ điển mới dành riêng cho Team!');
      return;
    }
    setSelectedDict(dict);
    setFormName(dict.name);
    setFormKeywords(dict.keywords);
    setFormPrompt(dict.promptContent);
    setFormGenreKey(dict.genreKey);
    setIsEditing(true);
    setIsCreating(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formPrompt) {
      alert('Vui lòng điền tên và nội dung từ điển!');
      return;
    }

    setLoading(true);
    try {
      if (isCreating) {
        const res = await createDubDictionaryAction({
          teamId,
          name: formName,
          keywords: formKeywords,
          promptContent: formPrompt,
          genreKey: formGenreKey
        });

        if (res.success && res.data) {
          setDictionaries([res.data, ...dictionaries]);
          setIsCreating(false);
        } else {
          alert(res.error || 'Tạo thất bại');
        }
      } else if (isEditing && selectedDict) {
        const res = await updateDubDictionaryAction({
          id: selectedDict.id,
          teamId,
          name: formName,
          keywords: formKeywords,
          promptContent: formPrompt
        });

        if (res.success && res.data) {
          setDictionaries(dictionaries.map(d => d.id === selectedDict.id ? res.data : d));
          setIsEditing(false);
        } else {
          alert(res.error || 'Cập nhật thất bại');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Bạn có chắc muốn xóa bộ từ điển này?')) return;

    const res = await deleteDubDictionaryAction(id, teamId);
    if (res.success) {
      setDictionaries(dictionaries.filter(d => d.id !== id));
    } else {
      alert(res.error || 'Xóa thất bại');
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white p-4 md:p-8">
      {/* Header */}
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Link
                href={`/hero-dub/t/${teamId}/dashboard`}
                className="text-gray-400 hover:text-white transition flex items-center gap-1 text-xs"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Dashboard
              </Link>
              <span className="text-gray-600">/</span>
              <span className="text-amber-400 text-xs font-semibold">Kho Từ Điển & Bối Cảnh AI</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
              <BookOpen className="w-7 h-7 text-amber-500" /> Kho Từ Điển & Xưng Hô AI
            </h1>
            <p className="text-xs text-gray-400">
              Quản lý các mẫu quy tắc xưng hô, dịch thuật ngữ & sửa lỗi ASR đồng âm theo từng thể loại phim.
            </p>
          </div>

          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-semibold text-xs px-4 py-2.5 rounded-xl shadow-lg shadow-amber-500/20 transition duration-200"
          >
            <Plus className="w-4 h-4" /> Thêm Từ Điển Mới
          </button>
        </div>

        {/* Search & Stats */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Tìm kiếm theo tên hoặc từ khóa..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50"
            />
          </div>

          <div className="text-xs text-gray-400 flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-blue-400" /> Hệ thống: {dictionaries.filter(d => d.isGlobal).length}
            </span>
            <span className="flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-amber-400" /> Cá nhân/Team: {dictionaries.filter(d => !d.isGlobal).length}
            </span>
          </div>
        </div>

        {/* Main Grid List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDicts.map((dict) => (
            <div
              key={dict.id}
              className={`relative bg-gradient-to-b from-white/5 to-white/[0.02] border rounded-2xl p-5 flex flex-col justify-between transition hover:border-amber-500/40 group ${
                dict.isGlobal ? 'border-white/10' : 'border-amber-500/30'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm text-white group-hover:text-amber-400 transition">
                        {dict.name}
                      </h3>
                    </div>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/5 text-gray-400 border border-white/5">
                      {dict.isGlobal ? (
                        <>
                          <Globe className="w-3 h-3 text-blue-400" /> Mẫu hệ thống
                        </>
                      ) : (
                        <>
                          <UserCheck className="w-3 h-3 text-amber-400" /> Dành riêng cho Team
                        </>
                      )}
                    </span>
                  </div>

                  {!dict.isGlobal && (
                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition">
                      <button
                        onClick={() => handleOpenEdit(dict)}
                        className="p-1.5 text-gray-400 hover:text-amber-400 hover:bg-white/5 rounded-lg transition"
                        title="Sửa"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(dict.id)}
                        className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-white/5 rounded-lg transition"
                        title="Xóa"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Keywords Badge */}
                <div className="space-y-1">
                  <div className="flex items-center gap-1 text-[10px] font-semibold text-gray-400 uppercase">
                    <Tag className="w-3 h-3 text-amber-400" /> Từ khóa nhận diện tự động:
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {dict.keywords.split(',').map((kw, idx) => (
                      <span
                        key={idx}
                        className="bg-amber-500/10 text-amber-300 text-[10px] px-2 py-0.5 rounded-md border border-amber-500/20"
                      >
                        {kw.trim()}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Prompt Preview */}
                <div className="space-y-1 pt-2 border-t border-white/5">
                  <div className="flex items-center gap-1 text-[10px] font-semibold text-gray-400 uppercase">
                    <FileText className="w-3 h-3 text-blue-400" /> Nội dung Prompt & Thuật ngữ:
                  </div>
                  <pre className="text-[11px] text-gray-300 bg-black/40 p-2.5 rounded-xl border border-white/5 font-mono whitespace-pre-wrap max-h-36 overflow-y-auto">
                    {dict.promptContent}
                  </pre>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Modal Thêm/Sửa từ điển */}
        {(isCreating || isEditing) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-[#121215] border border-white/10 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl space-y-6 p-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-amber-500" />
                  {isCreating ? 'Thêm Bộ Từ Điển Mới' : 'Chỉnh Sửa Từ Điển'}
                </h3>
                <button
                  onClick={() => {
                    setIsCreating(false);
                    setIsEditing(false);
                  }}
                  className="text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSave} className="space-y-4 text-xs">
                <div className="space-y-1">
                  <label className="font-semibold text-gray-300">Tên Bộ Từ Điển / Thể Loại</label>
                  <input
                    type="text"
                    required
                    placeholder="VD: 🗡️ Tiên hiệp - Vũ Trụ Tu Tiên 2026"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-gray-300">
                    Từ khóa nhận dạng tự động (Keywords - cách nhau bằng dấu phẩy)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="tiên hiệp, tu tiên, độ kiếp, kim đan, đại vương"
                    value={formKeywords}
                    onChange={(e) => setFormKeywords(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500"
                  />
                  <p className="text-[10px] text-gray-500">
                    Khi tiêu đề hoặc mô tả video chứa các từ khóa này, AI sẽ tự động kích hoạt bộ từ điển này.
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-gray-300">Nội dung Quy tắc Xưng hô & Thuật ngữ (Prompt Content)</label>
                  <textarea
                    rows={8}
                    required
                    placeholder="Nhập quy tắc xưng hô, thuật ngữ chuyên ngành và các từ đồng âm cần sửa lỗi ASR..."
                    value={formPrompt}
                    onChange={(e) => setFormPrompt(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 font-mono text-[11px]"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreating(false);
                      setIsEditing(false);
                    }}
                    className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-medium"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs shadow-lg shadow-amber-500/20"
                  >
                    {loading ? 'Đang lưu...' : 'Lưu Từ Điển'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
