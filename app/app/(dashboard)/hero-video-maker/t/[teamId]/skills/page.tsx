import path from 'path';
import fs from 'fs/promises';
import SkillsAuditClient from './skills-audit-client';

export const metadata = {
  title: 'Skill Audit - Video Maker AI'
};

export default async function SkillAuditPage({
  params
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = await params;
  const presetsPath = path.join(process.cwd(), 'app', 'lib', 'hero-video-maker', 'presets.json');
  let initialPresets = { artSkills: [], storySkills: [] };
  
  try {
    const fileContent = await fs.readFile(presetsPath, 'utf8');
    initialPresets = JSON.parse(fileContent);
  } catch (error) {
    console.error('Error loading presets.json:', error);
  }

  return (
    <div className="w-full h-full p-6 lg:p-8 space-y-6 flex flex-col max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white mb-2">Skill Audit</h1>
        <p className="text-sm text-gray-400">
          Quản lý, kiểm duyệt và cập nhật hình đại diện cho 150+ Sổ tay Đạo diễn và Phong cách Nghệ thuật.
        </p>
      </div>
      
      <div className="flex-1 min-h-0 bg-white/[0.02] border border-white/5 rounded-2xl p-6">
        <SkillsAuditClient initialPresets={initialPresets} teamId={teamId} />
      </div>
    </div>
  );
}
