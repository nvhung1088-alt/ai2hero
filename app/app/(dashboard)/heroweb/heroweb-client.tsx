'use client';

import React, { useState } from 'react';
import { Plus, Globe, Settings, ExternalLink, Activity, LayoutTemplate, MoreVertical, Search, ArrowRight, CheckCircle2, Image } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createWebsiteAction } from '@/lib/db/website-actions';

interface Website {
  id: number;
  name: string;
  subdomain: string;
  customDomain: string | null;
  templateId: string;
  createdAt: string | Date;
}

interface HeroWebClientProps {
  user: any;
  initialWebsites: Website[];
}

const TEMPLATES = [
  {
    id: 'ecommerce',
    name: 'E-Commerce Pro',
    image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?ixlib=rb-1.2.1&auto=format&fit=crop&w=1950&q=80',
    description: 'Tối ưu cho bán hàng, tích hợp sản phẩm từ Marketplace và Reels.'
  },
  {
    id: 'creator',
    name: 'Creator Portfolio',
    image: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?ixlib=rb-1.2.1&auto=format&fit=crop&w=1950&q=80',
    description: 'Dành cho KOL/KOC muốn xây dựng thương hiệu cá nhân.'
  }
];

export function HeroWebClient({ user, initialWebsites }: HeroWebClientProps) {
  const [websites, setWebsites] = useState<Website[]>(initialWebsites);
  const [isCreating, setIsCreating] = useState(false);
  const [creationStep, setCreationStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    templateId: 'ecommerce',
    sources: { profile: true, pages: false, shop: true },
    name: '',
    subdomain: '',
    seoDescription: '',
    logoUrl: ''
  });

  const handleCreateWebsite = async () => {
    setIsSubmitting(true);
    const result = await createWebsiteAction({
      name: formData.name,
      subdomain: formData.subdomain,
      templateId: formData.templateId,
      themeConfig: {
        sources: formData.sources,
        seoDescription: formData.seoDescription,
        logoUrl: formData.logoUrl
      }
    });

    if (result.error) {
      alert(result.error);
      setIsSubmitting(false);
      return;
    }

    if (result.website) {
      setWebsites([result.website as any, ...websites]);
      setIsCreating(false);
      setCreationStep(1);
      setFormData({
        templateId: 'ecommerce',
        sources: { profile: true, pages: false, shop: true },
        name: '',
        subdomain: '',
        seoDescription: '',
        logoUrl: ''
      });
    }
    setIsSubmitting(false);
  };

  return (
    <div className="flex-1 space-y-8 p-4 md:p-8 pt-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-white bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-indigo-500">
            HeroWeb Studio
          </h2>
          <p className="text-white/60 mt-1 font-medium">Trung tâm quản lý & thiết kế website kéo thả của bạn</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative hidden md:block">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <input 
              type="text" 
              placeholder="Tìm website..." 
              className="bg-[#161618] border border-white/10 rounded-full pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-pink-500 transition-colors w-64"
            />
          </div>
          <Button onClick={() => setIsCreating(true)} className="bg-gradient-to-r from-pink-500 to-orange-500 hover:from-pink-600 hover:to-orange-600 text-white font-bold rounded-full shadow-lg shadow-pink-500/25">
            <Plus className="mr-2 h-4 w-4" /> Tạo Website
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-6 md:grid-cols-3">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#161618] to-[#1a1a1f] border border-white/5 p-6 group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Globe className="w-24 h-24 text-pink-500" />
          </div>
          <h3 className="text-sm font-semibold text-white/50 mb-2 uppercase tracking-wider">Tổng Website</h3>
          <div className="flex items-end gap-3">
            <span className="text-4xl font-black text-white">{websites.length}</span>
            <span className="text-emerald-400 text-sm font-medium mb-1">+1 tháng này</span>
          </div>
        </div>
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#161618] to-[#1a1a1f] border border-white/5 p-6 group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Activity className="w-24 h-24 text-indigo-500" />
          </div>
          <h3 className="text-sm font-semibold text-white/50 mb-2 uppercase tracking-wider">Lượt truy cập (30 ngày)</h3>
          <div className="flex items-end gap-3">
            <span className="text-4xl font-black text-white">12.5K</span>
            <span className="text-emerald-400 text-sm font-medium mb-1">+14%</span>
          </div>
        </div>
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#161618] to-[#1a1a1f] border border-white/5 p-6 group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <LayoutTemplate className="w-24 h-24 text-emerald-500" />
          </div>
          <h3 className="text-sm font-semibold text-white/50 mb-2 uppercase tracking-wider">Tên miền riêng</h3>
          <div className="flex items-end gap-3">
            <span className="text-4xl font-black text-white">{websites.filter(w => w.customDomain).length}</span>
            <span className="text-white/40 text-sm font-medium mb-1">Đã kết nối</span>
          </div>
        </div>
      </div>

      {/* Website List */}
      <div className="space-y-4">
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          <Globe className="w-5 h-5 text-pink-500" /> Các dự án của bạn
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {websites.map((site) => {
            const template = TEMPLATES.find(t => t.id === site.templateId) || TEMPLATES[0];
            return (
              <div key={site.id} className="bg-[#161618] border border-white/5 rounded-3xl overflow-hidden shadow-xl hover:shadow-pink-500/10 hover:border-white/20 transition-all group flex flex-col">
                <div className="h-48 relative overflow-hidden">
                  <div className="absolute inset-0 bg-black/40 group-hover:bg-transparent transition-colors z-10" />
                  <img src={template.image} alt={template.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                  <div className="absolute top-4 right-4 z-20">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-white/80 hover:text-white bg-black/40 hover:bg-black/60 backdrop-blur-md rounded-full">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="absolute bottom-4 left-4 z-20 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
                    <span className="text-xs font-bold text-white uppercase tracking-wider">{template.name}</span>
                  </div>
                </div>
                
                <div className="p-6 flex-1 flex flex-col">
                  <h3 className="text-2xl font-black text-white mb-4 group-hover:text-pink-400 transition-colors">{site.name}</h3>
                  <div className="space-y-3 mb-6 flex-1">
                    <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                      <span className="text-xs text-white/40 font-medium uppercase">Tên miền AI2Hero</span>
                      <a href={`http://${site.subdomain}.localhost:3000`} target="_blank" rel="noreferrer" className="text-sm text-pink-400 font-semibold hover:underline flex items-center gap-1">
                        {site.subdomain}.ai2hero.com <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    {site.customDomain ? (
                      <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                        <span className="text-xs text-emerald-500/60 font-medium uppercase">Tên miền riêng</span>
                        <a href={`http://${site.customDomain}`} target="_blank" rel="noreferrer" className="text-sm text-emerald-400 font-semibold hover:underline flex items-center gap-1">
                          {site.customDomain} <CheckCircle2 className="w-3 h-3" />
                        </a>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 border-dashed">
                        <span className="text-xs text-white/40 font-medium uppercase">Tên miền riêng</span>
                        <span className="text-sm text-white/30 italic">Chưa kết nối</span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3 mt-auto">
                    <Button className="flex-1 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl h-11">
                      <Settings className="w-4 h-4 mr-2" /> Cấu hình
                    </Button>
                    <Button className="flex-1 bg-pink-500/10 hover:bg-pink-500/20 text-pink-500 font-semibold border border-pink-500/20 rounded-xl h-11">
                      <LayoutTemplate className="w-4 h-4 mr-2" /> Thiết kế
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}

          {websites.length === 0 && (
            <div className="col-span-full py-20 text-center bg-gradient-to-b from-[#161618] to-transparent border border-white/5 border-dashed rounded-3xl">
              <div className="w-20 h-20 bg-pink-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Globe className="w-10 h-10 text-pink-500" />
              </div>
              <h3 className="text-2xl font-black text-white mb-2">Chưa có Website nào</h3>
              <p className="text-white/50 mb-8 max-w-md mx-auto">Bạn chưa sở hữu website nào trên hệ thống. Hãy chọn một mẫu thiết kế và bắt đầu xây dựng ngay hôm nay!</p>
              <Button onClick={() => setIsCreating(true)} className="bg-pink-500 hover:bg-pink-600 text-white font-bold rounded-full px-8 py-6 text-lg shadow-lg shadow-pink-500/25">
                <Plus className="mr-2 h-5 w-5" /> Bắt đầu tạo Website
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Create Modal - 3 Step Wizard */}
      {isCreating && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex justify-center items-center z-50 p-4 md:p-8 overflow-y-auto">
          <div className="bg-[#161618] border border-white/10 rounded-3xl w-full max-w-5xl flex flex-col overflow-hidden shadow-2xl relative my-auto min-h-[600px]">
            
            {/* Header Wizard */}
            <div className="bg-[#1a1a1f] p-6 border-b border-white/5 flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-black text-white">Tạo Website mới</h3>
                <p className="text-white/50 text-sm">Thiết lập hệ sinh thái vệ tinh của bạn trong 3 bước.</p>
              </div>
              <div className="flex items-center gap-4">
                {[1, 2, 3].map(step => (
                  <div key={step} className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${creationStep === step ? 'bg-pink-500 text-white shadow-lg shadow-pink-500/20' : creationStep > step ? 'bg-emerald-500 text-white' : 'bg-white/10 text-white/40'}`}>
                      {creationStep > step ? <CheckCircle2 className="w-5 h-5" /> : step}
                    </div>
                    {step < 3 && <div className={`h-1 w-12 rounded-full ${creationStep > step ? 'bg-emerald-500' : 'bg-white/10'}`} />}
                  </div>
                ))}
              </div>
            </div>

            {/* Content Wizard */}
            <div className="flex-1 flex flex-col p-8 overflow-y-auto">
              {/* Step 1: Template Selection */}
              {creationStep === 1 && (
                <div className="animate-in fade-in slide-in-from-right-8 duration-500">
                  <h4 className="text-xl font-bold text-white mb-6">1. Chọn mẫu giao diện (Template)</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {TEMPLATES.map(t => (
                      <div 
                        key={t.id}
                        onClick={() => setFormData({...formData, templateId: t.id})}
                        className={`cursor-pointer rounded-2xl overflow-hidden border-2 transition-all group ${formData.templateId === t.id ? 'border-pink-500 ring-4 ring-pink-500/20' : 'border-white/5 hover:border-white/20'}`}
                      >
                        <div className="aspect-[4/3] relative overflow-hidden">
                          <img src={t.image} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                          {formData.templateId === t.id && (
                            <div className="absolute inset-0 bg-pink-500/20 flex items-center justify-center">
                              <div className="bg-pink-500 text-white p-2 rounded-full shadow-lg">
                                <CheckCircle2 className="w-6 h-6" />
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="p-4 bg-[#1a1a1f]">
                          <h4 className="text-white font-bold mb-1">{t.name}</h4>
                          <p className="text-xs text-white/50 line-clamp-2">{t.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 2: Data Sources */}
              {creationStep === 2 && (
                <div className="animate-in fade-in slide-in-from-right-8 duration-500 max-w-2xl mx-auto w-full">
                  <h4 className="text-xl font-bold text-white mb-2">2. Đồng bộ nguồn dữ liệu</h4>
                  <p className="text-white/50 mb-8 text-sm">Website sẽ tự động lấy dữ liệu (bài viết, sản phẩm, video) từ các nguồn bạn chọn.</p>
                  
                  <div className="space-y-4">
                    {/* Profile */}
                    <div className={`p-4 rounded-2xl border-2 transition-colors cursor-pointer flex items-start gap-4 ${formData.sources.profile ? 'border-pink-500 bg-pink-500/5' : 'border-white/10 hover:border-white/20 bg-[#1a1a1f]'}`}
                         onClick={() => setFormData({...formData, sources: {...formData.sources, profile: !formData.sources.profile}})}>
                      <div className={`mt-1 w-6 h-6 rounded-full border flex items-center justify-center ${formData.sources.profile ? 'bg-pink-500 border-pink-500' : 'border-white/20'}`}>
                        {formData.sources.profile && <CheckCircle2 className="w-4 h-4 text-white" />}
                      </div>
                      <div>
                        <h5 className="text-white font-bold mb-1">Trang cá nhân (Profile)</h5>
                        <p className="text-white/50 text-sm">Đồng bộ các bài viết công khai, Video Reels và thông tin cá nhân của bạn lên Website.</p>
                      </div>
                    </div>

                    {/* Pages */}
                    <div className={`p-4 rounded-2xl border-2 transition-colors cursor-pointer flex items-start gap-4 ${formData.sources.pages ? 'border-indigo-500 bg-indigo-500/5' : 'border-white/10 hover:border-white/20 bg-[#1a1a1f]'}`}
                         onClick={() => setFormData({...formData, sources: {...formData.sources, pages: !formData.sources.pages}})}>
                      <div className={`mt-1 w-6 h-6 rounded-full border flex items-center justify-center ${formData.sources.pages ? 'bg-indigo-500 border-indigo-500' : 'border-white/20'}`}>
                        {formData.sources.pages && <CheckCircle2 className="w-4 h-4 text-white" />}
                      </div>
                      <div>
                        <h5 className="text-white font-bold mb-1">Fanpage (Trang)</h5>
                        <p className="text-white/50 text-sm">Lấy tin tức, bài viết thương hiệu từ các Trang mà bạn đang quản lý.</p>
                      </div>
                    </div>

                    {/* Shop */}
                    <div className={`p-4 rounded-2xl border-2 transition-colors cursor-pointer flex items-start gap-4 ${formData.sources.shop ? 'border-orange-500 bg-orange-500/5' : 'border-white/10 hover:border-white/20 bg-[#1a1a1f]'}`}
                         onClick={() => setFormData({...formData, sources: {...formData.sources, shop: !formData.sources.shop}})}>
                      <div className={`mt-1 w-6 h-6 rounded-full border flex items-center justify-center ${formData.sources.shop ? 'bg-orange-500 border-orange-500' : 'border-white/20'}`}>
                        {formData.sources.shop && <CheckCircle2 className="w-4 h-4 text-white" />}
                      </div>
                      <div>
                        <h5 className="text-white font-bold mb-1">Cửa hàng (Marketplace)</h5>
                        <p className="text-white/50 text-sm">Trưng bày và bán các sản phẩm từ Gian hàng AI2Hero của bạn trực tiếp trên Web.</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: SEO & Info */}
              {creationStep === 3 && (
                <div className="animate-in fade-in slide-in-from-right-8 duration-500 max-w-2xl mx-auto w-full">
                  <h4 className="text-xl font-bold text-white mb-2">3. Thông tin cơ bản & SEO</h4>
                  <p className="text-white/50 mb-8 text-sm">Thiết lập nhận diện thương hiệu để xuất bản website lên internet.</p>
                  
                  <div className="space-y-6">
                    {/* Logo Upload (Mock UI) */}
                    <div>
                      <label className="block text-sm font-semibold text-white/70 mb-2">Logo Website</label>
                      <div className="flex items-center gap-4">
                        <div className="w-20 h-20 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center border-dashed">
                          <Image className="w-6 h-6 text-white/20" />
                        </div>
                        <div>
                          <Button variant="outline" className="border-white/10 text-white hover:bg-white/5 mb-2">
                            Tải ảnh lên
                          </Button>
                          <p className="text-xs text-white/40">PNG, JPG tối đa 5MB. Khuyên dùng ảnh vuông 512x512px.</p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-semibold text-white/70 mb-2">Tên Website</label>
                        <input 
                          type="text" 
                          value={formData.name}
                          onChange={(e) => setFormData({...formData, name: e.target.value})}
                          placeholder="Ví dụ: Shop Thời Trang" 
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-pink-500 transition-colors" 
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-white/70 mb-2">Tên miền phụ (Subdomain)</label>
                        <div className="flex">
                          <input 
                            type="text" 
                            value={formData.subdomain}
                            onChange={(e) => setFormData({...formData, subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')})}
                            placeholder="myshop" 
                            className="w-full bg-white/5 border border-white/10 border-r-0 rounded-l-xl px-4 py-3 text-white focus:outline-none focus:border-pink-500 transition-colors" 
                          />
                          <div className="bg-white/10 border border-white/10 border-l-0 rounded-r-xl px-4 py-3 text-white/50 flex items-center">
                            .ai2hero.com
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-white/70 mb-2 flex items-center gap-2">
                        Mô tả Website (Chuẩn SEO) <span className="px-2 py-0.5 rounded text-[10px] bg-pink-500/20 text-pink-400">Quan trọng</span>
                      </label>
                      <textarea 
                        value={formData.seoDescription}
                        onChange={(e) => setFormData({...formData, seoDescription: e.target.value})}
                        placeholder="Mô tả ngắn gọn về cửa hàng, cá nhân hoặc dịch vụ của bạn. Thông tin này sẽ hiển thị trên Google..." 
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-pink-500 transition-colors min-h-[100px] resize-none" 
                      />
                      <p className="text-xs text-white/40 mt-2 text-right">{formData.seoDescription.length}/160 ký tự</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Wizard */}
            <div className="bg-[#1a1a1f] p-6 border-t border-white/5 flex justify-between items-center mt-auto">
              <Button 
                onClick={() => creationStep === 1 ? setIsCreating(false) : setCreationStep(creationStep - 1)} 
                variant="ghost" 
                className="text-white/60 hover:text-white hover:bg-white/5 rounded-xl px-6"
              >
                {creationStep === 1 ? 'Hủy bỏ' : 'Quay lại'}
              </Button>
              
              {creationStep < 3 ? (
                <Button 
                  onClick={() => setCreationStep(creationStep + 1)} 
                  className="bg-white/10 hover:bg-white/20 text-white rounded-xl px-8 font-bold"
                >
                  Tiếp tục <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button 
                  onClick={handleCreateWebsite}
                  disabled={isSubmitting || !formData.name || !formData.subdomain}
                  className="bg-gradient-to-r from-pink-500 to-orange-500 hover:from-pink-600 hover:to-orange-600 text-white rounded-xl px-8 font-bold shadow-lg shadow-pink-500/25"
                >
                  {isSubmitting ? 'Đang xuất bản...' : 'Xuất bản Website'}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
