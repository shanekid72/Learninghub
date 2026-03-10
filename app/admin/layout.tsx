import { redirect } from "next/navigation"
import { getSessionContext, hasAdminRole } from "@/lib/app-session"
import { AdminSidebar } from "@/components/admin/admin-sidebar"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSessionContext()

  if (!session) {
    redirect("/")
  }

  if (!hasAdminRole(session.profile)) {
    redirect("/hub")
  }

  return (
    <div className="flex h-screen bg-neutral-950">
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto p-8">
        {children}
      </main>
    </div>
  )
}
