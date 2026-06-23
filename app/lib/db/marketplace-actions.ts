'use server';

import { db } from './drizzle';
import { marketplaceProducts, marketplaceOrders } from './schema';
import { getTeamForUser, getUser } from './queries';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { eq, and, desc, like, or, inArray } from 'drizzle-orm';

// --- SCHEMA & VALIDATIONS ---

const CreateProductSchema = z.object({
  name: z.string().min(1, 'Tên không được để trống').max(500),
  description: z.string().optional(),
  price: z.number().int().nonnegative('Giá phải là số dương'),
  comparePrice: z.number().int().nonnegative().optional(),
  stock: z.number().int().nonnegative().default(0),
  shopId: z.number().int().positive(),
  categoryId: z.number().int().positive().optional(),
  images: z.any().optional(),
  status: z.enum(['active', 'draft', 'out_of_stock']).default('active'),
  
  // Expanded fields
  sku: z.string().max(100).optional(),
  costPrice: z.number().int().nonnegative().optional().default(0),
  minStock: z.number().int().nonnegative().optional().default(0),
  reserved: z.number().int().nonnegative().optional().default(0),
  avgDailySales: z.number().int().nonnegative().optional().default(0),
  weight: z.number().int().nonnegative().optional().default(0),
  aiStatus: z.enum(['active', 'limited', 'hidden']).optional().default('active'),
  tierPrices: z.array(z.object({
    moq: z.number().int().positive(),
    price: z.number().int().nonnegative(),
    label: z.string()
  })).optional(),
  aiConfig: z.any().optional(),
  
  sourcePlatform: z.string().optional().default('manual'),
  sourceId: z.string().optional(),
});

export type CreateProductInput = z.input<typeof CreateProductSchema>;

const UpdateProductSchema = z.object({
  name: z.string().min(1, 'Tên không được để trống').max(500).optional(),
  description: z.string().optional(),
  price: z.number().int().nonnegative('Giá phải là số dương').optional(),
  comparePrice: z.number().int().nonnegative().optional(),
  stock: z.number().int().nonnegative().optional(),
  categoryId: z.number().int().positive().optional(),
  images: z.any().optional(),
  status: z.enum(['active', 'draft', 'out_of_stock']).optional(),
  
  sku: z.string().max(100).optional(),
  costPrice: z.number().int().nonnegative().optional(),
  minStock: z.number().int().nonnegative().optional(),
  reserved: z.number().int().nonnegative().optional(),
  avgDailySales: z.number().int().nonnegative().optional(),
  weight: z.number().int().nonnegative().optional(),
  aiStatus: z.enum(['active', 'limited', 'hidden']).optional(),
  tierPrices: z.array(z.object({
    moq: z.number().int().positive(),
    price: z.number().int().nonnegative(),
    label: z.string()
  })).optional(),
  aiConfig: z.any().optional(),
});

const CreateOrderSchema = z.object({
  shopId: z.number().int().positive(),
  teamId: z.number().int().positive(),
  items: z.array(z.object({
    productId: z.number().int().positive(),
    qty: z.number().int().positive(),
    price: z.number().int().nonnegative(),
    name: z.string(),
    image: z.string().optional(),
    sku: z.string().optional()
  })).min(1, 'Giỏ hàng trống'),
  customerName: z.string().min(1, 'Tên khách hàng không được để trống').optional(),
  customerPhone: z.string().min(1, 'Số điện thoại không được để trống').optional(),
  customerAddress: z.string().min(1, 'Địa chỉ không được để trống').optional(),
  source: z.string().optional().default('manual'),
  carrier: z.string().optional(),
  trackingNumber: z.string().optional(),
  shippingFee: z.number().int().nonnegative().optional().default(0),
  discount: z.number().int().nonnegative().optional().default(0),
});

export type CreateOrderInput = z.input<typeof CreateOrderSchema>;

function sanitizeError(error: any): string {
  if (error?.code === '23505') return 'Dữ liệu đã tồn tại';
  if (error?.code === '23503') return 'Dữ liệu liên quan không tồn tại';
  return error?.message || 'Đã xảy ra sự cố kỹ thuật';
}

// --- PRODUCT ACTIONS ---

export async function createProductAction(data: CreateProductInput) {
  try {
    const user = await getUser();
    if (!user) throw new Error('Chưa đăng nhập');
    
    const team = await getTeamForUser();
    if (!team) throw new Error('Không có quyền truy cập không gian làm việc');

    const parsed = CreateProductSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0].message };
    }

    const [result] = await db
      .insert(marketplaceProducts)
      .values({
        teamId: team.id,
        ...parsed.data,
        tierPrices: parsed.data.tierPrices || [],
        aiConfig: parsed.data.aiConfig || {},
      })
      .returning();

    revalidatePath('/marketplace');
    return { success: true, data: result };
  } catch (error: any) {
    console.error('Lỗi khi tạo sản phẩm marketplace:', error);
    return { success: false, error: sanitizeError(error) };
  }
}

export async function getAdminProductsAction(filters?: {
  status?: string;
  aiStatus?: string;
  search?: string;
}) {
  try {
    const user = await getUser();
    if (!user) throw new Error('Chưa đăng nhập');

    const team = await getTeamForUser();
    if (!team) throw new Error('Không có quyền truy cập không gian làm việc');

    let conditions = eq(marketplaceProducts.teamId, team.id);

    if (filters?.status && filters.status !== 'all') {
      conditions = and(conditions, eq(marketplaceProducts.status, filters.status)) as any;
    }
    if (filters?.aiStatus && filters.aiStatus !== 'all') {
      conditions = and(conditions, eq(marketplaceProducts.aiStatus, filters.aiStatus)) as any;
    }
    if (filters?.search) {
      const searchPattern = `%${filters.search}%`;
      conditions = and(
        conditions,
        or(
          like(marketplaceProducts.name, searchPattern),
          like(marketplaceProducts.sku, searchPattern)
        )
      ) as any;
    }

    const products = await db
      .select()
      .from(marketplaceProducts)
      .where(conditions)
      .orderBy(desc(marketplaceProducts.createdAt));

    return { success: true, data: products };
  } catch (error: any) {
    console.error('Lỗi khi lấy danh sách sản phẩm admin:', error);
    return { success: false, error: sanitizeError(error) };
  }
}

export async function updateProductAction(productId: number, data: z.infer<typeof UpdateProductSchema>) {
  try {
    const user = await getUser();
    if (!user) throw new Error('Chưa đăng nhập');

    const team = await getTeamForUser();
    if (!team) throw new Error('Không có quyền truy cập không gian làm việc');

    const parsed = UpdateProductSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0].message };
    }

    // Check ownership
    const [existing] = await db
      .select()
      .from(marketplaceProducts)
      .where(and(eq(marketplaceProducts.id, productId), eq(marketplaceProducts.teamId, team.id)))
      .limit(1);

    if (!existing) throw new Error('Không tìm thấy sản phẩm hoặc không có quyền chỉnh sửa');

    const [updated] = await db
      .update(marketplaceProducts)
      .set({
        ...parsed.data,
        updatedAt: new Date(),
      })
      .where(eq(marketplaceProducts.id, productId))
      .returning();

    revalidatePath('/marketplace/admin/products');
    revalidatePath('/marketplace');
    revalidatePath(`/product/${productId}`);
    return { success: true, data: updated };
  } catch (error: any) {
    console.error('Lỗi khi cập nhật sản phẩm:', error);
    return { success: false, error: sanitizeError(error) };
  }
}

export async function getInventorySuggestionsAction() {
  try {
    const user = await getUser();
    if (!user) throw new Error('Chưa đăng nhập');

    const team = await getTeamForUser();
    if (!team) throw new Error('Không có quyền truy cập không gian làm việc');

    const products = await db
      .select()
      .from(marketplaceProducts)
      .where(eq(marketplaceProducts.teamId, team.id));

    const suggestions = products.map(product => {
      const stock = product.stock || 0;
      const minStock = product.minStock || 0;
      const avgDailySales = product.avgDailySales || 0;
      const reserved = product.reserved || 0;
      const available = Math.max(0, stock - reserved);

      let daysLeft = 999;
      if (avgDailySales > 0) {
        daysLeft = Math.round((available / avgDailySales) * 10) / 10;
      }

      let priority: 'critical' | 'warning' | 'safe' = 'safe';
      let reason = 'Tồn kho an toàn';
      let suggestQty = 0;

      if (available <= minStock) {
        priority = 'critical';
        reason = `Tồn kho khả dụng (${available}) dưới mức tối thiểu (${minStock})`;
        suggestQty = Math.max(50, minStock * 3 - available);
      } else if (daysLeft <= 3) {
        priority = 'critical';
        reason = `Lượng hàng chỉ đủ bán trong ${daysLeft} ngày`;
        suggestQty = Math.max(50, Math.round(avgDailySales * 30 - available));
      } else if (daysLeft <= 7) {
        priority = 'warning';
        reason = `Lượng hàng sắp hết, chỉ đủ bán trong ${daysLeft} ngày`;
        suggestQty = Math.max(20, Math.round(avgDailySales * 14 - available));
      }

      suggestQty = Math.ceil(suggestQty / 10) * 10;

      return {
        productId: product.id,
        name: product.name,
        sku: product.sku || `SP-${product.id}`,
        stock,
        reserved,
        available,
        avgDailySales,
        daysLeft,
        priority,
        reason,
        suggestQty: priority !== 'safe' ? suggestQty : 0,
      };
    });

    suggestions.sort((a, b) => {
      const priorityWeight = { critical: 3, warning: 2, safe: 1 };
      return priorityWeight[b.priority] - priorityWeight[a.priority];
    });

    return { success: true, data: suggestions };
  } catch (error: any) {
    console.error('Lỗi khi lấy gợi ý nhập kho:', error);
    return { success: false, error: sanitizeError(error) };
  }
}

// --- ORDER ACTIONS ---

export async function createOrderAction(data: CreateOrderInput) {
  try {
    const user = await getUser();
    if (!user) throw new Error('Chưa đăng nhập');
    
    const parsed = CreateOrderSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0].message };
    }

    const { 
      shopId, 
      teamId, 
      items, 
      customerName, 
      customerPhone, 
      customerAddress, 
      source, 
      carrier,
      trackingNumber,
      shippingFee,
      discount 
    } = parsed.data;
    
    const totalAmount = items.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const profit = Math.max(0, totalAmount + (shippingFee || 0) - (discount || 0));

    const initialTimeline = [{
      event: 'Tạo đơn hàng',
      time: new Date().toISOString(),
      by: customerName || user.name || 'Khách hàng',
      detail: `Đơn hàng mới được tạo từ kênh ${source || 'manual'}`
    }];

    const [order] = await db
      .insert(marketplaceOrders)
      .values({
        teamId: teamId,
        shopId: shopId,
        buyerUserId: user.id,
        items: items, // Drizzle handles jsonb serialization
        totalAmount,
        status: 'pending',
        customerName: customerName || user.name || 'Khách mua hàng',
        customerPhone: customerPhone || '',
        customerAddress: customerAddress || '',
        source: source || 'manual',
        carrier: carrier || '',
        trackingNumber: trackingNumber || '',
        shippingFee: shippingFee || 0,
        discount: discount || 0,
        profit: profit,
        timeline: initialTimeline
      })
      .returning();

    return { success: true, data: order };
  } catch (error: any) {
    console.error('Lỗi khi tạo đơn hàng:', error);
    return { success: false, error: sanitizeError(error) };
  }
}

export async function getAdminOrdersAction(filters?: {
  status?: string;
  source?: string;
  search?: string;
}) {
  try {
    const user = await getUser();
    if (!user) throw new Error('Chưa đăng nhập');

    const team = await getTeamForUser();
    if (!team) throw new Error('Không có quyền truy cập không gian làm việc');

    let conditions = eq(marketplaceOrders.teamId, team.id);

    if (filters?.status && filters.status !== 'all') {
      conditions = and(conditions, eq(marketplaceOrders.status, filters.status)) as any;
    }
    if (filters?.source && filters.source !== 'all') {
      conditions = and(conditions, eq(marketplaceOrders.source, filters.source)) as any;
    }
    if (filters?.search) {
      const searchPattern = `%${filters.search}%`;
      conditions = and(
        conditions,
        or(
          like(marketplaceOrders.customerName, searchPattern),
          like(marketplaceOrders.customerPhone, searchPattern),
          like(marketplaceOrders.trackingNumber, searchPattern)
        )
      ) as any;
    }

    const orders = await db
      .select()
      .from(marketplaceOrders)
      .where(conditions)
      .orderBy(desc(marketplaceOrders.createdAt));

    return { success: true, data: orders };
  } catch (error: any) {
    console.error('Lỗi khi lấy danh sách đơn hàng admin:', error);
    return { success: false, error: sanitizeError(error) };
  }
}

export async function updateOrderStatusAction(orderId: number, status: string, detail?: string) {
  try {
    const user = await getUser();
    if (!user) throw new Error('Chưa đăng nhập');

    const team = await getTeamForUser();
    if (!team) throw new Error('Không có quyền truy cập không gian làm việc');

    const [order] = await db
      .select()
      .from(marketplaceOrders)
      .where(and(eq(marketplaceOrders.id, orderId), eq(marketplaceOrders.teamId, team.id)))
      .limit(1);

    if (!order) throw new Error('Không tìm thấy đơn hàng');

    let currentTimeline: any[] = [];
    try {
      currentTimeline = typeof order.timeline === 'string' 
        ? JSON.parse(order.timeline) 
        : (order.timeline || []);
      if (!Array.isArray(currentTimeline)) {
        currentTimeline = [];
      }
    } catch (e) {
      currentTimeline = [];
    }

    currentTimeline.push({
      event: `Cập nhật trạng thái: ${status}`,
      time: new Date().toISOString(),
      by: user.name || 'Hệ thống',
      detail: detail || `Trạng thái đơn hàng chuyển sang ${status}`,
    });

    const [updatedOrder] = await db
      .update(marketplaceOrders)
      .set({
        status,
        timeline: currentTimeline,
        updatedAt: new Date(),
      })
      .where(eq(marketplaceOrders.id, orderId))
      .returning();

    revalidatePath('/marketplace/admin/orders');
    return { success: true, data: updatedOrder };
  } catch (error: any) {
    console.error('Lỗi khi cập nhật trạng thái đơn hàng:', error);
    return { success: false, error: sanitizeError(error) };
  }
}

export async function bulkUpdateOrdersAction(
  orderIds: number[],
  action: 'confirm' | 'print' | 'ship' | 'delivered' | 'cancelled'
) {
  try {
    const user = await getUser();
    if (!user) throw new Error('Chưa đăng nhập');

    const team = await getTeamForUser();
    if (!team) throw new Error('Không có quyền truy cập không gian làm việc');

    if (!orderIds || orderIds.length === 0) {
      throw new Error('Danh sách đơn hàng trống');
    }

    const orders = await db
      .select()
      .from(marketplaceOrders)
      .where(and(inArray(marketplaceOrders.id, orderIds), eq(marketplaceOrders.teamId, team.id)));

    const updatedOrders = [];

    for (const order of orders) {
      let status = order.status;
      let printCount = order.printCount || 0;
      let detail = '';

      if (action === 'confirm') {
        status = 'confirmed';
        detail = 'Đơn hàng được xác nhận hàng loạt';
      } else if (action === 'print') {
        printCount += 1;
        detail = 'In đơn hàng hàng loạt';
      } else if (action === 'ship') {
        status = 'shipping';
        detail = 'Bàn giao vận chuyển hàng loạt';
      } else if (action === 'delivered') {
        status = 'completed';
        detail = 'Đánh dấu đã giao hàng hàng loạt';
      } else if (action === 'cancelled') {
        status = 'cancelled';
        detail = 'Hủy đơn hàng hàng loạt';
      }

      let currentTimeline: any[] = [];
      try {
        currentTimeline = typeof order.timeline === 'string'
          ? JSON.parse(order.timeline)
          : (order.timeline || []);
        if (!Array.isArray(currentTimeline)) {
          currentTimeline = [];
        }
      } catch (e) {
        currentTimeline = [];
      }

      currentTimeline.push({
        event: detail,
        time: new Date().toISOString(),
        by: user.name || 'Hệ thống',
        detail: `Thao tác hàng loạt: ${action}`,
      });

      const [updated] = await db
        .update(marketplaceOrders)
        .set({
          status,
          printCount,
          timeline: currentTimeline,
          updatedAt: new Date(),
        })
        .where(eq(marketplaceOrders.id, order.id))
        .returning();

      updatedOrders.push(updated);
    }

    revalidatePath('/marketplace/admin/orders');
    return { success: true, count: updatedOrders.length };
  } catch (error: any) {
    console.error('Lỗi khi thao tác hàng loạt đơn hàng:', error);
    return { success: false, error: sanitizeError(error) };
  }
}

export async function updateOrderByTrackingAction(trackingNumber: string, status: string, detail?: string) {
  try {
    const user = await getUser();
    if (!user) throw new Error('Chưa đăng nhập');

    const team = await getTeamForUser();
    if (!team) throw new Error('Không có quyền truy cập không gian làm việc');

    if (!trackingNumber) {
      throw new Error('Vui lòng cung cấp mã vận đơn');
    }

    const [order] = await db
      .select()
      .from(marketplaceOrders)
      .where(and(eq(marketplaceOrders.trackingNumber, trackingNumber), eq(marketplaceOrders.teamId, team.id)))
      .limit(1);

    if (!order) throw new Error(`Không tìm thấy đơn hàng với mã vận đơn ${trackingNumber}`);

    let currentTimeline: any[] = [];
    try {
      currentTimeline = typeof order.timeline === 'string'
        ? JSON.parse(order.timeline)
        : (order.timeline || []);
      if (!Array.isArray(currentTimeline)) {
        currentTimeline = [];
      }
    } catch (e) {
      currentTimeline = [];
    }

    currentTimeline.push({
      event: `Cập nhật theo mã vận đơn: ${status}`,
      time: new Date().toISOString(),
      by: user.name || 'Hệ thống (Fulfillment)',
      detail: detail || `Trạng thái đơn hàng chuyển sang ${status}`,
    });

    const [updatedOrder] = await db
      .update(marketplaceOrders)
      .set({
        status,
        timeline: currentTimeline,
        updatedAt: new Date(),
      })
      .where(eq(marketplaceOrders.id, order.id))
      .returning();

    revalidatePath('/marketplace/admin/orders');
    return { success: true, data: updatedOrder };
  } catch (error: any) {
    console.error('Lỗi khi cập nhật đơn hàng theo mã vận đơn:', error);
    return { success: false, error: sanitizeError(error) };
  }
}

// --- FULFILLMENT PHASE 2 MOCK ACTIONS ---

export async function completePickBatchAction(teamId: string, trackingNumbers: string[]) {
  console.log(`[Fulfillment] Pick Batch Complete for team ${teamId}`, trackingNumbers);
  return { success: true };
}

export async function createExportSlipAction(teamId: string, trackingNumbers: string[]) {
  console.log(`[Fulfillment] Export Slip Created for team ${teamId}`, trackingNumbers);
  return { success: true };
}

export async function processReturnAction(teamId: string, trackingNumber: string) {
  console.log(`[Fulfillment] Process Return for team ${teamId}`, trackingNumber);
  return { success: true };
}

