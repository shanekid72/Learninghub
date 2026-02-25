"use client"

import { useState } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Search, MoreHorizontal, Shield, User } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

interface Profile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  role: string
  team: string | null
  created_at: string
}

interface UserTableProps {
  users: Profile[]
}

export function UserTable({ users }: UserTableProps) {
  const [searchQuery, setSearchQuery] = useState("")

  const filteredUsers = users.filter(user => {
    const query = searchQuery.toLowerCase()
    return (
      user.email.toLowerCase().includes(query) ||
      user.full_name?.toLowerCase().includes(query) ||
      user.team?.toLowerCase().includes(query)
    )
  })

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
    }
    return email[0].toUpperCase()
  }

  return (
    <Card className="bg-neutral-900 border-neutral-800">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white">All Users ({users.length})</CardTitle>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
            <Input
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-neutral-800 border-neutral-700 text-white placeholder:text-neutral-500"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow className="border-neutral-800 hover:bg-transparent">
              <TableHead className="text-neutral-400">User</TableHead>
              <TableHead className="text-neutral-400">Role</TableHead>
              <TableHead className="text-neutral-400">Team</TableHead>
              <TableHead className="text-neutral-400">Joined</TableHead>
              <TableHead className="text-neutral-400 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.map((user) => (
              <TableRow key={user.id} className="border-neutral-800">
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={user.avatar_url || undefined} />
                      <AvatarFallback className="bg-neutral-700 text-white">
                        {getInitials(user.full_name, user.email)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-white">
                        {user.full_name || "No name"}
                      </p>
                      <p className="text-sm text-neutral-400">{user.email}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge 
                    variant={user.role === "admin" ? "default" : "secondary"}
                    className={user.role === "admin" 
                      ? "bg-amber-500/20 text-amber-400 hover:bg-amber-500/30" 
                      : "bg-neutral-700 text-neutral-300"
                    }
                  >
                    {user.role === "admin" ? (
                      <Shield className="w-3 h-3 mr-1" />
                    ) : (
                      <User className="w-3 h-3 mr-1" />
                    )}
                    {user.role}
                  </Badge>
                </TableCell>
                <TableCell className="text-neutral-300">
                  {user.team || "-"}
                </TableCell>
                <TableCell className="text-neutral-400">
                  {formatDistanceToNow(new Date(user.created_at), { addSuffix: true })}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-neutral-400 hover:text-white">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-neutral-800 border-neutral-700">
                      <DropdownMenuItem className="text-neutral-300 focus:text-white focus:bg-neutral-700">
                        View Profile
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-neutral-300 focus:text-white focus:bg-neutral-700">
                        View Progress
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-neutral-300 focus:text-white focus:bg-neutral-700">
                        {user.role === "admin" ? "Remove Admin" : "Make Admin"}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {filteredUsers.length === 0 && (
          <div className="text-center py-8">
            <p className="text-neutral-400">No users found</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
