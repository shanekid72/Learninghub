import { notFound } from "next/navigation"
import { HrSessionDetailView } from "@/components/admin/hr-session-detail"
import { isHrIntegrityEnabled } from "@/lib/hr/feature"

export default async function AdminHrSessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>
}) {
  if (!isHrIntegrityEnabled()) {
    notFound()
  }

  const { sessionId } = await params
  return <HrSessionDetailView sessionId={sessionId} />
}
