import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { z } from "zod"
import { Comment } from "@/lib/comment-types"
import { checkRateLimit, getRateLimitResponse, getClientIP } from "@/lib/rate-limit"
import { sanitizeCommentContent } from "@/lib/sanitize"

const createCommentSchema = z.object({
  moduleId: z.string(),
  content: z.string().min(1).max(2000),
  parentId: z.string().uuid().optional(),
})

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const moduleId = searchParams.get('moduleId')

    if (!moduleId) {
      return NextResponse.json({ error: 'moduleId is required' }, { status: 400 })
    }

    const supabase = await createClient()

    const { data: comments, error } = await supabase
      .from('comments')
      .select(`
        *,
        profiles (
          id,
          email,
          full_name,
          avatar_url
        )
      `)
      .eq('module_id', moduleId)
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    const formattedComments: Comment[] = (comments || []).map((c) => ({
      id: c.id,
      userId: c.user_id,
      moduleId: c.module_id,
      content: c.content,
      parentId: c.parent_id,
      createdAt: c.created_at,
      updatedAt: c.updated_at,
      user: c.profiles ? {
        id: c.profiles.id,
        email: c.profiles.email,
        fullName: c.profiles.full_name,
        avatarUrl: c.profiles.avatar_url,
      } : undefined,
    }))

    return NextResponse.json(formattedComments)
  } catch (error) {
    console.error('Error fetching comments:', error)
    return NextResponse.json(
      { error: 'Failed to fetch comments' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const clientIP = getClientIP(request)
    const rateLimitResult = checkRateLimit(clientIP, '/api/comments')
    
    if (!rateLimitResult.success) {
      return getRateLimitResponse(rateLimitResult.resetIn)
    }

    const body = await request.json()
    
    const validation = createCommentSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid comment data', details: validation.error.issues },
        { status: 400 }
      )
    }

    const { moduleId, parentId } = validation.data
    const sanitizedContent = sanitizeCommentContent(validation.data.content)
    
    if (!sanitizedContent) {
      return NextResponse.json(
        { error: 'Comment content is empty after sanitization' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: comment, error } = await supabase
      .from('comments')
      .insert({
        user_id: user.id,
        module_id: moduleId,
        content: sanitizedContent,
        parent_id: parentId || null,
      })
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

    return NextResponse.json(formattedComment, { status: 201 })
  } catch (error) {
    console.error('Error creating comment:', error)
    return NextResponse.json(
      { error: 'Failed to create comment' },
      { status: 500 }
    )
  }
}
