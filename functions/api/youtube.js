// functions/api/youtube.js — Cloudflare Pages Function
// YouTube API 서버 프록시: API 키를 클라이언트에 노출하지 않기 위해 사용
// 환경변수 YOUTUBE_API_KEY 는 Cloudflare Pages 대시보드에서 설정
//   Settings → Environment variables → YOUTUBE_API_KEY

const ALLOWED_ENDPOINTS = ['videos', 'search'];

export async function onRequest(context) {
  const url = new URL(context.request.url);
  const endpoint = url.searchParams.get('_ep');

  if (!endpoint || !ALLOWED_ENDPOINTS.includes(endpoint)) {
    return json({ error: { message: '잘못된 요청입니다.' } }, 400);
  }

  const apiKey = context.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return json({ error: { message: 'API 키가 설정되지 않았습니다. 관리자에게 문의해주세요.' } }, 500);
  }

  const params = new URLSearchParams(url.searchParams);
  params.delete('_ep');
  params.set('key', apiKey);

  try {
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/${endpoint}?${params.toString()}`
    );
    const data = await res.json();
    return json(data, res.status);
  } catch {
    return json({ error: { message: '일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' } }, 502);
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
