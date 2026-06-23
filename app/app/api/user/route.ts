import { getUser } from '@/lib/db/queries';

export async function GET() {
  const user = await getUser();
  
  if (!user) {
    return Response.json({ user: null, error: 'Unauthorized' }, { status: 200 });
  }

  // Strip passwordHash for security
  const { passwordHash, ...safeUser } = user;

  return Response.json(safeUser);
}

