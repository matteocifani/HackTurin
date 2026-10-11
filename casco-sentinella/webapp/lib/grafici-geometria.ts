/** Geometry and shared constants for SVG and recharts charts. Part of the IAMAimpresa design system. */
export type Punto = readonly [number, number]

export const STACCO = 2

export const SPESSORE = { fuoco: 2, serie: 1.75, bordo: 1.25, riferimento: 1.25 } as const

export const TRATTO = { riferimento: '4 3', incorso: '1 3', ponte: '1 2', manca: '3 2' } as const

export const COLONNA_MAX = 24
export const COLONNA_GAP = '25%'

export const RILIEVO = { raggio: 3.5, raggioSecondaria: 3, alone: 2 } as const

export const SFUMATURA = { alto: 0.16, base: 0 } as const

export const SERIE = [
  'var(--chart-1)',
  'var(--chart-slate)',
  'var(--chart-ochre)',
  'var(--chart-plum)',
] as const

export const TINTE = [
  'var(--chart-1-tint)',
  'var(--chart-slate-tint)',
  'var(--chart-ochre-tint)',
  'var(--chart-plum-tint)',
] as const

export const ALTRI = 'var(--chart-context)'

export const CARTA = 'var(--card)'

export const RAMPA_ALERT = [
  'var(--chart-alert-tint)',
  'var(--chart-alert-soft)',
  'var(--chart-alert-mid)',
  'var(--chart-alert)',
] as const
export const RAMPA_GOOD = [
  'var(--chart-good-tint)',
  'var(--chart-good-soft)',
  'var(--chart-good-mid)',
  'var(--chart-good)',
] as const

function r1(v: number): number {
  return Math.round(v * 10) / 10
}

function pt(x: number, y: number): string {
  return `${r1(x)},${r1(y)}`
}

function passoBello(grezzo: number, decimali: boolean, correzione: number): number {
  if (!(grezzo > 0)) return 1
  const cifre = Math.floor(Math.log10(grezzo)) + 1
  const dv = Math.pow(10, cifre)
  const scala = cifre !== 1 ? 0.05 : 0.1
  const passo = (Math.ceil(grezzo / dv / scala - 1e-9) + correzione) * scala * dv
  return decimali ? passo : Math.max(1, Math.ceil(passo - 1e-9))
}

export function tacche(max: number, n = 5, min = 0, interi = false): number[] {
  const alto = max === min ? min + 1 : max
  const calcola = (corr: number): number[] => {
    const passo = passoBello((alto - min) / (n - 1), !interi, corr)
    let mezzo = min <= 0 && alto >= 0 ? 0 : (min + alto) / 2
    mezzo = mezzo - (mezzo % passo)
    let sotto = Math.ceil((mezzo - min) / passo - 1e-9)
    let sopra = Math.ceil((alto - mezzo) / passo - 1e-9)
    const conta = sotto + sopra + 1
    if (conta > n && corr < 20) return calcola(corr + 1)
    if (conta < n) {
      if (alto > 0) sopra += n - conta
      else sotto += n - conta
    }
    const t: number[] = []
    for (let i = -sotto; i <= sopra; i++) t.push(Math.round((mezzo + i * passo) * 1e6) / 1e6)
    return t
  }
  return calcola(0)
}

export type OpzioniPiano = {
  w: number
  h: number

  m?: { t: number; r: number; b: number; l: number }

  n?: number

  tipo?: 'punti' | 'bande'

  max?: number
  min?: number

  nt?: number

  tacche?: number[]
  interi?: boolean

  gap?: number

  maxBarra?: number
}

export type Piano = {
  L: number
  R: number
  T: number
  B: number
  w: number
  h: number

  x: (i: number) => number

  y: (v: number) => number

  vx: (v: number) => number

  banda: number
  bw: number
  tacche: number[]
  y0: number
  y1: number
  n: number
}

export function piano(o: OpzioniPiano): Piano {
  const m = o.m ?? { t: 8, r: 8, b: 24, l: 40 }
  const L = m.l
  const R = o.w - m.r
  const T = m.t
  const B = o.h - m.b
  const tk = o.tacche ?? tacche(o.max ?? 1, o.nt ?? 5, o.min ?? 0, o.interi)
  const y0 = tk[0] ?? 0
  const y1 = tk[tk.length - 1] ?? 1
  const n = o.n ?? 1
  const banda = (R - L) / n
  const gap = o.gap ?? 0.5
  const tetto = o.maxBarra ?? COLONNA_MAX
  const bw = Math.min(banda * (1 - gap), tetto)
  const ampiezza = y1 - y0 || 1
  return {
    L,
    R,
    T,
    B,
    w: o.w,
    h: o.h,
    x: i =>
      o.tipo === 'punti' ? (n === 1 ? (L + R) / 2 : L + (i * (R - L)) / (n - 1)) : L + banda * (i + 0.5),
    y: v => B - ((v - y0) / ampiezza) * (B - T),
    vx: v => L + ((v - y0) / ampiezza) * (R - L),
    banda,
    bw,
    tacche: tk,
    y0,
    y1,
    n,
  }
}

export function linea(p: readonly Punto[]): string {
  return p.map(([x, y], i) => `${i ? 'L' : 'M'}${pt(x, y)}`).join('')
}

export function curva(p: readonly Punto[]): string {
  const n = p.length
  if (n < 3) return linea(p)
  const h: number[] = []
  const s: number[] = []
  const t: number[] = new Array<number>(n).fill(0)
  for (let i = 0; i < n - 1; i++) {
    h[i] = p[i + 1][0] - p[i][0]
    s[i] = (p[i + 1][1] - p[i][1]) / (h[i] || 1e-9)
  }
  const sgn = (v: number) => (v < 0 ? -1 : 1)
  for (let i = 1; i < n - 1; i++) {
    const h0 = h[i - 1]
    const h1 = h[i]
    const s0 = s[i - 1]
    const s1 = s[i]
    const q = (s0 * h1 + s1 * h0) / (h0 + h1)
    t[i] = (sgn(s0) + sgn(s1)) * Math.min(Math.abs(s0), Math.abs(s1), 0.5 * Math.abs(q)) || 0
  }
  t[0] = (3 * s[0] - t[1]) / 2
  t[n - 1] = (3 * s[n - 2] - t[n - 2]) / 2
  let d = `M${pt(p[0][0], p[0][1])}`
  for (let i = 0; i < n - 1; i++) {
    const dx = (p[i + 1][0] - p[i][0]) / 3
    d += `C${pt(p[i][0] + dx, p[i][1] + dx * t[i])} ${pt(p[i + 1][0] - dx, p[i + 1][1] - dx * t[i + 1])} ${pt(p[i + 1][0], p[i + 1][1])}`
  }
  return d
}

function traccia(p: readonly Punto[], curvo: boolean): string {
  return curvo ? curva(p) : linea(p)
}

export function area(p: readonly Punto[], base: number, curvo = false): string {
  if (!p.length) return ''
  const ultimo = p[p.length - 1]
  return `${traccia(p, curvo)}L${pt(ultimo[0], base)}L${pt(p[0][0], base)}Z`
}

export function fascia(su: readonly Punto[], giu: readonly Punto[], curvo = false): string {
  if (!su.length) return ''
  const ritorno = traccia([...giu].reverse(), curvo)
  return `${traccia(su, curvo)}L${ritorno.slice(1)}Z`
}

export function rett(x: number, y: number, w: number, h: number): string {
  if (h <= 0.05 || w <= 0.05) return ''
  return `M${pt(x, y)}h${r1(w)}v${r1(h)}h${r1(-w)}Z`
}

export function contorno(x: number, y: number, w: number, h: number): string {
  return `M${pt(x, y)}H${r1(x + w)}V${r1(y + h)}H${r1(x)}Z`
}

export type Scarto = { d: string; segno: -1 | 0 | 1 }

export function scarti(a: readonly Punto[], b: readonly Punto[]): Scarto[] {
  const out: Scarto[] = []
  let cur: { segno: -1 | 0 | 1; su: Punto[]; giu: Punto[] } | null = null
  const chiudi = () => {
    if (cur && cur.su.length > 1)
      out.push({ d: `${linea(cur.su)}L${linea([...cur.giu].reverse()).slice(1)}Z`, segno: cur.segno })
  }
  for (let i = 0; i < a.length; i++) {
    const d = b[i][1] - a[i][1]
    const s: -1 | 0 | 1 = d > 0.01 ? 1 : d < -0.01 ? -1 : 0
    if (i > 0 && cur) {
      const dp = b[i - 1][1] - a[i - 1][1]
      if (dp * d < 0) {
        const t = dp / (dp - d)
        const incrocio: Punto = [
          a[i - 1][0] + t * (a[i][0] - a[i - 1][0]),
          a[i - 1][1] + t * (a[i][1] - a[i - 1][1]),
        ]
        cur.su.push(incrocio)
        cur.giu.push(incrocio)
        chiudi()
        cur = { segno: s, su: [incrocio], giu: [incrocio] }
      }
    }
    if (!cur) cur = { segno: s, su: [], giu: [] }
    if (!cur.segno && s) cur.segno = s
    cur.su.push(a[i])
    cur.giu.push(b[i])
  }
  chiudi()
  return out
}

export function stacca(
  da: number,
  a: number,
  riduciDa: boolean,
  riduciA: boolean,
  stacco: number = STACCO
): readonly [number, number] | null {
  const inizio = da + (riduciDa ? stacco / 2 : 0)
  const fine = a - (riduciA ? stacco / 2 : 0)
  return fine - inizio <= 0.6 ? null : [inizio, fine]
}

export function colonna(x: number, w: number, ys: readonly number[], stacco: number = STACCO): string[] {
  let cima = -1
  for (let k = ys.length - 1; k > 0; k--) {
    if (ys[k - 1] - ys[k] > 0.05) {
      cima = k
      break
    }
  }
  const out: string[] = []
  for (let i = 1; i < ys.length; i++) {
    const pezzo = ys[i - 1] - ys[i] <= 0.05 ? null : stacca(ys[i], ys[i - 1], i < cima, i > 1, stacco)
    out.push(pezzo ? rett(x, pezzo[0], w, pezzo[1] - pezzo[0]) : '')
  }
  return out
}

export function riga(xs: readonly number[], y: number, h: number, stacco: number = STACCO): string[] {
  let ultimo = -1
  for (let k = xs.length - 1; k > 0; k--) {
    if (xs[k] - xs[k - 1] > 0.05) {
      ultimo = k
      break
    }
  }
  const out: string[] = []
  for (let i = 1; i < xs.length; i++) {
    const pezzo = xs[i] - xs[i - 1] <= 0.05 ? null : stacca(xs[i - 1], xs[i], i > 1, i < ultimo, stacco)
    out.push(pezzo ? rett(pezzo[0], y, pezzo[1] - pezzo[0], h) : '')
  }
  return out
}

export function distanzia(ys: readonly number[], passo: number, min?: number, max?: number): number[] {
  const idx = ys.map((y, i) => ({ y, i })).sort((p, q) => p.y - q.y)
  for (let k = 1; k < idx.length; k++) if (idx[k].y - idx[k - 1].y < passo) idx[k].y = idx[k - 1].y + passo
  if (max != null && idx.length && idx[idx.length - 1].y > max) {
    idx[idx.length - 1].y = max
    for (let k = idx.length - 2; k >= 0; k--)
      if (idx[k + 1].y - idx[k].y < passo) idx[k].y = idx[k + 1].y - passo
  }
  if (min != null && idx.length && idx[0].y < min) {
    idx[0].y = min
    for (let k = 1; k < idx.length; k++) if (idx[k].y - idx[k - 1].y < passo) idx[k].y = idx[k - 1].y + passo
  }
  const out: number[] = new Array<number>(ys.length)
  for (const o of idx) out[o.i] = r1(o.y)
  return out
}

export type Sfumatura = {
  id: string
  y1: number
  y2: number
  colore: string
  opacitaAlto: number
  opacitaBase: number
}

export function sfuma(
  id: string,
  colore: string,
  yAlto: number,
  yBase: number,
  opacitaAlto: number = SFUMATURA.alto,
  opacitaBase: number = SFUMATURA.base
): Sfumatura {
  return { id, y1: r1(yAlto), y2: r1(yBase), colore, opacitaAlto, opacitaBase }
}

export type Rilievo = { cx: number; cy: number; r: number; fill: string; stroke: string; strokeWidth: number }

export function rilievo(x: number, y: number, colore: string, r: number = RILIEVO.raggio): Rilievo {
  return { cx: r1(x), cy: r1(y), r, fill: colore, stroke: CARTA, strokeWidth: RILIEVO.alone }
}
