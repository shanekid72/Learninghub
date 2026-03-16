"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

export type ModulePickerItem = {
  moduleId: string
  title: string
  objective: string
  moduleType: "VIDEO" | "DOC" | "SLIDES"
  owner: string
  badges: Array<"MANDATORY" | "NEW" | "UPDATED">
  teams: string[]
  status: "draft" | "published" | "archived"
  durationMins: number
}

type ModulePickerResponse = {
  modules: ModulePickerItem[]
}

type ModulePickerProps = {
  value: string
  onSelect: (module: ModulePickerItem) => void
  disabled?: boolean
  placeholder?: string
  status?: "draft" | "published" | "archived"
}

export function ModulePicker({
  value,
  onSelect,
  disabled = false,
  placeholder = "Select a module",
  status = "published",
}: ModulePickerProps) {
  const [open, setOpen] = React.useState(false)
  const [modules, setModules] = React.useState<ModulePickerItem[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    let cancelled = false

    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const params = new URLSearchParams({
          compact: "1",
          status,
        })
        const response = await fetch(`/api/admin/modules?${params.toString()}`, {
          cache: "no-store",
        })

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}))
          throw new Error(payload.error || "Failed to load modules")
        }

        const payload = (await response.json()) as ModulePickerResponse
        if (!cancelled) {
          setModules(payload.modules || [])
        }
      } catch (fetchError) {
        if (!cancelled) {
          setError(fetchError instanceof Error ? fetchError.message : "Failed to load modules")
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [status])

  const selectedModule = React.useMemo(
    () => modules.find((module) => module.moduleId === value) || null,
    [modules, value],
  )

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className="w-full justify-between border-neutral-700 bg-neutral-800 text-left text-white hover:bg-neutral-800"
          >
            <span className="min-w-0 truncate">
              {selectedModule ? `${selectedModule.title} (${selectedModule.moduleId})` : placeholder}
            </span>
            {loading ? (
              <Loader2 className="ml-2 h-4 w-4 shrink-0 animate-spin" />
            ) : (
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-60" />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] border-neutral-800 bg-neutral-950 p-0 text-white">
          <Command className="bg-neutral-950 text-white">
            <CommandInput placeholder="Search by title, module ID, or owner" className="text-white" />
            <CommandList>
              <CommandEmpty>{error || "No modules found."}</CommandEmpty>
              {modules.map((module) => (
                <CommandItem
                  key={module.moduleId}
                  value={`${module.title} ${module.moduleId} ${module.owner}`}
                  onSelect={() => {
                    onSelect(module)
                    setOpen(false)
                  }}
                  className="items-start px-3 py-3 data-[selected=true]:bg-neutral-800 data-[selected=true]:text-white"
                >
                  <Check
                    className={cn(
                      "mt-0.5 h-4 w-4 shrink-0",
                      selectedModule?.moduleId === module.moduleId ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-white">{module.title}</span>
                      <Badge className="border border-neutral-700 bg-neutral-900 text-neutral-300">
                        {module.moduleId}
                      </Badge>
                      <Badge className="bg-neutral-800 text-neutral-200">{module.moduleType}</Badge>
                    </div>
                    <p className="text-xs text-neutral-400">{module.owner}</p>
                    {module.teams.length > 0 ? (
                      <p className="truncate text-xs text-neutral-500">{module.teams.join(", ")}</p>
                    ) : null}
                  </div>
                </CommandItem>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selectedModule ? (
        <div className="rounded-md border border-neutral-800 bg-neutral-950/50 p-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-white">{selectedModule.title}</span>
            <Badge className="border border-neutral-700 bg-neutral-900 text-neutral-300">
              {selectedModule.moduleId}
            </Badge>
            <Badge className="bg-neutral-800 text-neutral-200">{selectedModule.moduleType}</Badge>
          </div>
          <p className="mt-2 text-xs text-neutral-400">{selectedModule.objective}</p>
          <p className="mt-2 text-xs text-neutral-500">
            Owner: {selectedModule.owner}
            {selectedModule.teams.length > 0 ? ` | Teams: ${selectedModule.teams.join(", ")}` : ""}
          </p>
        </div>
      ) : null}
    </div>
  )
}
