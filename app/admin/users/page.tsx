import { createClient } from "@/lib/supabase/server"
import { UserTable } from "@/components/admin/user-table"

export default async function AdminUsersPage() {
  const supabase = await createClient()

  const { data: users, error } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching users:", error)
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Users</h1>
        <p className="text-neutral-400 mt-1">Manage learners and administrators</p>
      </div>

      <UserTable users={users || []} />
    </div>
  )
}
