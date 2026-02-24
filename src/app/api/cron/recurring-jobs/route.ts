import { NextRequest } from "next/server"

// Recurring job generation via cron is disabled.
// Jobs now cycle automatically between SCHEDULED and COMPLETED states
// when marked as complete in updateJobStatus() (src/actions/jobs.ts).

export async function GET(req: NextRequest) {
  return Response.json({
    message: "Recurring job generation disabled - jobs now cycle automatically",
  })
}
