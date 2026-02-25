"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Comment } from "@/lib/comment-types"
import { CommentForm } from "./comment-form"
import { CommentItem } from "./comment-item"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MessageSquare, Loader2 } from "lucide-react"

interface CommentSectionProps {
  moduleId: string
}

export function CommentSection({ moduleId }: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  const fetchComments = useCallback(async () => {
    try {
      const response = await fetch(`/api/comments?moduleId=${moduleId}`)
      if (response.ok) {
        const data = await response.json()
        setComments(data)
      }
    } catch (error) {
      console.error('Failed to fetch comments:', error)
    } finally {
      setLoading(false)
    }
  }, [moduleId])

  useEffect(() => {
    fetchComments()

    const supabase = createClient()
    
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUserId(user?.id || null)
    })

    const channel = supabase
      .channel(`comments:${moduleId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comments',
          filter: `module_id=eq.${moduleId}`
        },
        () => {
          fetchComments()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [moduleId, fetchComments])

  const handleCommentAdded = (newComment: Comment) => {
    if (newComment.parentId) {
      setComments(prev => prev.map(comment => {
        if (comment.id === newComment.parentId) {
          return {
            ...comment,
            replies: [...(comment.replies || []), newComment]
          }
        }
        return comment
      }))
    } else {
      setComments(prev => [newComment, ...prev])
    }
  }

  const handleCommentUpdated = (updatedComment: Comment) => {
    setComments(prev => prev.map(comment => {
      if (comment.id === updatedComment.id) {
        return updatedComment
      }
      if (comment.replies) {
        return {
          ...comment,
          replies: comment.replies.map(reply => 
            reply.id === updatedComment.id ? updatedComment : reply
          )
        }
      }
      return comment
    }))
  }

  const handleCommentDeleted = (commentId: string) => {
    setComments(prev => {
      const filtered = prev.filter(c => c.id !== commentId)
      return filtered.map(comment => ({
        ...comment,
        replies: comment.replies?.filter(r => r.id !== commentId)
      }))
    })
  }

  const topLevelComments = comments.filter(c => !c.parentId)

  return (
    <Card className="bg-transparent border-0 shadow-none">
      <CardHeader className="px-0">
        <CardTitle className="text-white flex items-center gap-2 text-lg">
          <MessageSquare className="w-5 h-5" />
          Discussion ({comments.length})
        </CardTitle>
      </CardHeader>
      
      <CardContent className="px-0 space-y-6">
        <CommentForm 
          moduleId={moduleId} 
          onCommentAdded={handleCommentAdded}
        />

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 text-neutral-500 animate-spin" />
          </div>
        ) : topLevelComments.length === 0 ? (
          <div className="text-center py-8">
            <MessageSquare className="w-12 h-12 text-neutral-600 mx-auto mb-3" />
            <p className="text-neutral-400">No comments yet</p>
            <p className="text-sm text-neutral-500">Be the first to start the discussion!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {topLevelComments.map(comment => (
              <CommentItem
                key={comment.id}
                comment={comment}
                currentUserId={currentUserId}
                moduleId={moduleId}
                onCommentAdded={handleCommentAdded}
                onCommentUpdated={handleCommentUpdated}
                onCommentDeleted={handleCommentDeleted}
                replies={comments.filter(c => c.parentId === comment.id)}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
