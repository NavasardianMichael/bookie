import { NextRequest, NextResponse } from 'next/server'

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    {
      source: '/((?!api|_next/static|_next/image|favicon.ico).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
}

export function middleware(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64')
  // TODO: remove other instances of images when implemented on back end
  const isDev = process.env.NODE_ENV === 'development'

  const cspHeader = isDev
    ? `default-src 'self' 'unsafe-eval' 'unsafe-inline';`
    : `
      default-src 'self';
      script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https: 'unsafe-inline' https://*.vercel.app https://vitals.vercel-insights.com;
      style-src 'self' 'nonce-${nonce}' 'unsafe-inline' https://*.vercel.app;
      img-src 'self' blob: data: https://randomuser.me https://*.vercel.app;
      font-src 'self' https://*.vercel.app;
      connect-src 'self' https://*.vercel.app https://vitals.vercel-insights.com;
      object-src 'none';
      base-uri 'self';
      form-action 'self';
      frame-ancestors 'none';
      frame-src 'self' https://*.vercel.app;
      media-src 'self' https://*.vercel.app;
      worker-src 'self' https://*.vercel.app;
      upgrade-insecure-requests;
    `
        .replace(/\s{2,}/g, ' ')
        .trim()
  // Replace newline characters and spaces
  const contentSecurityPolicyHeaderValue = cspHeader.replace(/\s{2,}/g, ' ').trim()

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)

  requestHeaders.set('Content-Security-Policy', contentSecurityPolicyHeaderValue)

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })
  response.headers.set('Content-Security-Policy', contentSecurityPolicyHeaderValue)

  return response
}
