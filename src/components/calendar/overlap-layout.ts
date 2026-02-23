import { parseISO, differenceInMinutes } from "date-fns"

interface LayoutJob {
  id: string
  scheduledStart: string
  scheduledEnd: string | null
}

interface OverlapInfo {
  colIndex: number
  totalCols: number
}

/**
 * Compute Google Calendar-style overlap layout for a list of jobs on a single day.
 *
 * Groups overlapping jobs into clusters, then assigns each job a column index
 * and total column count so they can render side-by-side.
 *
 * Returns a Map of jobId -> { colIndex, totalCols }
 */
export function computeOverlapLayout(jobs: LayoutJob[]): Map<string, OverlapInfo> {
  const result = new Map<string, OverlapInfo>()

  if (jobs.length === 0) return result

  // Parse start/end into minutes for easier comparison
  const parsed = jobs.map((job) => {
    const start = parseISO(job.scheduledStart)
    const startMin = start.getHours() * 60 + start.getMinutes()
    let endMin = startMin + 60 // default 1 hour
    if (job.scheduledEnd) {
      const end = parseISO(job.scheduledEnd)
      endMin = end.getHours() * 60 + end.getMinutes()
    }
    // Ensure minimum 30-minute span for layout purposes
    if (endMin - startMin < 30) {
      endMin = startMin + 30
    }
    return { id: job.id, startMin, endMin }
  })

  // Sort by start time, then by longer duration first (for stable column assignment)
  parsed.sort((a, b) => {
    if (a.startMin !== b.startMin) return a.startMin - b.startMin
    return (b.endMin - b.startMin) - (a.endMin - a.startMin)
  })

  // Group into overlap clusters using a sweep-line approach
  const clusters: typeof parsed[] = []
  let currentCluster: typeof parsed = []
  let clusterEnd = -1

  for (const job of parsed) {
    if (currentCluster.length === 0 || job.startMin < clusterEnd) {
      // This job overlaps with the current cluster
      currentCluster.push(job)
      clusterEnd = Math.max(clusterEnd, job.endMin)
    } else {
      // Start a new cluster
      clusters.push(currentCluster)
      currentCluster = [job]
      clusterEnd = job.endMin
    }
  }
  if (currentCluster.length > 0) {
    clusters.push(currentCluster)
  }

  // For each cluster, assign columns using a greedy approach
  for (const cluster of clusters) {
    // Track when each column becomes free
    const columnEnds: number[] = []

    for (const job of cluster) {
      // Find the first column where this job fits (its start >= column's end)
      let assignedCol = -1
      for (let c = 0; c < columnEnds.length; c++) {
        if (job.startMin >= columnEnds[c]) {
          assignedCol = c
          break
        }
      }

      if (assignedCol === -1) {
        // Need a new column
        assignedCol = columnEnds.length
        columnEnds.push(job.endMin)
      } else {
        columnEnds[assignedCol] = job.endMin
      }

      result.set(job.id, { colIndex: assignedCol, totalCols: 0 }) // totalCols set below
    }

    // Set totalCols for all jobs in this cluster
    const totalCols = columnEnds.length
    for (const job of cluster) {
      const info = result.get(job.id)!
      info.totalCols = totalCols
    }
  }

  return result
}
