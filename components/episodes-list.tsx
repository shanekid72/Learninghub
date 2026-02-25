"use client"

import * as React from "react"
import Image from "next/image"
import { Play, ChevronDown, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

export interface Episode {
  id: number
  title: string
  description: string
  duration: string
  thumbnail: string
  videoUrl?: string
  watched?: boolean
  progress?: number // 0-100 percentage
}

export interface Season {
  id: number
  title: string
  episodes: Episode[]
}

interface EpisodesListProps {
  seasons: Season[]
  currentSeason: number
  onSeasonChange: (seasonId: number) => void
  onEpisodePlay: (episode: Episode, seasonId: number) => void
  showTitle: string
  currentEpisode?: Episode | null
}

export function EpisodesList({
  seasons,
  currentSeason,
  onSeasonChange,
  onEpisodePlay,
  showTitle,
  currentEpisode,
}: EpisodesListProps) {
  const currentSeasonData = seasons.find((s) => s.id === currentSeason) || seasons[0]

  return (
    <div className="bg-gray-900 text-white p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Episodes</h2>

        {/* Season Selector */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="bg-gray-800 border-gray-600 text-white hover:bg-gray-700">
              {currentSeasonData.title}
              <ChevronDown className="w-4 h-4 ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-gray-800 border-gray-600">
            {seasons.map((season) => (
              <DropdownMenuItem
                key={season.id}
                onClick={() => onSeasonChange(season.id)}
                className="text-white hover:bg-gray-700 cursor-pointer"
              >
                {season.title}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Episodes Grid */}
      <div className="space-y-4">
        {currentSeasonData.episodes.map((episode, index) => (
          <EpisodeCard
            key={episode.id}
            episode={episode}
            episodeNumber={index + 1}
            onPlay={() => onEpisodePlay(episode, currentSeason)}
            showTitle={showTitle}
            isCurrentEpisode={currentEpisode?.id === episode.id}
          />
        ))}
      </div>
    </div>
  )
}

interface EpisodeCardProps {
  episode: Episode
  episodeNumber: number
  onPlay: () => void
  showTitle: string
  isCurrentEpisode?: boolean
}

function EpisodeCard({ episode, episodeNumber, onPlay, showTitle, isCurrentEpisode }: EpisodeCardProps) {
  const [isHovered, setIsHovered] = React.useState(false)

  return (
    <div
      className={`flex rounded-lg overflow-hidden hover:bg-gray-750 transition-colors cursor-pointer ${
        isCurrentEpisode ? "bg-gray-700 border border-red-600" : "bg-gray-800"
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onPlay}
    >
      {/* Episode Number */}
      <div
        className={`flex items-center justify-center w-12 text-gray-300 font-bold ${
          isCurrentEpisode ? "bg-red-600 text-white" : "bg-gray-700"
        }`}
      >
        {episode.watched ? <Check className="w-5 h-5 text-green-500" /> : episodeNumber}
      </div>

      {/* Rest of the component remains the same */}
      <div className="relative w-40 h-24 flex-shrink-0">
        <Image src={episode.thumbnail || "/placeholder.svg"} alt={episode.title} fill className="object-cover" />

        {/* Progress Bar */}
        {episode.progress !== undefined && episode.progress > 0 && episode.progress < 100 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-600">
            <div className="h-full bg-red-600" style={{ width: `${episode.progress}%` }} />
          </div>
        )}

        {/* Play Button Overlay */}
        {isHovered && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <Button size="sm" className="rounded-full w-12 h-12 p-0">
              <Play className="w-5 h-5" />
            </Button>
          </div>
        )}
      </div>

      {/* Episode Info */}
      <div className="flex-1 p-4">
        <div className="flex items-start justify-between mb-2">
          <h3 className={`font-semibold text-lg ${isCurrentEpisode ? "text-red-400" : ""}`}>
            {episode.title}
            {isCurrentEpisode && <span className="ml-2 text-xs bg-red-600 px-2 py-1 rounded">NOW PLAYING</span>}
          </h3>
          <span className="text-gray-400 text-sm">{episode.duration}</span>
        </div>
        <p className="text-gray-300 text-sm line-clamp-2 leading-relaxed">{episode.description}</p>
      </div>
    </div>
  )
}

// Sample data for TV shows
// Using a placeholder video URL for all episodes for demonstration.
// In a real app, each episode would have its own unique videoUrl.
const EPISODE_VIDEO_URL = "https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"

export const sampleTVShowData = {
  "Stranger Things": [
    {
      id: 1,
      title: "Season 1",
      episodes: [
        {
          id: 1,
          title: "Chapter One: The Vanishing of Will Byers",
          description:
            "On his way home from a friend's house, young Will sees something terrifying. Nearby, a sinister secret lurks in the depths of a government lab.",
          duration: "47m",
          thumbnail: "/placeholder.svg?height=135&width=240",
          videoUrl: EPISODE_VIDEO_URL,
          watched: false, // Set to false initially, progress will be loaded
          progress: 0,
        },
        {
          id: 2,
          title: "Chapter Two: The Weirdo on Maple Street",
          description:
            "Lucas, Mike and Dustin try to talk to the girl they found in the woods. Hopper questions an anxious Joyce about an unsettling phone call.",
          duration: "55m",
          thumbnail: "/placeholder.svg?height=135&width=240",
          videoUrl: EPISODE_VIDEO_URL,
          watched: false,
          progress: 0,
        },
        {
          id: 3,
          title: "Chapter Three: Holly, Jolly",
          description:
            "An increasingly concerned Nancy looks for Barb and finds out what Jonathan's been up to. Joyce is convinced Will is trying to talk to her.",
          duration: "51m",
          thumbnail: "/placeholder.svg?height=135&width=240",
          videoUrl: EPISODE_VIDEO_URL,
          watched: false,
          progress: 0,
        },
        {
          id: 4,
          title: "Chapter Four: The Body",
          description:
            "Refusing to believe Will is dead, Joyce tries to connect with her son. The boys give Eleven a makeover. Nancy and Jonathan form an unlikely alliance.",
          duration: "50m",
          thumbnail: "/placeholder.svg?height=135&width=240",
          videoUrl: EPISODE_VIDEO_URL,
          watched: false,
          progress: 0,
        },
      ],
    },
    {
      id: 2,
      title: "Season 2",
      episodes: [
        {
          id: 5,
          title: "Chapter One: MADMAX",
          description:
            "As the town preps for Halloween, a high-scoring rival shakes things up at the arcade, and a skeptical Hopper inspects a field of rotting pumpkins.",
          duration: "48m",
          thumbnail: "/placeholder.svg?height=135&width=240",
          videoUrl: EPISODE_VIDEO_URL,
          watched: false,
          progress: 0,
        },
        {
          id: 6,
          title: "Chapter Two: Trick or Treat, Freak",
          description:
            "After Will sees something terrible on trick-or-treat night, Mike wonders whether Eleven's still out there. Nancy wrestles with the truth about Barb.",
          duration: "56m",
          thumbnail: "/placeholder.svg?height=135&width=240",
          videoUrl: EPISODE_VIDEO_URL,
          watched: false,
          progress: 0,
        },
        {
          id: 7,
          title: "Chapter Three: The Pollywog",
          description:
            "Dustin adopts a strange new pet, and Eleven grows increasingly impatient. A well-meaning Bob urges Will to stand up to his fears.",
          duration: "51m",
          thumbnail: "/placeholder.svg?height=135&width=240",
          videoUrl: EPISODE_VIDEO_URL,
          watched: false,
          progress: 0,
        },
      ],
    },
    {
      id: 3,
      title: "Season 3",
      episodes: [
        {
          id: 8,
          title: "Chapter One: Suzie, Do You Copy?",
          description:
            "Summer brings new jobs and budding romance. But the mood shifts when Dustin's radio picks up a Russian broadcast, and Will senses something is wrong.",
          duration: "50m",
          thumbnail: "/placeholder.svg?height=135&width=240",
          videoUrl: EPISODE_VIDEO_URL,
          watched: false,
          progress: 0,
        },
        {
          id: 9,
          title: "Chapter Two: The Mall Rats",
          description:
            "Nancy and Jonathan follow a lead, Steve and Robin sign on to a secret mission, and Max and Eleven go shopping. A rattled Billy has troubling visions.",
          duration: "49m",
          thumbnail: "/placeholder.svg?height=135&width=240",
          videoUrl: EPISODE_VIDEO_URL,
          watched: false,
          progress: 0,
        },
      ],
    },
  ],
  "The Crown": [
    {
      id: 1,
      title: "Season 1",
      episodes: [
        {
          id: 1,
          title: "Wolferton Splash",
          description:
            "A young Princess Elizabeth marries Prince Philip. As King George VI's health worsens, Winston Churchill becomes concerned about the line of succession.",
          duration: "57m",
          thumbnail: "/placeholder.svg?height=135&width=240",
          videoUrl: EPISODE_VIDEO_URL,
          watched: false,
          progress: 0,
        },
      ],
    },
  ],
}
