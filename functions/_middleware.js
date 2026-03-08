// Cloudflare Pages Functions middleware
// Force HTML/doc-like routes to bypass edge/browser cache so refresh always gets latest shell.
export async function onRequest(context) {
  const { request } = context
  const url = new URL(request.url)
  const pathname = url.pathname

  const response = await context.next()

  // Keep hashed static assets cacheable for performance.
  if (pathname.startsWith('/assets/')) return response

  const hasFileExt = /\.[a-zA-Z0-9]+$/.test(pathname)
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
