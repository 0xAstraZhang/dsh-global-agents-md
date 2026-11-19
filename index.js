/**
 * Host half of the rules editor.
 *
 * The browser half edits the user-global AGENTS.md and the rules files of one
 * workspace. A workspace can hold several: the chain that
 * `@deepseek-ai/dsh-agent-instructions` loads runs from the project root down,
 * so the page lists every rules file found in the workspace instead of assuming
 * a single root file. All access goes through exact Fetch routes, and every
 * project path is resolved here, never taken from the request.
 */
import { createHash } from 'node:crypto'
import { chmod, mkdir, open, readdir, readFile, rename, stat, unlink } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, join, resolve, sep } from 'node:path'

export const inject = ['connection', 'workspaceRegistry']

const TARGETS_PATH = '/api/global-agents-md/targets'
const FILES_PATH = '/api/global-agents-md/files'
const READ_PATH = '/api/global-agents-md/read'
const WRITE_PATH = '/api/global-agents-md/write'

/** The file name the editor offers when a directory has no rules yet. */
export const ROOT_RULE = 'AGENTS.md'

/** Rule file names the instruction chain treats as a directory's own rules. */
export const RULE_NAMES = ['AGENTS.md', 'AGENTS.local.md']

/** Directories a rules scan never descends into. */
const SKIP_NAMES = new Set(['.git', '.hg', '.svn', 'node_modules'])

/** Bounds of one workspace scan, so a large tree cannot stall the request. */
const MAX_DEPTH = 8
const MAX_DIRS = 4000
const MAX_FILES = 200

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
 * Describe the user-global file symbolically for user-facing text.
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
 * Order rule paths broad to specific, the order the instruction chain renders:
 * shallower directories first, and within one directory the base file before
 * its local overlay.
 * @param a - one workspace-relative path.
 * @param b - the other workspace-relative path.
 * @returns the comparison result.
 */
function compareRulePaths(a, b) {
  const depth = a.split('/').length - b.split('/').length
  if (depth !== 0) return depth
  const rank = (path) => RULE_NAMES.indexOf(path.split('/').at(-1))
  const byName = rank(a) - rank(b)
  return byName !== 0 ? byName : a.localeCompare(b)
}

/**
 * Turn a workspace-relative path into an absolute rule file path, rejecting
 * anything that is not a rule file inside the workspace.
 * @param root - absolute workspace directory.
 * @param relative - workspace-relative path such as `packages/app/AGENTS.md`.
 * @returns the absolute file path, or undefined when the path is not accepted.
 */
export function resolveProjectFile(root, relative) {
  if (typeof relative !== 'string' || relative === '') return undefined
  if (relative.includes('\\') || relative.includes('\0')) return undefined
  if (relative.startsWith('/')) return undefined
  const segments = relative.split('/')
  if (segments.some((segment) => segment === '' || segment === '.' || segment === '..')) return undefined
  if (!RULE_NAMES.includes(segments[segments.length - 1])) return undefined
  const file = join(root, ...segments)
  // Belt and braces after the segment checks: the result must stay inside root.
  if (!file.startsWith(root.endsWith(sep) ? root : root + sep)) return undefined
  return file
}

/**
 * List every rule file inside one workspace, root file included when present.
 * @param root - absolute workspace directory.
 * @returns workspace-relative rule paths in load order.
 */
export async function discoverRuleFiles(root) {
  const found = []
  const queue = [{ directory: root, prefix: '', depth: 0 }]
  let visited = 0
  while (queue.length > 0 && visited < MAX_DIRS && found.length < MAX_FILES) {
    const { directory, prefix, depth } = queue.shift()
    visited += 1
    let entries
    try {
      entries = await readdir(directory, { withFileTypes: true })
    } catch {
      continue
    }
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (SKIP_NAMES.has(entry.name) || entry.name.startsWith('.')) continue
        if (depth >= MAX_DEPTH) continue
        queue.push({
          directory: join(directory, entry.name),
          prefix: prefix === '' ? entry.name : `${prefix}/${entry.name}`,
          depth: depth + 1,
        })
      } else if (entry.isFile() && RULE_NAMES.includes(entry.name)) {
        found.push(prefix === '' ? entry.name : `${prefix}/${entry.name}`)
        if (found.length >= MAX_FILES) break
      }
    }
  }
  return found.sort(compareRulePaths)
}

/**
 * Resolve one request's scope to the file it edits.
 * @param request - the scope, workspace id, and workspace-relative path.
 * @param registry - the workspace registry, when available.
 * @returns the absolute file and its display path, or undefined when unknown.
 */
export function resolveRequest(request, registry) {
  if (request?.scope === 'global') {
    return { file: agentsMdPath(), display: displayAgentsPath() }
  }
  if (request?.scope !== 'project') return undefined
  const workspace = registry?.get(request.workspaceId)
  if (workspace === undefined) return undefined
  const relative = typeof request.path === 'string' && request.path !== '' ? request.path : ROOT_RULE
  const file = resolveProjectFile(workspace.path, relative)
  if (file === undefined) return undefined
  return { file, display: `${workspace.title}/${relative}` }
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
 * Report whether a file exists and how large it is, without reading it.
 * @param file - absolute path of the file.
 * @returns the presence and byte size.
 */
export async function describeFile(file) {
  try {
    const info = await stat(file)
    return { exists: true, bytes: info.size }
  } catch (error) {
    if (error?.code === 'ENOENT') return { exists: false, bytes: 0 }
    throw error
  }
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
  const temporary = join(dirname(file), `.${Date.now()}.${process.pid}.AGENTS.md.tmp`)
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
 * Describe one thrown value.
 * @param error - the thrown value.
 * @returns the message text.
 */
function messageOf(error) {
  return error instanceof Error ? error.message : String(error)
}

/**
 * Answer the global file and every registered workspace.
 * @param registry - the workspace registry.
 * @returns the JSON response.
 */
async function handleTargets(registry) {
  try {
    const workspaces = []
    for (const workspace of registry?.list() ?? []) {
      const base = { id: workspace.id, title: workspace.title, display: `${workspace.title}/${ROOT_RULE}` }
      try {
        workspaces.push({ ...base, ...(await describeFile(join(workspace.path, ROOT_RULE))) })
      } catch (error) {
        workspaces.push({ ...base, exists: false, bytes: 0, error: messageOf(error) })
      }
    }
    return json({
      ok: true,
      global: { display: displayAgentsPath(), ...(await describeFile(agentsMdPath())) },
      workspaces,
      rootRule: ROOT_RULE,
    })
  } catch (error) {
    return json({ ok: false, code: 'targets-failed', message: messageOf(error) })
  }
}

/**
 * Answer every rules file one workspace holds.
 * @param workspaceId - the registered workspace id.
 * @param registry - the workspace registry.
 * @returns the JSON response.
 */
async function handleFiles(workspaceId, registry) {
  const workspace = registry?.get(workspaceId)
  if (workspace === undefined) {
    return json({ ok: false, code: 'unknown-target', message: `unknown workspace ${String(workspaceId)}` })
  }
  try {
    const paths = await discoverRuleFiles(workspace.path)
    if (!paths.includes(ROOT_RULE)) paths.unshift(ROOT_RULE)
    const files = []
    for (const path of paths) {
      files.push({ path, ...(await describeFile(join(workspace.path, ...path.split('/')))) })
    }
    return json({ ok: true, workspace: { id: workspace.id, title: workspace.title }, files })
  } catch (error) {
    return json({ ok: false, code: 'files-failed', message: messageOf(error) })
  }
}

/**
 * Answer a read request for one scope.
 * @param query - the request's scope parameters.
 * @param registry - the workspace registry.
 * @returns the JSON response.
 */
async function handleRead(query, registry) {
  const request = query.scope === 'project'
    ? { scope: 'project', workspaceId: query.workspaceId, path: query.path }
    : { scope: 'global' }
  const resolved = resolveRequest(request, registry)
  if (resolved === undefined) {
    return json({ ok: false, code: 'unknown-target', message: `unknown target ${JSON.stringify(query)}` })
  }
  try {
    return json({ ok: true, display: resolved.display, absolutePath: resolved.file, ...(await readAgents(resolved.file)) })
  } catch (error) {
    return json({ ok: false, code: 'read-failed', message: messageOf(error) })
  }
}

/**
 * Answer a write request for one scope.
 * @param registry - the workspace registry.
 * @param request - the buffered request.
 * @returns the JSON response.
 */
async function handleWrite(registry, request) {
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
  const resolved = resolveRequest(body, registry)
  if (resolved === undefined) {
    return json({ ok: false, code: 'unknown-target', message: 'unknown target' })
  }
  try {
    const stored = await saveAgents(resolved.file, body.text, body.expectedVersion ?? null)
    if (!stored.ok) {
      return json({
        ok: false,
        code: 'conflict',
        message: 'the file changed since this page loaded it',
        version: stored.version,
      })
    }
    return json({ ok: true, display: resolved.display, absolutePath: resolved.file, ...stored })
  } catch (error) {
    return json({ ok: false, code: 'write-failed', message: messageOf(error) })
  }
}

/**
 * Register the editor's routes for the life of this plugin.
 * @param ctx - the plugin context.
 */
export function apply(ctx) {
  const registry = () => ctx.workspaceRegistry
  ctx.effect(
    () =>
      ctx.connection.fetch.register({
        path: TARGETS_PATH,
        methods: ['GET'],
        requestBody: 'buffered',
        fetch: () => handleTargets(registry()),
      }),
    'global-agents-md: targets route',
  )
  ctx.effect(
    () =>
      ctx.connection.fetch.register({
        path: FILES_PATH,
        methods: ['GET'],
        requestBody: 'buffered',
        fetch: (request) => handleFiles(new URL(request.url).searchParams.get('workspace') ?? '', registry()),
      }),
    'global-agents-md: files route',
  )
  ctx.effect(
    () =>
      ctx.connection.fetch.register({
        path: READ_PATH,
        methods: ['GET'],
        requestBody: 'buffered',
        fetch: (request) => {
          const params = new URL(request.url).searchParams
          return handleRead({
            scope: params.get('scope') ?? 'global',
            workspaceId: params.get('workspace') ?? undefined,
            path: params.get('path') ?? undefined,
          }, registry())
        },
      }),
    'global-agents-md: read route',
  )
  ctx.effect(
    () =>
      ctx.connection.fetch.register({
        path: WRITE_PATH,
        methods: ['POST'],
        requestBody: 'buffered',
        fetch: (request) => handleWrite(registry(), request),
      }),
    'global-agents-md: write route',
  )
}
