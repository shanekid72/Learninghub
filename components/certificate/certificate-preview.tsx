"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { CertificateTemplate } from "./certificate-template"
import { CertificateData } from "@/lib/certificate-types"
import { Download, X, Loader2, AlertCircle } from "lucide-react"

interface CertificatePreviewProps {
  isOpen: boolean
  onClose: () => void
  data: CertificateData | null
}

export function CertificatePreview({ isOpen, onClose, data }: CertificatePreviewProps) {
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState<string | null>(null)

  const handleDownload = async () => {
    if (!data) return

    setIsDownloading(true)
    setDownloadError(null)
    
    try {
      const response = await fetch(`/api/certificates/${data.certificateId}/download`)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to download certificate')
      }
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `certificate-${data.certificateId.slice(0, 8)}.svg`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Failed to download certificate:', error)
      setDownloadError(error instanceof Error ? error.message : 'Download failed')
    } finally {
      setIsDownloading(false)
    }
  }

  if (!data) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl bg-neutral-900 border-neutral-800">
        <DialogHeader>
          <DialogTitle className="text-white">Your Certificate</DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col items-center gap-6">
          <div className="scale-75 origin-top">
            <CertificateTemplate data={data} />
          </div>
          
          {downloadError && (
            <div className="flex items-center gap-2 text-red-400 text-sm">
              <AlertCircle className="w-4 h-4" />
              {downloadError}
            </div>
          )}
          
          <div className="flex gap-4">
            <Button
              onClick={handleDownload}
              disabled={isDownloading}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {isDownloading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Downloading...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Download Certificate
                </>
              )}
            </Button>
            <Button variant="outline" onClick={onClose}>
              <X className="w-4 h-4 mr-2" />
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
