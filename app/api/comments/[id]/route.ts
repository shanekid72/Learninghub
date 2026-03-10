import { NextResponse } from "next/server"
import { getSessionContext } from "@/lib/app-session"
import { createAdminClient } from "@/lib/supabase/server"
import { z } from "zod"
import { Comment } from "@/lib/comment-types"
import { sanitizeCommentContent } from "@/lib/sanitize"
import { canDeleteComment, canEditComment } from "@/lib/comment-permissions"

const updateCommentSchema = z.object({
  content: z.string().min(1).max(2000),
})

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const session = await getSessionContext()
    if (!session?.profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const validation = updateCommentSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid comment data', details: validation.error.issues },
        { status: 400 }
      )
    }

    const sanitizedContent = sanitizeCommentContent(validation.data.content)
    if (!sanitizedContent) {
      return NextResponse.json(
        { error: "Comment content is empty after sanitization" },
        { status: 400 }
      )
    }

    const supabase = await createAdminClient()

    const { data: existingComment } = await supabase
      .from('comments')
      .select('user_id')
      .eq('id', id)
      .single()

    if (!existingComment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 })
    }

    if (!canEditComment(existingComment.user_id, session.profile.id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data: comment, error } = await supabase
      .from('comments')
      .update({ content: sanitizedContent, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select(`
        *,
        profiles (
          id,
          email,
          full_name,
          avatar_url
        )
      `)
      .single()

    if (error) {
      throw error
    }

    const formattedComment: Comment = {
      id: comment.id,
      userId: comment.user_id,
      moduleId: comment.module_id,
      content: comment.content,
      parentId: comment.parent_id,
      createdAt: comment.created_at,
      updatedAt: comment.updated_at,
      user: comment.profiles ? {
        id: comment.profiles.id,
        email: comment.profiles.email,
        fullName: comment.profiles.full_name,
        avatarUrl: comment.profiles.avatar_url,
      } : undefined,
    }

    return NextResponse.json(formattedComment)
  } catch (error) {
    console.error('Error updating comment:', error)
    return NextResponse.json(
      { error: 'Failed to update comment' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getSessionContext()
    if (!session?.profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const supabase = await createAdminClient()

    const { data: existingComment } = await supabase
      .from('comments')
      .select('user_id')
      .eq('id', id)
      .single()

    if (!existingComment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 })
    }

    if (!canDeleteComment(existingComment.user_id, session.profile.id, session.profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', id)

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting comment:', error)
    return NextResponse.json(
      { error: 'Failed to delete comment' },
      { status: 500 }
    )
  }
}
