import { EventEmitter } from "events";
import { db } from '@/lib/db/drizzle';
import { videoPrompts, VideoNovel } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { HeroAiText } from './ai-utils';

export interface EventType {
  id: number;
  event: string;
}

export class CleanNovel {
  emitter: EventEmitter;
  concurrency: number;
  aiText: HeroAiText;

  constructor(aiText: HeroAiText, concurrency: number = 5) {
    this.emitter = new EventEmitter();
    this.concurrency = concurrency;
    this.aiText = aiText;
  }

  private async processChapter(novel: VideoNovel): Promise<EventType | null> {
    try {
      const promptData = await db.query.videoPrompts.findFirst({
        where: eq(videoPrompts.type, 'eventExtraction')
      });

      let eventExtraction = promptData?.data || '';
      if (promptData?.useData) {
        eventExtraction = promptData.useData;
      }

      if (!eventExtraction) {
        // Fallback default event extraction prompt
        eventExtraction = `# TẬP LỆNH TRÍCH XUẤT SỰ KIỆN TIỂU THUYẾT\nBạn là trợ lý phân tích văn bản. Hãy trích xuất sự kiện chính từ chương truyện dưới dạng bảng 7 trường.`;
      }

      const resData = await this.aiText.invoke({
        system: eventExtraction,
        messages: [
          {
            role: "user",
            content:
              `Hãy trích xuất sự kiện từ chương tiểu thuyết sau:\n` +
              `Số thứ tự chương: ${novel.chapterIndex}\n` +
              `Quyển/Tập: ${novel.reel || 'Không có'}\n` +
              `Tên chương: ${novel.chapter}\n` +
              `Nội dung chương:\n${novel.chapterData}`,
          },
        ],
      });

      const preData = resData.text;
      this.emitter.emit("item", { id: novel.id, event: preData });
      return { id: novel.id, event: preData };
    } catch (e: any) {
      this.emitter.emit("item", { id: novel.id, event: null, errorReason: e.message });
      return null;
    }
  }

  async start(allChapters: VideoNovel[]): Promise<EventType[]> {
    const totalEvent: EventType[] = [];
    let running = 0;
    let index = 0;

    const runNext = (): Promise<void> => {
      if (index >= allChapters.length) return Promise.resolve();
      const novel = allChapters[index++];
      running++;

      return this.processChapter(novel).then((result) => {
        if (result) totalEvent.push(result);
        running--;
        return runNext();
      });
    };

    const workers = Array.from(
      { length: Math.min(this.concurrency, allChapters.length) },
      () => runNext()
    );

    await Promise.all(workers);
    return totalEvent;
  }
}
