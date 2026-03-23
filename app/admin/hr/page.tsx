import { notFound } from "next/navigation"
import { HrSessionManager } from "@/components/admin/hr-session-manager"
import { isHrIntegrityEnabled } from "@/lib/hr/feature"

export default function AdminHrPage() {
  if (!isHrIntegrityEnabled()) {
    notFound()
  }

  return <HrSessionManager />
}
