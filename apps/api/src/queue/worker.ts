export type WorkerOptions = {
  enabled: boolean
}

export function startWorker(opts: WorkerOptions) {
  if (!opts.enabled) return
  // skeleton: later this becomes a claim loop against jobs table
  // eslint-disable-next-line no-console
  console.log('[worker] started (skeleton)')
}
