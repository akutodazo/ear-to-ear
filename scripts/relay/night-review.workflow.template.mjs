export const meta = {
  name: 'night-review',
  description: '当日の差分を多視点で探して反証にかけ、直さずに朝の読み物にする（ハーネス v0.6 の夜番）',
  phases: [
    { title: 'Find', detail: '塊 × 観点（Sonnet）' },
    { title: 'Refute', detail: '各件 Sonnet 1 票、止める候補は Opus を足す' },
    { title: 'Write', detail: '朝の読み物（Sonnet）' },
  ],
}

// scripts/relay/night.mjs が対象を埋め込む（夜のセッションにファイルを読む道具を渡さないため）。
// 形: { date, size: 'small' | 'medium', files: [{ path, ref, text }], dropped: [path] }
const T = /*TARGETS*/ null

const SIZES = {
  small: { lenses: 2, chunk: 4, maxChunks: 2, maxFindings: 6, opusVotes: 0 },
  medium: { lenses: 4, chunk: 4, maxChunks: 2, maxFindings: 12, opusVotes: 3 },
}
const S = SIZES[T.size] ?? SIZES.small

const LENSES = [
  { key: 'location', text: '撮影位置（docs/spec.md の K6）: 座標・候補までの距離・端末 ID が、応答・ログ・R2 のキー・保存・REPORT に出る経路。公開側の画像に APP1〜APP15 が残る経路' },
  { key: 'secret', text: '秘密とログ: 環境変数・合言葉・SESSION_SECRET・ハッシュ・Cookie が応答・ログ・例外のメッセージに出る経路。認証の抜け（member・admin の取り違え）' },
  { key: 'input', text: '入力の境界（Worker）: 大きさ・型・JSON・SQL の bind・CPU 10ms・同時の要求・例外のときの R2 と D1 の残り・未処理の例外が 500 以外になる経路' },
  { key: 'rules', text: '仕様と決まり: 層の決まり（Service は純粋関数、Worker は薄い）、`any`・`@ts-ignore`、凍結テストが縛っていない合格条件の抜け' },
]

const FIND_SCHEMA = {
  type: 'object',
  properties: {
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          file: { type: 'string' },
          line: { type: 'number' },
          claim: { type: 'string', description: '何が起きるか（1 文）' },
          repro: { type: 'string', description: '再現の手順（入力と期待と実際）。コードは書かない' },
          severity: { type: 'string', enum: ['止める', '直す', '気づき'] },
        },
        required: ['file', 'line', 'claim', 'repro', 'severity'],
      },
    },
  },
  required: ['findings'],
}

const VERDICT_SCHEMA = {
  type: 'object',
  properties: { refuted: { type: 'boolean' }, why: { type: 'string' } },
  required: ['refuted', 'why'],
}

const RULES = '渡したコードだけを見る。ファイルを読まない・コマンドを実行しない・コードを直さない。秘密・手元のパスを書かない。日本語で、推定は推定と書く。'

function chunks(files, size) {
  const out = []
  for (let i = 0; i < files.length; i += size) out.push(files.slice(i, i + size))
  return out
}

function codeOf(files) {
  return files.map((f) => `### ${f.path}（${f.ref}）\n\`\`\`ts\n${f.text}\n\`\`\``).join('\n\n')
}

const RANK = { 止める: 0, 直す: 1, 気づき: 2 }
let confirmed = []
let found = 0
let droppedFindings = 0
let droppedChunks = 0

try {
  if (T.files.length > 0) {
    phase('Find')
    const allChunks = chunks(T.files, S.chunk)
    const used = allChunks.slice(0, S.maxChunks)
    droppedChunks = allChunks.length - used.length
    if (droppedChunks > 0) log(`塊を ${droppedChunks} 個落とした（上限 ${S.maxChunks}）`)
    const jobs = []
    for (const c of used) for (const lens of LENSES.slice(0, S.lenses)) jobs.push({ c, lens })
    const results = await parallel(
      jobs.map((j) => () =>
        agent(`あなたは当日のコードの下読み役です。観点: ${j.lens.text}\n${RULES}\n見つからなければ空の配列を返す。\n\n${codeOf(j.c)}`, {
          label: `find:${j.lens.key}`,
          phase: 'Find',
          model: 'sonnet',
          effort: 'medium',
          schema: FIND_SCHEMA,
        }),
      ),
    )
    const all = results.filter(Boolean).flatMap((r) => r.findings)
    found = all.length
    const seen = new Set()
    const unique = []
    for (const f of all) {
      const key = `${f.file}:${f.line}:${f.claim.slice(0, 40)}`
      if (!seen.has(key)) {
        seen.add(key)
        unique.push(f)
      }
    }
    unique.sort((a, b) => (RANK[a.severity] ?? 3) - (RANK[b.severity] ?? 3))
    const picked = unique.slice(0, S.maxFindings)
    droppedFindings = unique.length - picked.length
    if (droppedFindings > 0) log(`指摘を ${droppedFindings} 件落とした（上限 ${S.maxFindings}）`)

    phase('Refute')
    const fileText = new Map(T.files.map((f) => [f.path, f]))
    let opusLeft = S.opusVotes
    const judged = await pipeline(picked, async (f) => {
      const src = fileText.get(f.file)
      const ask = `次の指摘を反証してください。確信が無ければ refuted=true。\n${RULES}\n\n指摘: ${f.file}:${f.line} ${f.claim}\n再現: ${f.repro}\n\n${src ? codeOf([src]) : '（コードが無い）'}`
      const votes = [await agent(ask, { label: `refute:${f.file}:${f.line}`, phase: 'Refute', model: 'sonnet', effort: 'medium', schema: VERDICT_SCHEMA })]
      if (f.severity === '止める' && opusLeft > 0) {
        opusLeft -= 1
        votes.push(await agent(ask, { label: `refute-opus:${f.file}:${f.line}`, phase: 'Refute', model: 'opus', effort: 'high', schema: VERDICT_SCHEMA }))
      }
      const valid = votes.filter(Boolean)
      if (valid.length === 0 || valid[0].refuted) return null
      const verdict = valid.length > 1 && valid[1].refuted ? 'PLAUSIBLE' : 'CONFIRMED'
      return { ...f, verdict, why: valid.map((v) => v.why).join(' ／ ') }
    })
    confirmed = judged.filter(Boolean)
  }
} finally {
  phase('Write')
}

const table = `| 出た | 重なりを除いた後に落とした | 塊を落とした | 残った |\n|---|---|---|---|\n| ${found} | ${droppedFindings} | ${droppedChunks} | ${confirmed.length} |`
const report = await agent(
  `夜番の報告を Markdown で書く。先頭に「止める」を 3 行以内（無ければ「止めるものは無い」）。次に件数の表をそのまま貼る。次に各件を「file:line・主張・再現手順・票（CONFIRMED／PLAUSIBLE）・足すべきテストの名前」で。コードは書かない。最後に「人が確かめること」。${RULES}\n\n日付: ${T.date}\n対象: ${T.files.map((f) => f.path).join('、') || 'なし'}\n対象から外したファイル: ${T.dropped.join('、') || 'なし'}\n\n件数の表:\n${table}\n\n残った指摘（JSON）:\n${JSON.stringify(confirmed)}`,
  { label: 'write', phase: 'Write', model: 'sonnet', effort: 'low' },
)
return report ?? `# 夜番 ${T.date}\n\n報告の役が失敗した。\n\n${table}\n\n${JSON.stringify(confirmed, null, 2)}`
