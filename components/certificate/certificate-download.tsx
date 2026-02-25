"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { CertificatePreview } from "./certificate-preview"
import { CertificateData } from "@/lib/certificate-types"
import { Award, Loader2 } from "lucide-react"

interface CertificateDownloadProps {
  moduleId: string
  moduleTitle: string
  isCompleted: boolean
  quizPassed?: boolean
}

export function CertificateDownload({ 
  moduleId, 
  moduleTitle, 
  isCompleted, 
  quizPassed = true 
}: CertificateDownloadProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [certificateData, setCertificateData] = useState<CertificateData | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canGenerate = isCompleted && quizPassed

  const handleGenerate = async () => {
    if (!canGenerate) return

    setIsGenerating(true)
    setError(null)

    try {
      const response = await fetch('/api/certificates/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ moduleId, moduleTitle })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to generate certificate')
      }

      const data: CertificateData = await response.json()
      setCertificateData(data)
      setShowPreview(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate certificate')
    } finally {
      setIsGenerating(false)
    }
  }

  if (!canGenerate) {
    return (
      <div className="text-sm text-neutral-500">
        {!isCompleted && "Complete the module to earn a certificate"}
        {isCompleted && !quizPassed && "Pass the quiz to earn a certificate"}
      </div>
    )
  }

  return (
    <>
      <Button
        onClick={handleGenerate}
        disabled={isGenerating}
        className="gap-2 bg-amber-600 hover:bg-amber-700 text-white"
      >
        {isGenerating ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <Award className="w-4 h-4" />
            Get Certificate
          </>
        )}
      </Button>

      {error && (
        <p className="text-sm text-red-400 mt-2">{error}</p>
      )}

      <CertificatePreview
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        data={certificateData}
      />
    </>
  )
}
