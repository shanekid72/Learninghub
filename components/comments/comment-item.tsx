"use client"

import { useState } from "react"
import { Comment } from "@/lib/comment-types"
import { CommentForm } from "./comment-form"
import { CommentActions } from "./comment-actions"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { formatDistanceToNow } from "date-fns"
import { MessageSquare, X, Check, Loader2 } from "lucide-react"

interface CommentItemProps {
  comment: Comment
  currentUserId: string | null
  moduleId: string
  onCommentAdded: (comment: Comment) => void
  onCommentUpdated: (comment: Comment) => void
  onCommentDeleted: (commentId: string) => void
  replies?: Comment[]
  isReply?: boolean
}

export function CommentItem({
  comment,
  currentUserId,
  moduleId,
  onCommentAdded,
  onCommentUpdated,
  onCommentDeleted,
  replies = [],
  isReply = false
}: CommentItemProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [isReplying, setIsReplying] = useState(false)
  const [editContent, setEditContent] = useState(comment.content)
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isOwner = currentUserId === comment.userId

  const getInitials = (name: string | null | undefined, email: string) => {
    if (name) {
      return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
    }
    return email?.[0]?.toUpperCase() || "?"
  }

  const handleUpdate = async () => {
    if (!editContent.trim() || editContent === comment.content) {
      setIsEditing(false)
      return
    }

    setIsUpdating(true)
    setError(null)
    
    try {
      const response = await fetch(`/api/comments/${comment.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editContent })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to update comment')
      }

      const updated = await response.json()
      onCommentUpdated(updated)
      setIsEditing(false)
    } catch (err) {
      console.error('Failed to update comment:', err)
      setError(err instanceof Error ? err.message : 'Failed to update comment')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDelete = async () => {
    setError(null)
    
    try {
      const response = await fetch(`/api/comments/${comment.id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to delete comment')
      }

      onCommentDeleted(comment.id)
    } catch (err) {
      console.error('Failed to delete comment:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete comment')
    }
  }

  const handleReplyAdded = (newReply: Comment) => {
    onCommentAdded(newReply)
    setIsReplying(false)
  }

  return (
    <div className={`${isReply ? 'ml-12 mt-3' : ''}`}>
      <div className="flex gap-3">
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarImage src={comment.user?.avatarUrl || undefined} />
          <AvatarFallback className="bg-neutral-700 text-white text-xs">
            {getInitials(comment.user?.fullName, comment.user?.email || "")}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-white text-sm">
              {comment.user?.fullName || comment.user?.email || "User"}
            </span>
            <span className="text-xs text-neutral-500">
              {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
            </span>
            {comment.createdAt !== comment.updatedAt && (
              <span className="text-xs text-neutral-500">(edited)</span>
            )}
          </div>

          {error && (
            <p className="text-red-400 text-xs mb-1">{error}</p>
          )}

          {isEditing ? (
            <div className="space-y-2">
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="min-h-[60px] bg-neutral-800 border-neutral-700 text-white resize-none"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleUpdate}
                  disabled={isUpdating}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  {isUpdating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setIsEditing(false)
                    setEditContent(comment.content)
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ) : (
            <>
              <p className="text-neutral-300 text-sm whitespace-pre-wrap break-words">
                {comment.content}
              </p>

              <div className="flex items-center gap-2 mt-2">
                {!isReply && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsReplying(!isReplying)}
                    className="h-7 text-xs text-neutral-400 hover:text-white"
                  >
                    <MessageSquare className="w-3 h-3 mr-1" />
                    Reply
                  </Button>
                )}

                {isOwner && (
                  <CommentActions
                    onEdit={() => setIsEditing(true)}
                    onDelete={handleDelete}
                  />
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {isReplying && (
        <div className="ml-11 mt-3">
          <CommentForm
            moduleId={moduleId}
            parentId={comment.id}
            onCommentAdded={handleReplyAdded}
            onCancel={() => setIsReplying(false)}
            placeholder="Write a reply..."
            compact
          />
        </div>
      )}

      {replies.length > 0 && (
        <div className="space-y-3">
          {replies.map(reply => (
            <CommentItem
              key={reply.id}
              comment={reply}
              currentUserId={currentUserId}
              moduleId={moduleId}
              onCommentAdded={onCommentAdded}
              onCommentUpdated={onCommentUpdated}
              onCommentDeleted={onCommentDeleted}
              isReply
            />
          ))}
        </div>
      )}
    </div>
  )
}
