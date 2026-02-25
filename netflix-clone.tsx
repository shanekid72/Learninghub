"use client"

import * as React from "react"
import {
  Bell,
  ChevronDown,
  Search,
  Bookmark,
  BookmarkCheck,
  Play,
  Clock,
  BookOpen,
  FileText,
  Presentation,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { BrandLogo } from "@/components/brand-logo"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ModuleDetailModal } from "./components/module-detail-modal"
import {
  mockModules,
  currentUser,
  teams,
  type Module,
} from "@/lib/learning-data"
import { useLearningHubModules, type LHModule } from "@/hooks/useLearningHubModules"
import { useLearningHubCompletions } from "@/hooks/useLearningHubCompletions"
import { useAuthEmail } from "@/hooks/useAuthEmail"

/** Map an API module to the internal Module shape */
function mapToModule(lh: LHModule): Module {
  const badgesArr = lh.badges
    ? (lh.badges.split(",").map((b) => b.trim().toUpperCase()).filter(Boolean) as Module["badges"])
    : undefined
  const teamsArr = lh.teams
    ? lh.teams.split(",").map((t) => t.trim()).filter(Boolean)
    : []

  return {
    id: lh.id,
    title: lh.title,
    objective: lh.objective || "",
    durationMins: lh.duration_mins || 0,
    type: ((lh.type || "VIDEO").toUpperCase() as Module["type"]),
    badges: badgesArr?.length ? badgesArr : undefined,
    teams: teamsArr,
    progress: 0,
    contentEmbedUrl: lh.content_embed_url || "",
    openUrl: lh.open_url || undefined,
    thumbnailUrl: lh.thumbnail_url || undefined,
    lastUpdated: new Date().toISOString().slice(0, 10),
    owner: "",
  }
}

type Page = "home" | "my-learning" | "role-paths" | "updates" | "library" | "saved"

export default function LearningHub() {
  const [isScrolled, setIsScrolled] = React.useState(false)
  const { modules: apiModules, loading } = useLearningHubModules()
  const { email: authEmail } = useAuthEmail()
  const { completions, refresh: refreshCompletions } = useLearningHubCompletions(authEmail)

  const [modules, setModules] = React.useState<Module[]>(mockModules)
  const [activePage, setActivePage] = React.useState<Page>("home")
  const [searchQuery, setSearchQuery] = React.useState("")
  const [searchOpen, setSearchOpen] = React.useState(false)
  const [selectedTeam, setSelectedTeam] = React.useState(currentUser.team)

  const [modalOpen, setModalOpen] = React.useState(false)
  const [selectedModule, setSelectedModule] = React.useState<Module | null>(null)

  // Sync API modules into state (fall back to mock data if API returns nothing)
  React.useEffect(() => {
    if (!loading && apiModules.length > 0) {
      const completedSet = new Set(completions.map((c) => String(c.module_id)))

      setModules((prev) => {
        const prevMap = new Map(prev.map((m) => [String(m.id), m]))
        const mapped = apiModules.map(mapToModule)

        return mapped.map((m) => {
          const old = prevMap.get(String(m.id))
          const isCompleted = completedSet.has(String(m.id))

          return {
            ...m,
            saved: old?.saved ?? false,
            assigned: isCompleted ? false : true,
            progress: isCompleted ? 100 : (old?.progress ?? 0),
          }
        })
      })
    }
  }, [apiModules, loading, completions])

  React.useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 0)
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const toggleSaved = (id: number | string) => {
    setModules((prev) =>
      prev.map((m) => (m.id === id ? { ...m, saved: !m.saved } : m))
    )
  }

  const markComplete = async (id: number | string) => {
    // optimistic UI
    setModules((prev) =>
      prev.map((m) => (m.id === id ? { ...m, progress: 100, assigned: false } : m))
    )
    if (selectedModule?.id === id) {
      setSelectedModule((prev) => (prev ? { ...prev, progress: 100, assigned: false } : prev))
    }

    try {
      if (!authEmail) return
      await fetch("/api/lh/mark-complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: authEmail,
          module_id: id,
          source: "portal",
        }),
      })

      // pull fresh completions so My Learning stays correct after reload
      await refreshCompletions()
    } catch (e) {
      console.error(e)
    }
  }

  const openModule = (mod: Module) => {
    setSelectedModule(mod)
    setModalOpen(true)
  }

  const signOut = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" })
    } catch (e) {
      console.error(e)
    } finally {
      window.location.href = "/"
    }
  }

  // Filtered sets
  const continueLearning = modules.filter(
    (m) => m.progress > 0 && m.progress < 100
  )
  const assigned = modules.filter((m) => m.progress === 0)
  const newHireEssentials = modules.filter(
    (m) =>
      m.title.toLowerCase().includes("onboarding") ||
      m.title.toLowerCase().includes("day 1") ||
      m.title.toLowerCase().includes("week 1") ||
      m.title.toLowerCase().includes("month 1")
  )
  const teamPath = modules.filter(
    (m) => m.teams.includes(selectedTeam) && m.progress < 100
  )
  const newAndUpdated = modules.filter(
    (m) => m.badges?.includes("NEW") || m.badges?.includes("UPDATED")
  )
  const mandatory = modules.filter((m) => m.badges?.includes("MANDATORY"))
  const saved = modules.filter((m) => m.saved)
  const completed = modules.filter((m) => m.progress === 100)

  const spotlight = modules.find((m) => m.badges?.includes("NEW") && m.type === "VIDEO") || modules[0]

  // Search
  const searchResults = searchQuery.trim()
    ? modules.filter(
      (m) =>
        m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.objective.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.teams.some((t) =>
          t.toLowerCase().includes(searchQuery.toLowerCase())
        ) ||
        m.owner.toLowerCase().includes(searchQuery.toLowerCase())
    )
    : []

  const navItems: { label: string; page: Page }[] = [
    { label: "Home", page: "home" },
    { label: "My Learning", page: "my-learning" },
    { label: "Role Paths", page: "role-paths" },
    { label: "Updates", page: "updates" },
    { label: "Library", page: "library" },
    { label: "Saved", page: "saved" },
  ]

  const renderRail = (title: string, items: Module[]) => {
    if (items.length === 0) return null
    return <Rail key={title} title={title} items={items} onOpen={openModule} onToggleSaved={toggleSaved} />
  }

  const renderPageContent = () => {
    switch (activePage) {
      case "my-learning":
        return (
          <div className="pt-28 pb-20 px-4 md:px-16">
            <h1 className="text-3xl font-bold text-white mb-8">My Learning</h1>
            {renderRail("Continue Learning", continueLearning)}
            {renderRail("Assigned to You", assigned)}
            {renderRail("Completed", completed)}
            {continueLearning.length === 0 && assigned.length === 0 && completed.length === 0 && (
              <p className="text-neutral-500 text-center py-16">
                You are all caught up. No modules in progress or assigned.
              </p>
            )}
          </div>
        )
      case "role-paths":
        return (
          <div className="pt-28 pb-20 px-4 md:px-16">
            <div className="flex items-center justify-between mb-8">
              <h1 className="text-3xl font-bold text-white">Role Paths</h1>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="bg-transparent border-neutral-700 text-white hover:bg-neutral-800 gap-2"
                  >
                    {selectedTeam}
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-neutral-900 border-neutral-800 text-white">
                  {teams.map((team) => (
                    <DropdownMenuItem
                      key={team}
                      onClick={() => setSelectedTeam(team)}
                      className="hover:bg-neutral-800 cursor-pointer"
                    >
                      {team}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            {renderRail(`${selectedTeam} Path`, teamPath)}
            {teamPath.length === 0 && (
              <p className="text-neutral-500 text-center py-16">
                No modules found for {selectedTeam}.
              </p>
            )}
          </div>
        )
      case "updates":
        return (
          <div className="pt-28 pb-20 px-4 md:px-16">
            <h1 className="text-3xl font-bold text-white mb-8">
              New & Updated
            </h1>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {newAndUpdated.map((mod) => (
                <ModuleCard
                  key={mod.id}
                  module={mod}
                  onOpen={openModule}
                  onToggleSaved={toggleSaved}
                />
              ))}
            </div>
            {newAndUpdated.length === 0 && (
              <p className="text-neutral-500 text-center py-16">
                No new or updated modules.
              </p>
            )}
          </div>
        )
      case "library":
        return (
          <div className="pt-28 pb-20 px-4 md:px-16">
            <h1 className="text-3xl font-bold text-white mb-8">Library</h1>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {(searchQuery.trim() ? searchResults : modules).map((mod) => (
                <ModuleCard
                  key={mod.id}
                  module={mod}
                  onOpen={openModule}
                  onToggleSaved={toggleSaved}
                />
              ))}
            </div>
            {searchQuery.trim() && searchResults.length === 0 && (
              <p className="text-neutral-500 text-center py-16">
                No modules match your search.
              </p>
            )}
          </div>
        )
      case "saved":
        return (
          <div className="pt-28 pb-20 px-4 md:px-16">
            <h1 className="text-3xl font-bold text-white mb-8">Saved</h1>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {saved.map((mod) => (
                <ModuleCard
                  key={mod.id}
                  module={mod}
                  onOpen={openModule}
                  onToggleSaved={toggleSaved}
                />
              ))}
            </div>
            {saved.length === 0 && (
              <p className="text-neutral-500 text-center py-16">
                No saved modules yet. Click the bookmark icon on any module to
                save it.
              </p>
            )}
          </div>
        )
      default:
        if (loading) {
          return (
            <div className="flex items-center justify-center h-screen">
              <Loader2 className="w-8 h-8 animate-spin text-red-500" />
            </div>
          )
        }
        return (
          <>
            {/* Hero */}
            <section className="relative h-[85vh] flex items-end pb-24">
              <div className="absolute inset-0 bg-gradient-to-br from-neutral-900 via-neutral-950 to-neutral-900">
                <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/40 to-transparent" />
              </div>
              <div className="relative z-10 px-4 md:px-16 max-w-2xl">
                <span className="inline-block text-xs font-semibold uppercase tracking-widest text-red-500 mb-3">
                  Spotlight Module
                </span>
                <h1 className="text-4xl md:text-5xl font-bold mb-4 text-white text-balance">
                  {spotlight.title}
                </h1>
                <p className="text-base md:text-lg mb-6 text-neutral-300 leading-relaxed line-clamp-3">
                  {spotlight.objective}
                </p>
                <div className="flex items-center gap-3 flex-wrap">
                  <Button
                    size="lg"
                    className="bg-white text-neutral-950 hover:bg-neutral-200 px-8 gap-2 font-semibold"
                    onClick={() => openModule(spotlight)}
                  >
                    <Play className="w-5 h-5" />
                    {spotlight.progress > 0 ? "Resume" : "Start"}
                  </Button>
                  <Button
                    size="lg"
                    variant="secondary"
                    className="bg-neutral-800/80 hover:bg-neutral-700 text-white px-6 gap-2"
                    onClick={() => {
                      setSelectedTeam(spotlight.teams[0] || currentUser.team)
                      setActivePage("role-paths")
                    }}
                  >
                    View Path
                  </Button>
                  <Button
                    size="lg"
                    variant="ghost"
                    className="hover:bg-neutral-800 text-white px-4"
                    onClick={() => toggleSaved(spotlight.id)}
                  >
                    {spotlight.saved ? (
                      <BookmarkCheck className="w-5 h-5 text-red-400" />
                    ) : (
                      <Bookmark className="w-5 h-5" />
                    )}
                  </Button>
                </div>
              </div>
            </section>

            {/* Rails */}
            <main className="relative z-10 -mt-16 pb-20">
              {renderRail("Continue Learning", continueLearning)}
              {renderRail("Assigned to You", assigned)}
              {renderRail("New Hire Essentials", newHireEssentials)}
              {renderRail(`Your Team Path - ${selectedTeam}`, teamPath)}
              {renderRail("New & Updated", newAndUpdated)}
              {renderRail("Mandatory", mandatory)}
              {renderRail("Saved", saved)}
            </main>
          </>
        )
    }
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      {/* Header */}
      <header
        className={`fixed top-0 z-50 w-full transition-all duration-300 ${isScrolled
          ? "bg-neutral-950/95 backdrop-blur-md border-b border-neutral-800/50"
          : "bg-gradient-to-b from-neutral-950/80 to-transparent"
          }`}
      >
        <div className="flex items-center justify-between px-4 py-3 md:px-16">
          <div className="flex items-center gap-8">
            <button
              type="button"
              onClick={() => { setActivePage("home"); setSearchQuery("") }}
              className="hover:opacity-90 transition-opacity"
            >
              <BrandLogo className="h-8 md:h-9 w-auto" />
            </button>
            <nav className="hidden lg:flex items-center gap-1">
              {navItems.map((item) => (
                <button
                  type="button"
                  key={item.page}
                  onClick={() => { setActivePage(item.page); setSearchQuery("") }}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${activePage === item.page
                    ? "text-white bg-neutral-800"
                    : "text-neutral-400 hover:text-white hover:bg-neutral-800/50"
                    }`}
                >
                  {item.label}
                </button>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center">
              {searchOpen ? (
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                    <Input
                      placeholder="Search modules, teams, topics..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value)
                        if (e.target.value.trim()) setActivePage("library")
                      }}
                      className="bg-neutral-900 border-neutral-700 text-white placeholder-neutral-500 w-72 pl-9"
                      autoFocus
                      onBlur={() => {
                        if (!searchQuery.trim()) setSearchOpen(false)
                      }}
                    />
                  </div>
                </div>
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSearchOpen(true)}
                  className="text-neutral-400 hover:text-white hover:bg-neutral-800"
                >
                  <Search className="w-5 h-5" />
                </Button>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="text-neutral-400 hover:text-white hover:bg-neutral-800"
            >
              <Bell className="w-5 h-5" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div className="flex items-center gap-2 cursor-pointer">
                  <Avatar className="w-8 h-8 bg-red-600">
                    <AvatarFallback className="bg-red-600 text-white text-sm font-medium">
                      {currentUser.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  <ChevronDown className="w-4 h-4 text-neutral-400" />
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-neutral-900 border-neutral-800 text-white">
                <DropdownMenuItem className="text-neutral-400 text-xs focus:bg-transparent cursor-default">
                  {authEmail || currentUser.email}
                </DropdownMenuItem>
                <DropdownMenuItem className="hover:bg-neutral-800 cursor-pointer">
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem className="hover:bg-neutral-800 cursor-pointer">
                  Settings
                </DropdownMenuItem>
                <DropdownMenuItem className="hover:bg-neutral-800 cursor-pointer">
                  Help Center
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={signOut}
                  className="hover:bg-neutral-800 cursor-pointer"
                >
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Mobile nav */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="lg:hidden text-neutral-400 hover:text-white hover:bg-neutral-800"
                >
                  Menu
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-neutral-900 border-neutral-800 text-white">
                {navItems.map((item) => (
                  <DropdownMenuItem
                    key={item.page}
                    onClick={() => setActivePage(item.page)}
                    className="hover:bg-neutral-800 cursor-pointer"
                  >
                    {item.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {renderPageContent()}

      <ModuleDetailModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        module={selectedModule}
        onMarkComplete={markComplete}
      />
    </div>
  )
}

// ---- Rail Component ----

function Rail({
  title,
  items,
  onOpen,
  onToggleSaved,
}: {
  title: string
  items: Module[]
  onOpen: (m: Module) => void
  onToggleSaved: (id: number | string) => void
}) {
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = React.useState(false)
  const [canScrollRight, setCanScrollRight] = React.useState(false)

  const checkScroll = React.useCallback(() => {
    if (!scrollRef.current) return
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current
    setCanScrollLeft(scrollLeft > 0)
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 2)
  }, [])

  React.useEffect(() => {
    checkScroll()
    const el = scrollRef.current
    el?.addEventListener("scroll", checkScroll)
    window.addEventListener("resize", checkScroll)
    return () => {
      el?.removeEventListener("scroll", checkScroll)
      window.removeEventListener("resize", checkScroll)
    }
  }, [checkScroll, items])

  const scroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return
    const amount = scrollRef.current.clientWidth * 0.75
    scrollRef.current.scrollBy({
      left: direction === "left" ? -amount : amount,
      behavior: "smooth",
    })
  }

  return (
    <section className="mb-8 px-4 md:px-16">
      <h2 className="text-lg md:text-xl font-semibold mb-4 text-white">
        {title}
      </h2>
      <div className="relative group">
        {canScrollLeft && (
          <button
            type="button"
            onClick={() => scroll("left")}
            className="absolute left-0 top-0 bottom-0 z-10 w-10 bg-gradient-to-r from-neutral-950 to-transparent flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-6 h-6 text-white" />
          </button>
        )}
        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto scrollbar-hide pb-2"
        >
          {items.map((mod) => (
            <ModuleCard
              key={mod.id}
              module={mod}
              onOpen={onOpen}
              onToggleSaved={onToggleSaved}
            />
          ))}
        </div>
        {canScrollRight && (
          <button
            type="button"
            onClick={() => scroll("right")}
            className="absolute right-0 top-0 bottom-0 z-10 w-10 bg-gradient-to-l from-neutral-950 to-transparent flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label="Scroll right"
          >
            <ChevronRight className="w-6 h-6 text-white" />
          </button>
        )}
      </div>
    </section>
  )
}

// ---- Module Card ----

function ModuleCard({
  module: mod,
  onOpen,
  onToggleSaved,
}: {
  module: Module
  onOpen: (m: Module) => void
  onToggleSaved: (id: number | string) => void
}) {
  const [isHovered, setIsHovered] = React.useState(false)

  const typeIcon =
    mod.type === "VIDEO" ? (
      <BookOpen className="w-3.5 h-3.5" />
    ) : mod.type === "DOC" ? (
      <FileText className="w-3.5 h-3.5" />
    ) : (
      <Presentation className="w-3.5 h-3.5" />
    )

  return (
    <div
      className="relative flex-shrink-0 w-52 md:w-60 cursor-pointer group/card"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onOpen(mod)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter") onOpen(mod) }}
    >
      <div className="relative rounded-lg overflow-hidden bg-neutral-900 border border-neutral-800 transition-all duration-200 group-hover/card:border-neutral-600 group-hover/card:shadow-xl group-hover/card:shadow-neutral-950/40">
        {/* Card top */}
        <div className="relative aspect-video bg-gradient-to-br from-neutral-800 to-neutral-900 flex items-center justify-center overflow-hidden">
          {mod.thumbnailUrl ? (
            <img
              src={mod.thumbnailUrl}
              alt={mod.title}
              className="absolute inset-0 w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="text-neutral-600">
              {mod.type === "VIDEO" ? (
                <BookOpen className="w-10 h-10" />
              ) : mod.type === "DOC" ? (
                <FileText className="w-10 h-10" />
              ) : (
                <Presentation className="w-10 h-10" />
              )}
            </div>
          )}

          {/* Badges */}
          <div className="absolute top-2 left-2 flex gap-1">
            {mod.badges?.map((badge) => (
              <span
                key={badge}
                className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${badge === "MANDATORY"
                  ? "bg-red-600 text-white"
                  : badge === "NEW"
                    ? "bg-emerald-600 text-white"
                    : "bg-amber-600 text-white"
                  }`}
              >
                {badge}
              </span>
            ))}
            {mod.progress === 100 && (
              <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-emerald-600 text-white">
                COMPLETED
              </span>
            )}
          </div>

          {/* Hover overlay */}
          {isHovered && (
            <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-2 p-3">
              <Button
                size="sm"
                className="bg-white text-neutral-950 hover:bg-neutral-200 gap-1.5 font-medium"
                onClick={(e) => {
                  e.stopPropagation()
                  onOpen(mod)
                }}
              >
                <Play className="w-4 h-4" />
                {mod.progress > 0 && mod.progress < 100 ? "Resume" : "Start"}
              </Button>
              {mod.dueDate && (
                <span className="text-xs text-amber-400">
                  Due {mod.dueDate}
                </span>
              )}
              <p className="text-xs text-neutral-300 text-center line-clamp-2 leading-relaxed">
                {mod.objective}
              </p>
            </div>
          )}

          {/* Progress bar */}
          {mod.progress > 0 && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-neutral-700">
              <div
                className={`h-full ${mod.progress === 100 ? "bg-emerald-500" : "bg-red-600"}`}
                style={{ width: `${mod.progress}%` }}
              />
            </div>
          )}
        </div>

        {/* Card body */}
        <div className="p-3">
          <h3 className="font-medium text-sm text-white leading-snug line-clamp-2 mb-2">
            {mod.title}
          </h3>
          <div className="flex items-center justify-between text-xs text-neutral-400">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {mod.durationMins} min
              </span>
              <span className="flex items-center gap-1">
                {typeIcon}
                {mod.type.charAt(0) + mod.type.slice(1).toLowerCase()}
              </span>
            </div>
            <button
              type="button"
              className="hover:text-red-400 transition-colors"
              onClick={(e) => {
                e.stopPropagation()
                onToggleSaved(mod.id)
              }}
              aria-label={mod.saved ? "Unsave module" : "Save module"}
            >
              {mod.saved ? (
                <BookmarkCheck className="w-4 h-4 text-red-400" />
              ) : (
                <Bookmark className="w-4 h-4" />
              )}
            </button>
          </div>
          {mod.progress > 0 && mod.progress < 100 && (
            <span className="text-[10px] text-red-400 font-medium mt-1 inline-block">
              {mod.progress}% complete
            </span>
          )}
          {mod.progress === 100 && (
            <span className="text-[10px] text-emerald-400 font-medium mt-1 inline-block">
              Completed
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
