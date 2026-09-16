import { ImageResponse } from '@vercel/og';

export const config = { runtime: 'edge' };

/* ブランドトークン(PROJECT_BRIEF.mdのデザイン定義と揃える) */
const COLORS = {
  navy: '#16233F',
  navy2: '#2B3F63',
  sky: '#EFF4F9',
  sky2: '#DCE6F0',
  paper: '#FCFBF8',
  ink: '#23262E',
  muted: '#6E7787',
  line: '#D9E1EA',
};

const SITE_NAME = 'えもの運命堂';
const DEFAULT_JOB = '新しい可能性';

/* Google FontsのCSS2 APIを使い、実際に描画するテキストに必要な字形だけを含む
   フォントファイルを取得する(satoriはシステムフォント/CSS経由のWebフォントを解釈できないため、
   ArrayBufferとして明示的に渡す必要がある) */
async function loadGoogleFont(fontFamily, weight, text) {
  const url = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(
    fontFamily
  )}:wght@${weight}&text=${encodeURIComponent(text)}`;
  const css = await (await fetch(url)).text();
  const match = css.match(/src: url\(([^)]+)\) format\('(opentype|truetype)'\)/);
  if (match) {
    const res = await fetch(match[1]);
    if (res.ok) return await res.arrayBuffer();
  }
  throw new Error(`Failed to load font: ${fontFamily} ${weight}`);
}

function clampScore(raw) {
  if (raw === null || raw === undefined || raw === '') return null;
  const n = parseInt(raw, 10);
  if (Number.isNaN(n)) return null;
  return Math.max(0, Math.min(99, n));
}

export default async function handler(req) {
  const { searchParams } = new URL(req.url);
  const job = (searchParams.get('job') || DEFAULT_JOB).slice(0, 40);
  const score = clampScore(searchParams.get('score'));

  // 描画するテキスト(フォント字形のサブセット取得に使う)
  const staticText = `${SITE_NAME}(仮)可能性診断・結果私の経験は、こう翻訳されました適合度登録不要・入力内容は保存されません%`;
  const allText = staticText + job + (score !== null ? String(score) : '');

  const [minchoBold, minchoBlack, sansRegular, sansMedium] = await Promise.all([
    loadGoogleFont('Zen Old Mincho', 700, allText),
    loadGoogleFont('Zen Old Mincho', 900, allText),
    loadGoogleFont('Noto Sans JP', 400, allText),
    loadGoogleFont('Noto Sans JP', 500, allText),
  ]);

  // 職種名が長い場合は自動で文字サイズを縮小する
  const jobFontSize = job.length > 10 ? 40 : job.length > 6 ? 48 : 58;

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          display: 'flex',
          position: 'relative',
          background: `linear-gradient(135deg, ${COLORS.sky} 0%, ${COLORS.sky2} 100%)`,
          fontFamily: '"Noto Sans JP"',
        }}
      >
        {/* 装飾の同心円(サイト内のモチーフを再利用) */}
        {[94, 190, 280, 360, 430].map((size, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              top: 300 - size / 2 - 120,
              left: 1080 - size / 2,
              width: size,
              height: size,
              borderRadius: '50%',
              border: `${i === 4 ? 6 : 1.4}px solid ${
                i === 0 ? COLORS.navy : i < 3 ? COLORS.navy2 : COLORS.sky2
              }`,
              opacity: i === 3 ? 0.6 : i === 4 ? 0.7 : 0.85,
              display: 'flex',
            }}
          />
        ))}

        <div
          style={{
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            width: '1200px',
            height: '630px',
            padding: '64px 72px',
          }}
        >
          {/* 上段: ブランド名 + 結果タグ */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div
              style={{
                display: 'flex',
                fontFamily: '"Zen Old Mincho"',
                fontWeight: 700,
                fontSize: 26,
                color: COLORS.navy,
              }}
            >
              {SITE_NAME}
              <span style={{ opacity: 0.55, fontSize: 20, marginLeft: 4 }}>(仮)</span>
            </div>
            <div
              style={{
                display: 'flex',
                background: COLORS.navy,
                color: COLORS.paper,
                fontSize: 16,
                padding: '8px 18px',
                borderRadius: 999,
              }}
            >
              可能性診断・結果
            </div>
          </div>

          {/* 中段: 診断結果の職種名 */}
          <div style={{ display: 'flex', flexDirection: 'column', maxWidth: 760 }}>
            <div style={{ display: 'flex', fontSize: 20, color: COLORS.muted, marginBottom: 18 }}>
              私の経験は、こう翻訳されました
            </div>
            <div
              style={{
                display: 'flex',
                fontFamily: '"Zen Old Mincho"',
                fontWeight: 900,
                fontSize: jobFontSize,
                lineHeight: 1.35,
                color: COLORS.navy,
              }}
            >
              「{job}」
            </div>
          </div>

          {/* 下段: 適合度バッジ + 注記 */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            {score !== null ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: 10,
                  background: COLORS.paper,
                  border: `1px solid ${COLORS.line}`,
                  borderRadius: 16,
                  padding: '18px 28px',
                }}
              >
                <span style={{ display: 'flex', fontSize: 18, color: COLORS.muted }}>適合度</span>
                <span
                  style={{
                    display: 'flex',
                    fontFamily: '"Zen Old Mincho"',
                    fontWeight: 900,
                    fontSize: 44,
                    color: COLORS.navy,
                  }}
                >
                  {score}
                  <span style={{ display: 'flex', fontSize: 22, fontWeight: 500, marginLeft: 2 }}>
                    %
                  </span>
                </span>
              </div>
            ) : (
              <div />
            )}
            <div style={{ display: 'flex', fontSize: 16, color: COLORS.muted }}>
              登録不要・入力内容は保存されません
            </div>
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: [
        { name: 'Zen Old Mincho', data: minchoBold, weight: 700, style: 'normal' },
        { name: 'Zen Old Mincho', data: minchoBlack, weight: 900, style: 'normal' },
        { name: 'Noto Sans JP', data: sansRegular, weight: 400, style: 'normal' },
        { name: 'Noto Sans JP', data: sansMedium, weight: 500, style: 'normal' },
      ],
    }
  );
}
