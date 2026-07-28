import { NextResponse } from 'next/server';

export async function GET() {
  const gemini = process.env.GEMINI_API_KEY || '';
  const google = process.env.GOOGLE_GENERATIVE_AI_API_KEY || '';
  
  return NextResponse.json({
    gemini: gemini.substring(0, 5) + '...' + gemini.substring(gemini.length - 5),
    google: google.substring(0, 5) + '...' + google.substring(google.length - 5),
    node_env: process.env.NODE_ENV
  });
}
