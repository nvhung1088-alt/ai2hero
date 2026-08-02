'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Loader2, Package, Search, Camera, Video, AlertCircle, CheckCircle2,
  Truck, RotateCcw, Play, Square, Download, Plus, Minus, Trash, Printer
} from 'lucide-react';
import {
  updateOrderByTrackingAction,
  completePickBatchAction,
  createExportSlipAction,
  processReturnAction
} from '@/lib/db/marketplace-actions';

// Fake sound generator
const playBeep = (type: 'success' | 'error' | 'warn') => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    if (type === 'success') {
      osc.frequency.value = 1000;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } else if (type === 'error') {
      osc.frequency.value = 200;
      osc.type = 'sawtooth';
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } else {
      osc.frequency.value = 600;
      osc.type = 'square';
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    }
  } catch (e) {}
};

type OrderItem = { sku: string; name: string; qty: number; scanned: number };
type PickOrder = { mvd: string; items: OrderItem[]; startTime: number; timer: number; isDone: boolean };

export default function FulfillmentClient({ teamId, initialOrders }: { teamId: string, initialOrders: any[] }) {
  const [activeTab, setActiveTab] = useState('printed');
  const [orders, setOrders] = useState<any[]>(initialOrders || []);

  // Keyboard Buffer
  const [scanBuffer, setScanBuffer] = useState('');

  // ---------- STATE ----------
  // Pick State
  const [pickMax, setPickMax] = useState(30);
  const [pickActive, setPickActive] = useState<PickOrder[]>([]);
  const [pickDone, setPickDone] = useState<PickOrder[]>([]);

  // Pack State
  const [packOrder, setPackOrder] = useState<any | null>(null);
  const [packTimer, setPackTimer] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [packChecklist, setPackChecklist] = useState<Record<string, boolean>>({});
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Export State
  const [exportList, setExportList] = useState<string[]>([]);
  const [exportSlips, setExportSlips] = useState<any[]>([]);
  
  // Return State
  const [returnPending, setReturnPending] = useState<string[]>(['VTP11112222', 'GHK22223333']); // Mock
  const [returnDone, setReturnDone] = useState<any[]>([]);

  // ---------- TIMER EFFECT ----------
  useEffect(() => {
    const t = setInterval(() => {
    if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
      setPickActive(prev => prev.map(p => p.isDone ? p : { ...p, timer: p.timer + 1 }));
      if (packOrder && isRecording) {
        setPackTimer(p => p + 1);
      }
    }, 1000);
    return () => clearInterval(t);
  }, [packOrder, isRecording]);

  // ---------- KEYBOARD SCANNER ----------
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) return;
      if (e.key === 'Enter') {
        if (scanBuffer.length >= 3) {
          processScan(scanBuffer);
        }
        setScanBuffer('');
      } else if (e.key.length === 1) {
        setScanBuffer(prev => prev + e.key);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [scanBuffer, activeTab, pickActive, packOrder, exportList, returnPending]);

  // ---------- SCAN LOGIC ----------
  const processScan = (barcode: string) => {
    // Audit Log
    console.log(`[ScanEngine] Quét mã: ${barcode} ở tab: ${activeTab}`);

    switch (activeTab) {
      case 'pick':
        handlePickScan(barcode);
        break;
      case 'pack':
        handlePackScan(barcode);
        break;
      case 'export':
        handleExportScan(barcode);
        break;
      case 'return':
        handleReturnScan(barcode);
        break;
      default:
        playBeep('warn');
        (window as any).showToast(`Mã quét: ${barcode}. Hãy chuyển sang tab xử lý tương ứng.`, 'info');
    }
  };

  // --- PICK LOGIC ---
  const handlePickScan = (barcode: string) => {
    // 1. Nếu là MVD của đơn đang nhặt -> Hoàn thành sớm
    const existingIdx = pickActive.findIndex(p => p.mvd === barcode);
    if (existingIdx >= 0) {
      const clone = [...pickActive];
      clone[existingIdx].isDone = true;
      setPickActive(clone.filter(c => !c.isDone));
      setPickDone(prev => [clone[existingIdx], ...prev]);
      playBeep('success');
      (window as any).showToast(`Đã đóng gói xong đơn ${barcode}`, 'success');
      return;
    }

    // 2. Nếu là MVD mới -> Bắt đầu nhặt (Mock logic check: order must exist)
    const o = orders.find(x => x.trackingNumber === barcode || x.platformOrderId === barcode);
    if (o || barcode.startsWith('VTP') || barcode.startsWith('GHK') || barcode.startsWith('SPX')) {
      if (pickActive.length >= pickMax) {
        playBeep('error');
        (window as any).showToast(`Tối đa ${pickMax} đơn cùng lúc.`, 'error');
        return;
      }
      playBeep('success');
      const newPick: PickOrder = {
        mvd: barcode,
        items: [
          { sku: 'SP-MOCK-1', name: 'Sản phẩm giả lập 1', qty: 2, scanned: 0 },
          { sku: 'SP-MOCK-2', name: 'Sản phẩm giả lập 2', qty: 1, scanned: 0 },
        ],
        startTime: Date.now(),
        timer: 0,
        isDone: false
      };
      setPickActive(prev => [...prev, newPick]);
      return;
    }

    // 3. Nếu là SKU
    let found = false;
    let allDoneMvd = null;
    const newPickActive = pickActive.map(p => {
      if (p.isDone) return p;
      const iIdx = p.items.findIndex(i => i.sku === barcode);
      if (iIdx >= 0) {
        found = true;
        const newItems = p.items.map((item, idx) =>
          idx === iIdx && item.scanned < item.qty
            ? { ...item, scanned: item.scanned + 1 }
            : item
        );
        const allDone = newItems.every(i => i.scanned >= i.qty);
        if (allDone) allDoneMvd = p.mvd;
        return { ...p, items: newItems };
      }
      return p;
    });

    if (found) {
      playBeep('success');
      setPickActive(newPickActive);
      if (allDoneMvd) {
        (window as any).showToast(`Đã nhặt đủ đồ cho đơn ${allDoneMvd}`, 'success');
        // Auto move to done? In real UpChat, requires final scan of MVD to close.
      }
    } else {
      playBeep('error');
      (window as any).showToast(`SKU ${barcode} không thuộc đơn đang nhặt nào!`, 'error');
    }
  };

  const finishAllPick = async () => {
    if (pickActive.length === 0) return;
    setPickDone(prev => [...pickActive, ...prev]);
    setPickActive([]);
    playBeep('success');
    (window as any).showToast(`Hoàn thành nhặt ${pickActive.length} đơn.`, 'success');
    await completePickBatchAction(teamId, pickActive.map(p => p.mvd));
  };

  // --- PACK LOGIC (WITH VIDEO) ---
  const handlePackScan = (barcode: string) => {
    if (packOrder) {
      if (packOrder.mvd === barcode) {
        // Stop packing
        stopRecording(barcode);
        playBeep('success');
        return;
      } else {
        // Finish old, start new
        stopRecording(packOrder.mvd);
      }
    }
    
    // Start pack
    setPackOrder({ mvd: barcode });
    setPackTimer(0);
    setPackChecklist({});
    startRecording();
    playBeep('success');
    (window as any).showToast(`Bắt đầu đóng gói ${barcode}`, 'info');
  };

  const toggleChecklist = (id: string) => {
    setPackChecklist(p => ({ ...p, [id]: !p[id] }));
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      if (videoRef.current) videoRef.current.srcObject = stream;
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mediaRecorder.start(1000);
      setIsRecording(true);
    } catch (err) {
      playBeep('error');
      (window as any).showToast('Lỗi Camera', 'error');
    }
  };

  const stopRecording = async (mvd: string) => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pack_${mvd}_${Date.now()}.webm`;
      a.click();
      URL.revokeObjectURL(url);
      
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach(track => track.stop());
      }
    }
    setPackOrder(null);
    (window as any).showToast(`Đã lưu video đóng gói ${mvd}`, 'success');
    await updateOrderByTrackingAction(mvd, 'shipping', 'Đóng gói xong — Chuẩn bị bàn giao vận chuyển');
  };

  // --- EXPORT LOGIC ---
  const handleExportScan = (barcode: string) => {
    if (exportList.includes(barcode)) {
      playBeep('warn');
      (window as any).showToast(`Đơn ${barcode} đã có trong danh sách xuất`, 'warning');
      return;
    }
    setExportList(p => [barcode, ...p]);
    playBeep('success');
  };

  const createExportSlip = async () => {
    if (exportList.length === 0) return;
    setExportSlips(p => [{ id: `XK-${Date.now()}`, count: exportList.length, time: new Date() }, ...p]);
    await createExportSlipAction(teamId, exportList);
    setExportList([]);
    playBeep('success');
    (window as any).showToast('Đã tạo phiếu xuất kho!', 'success');
  };

  // --- RETURN LOGIC ---
  const handleReturnScan = (barcode: string) => {
    if (!returnPending.includes(barcode)) {
      playBeep('error');
      (window as any).showToast(`Mã ${barcode} không có trong danh sách hoàn chờ nhận.`, 'error');
      return;
    }
    setReturnPending(p => p.filter(x => x !== barcode));
    setReturnDone(p => [{ mvd: barcode, status: 'ok', time: new Date() }, ...p]);
    playBeep('success');
    (window as any).showToast(`Đã kiểm định thành công ${barcode}`, 'success');
    processReturnAction(teamId, barcode);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* HEADER TABS */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full flex justify-start bg-card/50 backdrop-blur-md border border-border/50 h-auto p-1 overflow-x-auto">
          <TabsTrigger value="printed" className="py-2"><Package className="w-4 h-4 mr-2" /> Chờ xử lý</TabsTrigger>
          <TabsTrigger value="pick" className="py-2"><Search className="w-4 h-4 mr-2" /> Nhặt hàng</TabsTrigger>
          <TabsTrigger value="pack" className="py-2"><Camera className="w-4 h-4 mr-2" /> Đóng hàng</TabsTrigger>
          <TabsTrigger value="export" className="py-2"><Truck className="w-4 h-4 mr-2" /> Bàn giao</TabsTrigger>
          <TabsTrigger value="ship" className="py-2">Vận chuyển</TabsTrigger>
          <TabsTrigger value="return" className="py-2"><RotateCcw className="w-4 h-4 mr-2" /> Hoàn hàng</TabsTrigger>
        </TabsList>

        {/* ================= PICK TAB ================= */}
        <TabsContent value="pick" className="mt-4 space-y-4">
          <Card className="border-border/50 bg-card/50 backdrop-blur-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg">🛒 Trạm Nhặt Hàng (Pick)</CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setPickMax(p => Math.max(1, p - 1))}><Minus className="w-3 h-3" /></Button>
                <span className="font-mono">{pickMax}</span>
                <Button variant="outline" size="sm" onClick={() => setPickMax(p => Math.min(99, p + 1))}><Plus className="w-3 h-3" /></Button>
                <Button onClick={finishAllPick} className="ml-4"><CheckCircle2 className="w-4 h-4 mr-2" /> Hoàn thành tất cả</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground mb-4">Quét MVĐ để bắt đầu. Quét mã SKU sản phẩm để đếm. Quét MVĐ lại để chốt đơn.</div>
              {pickActive.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground border border-dashed rounded-md">Chưa có đơn nào đang nhặt. Quét mã ngay!</div>
              ) : (
                <div className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                  {pickActive.map(p => (
                    <div key={p.mvd} className="border rounded-md p-3 bg-background/50">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-mono font-bold text-primary">{p.mvd}</span>
                        <span className="text-xs text-muted-foreground">{p.timer}s</span>
                      </div>
                      <div className="space-y-1">
                        {p.items.map(it => (
                          <div key={it.sku} className={`flex justify-between text-sm ${it.scanned >= it.qty ? 'text-green-500' : ''}`}>
                            <span>{it.sku}</span>
                            <span>{it.scanned}/{it.qty}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ================= PACK TAB ================= */}
        <TabsContent value="pack" className="mt-4 space-y-4">
          <Card className="border-border/50 bg-card/50 backdrop-blur-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg">📦 Trạm Đóng Gói (Pack)</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                {!packOrder ? (
                  <div className="p-8 text-center text-muted-foreground border border-dashed rounded-md h-full flex items-center justify-center">
                    Quét MVĐ để bắt đầu đóng gói và quay video
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-base px-3 py-1 font-mono text-primary">{packOrder.mvd}</Badge>
                      <span className="text-red-500 font-mono animate-pulse">REC {packTimer}s</span>
                    </div>
                    <div className="space-y-2">
                      <label className="flex items-center space-x-2 p-2 border rounded-md cursor-pointer hover:bg-accent/50">
                        <input type="checkbox" checked={packChecklist['items'] || false} onChange={() => toggleChecklist('items')} className="w-4 h-4" />
                        <span>📦 Đủ sản phẩm</span>
                      </label>
                      <label className="flex items-center space-x-2 p-2 border rounded-md cursor-pointer hover:bg-accent/50">
                        <input type="checkbox" checked={packChecklist['protect'] || false} onChange={() => toggleChecklist('protect')} className="w-4 h-4" />
                        <span>🛡️ Chèn chống sốc</span>
                      </label>
                      <label className="flex items-center space-x-2 p-2 border rounded-md cursor-pointer hover:bg-accent/50">
                        <input type="checkbox" checked={packChecklist['label'] || false} onChange={() => toggleChecklist('label')} className="w-4 h-4" />
                        <span>🏷️ Dán tem phiếu</span>
                      </label>
                    </div>
                    <Button onClick={() => stopRecording(packOrder.mvd)} variant="destructive" className="w-full">
                      <Square className="w-4 h-4 mr-2" /> Dừng đóng gói & Lưu
                    </Button>
                  </div>
                )}
              </div>
              <div className="aspect-video bg-black/5 rounded-lg border border-border/50 overflow-hidden relative flex items-center justify-center">
                <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
                {!isRecording && <div className="absolute flex flex-col items-center text-muted-foreground"><Video className="w-8 h-8 mb-2 opacity-50" /><span>Camera Standby</span></div>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ================= EXPORT TAB ================= */}
        <TabsContent value="export" className="mt-4 space-y-4">
          <Card className="border-border/50 bg-card/50 backdrop-blur-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg">🚛 Trạm Xuất Kho (Export)</CardTitle>
              <Button onClick={createExportSlip} disabled={exportList.length === 0}><Printer className="w-4 h-4 mr-2" /> Tạo Phiếu ({exportList.length})</Button>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground mb-4">Quét liên tục các mã vận đơn để gom vào 1 phiên xuất kho.</div>
              <div className="grid gap-2 grid-cols-2 md:grid-cols-4 lg:grid-cols-6">
                {exportList.map(mvd => (
                  <Badge key={mvd} variant="secondary" className="py-2 justify-between flex text-sm">
                    {mvd}
                    <Trash className="w-3 h-3 text-red-500 cursor-pointer ml-2" onClick={() => setExportList(p => p.filter(x => x !== mvd))} />
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ================= RETURN TAB ================= */}
        <TabsContent value="return" className="mt-4 space-y-4">
          <Card className="border-border/50 bg-card/50 backdrop-blur-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">↩ Trạm Xử Lý Hoàn (Return)</CardTitle>
            </CardHeader>
            <CardContent>
               <div className="text-sm text-muted-foreground mb-4">Quét MVĐ đơn hàng trả về để kiểm định.</div>
               <div className="space-y-4">
                  <h4 className="font-semibold">Chờ xác nhận (Mock Data)</h4>
                  <div className="flex gap-2">
                    {returnPending.map(mvd => (
                      <Badge key={mvd} variant="outline" className="py-2 text-yellow-500">{mvd}</Badge>
                    ))}
                  </div>
                  <h4 className="font-semibold mt-6">Đã kiểm định</h4>
                  <div className="space-y-2">
                    {returnDone.map((rd, i) => (
                      <div key={i} className="text-sm flex justify-between p-2 border rounded-md">
                        <span className="font-mono text-primary">{rd.mvd}</span>
                        <span className="text-green-500 flex items-center"><CheckCircle2 className="w-4 h-4 mr-1"/> Nhập kho an toàn</span>
                      </div>
                    ))}
                  </div>
               </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* OTHER TABS (Fallback) */}
        <TabsContent value="printed" className="mt-4 text-center p-8 border rounded-md text-muted-foreground">Vui lòng chuyển sang Pick/Pack/Export để quét xử lý kho.</TabsContent>
        <TabsContent value="ship" className="mt-4 text-center p-8 border rounded-md text-muted-foreground">Theo dõi lộ trình giao hàng (Coming soon)</TabsContent>
      </Tabs>
    </div>
  );
}
