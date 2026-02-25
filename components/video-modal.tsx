"use client"

import * as React from "react"
import { X, Play, Pause, Volume2, VolumeX, Maximize, SkipBack, SkipForward } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { EpisodesList, type Season, type Episode, sampleTVShowData } from "./episodes-list"
import { AutoPlayOverlay } from "./auto-play-overlay"

const DEFAULT_VIDEO_URL = "https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"

interface VideoModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  videoUrl?: string
  showType?: "movie" | "tv"
  seasons?: Season[]
  contentId: number // New: ID of the content (movie or TV show)
  episodeId?: number // New: ID of the current episode (if TV show)
  initialProgressSeconds?: number // New: Initial playback time in seconds
  onProgressUpdate: (contentId: number, progress: number, duration: number, episodeId?: number) => void // Callback to save progress
}

export function VideoModal({
  isOpen,
  onClose,
  title,
  videoUrl,
  showType,
  seasons,
  contentId,
  episodeId,
  initialProgressSeconds = 0,
  onProgressUpdate,
}: VideoModalProps) {
  const videoRef = React.useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = React.useState(false)
  const [currentTime, setCurrentTime] = React.useState(0)
  const [duration, setDuration] = React.useState(0)
  const [volume, setVolume] = React.useState(1)
  const [isMuted, setIsMuted] = React.useState(false)
  const [showControls, setShowControls] = React.useState(true)
  const [isFullscreen, setIsFullscreen] = React.useState(false)

  const [showEpisodes, setShowEpisodes] = React.useState(false)
  const [currentSeason, setCurrentSeason] = React.useState(1)
  const [currentEpisode, setCurrentEpisode] = React.useState<Episode | null>(null)

  const [autoPlayCountdown, setAutoPlayCountdown] = React.useState(0)
  const [showAutoPlay, setShowAutoPlay] = React.useState(false)
  const [nextEpisodeInfo, setNextEpisodeInfo] = React.useState<{
    episode: Episode
    seasonId: number
    seasonTitle: string
  } | null>(null)

  const controlsTimeoutRef = React.useRef<NodeJS.Timeout>()
  const autoPlayTimerRef = React.useRef<NodeJS.Timeout>()
  const countdownTimerRef = React.useRef<NodeJS.Timeout>()
  const progressSaveIntervalRef = React.useRef<NodeJS.Timeout>() // Ref for progress saving interval

  const seasonsData = seasons || sampleTVShowData[title as keyof typeof sampleTVShowData] || []

  const findNextEpisode = React.useCallback(() => {
    if (!currentEpisode || !seasonsData.length) return null

    const currentSeasonData = seasonsData.find((s) => s.id === currentSeason)
    if (!currentSeasonData) return null

    const currentEpisodeIndex = currentSeasonData.episodes.findIndex((ep) => ep.id === currentEpisode.id)

    // Check if there's a next episode in current season
    if (currentEpisodeIndex < currentSeasonData.episodes.length - 1) {
      return {
        episode: currentSeasonData.episodes[currentEpisodeIndex + 1],
        seasonId: currentSeason,
        seasonTitle: currentSeasonData.title,
      }
    }

    // Check if there's a next season
    const currentSeasonIndex = seasonsData.findIndex((s) => s.id === currentSeason)
    if (currentSeasonIndex < seasonsData.length - 1) {
      const nextSeason = seasonsData[currentSeasonIndex + 1]
      if (nextSeason.episodes.length > 0) {
        return {
          episode: nextSeason.episodes[0],
          seasonId: nextSeason.id,
          seasonTitle: nextSeason.title,
        }
      }
    }

    return null
  }, [currentEpisode, currentSeason, seasonsData])

  // Initialize currentEpisode and video source when modal opens
  React.useEffect(() => {
    if (!isOpen) {
      // Clear intervals when modal closes
      if (progressSaveIntervalRef.current) clearInterval(progressSaveIntervalRef.current)
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current)
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current)
      return
    }

    let videoSrcToLoad = DEFAULT_VIDEO_URL
    let episodeToSet: Episode | null = null
    let seasonToSet = 1
    const initialTime = initialProgressSeconds // Use the passed initial progress

    if (showType === "tv" && seasonsData.length > 0) {
      // If an episodeId is provided, try to find it
      if (episodeId !== undefined) {
        for (const season of seasonsData) {
          const foundEpisode = season.episodes.find((ep) => ep.id === episodeId)
          if (foundEpisode) {
            episodeToSet = foundEpisode
            seasonToSet = season.id
            break
          }
        }
      }
      // If no specific episode or episode not found, default to the first episode of the first season
      if (!episodeToSet) {
        const firstSeason = seasonsData[0]
        episodeToSet = firstSeason.episodes[0]
        seasonToSet = firstSeason.id
      }

      videoSrcToLoad = episodeToSet?.videoUrl || DEFAULT_VIDEO_URL
      setCurrentEpisode(episodeToSet)
      setCurrentSeason(seasonToSet)
    } else if (showType === "movie" && videoUrl) {
      videoSrcToLoad = videoUrl
    } else {
      videoSrcToLoad = videoUrl || DEFAULT_VIDEO_URL
    }

    if (videoRef.current) {
      videoRef.current.src = videoSrcToLoad
      videoRef.current.load()
      videoRef.current.onloadedmetadata = () => {
        if (videoRef.current) {
          videoRef.current.currentTime = initialTime
          videoRef.current.play()
          setIsPlaying(true)
        }
      }

      // Start saving progress every 5 seconds
      if (progressSaveIntervalRef.current) clearInterval(progressSaveIntervalRef.current)
      progressSaveIntervalRef.current = setInterval(() => {
        if (videoRef.current && !videoRef.current.paused && !videoRef.current.ended) {
          onProgressUpdate(
            contentId,
            videoRef.current.currentTime,
            videoRef.current.duration,
            showType === "tv" ? currentEpisode?.id : undefined,
          )
        }
      }, 5000) // Save every 5 seconds
    }
  }, [isOpen, showType, seasonsData, videoUrl, contentId, episodeId, initialProgressSeconds, onProgressUpdate])

  React.useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const updateTime = () => setCurrentTime(video.currentTime)
    const updateDuration = () => setDuration(video.duration)

    const handleVideoEnded = () => {
      setIsPlaying(false)
      // Mark as 100% watched when video ends
      onProgressUpdate(contentId, video.duration, video.duration, showType === "tv" ? currentEpisode?.id : undefined)

      // Only show auto-play for TV shows with episodes
      if (showType === "tv" && seasonsData.length > 0) {
        const nextEp = findNextEpisode()
        if (nextEp) {
          setNextEpisodeInfo(nextEp)
          setShowAutoPlay(true)
          setAutoPlayCountdown(10)

          // Start countdown
          let countdown = 10
          if (countdownTimerRef.current) clearInterval(countdownTimerRef.current) // Clear previous if any
          countdownTimerRef.current = setInterval(() => {
            countdown -= 1
            setAutoPlayCountdown(countdown)

            if (countdown <= 0) {
              playNextEpisode()
            }
          }, 1000)
        }
      }
    }

    video.addEventListener("timeupdate", updateTime)
    video.addEventListener("loadedmetadata", updateDuration)
    video.addEventListener("ended", handleVideoEnded)

    return () => {
      video.removeEventListener("timeupdate", updateTime)
      video.removeEventListener("loadedmetadata", updateDuration)
      video.removeEventListener("ended", handleVideoEnded)
    }
  }, [contentId, currentEpisode, showType, seasonsData, onProgressUpdate, findNextEpisode]) // Added findNextEpisode to dependencies

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause()
      } else {
        videoRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  const handleSeek = (value: number[]) => {
    if (videoRef.current) {
      videoRef.current.currentTime = value[0]
      setCurrentTime(value[0])
    }
  }

  const handleVolumeChange = (value: number[]) => {
    if (videoRef.current) {
      const newVolume = value[0]
      videoRef.current.volume = newVolume
      setVolume(newVolume)
      setIsMuted(newVolume === 0)
    }
  }

  const toggleMute = () => {
    if (videoRef.current) {
      if (isMuted) {
        videoRef.current.volume = volume
        setIsMuted(false)
      } else {
        videoRef.current.volume = 0
        setIsMuted(true)
      }
    }
  }

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  const skipTime = (seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime += seconds
    }
  }

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, "0")}`
  }

  const handleMouseMove = () => {
    setShowControls(true)
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current)
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false)
      }
    }, 3000)
  }

  const handleEpisodePlay = React.useCallback((episode: Episode, seasonId: number) => {
    setCurrentEpisode(episode)
    setCurrentSeason(seasonId)
    setShowEpisodes(false)
    if (videoRef.current) {
      videoRef.current.src = episode.videoUrl || DEFAULT_VIDEO_URL
      videoRef.current.load()
      videoRef.current.onloadedmetadata = () => {
        // Use episode's progress if available, otherwise start from 0
        if (videoRef.current) {
          const initialTimeInSeconds =
            episode.progress !== undefined && episode.progress > 0
              ? (episode.progress / 100) * videoRef.current.duration
              : 0
          videoRef.current.currentTime = initialTimeInSeconds
          videoRef.current.play()
          setIsPlaying(true)
        }
      }
    }
  }, [])

  const toggleEpisodesView = () => {
    setShowEpisodes(!showEpisodes)
  }

  const playNextEpisode = React.useCallback(() => {
    if (nextEpisodeInfo) {
      handleEpisodePlay(nextEpisodeInfo.episode, nextEpisodeInfo.seasonId)
      setShowAutoPlay(false)
      setNextEpisodeInfo(null)
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current)
      }
    }
  }, [nextEpisodeInfo, handleEpisodePlay])

  const cancelAutoPlay = React.useCallback(() => {
    setShowAutoPlay(false)
    setNextEpisodeInfo(null)
    setAutoPlayCountdown(0)
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current)
    }
  }, [])

  React.useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current)
      }
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current)
      }
      if (progressSaveIntervalRef.current) {
        clearInterval(progressSaveIntervalRef.current)
      }
    }
  }, [])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black" onMouseMove={handleMouseMove}>
      {/* Close Button */}
      <Button
        onClick={onClose}
        variant="ghost"
        size="icon"
        className="absolute top-4 right-4 z-10 text-white hover:bg-white/20"
      >
        <X className="w-6 h-6" />
      </Button>

      {/* Video */}
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        src={currentEpisode?.videoUrl || videoUrl || DEFAULT_VIDEO_URL}
        poster="/placeholder.svg?height=1080&width=1920"
        onClick={togglePlay}
      />

      {/* Video Controls */}
      <div
        className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6 transition-opacity duration-300 ${
          showControls ? "opacity-100" : "opacity-0"
        }`}
      >
        {/* Progress Bar */}
        <div className="mb-4">
          <Slider value={[currentTime]} max={duration || 100} step={1} onValueChange={handleSeek} className="w-full" />
          <div className="flex justify-between text-sm text-gray-300 mt-1">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex items-center space-x-4">
          <Button onClick={togglePlay} variant="ghost" size="icon" className="text-white hover:bg-white/20">
            {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
          </Button>

          <Button onClick={() => skipTime(-10)} variant="ghost" size="icon" className="text-white hover:bg-white/20">
            <SkipBack className="w-5 h-5" />
          </Button>

          <Button onClick={() => skipTime(10)} variant="ghost" size="icon" className="text-white hover:bg-white/20">
            <SkipForward className="w-5 h-5" />
          </Button>

          <div className="flex items-center space-x-2">
            <Button onClick={toggleMute} variant="ghost" size="icon" className="text-white hover:bg-white/20">
              {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </Button>
            <div className="w-20">
              <Slider value={[isMuted ? 0 : volume]} max={1} step={0.1} onValueChange={handleVolumeChange} />
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <h3 className="text-white font-semibold">{title}</h3>
          {showType === "tv" && seasonsData.length > 0 && (
            <Button
              onClick={toggleEpisodesView}
              variant="outline"
              size="sm"
              className="bg-gray-800 border-gray-600 text-white hover:bg-gray-700"
            >
              Episodes
            </Button>
          )}
          <Button onClick={toggleFullscreen} variant="ghost" size="icon" className="text-white hover:bg-white/20">
            <Maximize className="w-5 h-5" />
          </Button>
        </div>
      </div>
      {/* Episodes List Overlay */}
      {showEpisodes && showType === "tv" && seasonsData.length > 0 && (
        <div className="absolute inset-0 bg-black/95 overflow-y-auto">
          <div className="container mx-auto max-w-4xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-800">
              <h1 className="text-3xl font-bold">{title}</h1>
              <Button onClick={toggleEpisodesView} variant="ghost" size="icon" className="text-white hover:bg-white/20">
                <X className="w-6 h-6" />
              </Button>
            </div>
            <EpisodesList
              seasons={seasonsData}
              currentSeason={currentSeason}
              onSeasonChange={setCurrentSeason}
              onEpisodePlay={handleEpisodePlay}
              showTitle={title}
              currentEpisode={currentEpisode}
            />
          </div>
        </div>
      )}
      {/* Auto-Play Overlay */}
      <AutoPlayOverlay
        isVisible={showAutoPlay}
        nextEpisode={
          nextEpisodeInfo
            ? {
                title: nextEpisodeInfo.episode.title,
                thumbnail: nextEpisodeInfo.episode.thumbnail,
                seasonTitle: nextEpisodeInfo.seasonTitle,
              }
            : null
        }
        countdown={autoPlayCountdown}
        onPlayNext={playNextEpisode}
        onCancel={cancelAutoPlay}
      />
    </div>
  )
}
