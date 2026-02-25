"use client"

import { ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"

interface EmbedFrameProps {
  src: string
  title: string
  type?: "VIDEO" | "DOC" | "SLIDES"
  openUrl?: string
}

export function EmbedFrame({ src, title, type = "VIDEO", openUrl }: EmbedFrameProps) {
  const isVideo = type === "VIDEO"

  return (
    <div className="flex flex-col gap-2">
      <div
        className={`relative w-full overflow-hidden rounded-lg border border-neutral-800 bg-neutral-950 ${isVideo ? "aspect-video" : "min-h-[500px]"
          }`}
      >
        <iframe
          src={src}
          title={title}
          className="absolute inset-0 h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        />
      </div>
      <a href={openUrl || src} target="_blank" rel="noopener noreferrer" className="self-start">
        <Button
          variant="ghost"
          size="sm"
          className="text-neutral-400 hover:text-white hover:bg-neutral-800 gap-2"
        >
          <ExternalLink className="w-4 h-4" />
          Open in new tab
        </Button>
      </a>
    </div>
  )
}
