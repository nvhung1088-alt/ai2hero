'use server';

import { db } from './drizzle';
import { websites } from './schema';
import { eq, and, desc } from 'drizzle-orm';
import { getUser } from './queries';

export async function getUserWebsitesAction() {
  const user = await getUser();
  if (!user) {
    return { error: 'Vui lòng đăng nhập' };
  }

  try {
    const userWebsites = await db
      .select()
      .from(websites)
      .where(eq(websites.userId, user.id))
      .orderBy(desc(websites.createdAt));

    return { websites: userWebsites };
  } catch (error: any) {
    console.error('Error fetching websites:', error);
    return { error: 'Lỗi tải danh sách website' };
  }
}

export async function createWebsiteAction(data: {
  name: string;
  subdomain: string;
  templateId?: string;
  themeConfig?: any;
  linkedPageId?: number | null;
  linkedProfileId?: number | null;
}) {
  const user = await getUser();
  if (!user) {
    return { error: 'Vui lòng đăng nhập' };
  }

  // Validate subdomain (only alphanumeric and hyphens)
  const subdomainRegex = /^[a-z0-9-]+$/;
  if (!subdomainRegex.test(data.subdomain)) {
    return { error: 'Subdomain chỉ được chứa chữ cái viết thường, số và dấu gạch ngang' };
  }

  try {
    // Check if subdomain exists
    const existing = await db
      .select({ id: websites.id })
      .from(websites)
      .where(eq(websites.subdomain, data.subdomain))
      .limit(1);

    if (existing.length > 0) {
      return { error: 'Tên miền phụ (subdomain) này đã được sử dụng' };
    }

    const [newWebsite] = await db.insert(websites).values({
      userId: user.id,
      name: data.name,
      subdomain: data.subdomain,
      templateId: data.templateId || 'ecommerce',
      themeConfig: data.themeConfig || {},
      linkedPageId: data.linkedPageId,
      linkedProfileId: data.linkedProfileId,
    }).returning();

    return { success: true, website: newWebsite };
  } catch (error: any) {
    console.error('Error creating website:', error);
    return { error: 'Lỗi tạo website: ' + error.message };
  }
}

export async function updateWebsiteAction(
  id: number,
  data: {
    name?: string;
    customDomain?: string;
    templateId?: string;
    themeConfig?: any;
    linkedPageId?: number | null;
    linkedProfileId?: number | null;
  }
) {
  const user = await getUser();
  if (!user) {
    return { error: 'Vui lòng đăng nhập' };
  }

  try {
    // Verify ownership
    const existing = await db
      .select()
      .from(websites)
      .where(and(eq(websites.id, id), eq(websites.userId, user.id)))
      .limit(1);

    if (existing.length === 0) {
      return { error: 'Website không tồn tại hoặc bạn không có quyền' };
    }

    const [updated] = await db
      .update(websites)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(websites.id, id))
      .returning();

    return { success: true, website: updated };
  } catch (error: any) {
    console.error('Error updating website:', error);
    return { error: 'Lỗi cập nhật website: ' + error.message };
  }
}

export async function getWebsiteBySubdomainAction(subdomain: string) {
  try {
    const [site] = await db
      .select()
      .from(websites)
      .where(eq(websites.subdomain, subdomain))
      .limit(1);
    
    return { website: site || null };
  } catch (error: any) {
    console.error('Error fetching website:', error);
    return { error: 'Lỗi tải website' };
  }
}

export async function getWebsiteByCustomDomainAction(customDomain: string) {
  try {
    const [site] = await db
      .select()
      .from(websites)
      .where(eq(websites.customDomain, customDomain))
      .limit(1);
    
    return { website: site || null };
  } catch (error: any) {
    console.error('Error fetching website:', error);
    return { error: 'Lỗi tải website' };
  }
}
