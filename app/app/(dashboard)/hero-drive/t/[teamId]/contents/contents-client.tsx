'use client';

import { useState } from 'react';
import {
  Layers,
  ChevronDown,
  ChevronRight,
  Copy,
  ExternalLink,
  FileVideo,
  FileImage,
  FileText,
  File,
  Search,
  Share2,
  CheckCircle2,
  Clock,
} from 'lucide-react';

export default function ContentsClient({
  teamId,
  initialContents,
}: {
  teamId: number;
  initialContents: any[];
}) {
  const [contents, setContents] = useState<any[]>(initialContents);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedContentIds, setExpandedContentIds] = useState<number[]>([]);

  const filteredContents = contents.filter((c) =>
    c.baseName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleExpandContent = (id: number) => {
    setExpandedContentIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Đã copy link trực tiếp thành công!');
  };

  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case 'video':
        return <FileVideo className="w-4 h-4 text-blue-400" />;
      case 'image':
        return <FileImage className="w-4 h-4 text-emerald-400" />;
      case 'text':
        return <FileText className="w-4 h-4 text-amber-400" />;
      default:
        return <File className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="flex-1 p-6 space-y-6 bg-slate-950/60 min-h-screen text-slate-100">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Layers className="w-5 h-5 text-purple-400" />
            Quản Lý Bài Đăng Mạng Xã Hội (Contents)
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Gom nhóm tự động các file cùng tên (1 Video, 2 Ảnh, 1 Txt) để chuẩn bị cho luồng tự động Đăng bài MXH.
          </p>
        </div>

        <div className="w-full sm:w-64 relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            placeholder="Tìm bài đăng..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-purple-500"
          />
        </div>
      </div>

      {/* Contents List */}
      <div className="space-y-3">
        {filteredContents.length === 0 ? (
          <div className="p-8 border border-slate-800 rounded-xl bg-slate-900/30 text-center">
            <Layers className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-300">Chưa có bài đăng nào được quét</p>
            <p className="text-xs text-slate-500 mt-1">
              Bật Python Worker quét file từ đĩa C để hệ thống tự động gom nhóm bài đăng lên đây.
            </p>
          </div>
        ) : (
          filteredContents.map((content) => {
            const isExpanded = expandedContentIds.includes(content.id);
            const isDone = content.status === 'completed';

            return (
              <div
                key={content.id}
                className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden"
              >
                <div
                  onClick={() => toggleExpandContent(content.id)}
                  className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-900/80 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    )}
                    <div>
                      <h3 className="font-semibold text-sm text-slate-100 flex items-center gap-2">
                        {content.baseName}
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Tệp đính kèm: {content.uploadedFiles} / {content.totalFiles} files
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`px-2.5 py-0.5 text-xs rounded border font-medium ${
                        isDone
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      }`}
                    >
                      {isDone ? 'Sẵn sàng Đăng MXH' : 'Đang xử lý Upload'}
                    </span>
                  </div>
                </div>

                {/* Collapsible Files List */}
                {isExpanded && (
                  <div className="border-t border-slate-800 p-4 bg-slate-950/80 space-y-2">
                    {content.files && content.files.length > 0 ? (
                      content.files.map((file: any) => (
                        <div
                          key={file.id}
                          className="flex items-center justify-between p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-xs"
                        >
                          <div className="flex items-center gap-2.5">
                            {getFileIcon(file.fileType)}
                            <div>
                              <p className="font-medium text-slate-200">{file.fileName}</p>
                              <p className="text-[11px] text-slate-400">
                                {(file.fileSize / (1024 * 1024)).toFixed(2)} MB • Status: {file.status}
                              </p>
                            </div>
                          </div>

                          {file.streamLink && (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => copyToClipboard(file.streamLink)}
                                className="flex items-center gap-1 px-2.5 py-1 bg-purple-600/20 text-purple-400 border border-purple-500/30 hover:bg-purple-600/30 rounded text-xs transition-colors"
                              >
                                <Copy className="w-3 h-3" />
                                Copy Link Stream
                              </button>
                              <a
                                href={file.streamLink}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1 text-slate-400 hover:text-slate-200"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-500 text-center py-2">
                        Chưa có thông tin tệp con.
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
