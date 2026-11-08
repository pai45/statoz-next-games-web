// Shared paths for the athlete toolchain. Everything heavy lives in .cache/athletes (gitignored);
// intermediate build output in tools/athletes/build (gitignored); shipped output in public/.
import { fileURLToPath } from 'node:url'
import path from 'node:path'

export const TOOL_DIR = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
export const ROOT = path.resolve(TOOL_DIR, '..', '..')
export const CACHE = path.join(ROOT, '.cache', 'athletes')
export const BUILD = path.join(TOOL_DIR, 'build')
export const PUBLIC_ATHLETES = path.join(ROOT, 'public', 'athletes')
export const PUBLIC_BASIS = path.join(ROOT, 'public', 'basis')
export const SOURCES = path.join(TOOL_DIR, 'sources.json')
export const LOCK = path.join(TOOL_DIR, 'sources.lock.json')

export const BLENDER = path.join(CACHE, 'blender', 'blender')
export const KTX_DIR = path.join(CACHE, 'ktx')
export const TOKTX = path.join(KTX_DIR, 'bin', 'toktx')
export const KTX_ENV = { ...process.env, LD_LIBRARY_PATH: [path.join(KTX_DIR, 'lib'), process.env.LD_LIBRARY_PATH].filter(Boolean).join(':') }
export const MH = path.join(CACHE, 'makehuman')
export const MHSYS = path.join(CACHE, 'mhsys')
