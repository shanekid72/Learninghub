"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { 
  LayoutDashboard, 
  Users, 
  BookOpen, 
  FileBarChart,
  Settings,
  ArrowLeft
} from "lucide-react"

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/modules", label: "Modules", icon: BookOpen },
  { href: "/admin/reports", label: "Reports", icon: FileBarChart },
]

export function AdminSidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 bg-neutral-900 border-r border-neutral-800 flex flex-col">
      <div className="p-6 border-b border-neutral-800">
        <h1 className="text-xl font-bold text-white">Admin Panel</h1>
        <p className="text-sm text-neutral-400 mt-1">Learning Hub</p>
      </div>

      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href || 
              (item.href !== "/admin" && pathname.startsWith(item.href))
            
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                    isActive 
                      ? "bg-neutral-800 text-white" 
                      : "text-neutral-400 hover:text-white hover:bg-neutral-800/50"
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="p-4 border-t border-neutral-800">
        <Link
          href="/hub"
          className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-neutral-400 hover:text-white hover:bg-neutral-800/50 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Hub
        </Link>
      </div>
    </aside>
  )
}
