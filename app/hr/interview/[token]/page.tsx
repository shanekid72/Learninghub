import { notFound } from "next/navigation"
import { HrInterviewAccess } from "@/components/hr/interview-access"
import { getHrScannerProtocol, isHrIntegrityEnabled } from "@/lib/hr/feature"

export default async function HrInterviewPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  if (!isHrIntegrityEnabled()) {
    notFound()
  }

  const { token } = await params

  return (
    <HrInterviewAccess
      scannerProtocol={getHrScannerProtocol()}
      token={decodeURIComponent(token)}
    />
  )
}
