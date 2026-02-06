import type { Database } from 'better-sqlite3'

export interface JobProgress {
  percent?: number | null
  stage?: string | null
  message?: string | null
}

export function setJobProgress(
  db: Database,
  jobId: string,
  progress: JobProgress
): void {
  const now = new Date().toISOString()

  const current = db.prepare(
    'SELECT progress_percent, progress_stage, progress_message, progress_updated_at FROM jobs WHERE id = ?'
  ).get(jobId) as { 
    progress_percent: number | null; 
    progress_stage: string | null; 
    progress_message: string | null;
    progress_updated_at: string | null 
  } | undefined

  if (!current) {
    return
  }

  const stageChanged = progress.stage !== undefined && progress.stage !== current.progress_stage
  const messageChanged = progress.message !== undefined && progress.message !== current.progress_message
  
  let shouldUpdate = stageChanged || messageChanged

  if (!shouldUpdate && progress.percent !== undefined && progress.percent !== null) {
    const currentPercent = current.progress_percent ?? 0
    if (progress.percent >= currentPercent + 5 || progress.percent === 100 || progress.percent === 0) {
      shouldUpdate = true
    }
  }

  if (shouldUpdate) {
    const sets: string[] = []
    const params: any[] = []

    if (progress.percent !== undefined) {
      sets.push('progress_percent = ?')
      params.push(progress.percent)
    }
    if (progress.stage !== undefined) {
      sets.push('progress_stage = ?')
      params.push(progress.stage)
    }
    if (progress.message !== undefined) {
      sets.push('progress_message = ?')
      params.push(progress.message)
    }

    sets.push('progress_updated_at = ?', 'updated_at = ?')
    params.push(now, now)
    params.push(jobId)

    db.prepare(`
      UPDATE jobs
      SET ${sets.join(', ')}
      WHERE id = ?
    `).run(...params)
  }
}
