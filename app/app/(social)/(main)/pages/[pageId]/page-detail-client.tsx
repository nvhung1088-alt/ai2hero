"use client";

import { PageHeader } from './page-header';
import { PageTabs } from './page-tabs';

interface PageDetailClientProps {
  currentUser: any;
  pageData: any;
  isAdmin: boolean;
  isFollowing: boolean;
  initialPosts: any[];
}

export function PageDetailClient({
  currentUser,
  pageData,
  isAdmin,
  isFollowing,
  initialPosts
}: PageDetailClientProps) {
  return (
    <div className="w-full space-y-6 text-white px-4 md:px-6 pt-6 pb-20">
      <div className="space-y-6">
        <PageHeader
          currentUser={currentUser}
          pageData={pageData}
          isAdmin={isAdmin}
          isFollowing={isFollowing}
        />

        <PageTabs
          currentUser={currentUser}
          pageData={pageData}
          initialPosts={initialPosts}
          isAdmin={isAdmin}
        />
      </div>
    </div>
  );
}
