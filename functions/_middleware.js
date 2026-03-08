// Cloudflare Pages Functions middleware
// 1) Normalize legacy routes/files that can bring back old UI (style.css, *.html, main.js).
// 2) Force SPA routes to always serve the latest index.html.
// 3) Force no-store on document-like responses.
export async function onRequest(context) {
  const { request } = context
  const url = new URL(request.url)
  const pathname = url.pathname

  const LEGACY_HTML_REDIRECTS = {
    '/auth.html': '/auth',
    '/dashboard.html': '/dashboard',
    '/spotlight.html': '/spotlight',
    '/timing.html': '/timing',
    '/pricing.html': '/pricing',
    '/mypage.html': '/mypage',
    '/payment.html': '/payment',
  }

  if (LEGACY_HTML_REDIRECTS[pathname]) {
    return Response.redirect(new URL(LEGACY_HTML_REDIRECTS[pathname], url.origin).toString(), 301)
  }

  // If an old shell still asks for these legacy files, neutralize them.
  if (pathname === '/style.css') {
    return new Response('/* legacy style disabled */', {
      status: 200,
      headers: {
        'Content-Type': 'text/css; charset=utf-8',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      },
    })
  }
  if (pathname === '/main.js') {
    return new Response('// legacy main disabled', {
      status: 200,
      headers: {
        'Content-Type': 'application/javascript; charset=utf-8',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      },
    })
  }

  const hasFileExt = /\.[a-zA-Z0-9]+$/.test(pathname)
  const response = await context.next()

  // Keep hashed static assets cacheable for performance.
  if (pathname.startsWith('/assets/')) return response

  const accept = request.headers.get('accept') || ''
  const isHtmlLike =
    pathname === '/' ||
    pathname.endsWith('.html') ||
    pathname === '/theme-init.js' ||
    (!hasFileExt && !pathname.startsWith('/api/')) ||
    accept.includes('text/html')

  if (!isHtmlLike) return response

  const headers = new Headers(response.headers)
  headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
  headers.set('Pragma', 'no-cache')
  headers.set('Expires', '0')

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}
