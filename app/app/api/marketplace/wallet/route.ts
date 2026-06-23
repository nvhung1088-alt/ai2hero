import { NextRequest, NextResponse } from 'next/server';
import { getTeamForUser } from '@/lib/db/queries';
import { db } from '@/lib/db/drizzle';
import { marketplaceWallets, marketplaceTransactions } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  try {
    const team = await getTeamForUser();
    if (!team) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Lấy ví của Team
    let [wallet] = await db
      .select()
      .from(marketplaceWallets)
      .where(eq(marketplaceWallets.teamId, team.id))
      .limit(1);

    // Nếu chưa có ví thì tạo tự động (balance: 0)
    if (!wallet) {
      const [newWallet] = await db
        .insert(marketplaceWallets)
        .values({
          teamId: team.id,
          balance: 0,
          currency: 'VND'
        })
        .returning();
      wallet = newWallet;
    }

    // 2. Lấy danh sách giao dịch
    const transactions = await db
      .select()
      .from(marketplaceTransactions)
      .where(eq(marketplaceTransactions.walletId, wallet.id))
      .orderBy(desc(marketplaceTransactions.createdAt))
      .limit(50); // Lấy 50 GD gần nhất

    return NextResponse.json({ success: true, wallet, transactions });

  } catch (error: any) {
    console.error('Wallet API Error:', error);
    return NextResponse.json({ error: 'Lỗi server nội bộ', details: error.message }, { status: 500 });
  }
}
