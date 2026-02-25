import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { z } from "zod"
import { Comment } from "@/lib/comment-types"

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
    
    const validation = updateCommentSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid comment data', details: validation.error.issues },
        { status: 400 }
      )
    }

    const { content } = validation.data
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: existingComment } = await supabase
      .from('comments')
      .select('user_id')
      .eq('id', id)
      .single()

    if (!existingComment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 })
    }

    if (existingComment.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data: comment, error } = await supabase
      .from('comments')
      .update({ content, updated_at: new Date().toISOString() })
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
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: existingComment } = await supabase
      .from('comments')
      .select('user_id')
      .eq('id', id)
      .single()

    if (!existingComment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const isOwner = existingComment.user_id === user.id
    const isAdmin = profile?.role === 'admin'

    if (!isOwner && !isAdmin) {
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
