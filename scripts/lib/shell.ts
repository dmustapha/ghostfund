import { spawnSync, type SpawnSyncReturns } from 'node:child_process'

type RunArgs = {
  cmd: string
  args: string[]
  cwd: string
  env?: NodeJS.ProcessEnv
  secretValues?: string[]
}

function redact(text: string, secretValues: string[] = []): string {
  let out = text
  for (const value of secretValues) {
    if (!value) continue
    out = out.split(value).join('[REDACTED]')
  }
  return out
}

function formatCommand(cmd: string, args: string[]): string {
  return [cmd, ...args].join(' ')
}

function collectOutput(res: SpawnSyncReturns<string>): string {
  const stdout = res.stdout ?? ''
  const stderr = res.stderr ?? ''
  return `${stdout}${stderr}`.trim()
}

export function runCommand({ cmd, args, cwd, env, secretValues = [] }: RunArgs): string {
  const res = spawnSync(cmd, args, {
    cwd,
    env: env ?? process.env,
    encoding: 'utf8',
  })

  if (res.error) {
    const rendered = redact(formatCommand(cmd, args), secretValues)
    const msg = redact(res.error.message, secretValues)
    throw new Error(`Command failed (spawn error): ${rendered}\n${msg}`)
  }

  const output = collectOutput(res)
  if (res.status !== 0) {
    const msg = redact(output, secretValues)
    const rendered = redact(formatCommand(cmd, args), secretValues)
    throw new Error(`Command failed (${res.status}): ${rendered}\n${msg}`)
  }

  return redact(output, secretValues)
}
