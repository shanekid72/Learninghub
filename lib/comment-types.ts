export interface Comment {
  id: string
  userId: string
  moduleId: string
  content: string
  parentId: string | null
  createdAt: string
  updatedAt: string
  user?: {
    id: string
    email: string
    fullName: string | null
    avatarUrl: string | null
  }
  replies?: Comment[]
}

export interface CreateCommentRequest {
  moduleId: string
  content: string
  parentId?: string
}

export interface UpdateCommentRequest {
  content: string
}
