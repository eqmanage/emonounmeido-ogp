export const config = { runtime: 'edge' };

const SITE_NAME = 'えもの運命堂';
const SITE_URL = 'https://eqmanage.github.io/emonounmeido/';
const DEFAULT_JOB = '新しい可能性';

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[c]));
}

function clampScore(raw) {
  if (raw === null || raw === undefined || raw === '') return null;
  const n = parseInt(raw, 10);
  if (Number.isNaN(n)) return null;
  return Math.max(0, Math.min(99, n));
}

/* このページ自体はGitHub Pages側の診断結果画面ではなく、
   X/LINEでシェアされたときにOGP(og:image)を結果ごとに正しく出し分けるための
   軽い中継ページ。クローラーはJSを実行しないため、静的なmetaタグとして
   結果を都度サーバー側(このEdge Function)で埋め込む必要がある。
   実際に人がリンクを開いた場合は、画像とボタンだけを表示し、
   本来の診断サイトへ案内する。 */
export default async function handler(req) {
  const { searchParams, origin } = new URL(req.url);
  const job = (searchParams.get('job') || DEFAULT_JOB).slice(0, 40);
  const score = clampScore(searchParams.get('score'));

  const ogParams = new URLSearchParams({ job });
  if (score !== null) ogParams.set('score', String(score));
  const imageUrl = `${origin}/api/og?${ogParams.toString()}`;

  const pageTitle = `私の経験は「${job}」に翻訳されました｜${SITE_NAME}`;
  const description = 'あなたの経験を翻訳する、3分の可能性診断。';

  const html = `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="color-scheme" content="light only">
<title>${escapeHtml(pageTitle)}</title>
<meta name="description" content="${escapeHtml(description)}">

<meta property="og:type" content="website">
<meta property="og:title" content="${escapeHtml(pageTitle)}">
<meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:image" content="${imageUrl}">
<meta property="og:url" content="${escapeHtml(req.url)}">
<meta property="og:site_name" content="${SITE_NAME}">
<meta property="og:locale" content="ja_JP">

<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeHtml(pageTitle)}">
<meta name="twitter:description" content="${escapeHtml(description)}">
<meta name="twitter:image" content="${imageUrl}">

<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #EFF4F9;
    color: #23262E;
    font-family: 'Noto Sans JP', sans-serif;
    padding: 24px;
  }
  .card { text-align: center; max-width: 560px; }
  .card img {
    width: 100%;
    border-radius: 14px;
    box-shadow: 0 10px 30px rgba(22,35,63,0.18);
    display: block;
  }
  .card p.lede {
    margin-top: 20px;
    font-size: 0.9rem;
    color: #6E7787;
  }
  .card a.btn {
    display: inline-block;
    margin-top: 16px;
    background: #16233F;
    color: #FCFBF8;
    padding: 13px 30px;
    border-radius: 999px;
    text-decoration: none;
    font-size: 0.95rem;
    letter-spacing: 0.02em;
  }
</style>
</head>
<body>
  <div class="card">
    <img src="${imageUrl}" alt="${escapeHtml(pageTitle)}">
    <p class="lede">この診断はエンターテインメントを目的とした参考情報です。</p>
    <a class="btn" href="${SITE_URL}">自分も診断してみる</a>
  </div>
</body>
</html>`;

  return new Response(html, {
    headers: { 'content-type': 'text/html; charset=utf-8' },
  });
}
