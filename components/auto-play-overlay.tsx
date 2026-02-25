"use client"
import { X, Play } from "lucide-react"
import { Button } from "@/components/ui/button"
import Image from "next/image"

interface AutoPlayOverlayProps {
  isVisible: boolean
  nextEpisode: {
    title: string
    thumbnail: string
    seasonTitle: string
  } | null
  countdown: number
  onPlayNext: () => void
  onCancel: () => void
}

export function AutoPlayOverlay({ isVisible, nextEpisode, countdown, onPlayNext, onCancel }: AutoPlayOverlayProps) {
  if (!isVisible || !nextEpisode) return null

  return (
    <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-20">
      <div className="bg-gray-900 rounded-lg p-6 max-w-md w-full mx-4 border border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold">Next Episode</h3>
          <Button onClick={onCancel} variant="ghost" size="icon" className="text-white hover:bg-white/20">
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Next Episode Info */}
        <div className="flex space-x-4 mb-6">
          <div className="relative w-24 h-16 flex-shrink-0 rounded overflow-hidden">
            <Image
              src={nextEpisode.thumbnail || "/placeholder.svg"}
              alt={nextEpisode.title}
              fill
              className="object-cover"
            />
          </div>
          <div className="flex-1">
            <p className="text-gray-400 text-sm">{nextEpisode.seasonTitle}</p>
            <h4 className="text-white font-medium text-sm">{nextEpisode.title}</h4>
          </div>
        </div>

        {/* Countdown and Actions */}
        <div className="flex items-center justify-between">
          <div className="text-white">
            <span className="text-sm">Playing in </span>
            <span className="text-xl font-bold">{countdown}</span>
            <span className="text-sm"> seconds</span>
          </div>
          <div className="flex space-x-2">
            <Button
              onClick={onCancel}
              variant="outline"
              size="sm"
              className="bg-gray-800 border-gray-600 text-white hover:bg-gray-700"
            >
              Cancel
            </Button>
            <Button onClick={onPlayNext} size="sm" className="bg-white text-black hover:bg-gray-200">
              <Play className="w-4 h-4 mr-1" />
              Play Now
            </Button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-4 w-full bg-gray-700 rounded-full h-1">
          <div
            className="bg-red-600 h-1 rounded-full transition-all duration-1000 ease-linear"
            style={{ width: `${((10 - countdown) / 10) * 100}%` }}
          />
        </div>
      </div>
    </div>
  )
}
