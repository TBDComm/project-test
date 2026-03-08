// Cloudflare Pages Functions middleware
// 1) Normalize legacy routes/files that can bring back old UI (*.html, main.js).
// 2) Force SPA routes to always serve the latest index.html.
// 3) Recover from stale hashed asset requests after deploys.
// 4) Force no-store on document-like responses.
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

  // If an old shell still asks for this legacy file, force a full reload to SPA entry.
  if (pathname === '/main.js') {
    return new Response('window.location.replace(window.location.pathname.replace(/\\.html$/, "") || "/");', {
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
  let response = await context.next()

  // Stale HTML can request old hashed bundle names after deployment.
  // If that happens, redirect the request to the latest hashed asset.
  if (pathname.startsWith('/assets/') && response.status === 404) {
    const fallback = await resolveLatestAssetPath(url.origin, pathname)
    if (fallback) {
      return Response.redirect(new URL(fallback, url.origin).toString(), 302)
    }
  }

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

async function resolveLatestAssetPath(origin, pathname) {
  const ext = pathname.endsWith('.css') ? 'css' : pathname.endsWith('.js') ? 'js' : ''
  if (!ext) return null

  try {
    const res = await fetch(`${origin}/index.html`, { headers: { Accept: 'text/html' } })
    if (!res.ok) return null
    const html = await res.text()
    const pattern = ext === 'css'
      ? /href="(\/assets\/index-[^"]+\.css)"/
      : /src="(\/assets\/index-[^"]+\.js)"/
    const match = html.match(pattern)
    return match?.[1] || null
  } catch {
    return null
  }
}
