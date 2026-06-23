'use client';

import React, { useState, useTransition, useEffect } from 'react';
import { 
  Search, Filter, DollarSign, ShoppingBag, TrendingUp, RefreshCw, 
  Eye, CheckCircle, XCircle, AlertCircle, Clock, ArrowLeft, Copy, 
  ChevronRight, Edit, Plus, Trash, Brain, Settings, Database, Info 
} from 'lucide-react';
import { updateProductAction, getInventorySuggestionsAction, getAdminProductsAction } from '@/lib/db/marketplace-actions';

interface ProductsClientProps {
  currentUser: any;
  team: any;
  initialProducts: any[];
}

export function ProductsClient({ currentUser, team, initialProducts }: ProductsClientProps) {
  const [products, setProducts] = useState<any[]>(initialProducts);
  const [activeTab, setActiveTab] = useState<'master' | 'pricing' | 'inventory' | 'dashboard'>('master');
  
  // Master Tab filtering
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [aiStatusFilter, setAiStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  // Sheet states for editing
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState<boolean>(false);
  const [sheetTab, setSheetTab] = useState<'info' | 'desc' | 'stock' | 'ai_tier'>('info');
  const [updating, setUpdating] = useState<boolean>(false);

  // Edit form states
  const [formName, setFormName] = useState<string>('');
  const [formSku, setFormSku] = useState<string>('');
  const [formPrice, setFormPrice] = useState<number>(0);
  const [formComparePrice, setFormComparePrice] = useState<number>(0);
  const [formCostPrice, setFormCostPrice] = useState<number>(0);
  const [formStock, setFormStock] = useState<number>(0);
  const [formMinStock, setFormMinStock] = useState<number>(0);
  const [formReserved, setFormReserved] = useState<number>(0);
  const [formAvgDailySales, setFormAvgDailySales] = useState<number>(0);
  const [formWeight, setFormWeight] = useState<number>(0);
  const [formStatus, setFormStatus] = useState<'active' | 'draft' | 'out_of_stock'>('active');
  const [formDescription, setFormDescription] = useState<string>('');
  
  // AI & Tier Pricing states
  const [formAiStatus, setFormAiStatus] = useState<'active' | 'limited' | 'hidden'>('active');
  const [formAliases, setFormAliases] = useState<string>('');
  const [formSampleText, setFormSampleText] = useState<string>('');
  const [formDontSay, setFormDontSay] = useState<string>('');
  const [formAiNote, setFormAiNote] = useState<string>('');
  const [formTierPrices, setFormTierPrices] = useState<any[]>([]);

  // Inventory Restock Suggestions
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState<boolean>(false);

  const [isPending, startTransition] = useTransition();

  // Load form fields on product select
  useEffect(() => {
    if (selectedProduct) {
      setFormName(selectedProduct.name || '');
      setFormSku(selectedProduct.sku || '');
      setFormPrice(selectedProduct.price || 0);
      setFormComparePrice(selectedProduct.comparePrice || 0);
      setFormCostPrice(selectedProduct.costPrice || 0);
      setFormStock(selectedProduct.stock || 0);
      setFormMinStock(selectedProduct.minStock || 0);
      setFormReserved(selectedProduct.reserved || 0);
      setFormAvgDailySales(selectedProduct.avgDailySales || 0);
      setFormWeight(selectedProduct.weight || 0);
      setFormStatus(selectedProduct.status || 'active');
      setFormDescription(selectedProduct.description || '');
      
      setFormAiStatus(selectedProduct.aiStatus || 'active');
      
      // Parse aiConfig
      let cfg: any = {};
      if (selectedProduct.aiConfig) {
        cfg = typeof selectedProduct.aiConfig === 'string' 
          ? JSON.parse(selectedProduct.aiConfig) 
          : selectedProduct.aiConfig;
      }
      setFormAliases(Array.isArray(cfg.aliases) ? cfg.aliases.join(', ') : '');
      setFormSampleText(cfg.sampleText || '');
      setFormDontSay(cfg.dontSay || '');
      setFormAiNote(cfg.note || '');
      
      // Parse tierPrices
      let tiers: any[] = [];
      if (selectedProduct.tierPrices) {
        tiers = typeof selectedProduct.tierPrices === 'string'
          ? JSON.parse(selectedProduct.tierPrices)
          : selectedProduct.tierPrices;
      }
      setFormTierPrices(Array.isArray(tiers) ? tiers : []);
    }
  }, [selectedProduct]);

  // Load restock suggestions
  const loadSuggestions = async () => {
    setLoadingSuggestions(true);
    const res = await getInventorySuggestionsAction();
    setLoadingSuggestions(false);
    if (res.success && res.data) {
      setSuggestions(res.data);
    }
  };

  useEffect(() => {
    if (activeTab === 'inventory') {
      loadSuggestions();
    }
  }, [activeTab, products]);

  // Helpers
  const formatVND = (value: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  };

  const refetchProducts = async () => {
    startTransition(async () => {
      const res = await getAdminProductsAction();
      if (res.success && res.data) {
        setProducts(res.data);
      }
    });
  };

  // Save Product changes
  const handleSaveProduct = async () => {
    if (!selectedProduct) return;
    
    setUpdating(true);
    
    // Process aliases array
    const aliasesArr = formAliases
      .split(',')
      .map(a => a.trim())
      .filter(a => a.length > 0);

    const updatedConfig = {
      aliases: aliasesArr,
      sampleText: formSampleText,
      dontSay: formDontSay,
      note: formAiNote,
    };

    const updatePayload = {
      name: formName,
      sku: formSku,
      price: formPrice,
      comparePrice: formComparePrice,
      costPrice: formCostPrice,
      stock: formStock,
      minStock: formMinStock,
      reserved: formReserved,
      avgDailySales: formAvgDailySales,
      weight: formWeight,
      status: formStatus,
      description: formDescription,
      aiStatus: formAiStatus,
      aiConfig: updatedConfig,
      tierPrices: formTierPrices,
    };

    const res = await updateProductAction(selectedProduct.id, updatePayload);
    setUpdating(false);
    
    if (res.success) {
      (window as any).showToast?.({
        title: 'Thành công',
        description: 'Đã lưu thông tin sản phẩm.',
        type: 'success'
      });
      setIsSheetOpen(false);
      refetchProducts();
    } else {
      (window as any).showToast?.({
        title: 'Thất bại',
        description: res.error || 'Có lỗi xảy ra.',
        type: 'error'
      });
    }
  };

  // Add Wholesale tier pricing
  const addTierPrice = () => {
    setFormTierPrices([...formTierPrices, { moq: 5, price: formPrice * 0.9, label: 'Giá sỉ nhỏ' }]);
  };

  const updateTierPrice = (index: number, field: string, val: any) => {
    const updated = [...formTierPrices];
    updated[index] = { ...updated[index], [field]: val };
    setFormTierPrices(updated);
  };

  const removeTierPrice = (index: number) => {
    setFormTierPrices(formTierPrices.filter((_, idx) => idx !== index));
  };

  // Quick Inline edits for Price & Stock
  const handleQuickUpdate = async (productId: number, field: string, value: any) => {
    const res = await updateProductAction(productId, { [field]: value });
    if (res.success) {
      (window as any).showToast?.({
        title: 'Đã cập nhật',
        description: `Đã thay đổi ${field} thành công.`,
        type: 'success'
      });
      // Update local state
      setProducts(products.map(p => p.id === productId ? { ...p, [field]: value } : p));
    } else {
      (window as any).showToast?.({
        title: 'Thất bại',
        description: res.error || 'Không thể cập nhật nhanh.',
        type: 'error'
      });
    }
  };

  // Bulk RESTOCK confirm simulator
  const handleBulkRestock = async () => {
    const criticals = suggestions.filter(s => s.priority === 'critical');
    if (criticals.length === 0) {
      (window as any).showToast?.({
        title: 'Thông báo',
        description: 'Không có sản phẩm nào ở mức khẩn cấp cần restock.',
        type: 'info'
      });
      return;
    }

    if (confirm(`Bạn muốn xác nhận restock tự động cho ${criticals.length} sản phẩm mức KHẨN CẤP với số lượng gợi ý?`)) {
      let successCount = 0;
      for (const item of criticals) {
        const prodObj = products.find(p => p.id === item.productId);
        if (prodObj) {
          const newStock = (prodObj.stock || 0) + item.suggestQty;
          const res = await updateProductAction(item.productId, { stock: newStock });
          if (res.success) successCount++;
        }
      }
      
      (window as any).showToast?.({
        title: 'Hoàn thành restock',
        description: `Đã nhập hàng thành công cho ${successCount}/${criticals.length} sản phẩm.`,
        type: 'success'
      });
      refetchProducts();
    }
  };

  // Filtered Products
  const filteredProducts = products.filter(p => {
    const matchesSearch = searchTerm === '' || 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    const matchesAiStatus = aiStatusFilter === 'all' || p.aiStatus === aiStatusFilter;

    return matchesSearch && matchesStatus && matchesAiStatus;
  });

  // Calculate Product KPIs
  const totalProductsCount = products.length;
  const totalStockCount = products.reduce((sum, p) => sum + (p.stock || 0), 0);
  const outOfStockCount = products.filter(p => (p.stock || 0) <= 0).length;
  const warningStockCount = products.filter(p => p.stock > 0 && p.stock <= (p.minStock || 0)).length;

  return (
    <div className="w-full text-foreground py-6 px-4 md:px-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-orange-400 to-pink-500 bg-clip-text text-transparent">
            QUẢN LÝ SẢN PHẨM & KHO HÀNG
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Không gian làm việc: <span className="text-orange-400 font-semibold">{team.name}</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={refetchProducts}
            className="flex items-center gap-2 px-4 py-2 bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] rounded-lg text-sm text-gray-300 transition"
            disabled={isPending}
          >
            <RefreshCw className={`h-4 w-4 ${isPending ? 'animate-spin' : ''}`} />
            Làm mới dữ liệu
          </button>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex border-b border-white/[0.08] mb-6">
        <button 
          onClick={() => setActiveTab('master')}
          className={`px-5 py-3 text-sm font-semibold transition relative ${
            activeTab === 'master' ? 'text-orange-400' : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          Sản phẩm Master ({products.length})
          {activeTab === 'master' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-orange-500 to-pink-500" />
          )}
        </button>
        <button 
          onClick={() => setActiveTab('pricing')}
          className={`px-5 py-3 text-sm font-semibold transition relative ${
            activeTab === 'pricing' ? 'text-orange-400' : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          Bảng giá sỉ/lẻ
          {activeTab === 'pricing' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-orange-500 to-pink-500" />
          )}
        </button>
        <button 
          onClick={() => setActiveTab('inventory')}
          className={`px-5 py-3 text-sm font-semibold transition relative ${
            activeTab === 'inventory' ? 'text-orange-400' : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          Kho & Nhập hàng (AI Restock)
          {activeTab === 'inventory' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-orange-500 to-pink-500" />
          )}
        </button>
        <button 
          onClick={() => setActiveTab('dashboard')}
          className={`px-5 py-3 text-sm font-semibold transition relative ${
            activeTab === 'dashboard' ? 'text-orange-400' : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          Phân tích Dashboard
          {activeTab === 'dashboard' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-orange-500 to-pink-500" />
          )}
        </button>
      </div>

      {/* --- TAB CONTENT: PRODUCTS MASTER --- */}
      {activeTab === 'master' && (
        <div className="space-y-4">
          {/* Filters Toolbar */}
          <div className="bg-white/[0.02] border border-white/[0.08] rounded-xl p-4 shadow-xl">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Search */}
              <div className="relative col-span-1 md:col-span-2">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Tìm theo SKU, tên sản phẩm..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition"
                />
              </div>

              {/* Status filter */}
              <div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-orange-500 transition"
                >
                  <option value="all" className="bg-[#141420]">Mọi trạng thái hiển thị</option>
                  <option value="active" className="bg-[#141420]">Đang hiển thị (Active)</option>
                  <option value="draft" className="bg-[#141420]">Lưu nháp (Draft)</option>
                  <option value="out_of_stock" className="bg-[#141420]">Hết hàng (Tạm ngưng)</option>
                </select>
              </div>

              {/* AI status filter */}
              <div>
                <select
                  value={aiStatusFilter}
                  onChange={(e) => setAiStatusFilter(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-orange-500 transition"
                >
                  <option value="all" className="bg-[#141420]">Mọi quyền tư vấn AI</option>
                  <option value="active" className="bg-[#141420]">AI tư vấn chủ động</option>
                  <option value="limited" className="bg-[#141420]">AI chỉ bán khi hỏi</option>
                  <option value="hidden" className="bg-[#141420]">AI không tư vấn</option>
                </select>
              </div>
            </div>
          </div>

          {/* Products Table */}
          <div className="bg-white/[0.02] border border-white/[0.08] rounded-xl overflow-hidden shadow-xl animate-fade-in">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/[0.08] bg-white/[0.02] text-xs text-gray-400 uppercase font-semibold">
                    <th className="p-4">SKU / Ảnh</th>
                    <th className="p-4">Tên sản phẩm</th>
                    <th className="p-4">Giá bán lẻ</th>
                    <th className="p-4">Giá nhập vốn</th>
                    <th className="p-4">Tồn kho khả dụng</th>
                    <th className="p-4">AI Tư vấn</th>
                    <th className="p-4">Hiển thị</th>
                    <th className="p-4 text-center">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04] text-sm text-gray-300">
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-gray-500">
                        Không tìm thấy sản phẩm nào.
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((p) => {
                      const imgArr = typeof p.images === 'string' ? JSON.parse(p.images) : (p.images || []);
                      const mainImage = imgArr[0] || '';
                      
                      return (
                        <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              {mainImage ? (
                                <img src={mainImage} alt={p.name} className="h-10 w-10 object-cover rounded bg-white/10" />
                              ) : (
                                <div className="h-10 w-10 bg-white/[0.04] rounded flex items-center justify-center text-gray-600">
                                  <ShoppingBag className="h-5 w-5" />
                                </div>
                              )}
                              <span className="font-mono text-xs font-semibold text-orange-400 bg-orange-500/10 px-2 py-1 rounded">
                                {p.sku || `ID-${p.id}`}
                              </span>
                            </div>
                          </td>
                          <td className="p-4 font-semibold text-white max-w-xs truncate">
                            {p.name}
                          </td>
                          <td className="p-4 font-bold text-white">
                            {formatVND(p.price)}
                          </td>
                          <td className="p-4 text-gray-400">
                            {formatVND(p.costPrice || 0)}
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-1.5">
                              <span className={`font-bold ${p.stock <= (p.minStock || 0) ? 'text-red-400' : 'text-emerald-400'}`}>
                                {p.stock}
                              </span>
                              {p.stock <= (p.minStock || 0) && (
                                <span title="Sắp hết hàng">
                                  <AlertCircle className="h-3.5 w-3.5 text-red-400" />
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-4">
                            {p.aiStatus === 'active' && <span className="px-2 py-0.5 text-xs bg-green-500/10 text-green-400 border border-green-500/20 rounded">Tư vấn tốt</span>}
                            {p.aiStatus === 'limited' && <span className="px-2 py-0.5 text-xs bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 rounded">Hạn chế</span>}
                            {p.aiStatus === 'hidden' && <span className="px-2 py-0.5 text-xs bg-red-500/10 text-red-400 border border-red-500/20 rounded">Không</span>}
                          </td>
                          <td className="p-4">
                            {p.status === 'active' ? (
                              <span className="text-green-400 flex items-center gap-1"><CheckCircle className="h-3.5 w-3.5" /> Bán</span>
                            ) : (
                              <span className="text-gray-500 flex items-center gap-1"><XCircle className="h-3.5 w-3.5" /> Ẩn</span>
                            )}
                          </td>
                          <td className="p-4 text-center">
                            <button
                              onClick={() => {
                                setSelectedProduct(p);
                                setIsSheetOpen(true);
                              }}
                              className="flex items-center gap-1 px-3 py-1.5 bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.1] hover:border-orange-500/30 rounded text-gray-300 transition mx-auto text-xs"
                            >
                              <Edit className="h-3.5 w-3.5 text-orange-400" />
                              Sửa
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* --- TAB CONTENT: PRICING TAB --- */}
      {activeTab === 'pricing' && (
        <div className="space-y-4">
          <div className="bg-white/[0.02] border border-white/[0.08] rounded-xl p-4 text-sm text-gray-400 shadow flex items-center gap-2">
            <Info className="h-4 w-4 text-orange-400" />
            <span>Bạn có thể thay đổi trực tiếp (nhập số mới và mất focus) giá bán lẻ hoặc giá vốn của sản phẩm ngay tại bảng dưới đây.</span>
          </div>

          <div className="bg-white/[0.02] border border-white/[0.08] rounded-xl overflow-hidden shadow-xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/[0.08] bg-white/[0.02] text-xs text-gray-400 uppercase font-semibold">
                  <th className="p-4">Mã SKU</th>
                  <th className="p-4">Tên sản phẩm</th>
                  <th className="p-4 w-44">Giá bán lẻ (đ)</th>
                  <th className="p-4 w-44">Giá vốn (đ)</th>
                  <th className="p-4">Chính sách giá sỉ (Tiers)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04] text-sm text-gray-300">
                {products.map((p) => {
                  const tiers = typeof p.tierPrices === 'string' ? JSON.parse(p.tierPrices) : (p.tierPrices || []);
                  return (
                    <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="p-4 font-mono text-xs text-orange-400">{p.sku || `ID-${p.id}`}</td>
                      <td className="p-4 font-semibold text-white">{p.name}</td>
                      <td className="p-4">
                        <input 
                          type="number"
                          defaultValue={p.price}
                          onBlur={(e) => handleQuickUpdate(p.id, 'price', parseInt(e.target.value) || 0)}
                          className="w-full bg-white/[0.04] border border-white/[0.08] rounded px-2.5 py-1 focus:outline-none focus:border-orange-500 font-bold text-white text-sm"
                        />
                      </td>
                      <td className="p-4">
                        <input 
                          type="number"
                          defaultValue={p.costPrice}
                          onBlur={(e) => handleQuickUpdate(p.id, 'costPrice', parseInt(e.target.value) || 0)}
                          className="w-full bg-white/[0.04] border border-white/[0.08] rounded px-2.5 py-1 focus:outline-none focus:border-orange-500 text-gray-300 text-sm"
                        />
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-1.5">
                          {tiers.length === 0 ? (
                            <span className="text-xs text-gray-500">Chưa có giá sỉ</span>
                          ) : (
                            tiers.map((t: any, idx: number) => (
                              <span key={idx} className="px-2 py-0.5 text-xs bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-full" title={t.label}>
                                Mua ≥{t.moq}: {formatVND(t.price)}
                              </span>
                            ))
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- TAB CONTENT: KHO & NHẬP HÀNG --- */}
      {activeTab === 'inventory' && (
        <div className="space-y-6">
          {/* Sub menu controls */}
          <div className="flex justify-between items-center bg-white/[0.02] border border-white/[0.08] rounded-xl p-4 shadow-md">
            <div>
              <h3 className="font-bold text-white text-base">Hệ thống Trợ lý Kho AI</h3>
              <p className="text-xs text-gray-400 mt-1">Đang phân tích dữ liệu bán hàng thực tế để đưa ra cảnh báo restock.</p>
            </div>
            <button
              onClick={handleBulkRestock}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white font-bold rounded-lg text-sm transition"
            >
              <Brain className="h-4 w-4" />
              Restock thông minh (Critical)
            </button>
          </div>

          {/* Restock suggestions block */}
          <div className="bg-white/[0.02] border border-white/[0.08] rounded-xl p-6 shadow-xl space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Cảnh báo tồn kho & Đề xuất nhập hàng</h4>
              {loadingSuggestions && <span className="text-xs text-orange-400 flex items-center gap-1.5"><RefreshCw className="h-3 w-3 animate-spin" /> Đang tính toán...</span>}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/[0.08] bg-white/[0.02] text-xs text-gray-400 uppercase font-semibold">
                    <th className="p-4">Mã SKU</th>
                    <th className="p-4">Tên sản phẩm</th>
                    <th className="p-4 text-center">Khả dụng / Tồn</th>
                    <th className="p-4 text-center">Bán TB/Ngày</th>
                    <th className="p-4 text-center">Đủ bán (ngày)</th>
                    <th className="p-4">Mức độ khẩn</th>
                    <th className="p-4">Lý do cảnh báo</th>
                    <th className="p-4 text-right">Gợi ý nhập</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04] text-sm text-gray-300">
                  {suggestions.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-gray-500">
                        {loadingSuggestions ? 'Đang phân tích...' : 'Kho hàng của bạn đang ở trạng thái an toàn tuyệt đối.'}
                      </td>
                    </tr>
                  ) : (
                    suggestions.map((item) => (
                      <tr key={item.productId} className="hover:bg-white/[0.02] transition-colors">
                        <td className="p-4 font-mono text-xs text-orange-400">{item.sku}</td>
                        <td className="p-4 font-semibold text-white max-w-xs truncate">{item.name}</td>
                        <td className="p-4 text-center font-bold">
                          <span className={item.available <= 0 ? 'text-red-400' : 'text-white'}>
                            {item.available}
                          </span> / <span className="text-gray-500 text-xs">{item.stock}</span>
                        </td>
                        <td className="p-4 text-center font-semibold">{item.avgDailySales}</td>
                        <td className="p-4 text-center">
                          {item.daysLeft >= 999 ? 'N/A' : `${item.daysLeft} ngày`}
                        </td>
                        <td className="p-4">
                          {item.priority === 'critical' && <span className="px-2 py-0.5 text-xs bg-red-500/10 text-red-400 border border-red-500/20 rounded font-bold uppercase">Khẩn cấp</span>}
                          {item.priority === 'warning' && <span className="px-2 py-0.5 text-xs bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 rounded font-bold uppercase">Cảnh báo</span>}
                          {item.priority === 'safe' && <span className="px-2 py-0.5 text-xs bg-green-500/10 text-green-400 border border-green-500/20 rounded font-bold uppercase">An toàn</span>}
                        </td>
                        <td className="p-4 text-xs text-gray-400 max-w-xs truncate">{item.reason}</td>
                        <td className="p-4 text-right font-extrabold text-white text-base">
                          {item.suggestQty > 0 ? (
                            <span className="text-orange-400">+{item.suggestQty}</span>
                          ) : (
                            <span className="text-gray-500">—</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* --- TAB CONTENT: DASHBOARD --- */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* KPI Mini Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white/[0.02] border border-white/[0.08] rounded-xl p-5 shadow">
              <span className="text-xs text-gray-400 uppercase font-semibold">Tổng mặt hàng</span>
              <p className="text-2xl font-bold text-white mt-1">{totalProductsCount} SP</p>
            </div>
            <div className="bg-white/[0.02] border border-white/[0.08] rounded-xl p-5 shadow">
              <span className="text-xs text-gray-400 uppercase font-semibold">Tổng lượng tồn kho</span>
              <p className="text-2xl font-bold text-white mt-1">{totalStockCount} cái</p>
            </div>
            <div className="bg-white/[0.02] border border-white/[0.08] rounded-xl p-5 shadow">
              <span className="text-xs text-gray-400 uppercase font-semibold">Đã cháy hàng (0 tồn)</span>
              <p className="text-2xl font-bold text-red-400 mt-1">{outOfStockCount} SP</p>
            </div>
            <div className="bg-white/[0.02] border border-white/[0.08] rounded-xl p-5 shadow">
              <span className="text-xs text-gray-400 uppercase font-semibold">Sắp hết hàng (≤ minStock)</span>
              <p className="text-2xl font-bold text-yellow-400 mt-1">{warningStockCount} SP</p>
            </div>
          </div>

          {/* Raking tables grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Top seller */}
            <div className="bg-white/[0.02] border border-white/[0.08] rounded-xl p-5 shadow-lg">
              <h4 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">Top 5 bán chạy (ngày)</h4>
              <div className="divide-y divide-white/[0.04]">
                {products
                  .filter(p => p.avgDailySales > 0)
                  .sort((a, b) => b.avgDailySales - a.avgDailySales)
                  .slice(0, 5)
                  .map((p, idx) => (
                    <div key={p.id} className="py-2.5 flex justify-between items-center text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-orange-400">#{idx + 1}</span>
                        <span className="text-white font-medium line-clamp-1 max-w-[150px]">{p.name}</span>
                      </div>
                      <span className="font-bold text-emerald-400">{p.avgDailySales} cái/ngày</span>
                    </div>
                  ))}
              </div>
            </div>

            {/* Top Profitability */}
            <div className="bg-white/[0.02] border border-white/[0.08] rounded-xl p-5 shadow-lg">
              <h4 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">Top 5 lợi nhuận cao nhất</h4>
              <div className="divide-y divide-white/[0.04]">
                {products
                  .map(p => ({ ...p, margin: p.price - (p.costPrice || 0) }))
                  .sort((a, b) => b.margin - a.margin)
                  .slice(0, 5)
                  .map((p, idx) => (
                    <div key={p.id} className="py-2.5 flex justify-between items-center text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-pink-400">#{idx + 1}</span>
                        <span className="text-white font-medium line-clamp-1 max-w-[150px]">{p.name}</span>
                      </div>
                      <span className="font-bold text-white">+{formatVND(p.margin)}</span>
                    </div>
                  ))}
              </div>
            </div>

            {/* Slow stock */}
            <div className="bg-white/[0.02] border border-white/[0.08] rounded-xl p-5 shadow-lg">
              <h4 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">Top 5 hàng bán chậm (Đọng tồn)</h4>
              <div className="divide-y divide-white/[0.04]">
                {products
                  .filter(p => p.stock > 0 && p.avgDailySales > 0)
                  .map(p => ({ ...p, days: Math.round(p.stock / p.avgDailySales) }))
                  .sort((a, b) => b.days - a.days)
                  .slice(0, 5)
                  .map((p, idx) => (
                    <div key={p.id} className="py-2.5 flex justify-between items-center text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-purple-400">#{idx + 1}</span>
                        <span className="text-white font-medium line-clamp-1 max-w-[150px]">{p.name}</span>
                      </div>
                      <span className="font-bold text-red-400">{p.days} ngày đủ bán</span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- DETAIL SHEET (SLIDE-IN MODAL) --- */}
      {isSheetOpen && selectedProduct && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Overlay */}
          <div 
            onClick={() => setIsSheetOpen(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
          />

          {/* Panel */}
          <div className="absolute right-0 top-0 h-full w-full sm:w-[500px] bg-[#0d0d15] border-l border-white/[0.08] shadow-2xl flex flex-col z-50 animate-scale-up">
            {/* Header */}
            <div className="p-6 border-b border-white/[0.08] flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-white">Chỉnh sửa sản phẩm</h3>
                <p className="text-xs text-orange-400 mt-1 font-mono">{formSku || 'CHƯA CÓ SKU'}</p>
              </div>
              <button 
                onClick={() => setIsSheetOpen(false)}
                className="p-1.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] rounded-lg text-gray-400 transition"
              >
                Đóng
              </button>
            </div>

            {/* Sub Tabs */}
            <div className="flex border-b border-white/[0.04] text-xs font-semibold bg-white/[0.01]">
              {[
                { id: 'info', label: 'Thông tin cơ bản' },
                { id: 'desc', label: 'Mô tả chi tiết' },
                { id: 'stock', label: 'Quản trị kho' },
                { id: 'ai_tier', label: 'AI & Giá sỉ' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setSheetTab(tab.id as any)}
                  className={`flex-1 py-3 text-center border-b transition-colors ${
                    sheetTab === tab.id 
                      ? 'border-orange-500 text-orange-400' 
                      : 'border-transparent text-gray-400 hover:text-gray-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Scrollable Editor Form */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* SUB TAB: INFO */}
              {sheetTab === 'info' && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-400">Tên sản phẩm *</label>
                    <input 
                      type="text"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500 transition"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-400">Mã SKU *</label>
                      <input 
                        type="text"
                        value={formSku}
                        onChange={(e) => setFormSku(e.target.value)}
                        className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500 transition"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-400">Trạng thái bán</label>
                      <select
                        value={formStatus}
                        onChange={(e) => setFormStatus(e.target.value as any)}
                        className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500 transition"
                      >
                        <option value="active" className="bg-[#141420]">Active (Hiển thị bán)</option>
                        <option value="draft" className="bg-[#141420]">Draft (Bản nháp ẩn)</option>
                        <option value="out_of_stock" className="bg-[#141420]">Hết hàng (Tạm ngưng)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-400">Giá bán lẻ (đ)</label>
                      <input 
                        type="number"
                        value={formPrice}
                        onChange={(e) => setFormPrice(parseInt(e.target.value) || 0)}
                        className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500 transition"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-400">So sánh giá (đ)</label>
                      <input 
                        type="number"
                        value={formComparePrice}
                        onChange={(e) => setFormComparePrice(parseInt(e.target.value) || 0)}
                        className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500 transition"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-400">Giá vốn (đ)</label>
                      <input 
                        type="number"
                        value={formCostPrice}
                        onChange={(e) => setFormCostPrice(parseInt(e.target.value) || 0)}
                        className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500 transition"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* SUB TAB: DESCRIPTION */}
              {sheetTab === 'desc' && (
                <div className="space-y-1.5 h-full flex flex-col">
                  <label className="text-xs font-semibold text-gray-400">Mô tả sản phẩm</label>
                  <textarea 
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    rows={12}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500 transition resize-none flex-1"
                    placeholder="Mô tả công dụng, tính năng, đặc điểm sản phẩm..."
                  />
                </div>
              )}

              {/* SUB TAB: STOCK */}
              {sheetTab === 'stock' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-400">Số lượng tồn kho thực tế</label>
                      <input 
                        type="number"
                        value={formStock}
                        onChange={(e) => setFormStock(parseInt(e.target.value) || 0)}
                        className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500 transition"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-400">Ngưỡng báo động tồn tối thiểu</label>
                      <input 
                        type="number"
                        value={formMinStock}
                        onChange={(e) => setFormMinStock(parseInt(e.target.value) || 0)}
                        className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500 transition"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-400">Số lượng đang giữ (Reserved)</label>
                      <input 
                        type="number"
                        value={formReserved}
                        onChange={(e) => setFormReserved(parseInt(e.target.value) || 0)}
                        className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500 transition"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-400">Lượng bán trung bình/ngày</label>
                      <input 
                        type="number"
                        value={formAvgDailySales}
                        onChange={(e) => setFormAvgDailySales(parseInt(e.target.value) || 0)}
                        className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500 transition"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-400">Trọng lượng đóng gói (gram)</label>
                    <input 
                      type="number"
                      value={formWeight}
                      onChange={(e) => setFormWeight(parseInt(e.target.value) || 0)}
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500 transition"
                    />
                  </div>
                </div>
              )}

              {/* SUB TAB: AI CONFIG & PRICE TIERS */}
              {sheetTab === 'ai_tier' && (
                <div className="space-y-6">
                  {/* AI Section */}
                  <div className="space-y-4 border-b border-white/[0.08] pb-6">
                    <h4 className="text-sm font-bold text-orange-400 flex items-center gap-1.5">
                      <Brain className="h-4 w-4" />
                      Cấu hình kịch bản tư vấn AI
                    </h4>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-400">Quyền tư vấn của AI</label>
                      <select
                        value={formAiStatus}
                        onChange={(e) => setFormAiStatus(e.target.value as any)}
                        className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500 transition"
                      >
                        <option value="active" className="bg-[#141420]">Chủ động tư vấn bán chéo (Active)</option>
                        <option value="limited" className="bg-[#141420]">Chỉ tư vấn khi được chỉ định hỏi (Limited)</option>
                        <option value="hidden" className="bg-[#141420]">Ẩn hoàn toàn khỏi AI context (Hidden)</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-400">Tên gọi khác của sản phẩm (Phân cách bằng dấu phẩy)</label>
                      <input 
                        type="text"
                        value={formAliases}
                        onChange={(e) => setFormAliases(e.target.value)}
                        placeholder="áo khoác, áo ấm, jacket, hoodie..."
                        className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-orange-500 transition"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-400">Mẫu từ khóa / Kịch bản AI khuyên dùng</label>
                      <textarea 
                        value={formSampleText}
                        onChange={(e) => setFormSampleText(e.target.value)}
                        placeholder="Hãy khuyên khách chọn size lớn hơn 1 size..."
                        className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500 transition h-16"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-400">Các từ AI KHÔNG được nói (Cấm nói)</label>
                      <input 
                        type="text"
                        value={formDontSay}
                        onChange={(e) => setFormDontSay(e.target.value)}
                        placeholder="hàng nhái, fake, hoàn tiền 100%..."
                        className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-orange-500 transition"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-400">Ghi chú vận hành của kho</label>
                      <input 
                        type="text"
                        value={formAiNote}
                        onChange={(e) => setFormAiNote(e.target.value)}
                        placeholder="Hàng dễ vỡ, bọc xốp 2 lớp..."
                        className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-orange-500 transition"
                      />
                    </div>
                  </div>

                  {/* Pricing Tiers Section */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h4 className="text-sm font-bold text-purple-400 flex items-center gap-1.5">
                        <Database className="h-4 w-4" />
                        Chính sách bán sỉ (Tiers)
                      </h4>
                      <button
                        type="button"
                        onClick={addTierPrice}
                        className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 font-semibold"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Thêm bậc sỉ
                      </button>
                    </div>

                    {formTierPrices.length === 0 ? (
                      <p className="text-center text-gray-500 text-xs py-4">Chưa cài đặt giá sỉ cho sản phẩm này.</p>
                    ) : (
                      <div className="space-y-3">
                        {formTierPrices.map((tier, idx) => (
                          <div key={idx} className="flex gap-2 items-center bg-white/[0.02] border border-white/[0.04] p-3 rounded-lg">
                            <div className="w-16">
                              <label className="text-[10px] text-gray-500 block">SL tối thiểu</label>
                              <input 
                                type="number"
                                value={tier.moq}
                                onChange={(e) => updateTierPrice(idx, 'moq', parseInt(e.target.value) || 0)}
                                className="w-full bg-white/[0.04] border border-white/[0.08] rounded px-1.5 py-0.5 text-xs text-white"
                              />
                            </div>
                            <div className="flex-1">
                              <label className="text-[10px] text-gray-500 block">Đơn giá sỉ (đ)</label>
                              <input 
                                type="number"
                                value={tier.price}
                                onChange={(e) => updateTierPrice(idx, 'price', parseInt(e.target.value) || 0)}
                                className="w-full bg-white/[0.04] border border-white/[0.08] rounded px-1.5 py-0.5 text-xs text-white"
                              />
                            </div>
                            <div className="w-24">
                              <label className="text-[10px] text-gray-500 block">Nhãn hiển thị</label>
                              <input 
                                type="text"
                                value={tier.label}
                                onChange={(e) => updateTierPrice(idx, 'label', e.target.value)}
                                className="w-full bg-white/[0.04] border border-white/[0.08] rounded px-1.5 py-0.5 text-xs text-white"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => removeTierPrice(idx)}
                              className="p-1 text-red-400 hover:bg-white/[0.08] rounded self-end mb-0.5"
                            >
                              <Trash className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-white/[0.08] bg-white/[0.01] flex justify-between items-center gap-3">
              <button 
                onClick={handleSaveProduct}
                disabled={updating}
                className="flex-1 py-2.5 bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white font-bold rounded-lg text-sm transition"
              >
                {updating ? 'Đang lưu chỉnh sửa...' : 'Lưu sản phẩm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
