export function canEditComment(commentOwnerId: string, currentUserId: string): boolean {
  return commentOwnerId === currentUserId
}

export function canDeleteComment(
  commentOwnerId: string,
  currentUserId: string,
  currentUserRole: string | null | undefined,
): boolean {
  if (commentOwnerId === currentUserId) return true
  return currentUserRole === "admin"
}
