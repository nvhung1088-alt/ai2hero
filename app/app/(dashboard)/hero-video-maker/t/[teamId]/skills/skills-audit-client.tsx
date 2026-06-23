'use client';

import React, { useState } from 'react';
import { useToast } from '@/components/ui/toast';
import { updateSkillAction, UpdateSkillPayload } from './skills-actions';
import { X, Save, Image as ImageIcon, BookOpen } from 'lucide-react';

interface Skill {
  id: string;
  name: string;
  imageUrl?: string;
  prompt: string;
}

interface Presets {
  artSkills: Skill[];
  storySkills: Skill[];
}

interface Props {
  initialPresets: Presets;
  teamId: string;
}

type TabType = 'artSkills' | 'storySkills';

export default function SkillsAuditClient({ initialPresets, teamId }: Props) {
  const [activeTab, setActiveTab] = useState<TabType>('storySkills');
  const [presets, setPresets] = useState<Presets>(initialPresets);
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { showToast } = useToast();

  const [editForm, setEditForm] = useState<UpdateSkillPayload>({
    name: '',
    imageUrl: '',
    prompt: '',
  });

  const handleOpenDrawer = (skill: Skill) => {
    setSelectedSkill(skill);
    setEditForm({
      name: skill.name || '',
      imageUrl: skill.imageUrl || '',
      prompt: skill.prompt || '',
    });
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setTimeout(() => setSelectedSkill(null), 300);
  };

  const handleSave = async () => {
    if (!selectedSkill) return;
    setIsSaving(true);
    try {
      const res = await updateSkillAction(activeTab, selectedSkill.id, editForm);
      if (res.success) {
        showToast('Đã cập nhật thông tin skill.', 'success');
        // Update local state (optimistic update is also fine, here we update after success)
        setPresets((prev) => {
          const updated = { ...prev };
          const idx = updated[activeTab].findIndex((s) => s.id === selectedSkill.id);
          if (idx !== -1) {
            updated[activeTab][idx] = { ...updated[activeTab][idx], ...editForm };
          }
          return updated;
        });
        handleCloseDrawer();
      } else {
        showToast(res.error || 'Cập nhật thất bại', 'error');
      }
    } catch (error: any) {
      showToast(error.message || 'Cập nhật thất bại', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const activeSkills = presets[activeTab] || [];

  return (
    <div className="relative h-full flex flex-col">
      {/* Tabs */}
      <div className="flex gap-4 border-b border-white/10 pb-4 mb-6">
        <button
          onClick={() => setActiveTab('storySkills')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'storySkills'
              ? 'bg-violet-500 text-white'
              : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-gray-200'
          }`}
        >
          Sổ tay Đạo diễn ({presets.storySkills?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('artSkills')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'artSkills'
              ? 'bg-violet-500 text-white'
              : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-gray-200'
          }`}
        >
          Phong cách Nghệ thuật ({presets.artSkills?.length || 0})
        </button>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar pb-10">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {activeSkills.map((skill) => (
            <div
              key={skill.id}
              onClick={() => handleOpenDrawer(skill)}
              className="group cursor-pointer rounded-xl bg-white/5 border border-white/10 overflow-hidden hover:border-violet-500/50 transition-all hover:shadow-lg hover:shadow-violet-500/10 flex flex-col aspect-[4/3] relative"
            >
              {skill.imageUrl ? (
                <div className="flex-1 w-full bg-black/40 overflow-hidden relative">
                  <img
                    src={skill.imageUrl}
                    alt={skill.name}
                    className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
                  />
                </div>
              ) : (
                <div className="flex-1 w-full bg-gradient-to-br from-gray-800 to-gray-900 flex flex-col items-center justify-center text-gray-500 group-hover:text-violet-400 transition-colors">
                  <ImageIcon className="w-8 h-8 mb-2 opacity-50" />
                  <span className="text-xs font-medium">Chưa có ảnh</span>
                </div>
              )}
              <div className="p-3 bg-gray-900/90 backdrop-blur-sm border-t border-white/5 relative z-10">
                <h3 className="text-sm font-semibold text-gray-200 truncate group-hover:text-violet-400 transition-colors">
                  {skill.name}
                </h3>
                <p className="text-[10px] text-gray-500 truncate mt-0.5 font-mono">{skill.id}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Drawer Overlay */}
      {isDrawerOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] transition-opacity"
          onClick={handleCloseDrawer}
        />
      )}

      {/* Drawer Content */}
      <div
        className={`fixed top-0 right-0 h-full w-[500px] max-w-[100vw] bg-[#0B0D14] border-l border-white/10 z-[110] shadow-2xl transform transition-transform duration-300 ease-in-out flex flex-col ${
          isDrawerOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between p-5 border-b border-white/10 bg-white/5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-violet-500/20 rounded-lg text-violet-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Chi tiết Skill</h2>
              <p className="text-xs text-gray-400 font-mono">{selectedSkill?.id}</p>
            </div>
          </div>
          <button
            onClick={handleCloseDrawer}
            className="p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {/* Image Preview */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-300">Ảnh đại diện</label>
            <div className="aspect-video w-full rounded-xl bg-black/50 border border-white/10 overflow-hidden flex items-center justify-center">
              {editForm.imageUrl ? (
                <img src={editForm.imageUrl} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <div className="text-gray-500 flex flex-col items-center">
                  <ImageIcon className="w-8 h-8 mb-2" />
                  <span className="text-sm">Chưa có ảnh</span>
                </div>
              )}
            </div>
            <input
              type="text"
              placeholder="Nhập đường dẫn hình ảnh..."
              value={editForm.imageUrl}
              onChange={(e) => setEditForm({ ...editForm, imageUrl: e.target.value })}
              className="w-full mt-2 bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all placeholder:text-gray-600"
            />
          </div>

          {/* Name */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-300">Tên Skill</label>
            <input
              type="text"
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all"
            />
          </div>

          {/* Prompt */}
          <div className="space-y-2 flex-1 flex flex-col min-h-[300px]">
            <label className="text-sm font-semibold text-gray-300">Nội dung Prompt</label>
            <textarea
              value={editForm.prompt}
              onChange={(e) => setEditForm({ ...editForm, prompt: e.target.value })}
              className="w-full flex-1 min-h-[400px] bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-sm text-gray-200 font-mono leading-relaxed focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all custom-scrollbar resize-y"
              placeholder="Nhập nội dung prompt..."
              spellCheck={false}
            />
          </div>
        </div>

        <div className="p-5 border-t border-white/10 bg-black/40 flex justify-end gap-3">
          <button
            onClick={handleCloseDrawer}
            className="px-5 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            Hủy bỏ
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium bg-violet-600 hover:bg-violet-500 text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-violet-500/20"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
          </button>
        </div>
      </div>
    </div>
  );
}
