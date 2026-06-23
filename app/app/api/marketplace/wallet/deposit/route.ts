import { NextRequest, NextResponse } from 'next/server';
import { getTeamForUser } from '@/lib/db/queries';
import { runConnectorAction } from '@/lib/connect-hub/connector-service';
import { db } from '@/lib/db/drizzle';
import { marketplaceWallets, marketplaceTransactions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(req: NextRequest) {
  try {
    const team = await getTeamForUser();
    if (!team) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { amount, connectionId, paymentMethod } = body;

    if (!amount || amount <= 0 || !connectionId) {
      return NextResponse.json({ error: 'Tham số không hợp lệ' }, { status: 400 });
    }

    // Lấy ví của Team
    let [wallet] = await db
      .select()
      .from(marketplaceWallets)
      .where(eq(marketplaceWallets.teamId, team.id))
      .limit(1);

    if (!wallet) {
      const [newWallet] = await db
        .insert(marketplaceWallets)
        .values({ teamId: team.id, balance: 0, currency: 'VND' })
        .returning();
      wallet = newWallet;
    }

    // Tạo reference ID (Mã tham chiếu cho giao dịch)
    const referenceId = `DEP_${wallet.id}_${Date.now()}`;

    // Gọi Connect Hub để tạo link thanh toán (Ví dụ PayOS hoặc MoMo)
    // Tùy theo paymentMethod (payos/momo), Connector sẽ map actionSlug là 'create_payment_link'
    const actionSlug = 'create_payment_link'; 
    
    // Connect Hub payload mẫu cho thanh toán
    const paymentInput = {
      orderCode: Number(Date.now().toString().slice(-6)), // PayOS yêu cầu number
      amount: Number(amount),
      description: `Nap tien vi HeroMarket ${referenceId}`,
      returnUrl: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/app/hero-marketplace/t/${team.id}/wallet`,
      cancelUrl: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/app/hero-marketplace/t/${team.id}/wallet`
    };

    const result = await runConnectorAction({
      teamId: team.id,
      connectionId: Number(connectionId),
      actionSlug: actionSlug,
      input: paymentInput,
      callerModule: 'hero-marketplace',
      normalize: true 
    });

    if (!result.success || !result.data) {
      return NextResponse.json({ error: result.error || 'Lỗi khi kết nối cổng thanh toán' }, { status: 500 });
    }

    // Kết quả trả về thường có chứa checkoutUrl (hoặc payUrl)
    const checkoutUrl = result.data.checkoutUrl || result.data.payUrl;

    // Lưu giao dịch pending vào Database
    await db.insert(marketplaceTransactions).values({
      walletId: wallet.id,
      amount: Number(amount),
      type: 'deposit',
      referenceId: referenceId,
      status: 'pending'
    });

    return NextResponse.json({ success: true, checkoutUrl });

  } catch (error: any) {
    console.error('Wallet Deposit Error:', error);
    return NextResponse.json({ error: 'Lỗi server nội bộ', details: error.message }, { status: 500 });
  }
}
