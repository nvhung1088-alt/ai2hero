import { NextResponse } from "next/server";

export async function GET() {
  try {
    let apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    apiKey = apiKey ? apiKey.replace(/['"]/g, "").trim() : undefined;
    
    if (!apiKey) return NextResponse.json({ error: "No key" });
    
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: "Hello" }] }]
      }),
      cache: "no-store"
    });
    
    const data = await res.json();
    return NextResponse.json({ key: apiKey.substring(0,5)+"..."+apiKey.substring(apiKey.length-5), data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message });
  }
}
