// Cloudflare Pages Functions middleware
// 1) Redirect legacy .html URLs to clean SPA routes.
// 2) Serve index.html directly via ASSETS binding for all SPA routes — no reliance on _redirects.
// 3) Pass hashed assets and API routes through unchanged.

export async function onRequest(context) {
  const { request, env } = context
  const url = new URL(request.url)
  const pathname = url.pathname

  // Legacy .html → clean URL (permanent redirect)
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

  // Legacy main.js — redirect old shell to SPA entry
  if (pathname === '/main.js') {
    return new Response(
      'window.location.replace(window.location.pathname.replace(/\\.html$/, "") || "/");',
      {
        status: 200,
        headers: {
          'Content-Type': 'application/javascript; charset=utf-8',
          'Cache-Control': 'no-store',
        },
      }
    )
  }

  // Hashed static assets — immutable cache, pass through unchanged
  if (pathname.startsWith('/assets/')) {
    return context.next()
  }

  // API function routes — pass through to handler
  if (pathname.startsWith('/api/')) {
    return context.next()
  }

  // SPA routes: any path without a file extension is handled by React Router.
  // Serve index.html directly via the ASSETS binding so refresh always works,
  // regardless of whether _redirects rewrites are applied by context.next().
  if (!/\.[a-zA-Z0-9]+$/.test(pathname)) {
    const indexResponse = await env.ASSETS.fetch(
      new URL('/index.html', url.origin).toString()
    )
    const headers = new Headers(indexResponse.headers)
    headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
    headers.set('Pragma', 'no-cache')
    headers.set('Expires', '0')
    return new Response(indexResponse.body, { status: 200, headers })
  }

  // Other static files (theme-init.js, style.css, favicon, etc.) — pass through
  return context.next()
}
