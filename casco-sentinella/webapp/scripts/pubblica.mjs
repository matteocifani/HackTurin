// Copia l'export statico di Next (`out/`) in `server/static/ui/`, da dove FastAPI lo serve.
import { cpSync, existsSync, rmSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const out = fileURLToPath(new URL('../out/', import.meta.url))
const dest = fileURLToPath(new URL('../../server/static/ui/', import.meta.url))

if (!existsSync(out)) {
  console.error('out/ non trovato: lancia prima `pnpm build`')
  process.exit(1)
}
rmSync(dest, { recursive: true, force: true })
cpSync(out, dest, { recursive: true })
console.log(`Copiato ${out} -> ${dest}`)
