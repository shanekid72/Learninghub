"use client"

import { useState } from "react"
import { Comment } from "@/lib/comment-types"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Send, Loader2, X } from "lucide-react"

interface CommentFormProps {
  moduleId: string
  parentId?: string
  onCommentAdded: (comment: Comment) => void
  onCancel?: () => void
  placeholder?: string
  compact?: boolean
}

export function CommentForm({
  moduleId,
  parentId,
  onCommentAdded,
  onCancel,
  placeholder = "Add a comment...",
  compact = false
}: CommentFormProps) {
  const [content, setContent] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!content.trim()) return

    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          moduleId,
          content: content.trim(),
          parentId
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to post comment')
      }

      const newComment = await response.json()
      onCommentAdded(newComment)
      setContent("")
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to post comment')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={placeholder}
        className={`bg-neutral-800 border-neutral-700 text-white placeholder:text-neutral-500 resize-none ${
          compact ? 'min-h-[60px]' : 'min-h-[80px]'
        }`}
        disabled={isSubmitting}
      />

      {error && (
        <p className="text-sm text-red-400">{error}</p>
      )}

      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button
            type="button"
            variant="ghost"
            size={compact ? "sm" : "default"}
            onClick={onCancel}
            disabled={isSubmitting}
          >
            <X className="w-4 h-4 mr-1" />
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          size={compact ? "sm" : "default"}
          disabled={!content.trim() || isSubmitting}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Posting...
            </>
          ) : (
            <>
              <Send className="w-4 h-4 mr-2" />
              {parentId ? "Reply" : "Comment"}
            </>
          )}
        </Button>
      </div>
    </form>
  )
}
