import { NextRequest, NextResponse } from 'next/server';

async function proxyRequest(request: NextRequest, pathSegments: string[]) {
  const backendUrl = 'http://127.0.0.1:5000';
  const path = pathSegments.join('/');
  const searchParams = request.nextUrl.searchParams.toString();
  const url = `${backendUrl}/${path}${searchParams ? '?' + searchParams : ''}`;

  console.log(`[API Proxy] Forwarding ${request.method} to: ${url}`);

  const headers = new Headers();
  request.headers.forEach((value, key) => {
    const lowerKey = key.toLowerCase();
    if (lowerKey !== 'host' && lowerKey !== 'accept-encoding') {
      headers.set(key, value);
    }
  });

  let body: any = undefined;
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    try {
      body = await request.arrayBuffer();
    } catch (e) {
      console.error('[API Proxy] Error parsing body:', e);
    }
  }

  try {
    const res = await fetch(url, {
      method: request.method,
      headers,
      body,
      redirect: 'manual'
    });

    const responseHeaders = new Headers();
    res.headers.forEach((value, key) => {
      const lowerKey = key.toLowerCase();
      if (lowerKey !== 'content-encoding' && lowerKey !== 'content-length') {
        responseHeaders.set(key, value);
      }
    });

    return new NextResponse(res.body, {
      status: res.status,
      headers: responseHeaders
    });
  } catch (error: any) {
    console.error('[API Proxy] Error fetching from backend:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(request: NextRequest, props: { params: Promise<{ path: string[] }> }) {
  const params = await props.params;
  return proxyRequest(request, params.path);
}

export async function POST(request: NextRequest, props: { params: Promise<{ path: string[] }> }) {
  const params = await props.params;
  return proxyRequest(request, params.path);
}

export async function PUT(request: NextRequest, props: { params: Promise<{ path: string[] }> }) {
  const params = await props.params;
  return proxyRequest(request, params.path);
}

export async function DELETE(request: NextRequest, props: { params: Promise<{ path: string[] }> }) {
  const params = await props.params;
  return proxyRequest(request, params.path);
}
