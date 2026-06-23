import { getVideoProjectById } from '@/lib/db/video-maker-actions';
import { redirect } from 'next/navigation';
import StepSidebar from './StepSidebar';

export default async function EditorLayout(props: {
  children: React.ReactNode;
  params: Promise<{ teamId: string; projectId: string }>;
}) {
  const { children } = props;
  const { teamId, projectId } = await props.params;
  const tid = parseInt(teamId, 10);
  const pid = parseInt(projectId, 10);

  const project = await getVideoProjectById(tid, pid);
  if (!project) {
    redirect(`/hero-video-maker/t/${tid}/dashboard`);
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#040407] text-slate-100 font-sans antialiased">
      {/* Step Sidebar */}
      <StepSidebar 
        teamId={tid} 
        projectId={pid} 
        projectTitle={project.title} 
      />

      {/* Main Workspace Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Glow Spot effect */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-pink-500/[0.015] blur-[150px] pointer-events-none -z-10" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] rounded-full bg-purple-500/[0.015] blur-[150px] pointer-events-none -z-10" />
        
        {children}
      </div>
    </div>
  );
}
