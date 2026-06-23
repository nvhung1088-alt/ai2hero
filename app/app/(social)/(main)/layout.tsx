import { getUser, getTeamsForUser } from '@/lib/db/queries';
import { redirect } from 'next/navigation';
import { SocialLayout } from './social-layout';
import { CookieSync } from '@/components/cookie-sync';
import { SocialTopNav } from './social-top-nav';
import { CreateWorkspaceModal } from '../../(dashboard)/dashboard/create-workspace-modal';
import { AuthModal } from '@/components/auth-modal';
import { getActiveTeamCookie } from '@/lib/team-cookie';
import { getFriendsWithProfile } from '@/lib/db/social-queries';
import { CartProvider } from '@/lib/cart-context';

export const revalidate = 0;

export default async function SocialModuleLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();
  const teams = user ? await getTeamsForUser(user.id) : [];
  const friends = user ? await getFriendsWithProfile(user.id) : [];
  
  // Lấy active team từ cookie hoặc fallback về team đầu tiên
  let activeTeamId = await getActiveTeamCookie();
  if (!activeTeamId && teams.length > 0) {
    activeTeamId = teams[0].id;
  }

  // Serialize props to prevent Date serialization issues
  const safeUser = user ? JSON.parse(JSON.stringify(user)) : null;
  const safeTeams = JSON.parse(JSON.stringify(teams));
  const safeFriends = JSON.parse(JSON.stringify(friends));

  return (
    <div
      className="flex flex-col min-h-screen text-white w-full"
      style={{
        background: `
          radial-gradient(ellipse at 15% 0%, rgba(139,92,246,0.06) 0%, transparent 50%),
          radial-gradient(ellipse at 85% 5%, rgba(236,72,153,0.04) 0%, transparent 45%),
          radial-gradient(ellipse at 50% 100%, rgba(59,130,246,0.03) 0%, transparent 50%),
          #08080c
        `
      }}
    >
      {activeTeamId && <CookieSync teamId={activeTeamId} />}
      <CreateWorkspaceModal hideTrigger={true} />
      <AuthModal />
      
      {/* Social Top Nav — dark-mode themed, thay thế TopHeader chung */}
      <CartProvider>
        <SocialTopNav />

        {/* Giao diện chính của Social Hero */}
        <SocialLayout user={safeUser} teams={safeTeams} activeTeamId={activeTeamId || 0} friends={safeFriends}>
          {children}
        </SocialLayout>
      </CartProvider>
    </div>
  );
}
