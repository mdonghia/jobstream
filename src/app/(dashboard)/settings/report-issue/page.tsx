import { requireAuth } from "@/lib/auth-utils"
import { ReportIssueForm } from "@/components/settings/report-issue-form"

export default async function SettingsReportIssuePage() {
  await requireAuth()

  return <ReportIssueForm />
}
