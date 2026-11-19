/**
 * Host half of the global rules editor.
 *
 * The browser half edits the one file `@deepseek-ai/dsh-agent-instructions`
 * loads as the user-global chain — `$DSH_HOME/AGENTS.md` — through two exact
 * Fetch routes, so no generated Remote namespace is involved.
 */
import { createHash } from 'node:crypto'
import { chmod, mkdir, open, readFile, rename, stat, unlink } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, join, resolve } from 'node:path'

export const inject = ['connection']

const READ_PATH = '/api/global-agents-md/read'
const WRITE_PATH = '/api/global-agents-md/write'

/** Cap on the file the editor writes back, in bytes. */
const MAX_BYTES = 256 * 1024

/**
 * Expand a leading `~`, `~/`, or `~\` against the operating-system home.
 * Every other form passes through unchanged.
 * @param value - the configured path.
 * @returns the expanded path.
 */
export function expandHomePath(value) {
  if (value === '~') return homedir()
  if (value.startsWith('~/') || value.startsWith('~\\')) return join(homedir(), value.slice(2))
  return value
}

/**
 * Resolve the DSH home with the precedence the harness uses everywhere: an
 * explicit value, then `$DSH_HOME`, then `~/.dsh`. A blank value is unset.
 * @param env - the environment to read; defaults to the process environment.
 * @returns the normalized absolute home.
 */
export function resolveDshHome(env = process.env) {
  const configured = env.DSH_HOME?.trim()
  return configured ? resolve(expandHomePath(configured)) : join(homedir(), '.dsh')
}

/**
 * Describe the edited file symbolically for user-facing text.
 * @param env - the environment to read; defaults to the process environment.
 * @returns `~/.dsh/AGENTS.md`, or `$DSH_HOME/AGENTS.md` when the home is configured.
 */
export function displayAgentsPath(env = process.env) {
  return env.DSH_HOME?.trim() ? '$DSH_HOME/AGENTS.md' : '~/.dsh/AGENTS.md'
}

/**
 * The absolute path of the user-global AGENTS.md.
 * @param env - the environment to read; defaults to the process environment.
 * @returns the normalized absolute file path.
 */
export function agentsMdPath(env = process.env) {
  return join(resolveDshHome(env), 'AGENTS.md')
}

/**
 * Identify one text version so a save can detect an edit made elsewhere.
 * @param text - the file content.
 * @returns the content hash.
 */
function versionOf(text) {
  return createHash('sha1').update(text, 'utf8').digest('hex')
}

/**
 * Read the edited file.
 * @param file - absolute path of the file.
 * @returns the text, its version, its byte size, and whether it exists.
 */
export async function readAgents(file) {
  let text
  try {
    text = await readFile(file, 'utf8')
  } catch (error) {
    if (error?.code === 'ENOENT') return { exists: false, text: '', version: null, bytes: 0 }
    throw error
  }
  return { exists: true, text, version: versionOf(text), bytes: Buffer.byteLength(text, 'utf8') }
}

/**
 * Replace the edited file atomically, refusing to overwrite an edit made after
 * the caller loaded it.
 * @param file - absolute path of the file.
 * @param text - the complete new content.
 * @param expectedVersion - the version the caller loaded, or null to accept the current one.
 * @returns `{ ok: true }` with the stored state, or `{ ok: false, version }` on a conflict.
 */
export async function saveAgents(file, text, expectedVersion) {
  const current = await readAgents(file)
  if (expectedVersion !== null && expectedVersion !== undefined) {
    if (current.exists && current.version !== expectedVersion) {
      return { ok: false, version: current.version }
    }
  }
  await mkdir(dirname(file), { recursive: true })
  const temporary = join(dirname(file), `.AGENTS.md.${process.pid}.${Date.now()}.tmp`)
  let handle
  try {
    handle = await open(temporary, 'w')
    if (current.exists) {
      try {
        const existing = await stat(file)
        await chmod(temporary, existing.mode & 0o777)
      } catch {
        // A vanished or unreadable mode keeps the default creation mode.
      }
    }
    await handle.writeFile(text, 'utf8')
    await handle.sync()
    await handle.close()
    handle = undefined
    await rename(temporary, file)
  } catch (error) {
    await handle?.close().catch(() => {})
    await unlink(temporary).catch(() => {})
    throw error
  }
  return { ok: true, ...(await readAgents(file)) }
}

/**
 * Answer one JSON payload without letting a transport error turn it into a 500.
 * @param body - the JSON-compatible payload.
 * @returns the HTTP response.
 */
function json(body) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  })
}

/**
 * Describe one failure for the browser half.
 * @param error - the thrown value.
 * @returns the message text.
 */
function messageOf(error) {
  return error instanceof Error ? error.message : String(error)
}

/**
 * Answer a read request.
 * @param file - absolute path of the edited file.
 * @param display - the symbolic path shown in the page.
 * @returns the JSON response.
 */
async function handleRead(file, display) {
  try {
    return json({ ok: true, display, absolutePath: file, ...(await readAgents(file)) })
  } catch (error) {
    return json({ ok: false, code: 'read-failed', message: messageOf(error) })
  }
}

/**
 * Answer a write request.
 * @param file - absolute path of the edited file.
 * @param display - the symbolic path shown in the page.
 * @param request - the buffered request.
 * @returns the JSON response.
 */
async function handleWrite(file, display, request) {
  let body
  try {
    body = await request.json()
  } catch {
    return json({ ok: false, code: 'bad-request', message: 'the request body is not JSON' })
  }
  if (typeof body?.text !== 'string') {
    return json({ ok: false, code: 'bad-request', message: '`text` must be a string' })
  }
  if (Buffer.byteLength(body.text, 'utf8') > MAX_BYTES) {
    return json({ ok: false, code: 'too-large', message: `the content exceeds ${MAX_BYTES} bytes` })
  }
  try {
    const stored = await saveAgents(file, body.text, body.expectedVersion ?? null)
    if (!stored.ok) {
      return json({
        ok: false,
        code: 'conflict',
        message: 'the file changed since this page loaded it',
        version: stored.version,
      })
    }
    return json({ ok: true, display, absolutePath: file, ...stored })
  } catch (error) {
    return json({ ok: false, code: 'write-failed', message: messageOf(error) })
  }
}

/**
 * Register the editor's two routes for the life of this plugin.
 * @param ctx - the plugin context.
 */
export function apply(ctx) {
  const file = agentsMdPath()
  const display = displayAgentsPath()
  ctx.effect(
    () =>
      ctx.connection.fetch.register({
        path: READ_PATH,
        methods: ['GET'],
        requestBody: 'buffered',
        fetch: () => handleRead(file, display),
      }),
    'global-agents-md: read route',
  )
  ctx.effect(
    () =>
      ctx.connection.fetch.register({
        path: WRITE_PATH,
        methods: ['POST'],
        requestBody: 'buffered',
        fetch: (request) => handleWrite(file, display, request),
      }),
    'global-agents-md: write route',
  )
}
