import { NextResponse } from 'next/server';
import { SignJWT, importPKCS8 } from 'jose';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { url, secret_key } = body;

    // Security check - Bỏ qua nếu chưa config secret
    if (process.env.SEO_SECRET_KEY && secret_key !== process.env.SEO_SECRET_KEY) {
      return NextResponse.json({ error: 'Unauthorized: Sai Secret Key', status: 'error' }, { status: 401 });
    }

    if (!url) {
      return NextResponse.json({ error: 'Missing url parameter', status: 'error' }, { status: 400 });
    }

    const credentialsStr = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
    if (!credentialsStr) {
      return NextResponse.json({ 
        error: 'Chưa cấu hình GOOGLE_APPLICATION_CREDENTIALS_JSON trong Vercel ENV.',
        status: 'error' 
      }, { status: 500 });
    }

    let credentials;
    try {
      credentials = JSON.parse(credentialsStr);
    } catch (e) {
      return NextResponse.json({ error: 'Lỗi parse JSON credentials từ ENV. Vui lòng kiểm tra lại cấu trúc file JSON.', status: 'error' }, { status: 500 });
    }

    const privateKey = credentials.private_key;
    const clientEmail = credentials.client_email;

    if (!privateKey || !clientEmail) {
      return NextResponse.json({ error: 'File JSON Google Credentials thiếu trường private_key hoặc client_email hợp lệ.', status: 'error' }, { status: 500 });
    }

    // Sign JWT Token for Google using RS256
    const alg = 'RS256';
    const pkcs8 = await importPKCS8(privateKey, alg);
    
    // Create and sign the JWT
    const jwt = await new SignJWT({
        iss: clientEmail,
        scope: 'https://www.googleapis.com/auth/indexing',
        aud: 'https://oauth2.googleapis.com/token'
      })
      .setProtectedHeader({ alg, typ: 'JWT' })
      .setIssuedAt()
      .setExpirationTime('1h') // Token expires in 1 hour
      .sign(pkcs8);

    // Request Access Token from Google OAuth2 Token endpoint
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt
      })
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.access_token) {
      return NextResponse.json({ 
        error: 'Failed to get access token from Google', 
        details: tokenData, 
        status: 'error' 
      }, { status: 500 });
    }

    const accessToken = tokenData.access_token;

    // Fire the Request to Google Indexing API
    const indexingRes = await fetch('https://indexing.googleapis.com/v3/urlNotifications:publish', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        url: url,
        type: 'URL_UPDATED' // Báo cập nhật / đăng mới
      })
    });

    const indexingData = await indexingRes.json();
    
    if (!indexingRes.ok) {
        return NextResponse.json({ 
            error: 'Google Indexing API Error', 
            details: indexingData, 
            status: 'error' 
        }, { status: indexingRes.status });
    }

    return NextResponse.json({ 
      success: true, 
      status: 'success',
      message: 'Successfully submitted URL to Google Indexing API',
      data: indexingData 
    }, { status: 200 });

  } catch (error: any) {
    console.error('Indexing API Error:', error);
    return NextResponse.json({ 
        error: error.message || 'Internal Server Error', 
        status: 'error' 
    }, { status: 500 });
  }
}
