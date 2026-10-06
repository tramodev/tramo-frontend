// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Flag, MessageCircle, Reply, Trash2 } from "lucide-react"

import { AuthorAvatar } from "@/components/shared/author-avatar"
import { ProfileHoverCard } from "@/components/social/profile-hover-card"
import { NameBadge } from "@/components/profile/badges-panel"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { getComments, postComment, deleteComment, type Comment } from "@/lib/comments"
import { reportComment } from "@/lib/moderation"

function timeAgo(iso: string) {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (seconds < 60) return "just now"
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

const PAGE_SIZE = 20

export function CommentsSection({
  projectId,
  projectTitle,
  isLoggedIn,
  username,
  commentCount,
  onCommentCountChange,
  canComment,
}: {
  projectId: string
  projectTitle: string
  isLoggedIn: boolean
  username: string | null
  commentCount: number
  onCommentCountChange: (updater: (current: number) => number) => void
  canComment: boolean
}) {
  const commentingAllowed = !isLoggedIn || canComment
  const [comments, setComments] = useState<Comment[] | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [loadedPages, setLoadedPages] = useState(0)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [content, setContent] = useState("")
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [replyContent, setReplyContent] = useState("")
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [reportTarget, setReportTarget] = useState<string | null>(null)
  const [reportReason, setReportReason] = useState("")
  const [reportSubmitted, setReportSubmitted] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function refresh() {
    getComments(projectId, 0, PAGE_SIZE).then((page) => {
      setComments(page.items)
      setHasMore(page.hasMore)
      setLoadedPages(1)
    })
  }

  function loadMore() {
    setIsLoadingMore(true)
    getComments(projectId, loadedPages, PAGE_SIZE).then((page) => {
      setComments((current) => [...(current ?? []), ...page.items])
      setHasMore(page.hasMore)
      setLoadedPages((n) => n + 1)
      setIsLoadingMore(false)
    })
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  function requireLogin(): boolean {
    if (!isLoggedIn) {
      router.push("/login")
      return true
    }
    return false
  }

  function handlePost() {
    if (!content.trim() || isPending) return
    if (requireLogin()) return
    startTransition(async () => {
      await postComment(projectId, content.trim())
      setContent("")
      onCommentCountChange((current) => current + 1)
      refresh()
    })
  }

  function handleReply(parentId: string) {
    if (!replyContent.trim() || isPending) return
    if (requireLogin()) return
    startTransition(async () => {
      await postComment(projectId, replyContent.trim(), parentId)
      setReplyContent("")
      setReplyTo(null)
      onCommentCountChange((current) => current + 1)
      refresh()
    })
  }

  function handleDelete() {
    if (!deleteTarget) return
    const id = deleteTarget
    setDeleteTarget(null)
    startTransition(async () => {
      await deleteComment(id)
      onCommentCountChange((current) => Math.max(0, current - 1))
      refresh()
    })
  }

  async function handleReport() {
    if (!reportTarget || !reportReason.trim()) return
    await reportComment(reportTarget, reportReason.trim())
    setReportSubmitted(true)
  }

  function closeReportDialog(next: boolean) {
    if (!next) {
      setReportTarget(null)
      setTimeout(() => {
        setReportReason("")
        setReportSubmitted(false)
      }, 200)
    }
  }

  const topLevel = comments?.filter((c) => !c.parentId) ?? []
  const repliesFor = (id: string) => comments?.filter((c) => c.parentId === id) ?? []

  return (
    <div id="comments" className="mx-auto flex w-full max-w-[1024px] flex-col gap-4 px-6 py-8">
      <div className="flex flex-col gap-1">
        <h2 className="flex items-center gap-2 text-lg font-medium">
          <MessageCircle className="h-5 w-5" />
          Comments {commentCount > 0 && <span className="text-muted-foreground">({commentCount})</span>}
        </h2>
        <p className="text-sm text-muted-foreground">On the project «{projectTitle}»</p>
      </div>

      {comments === null ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : topLevel.length === 0 ? (
        <p className="text-sm text-muted-foreground">No comments yet. Be the first to say something.</p>
      ) : null}

      {commentingAllowed ? (
        <div className="flex flex-col gap-2">
          <Textarea
            placeholder="Add a comment..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={1}
            aria-label="Add a comment"
            disabled={isPending}
            className="min-h-0 resize-none rounded-none border-0 border-b px-0 shadow-none focus-visible:border-primary focus-visible:ring-0"
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setContent("")} disabled={!content || isPending}>
              Cancel
            </Button>
            <Button
              onClick={handlePost}
              disabled={!content.trim() || isPending}
              className="disabled:opacity-100 disabled:bg-primary/40"
            >
              {isPending ? "Commenting..." : "Comment"}
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Comments are limited on this project.</p>
      )}

      <div className="flex flex-col gap-4">
        {comments !== null && topLevel.length > 0 && (
          topLevel.map((comment) => (
            <div key={comment.id} className="flex flex-col gap-3">
              <CommentItem
                comment={comment}
                isLoggedIn={isLoggedIn}
                viewerUsername={username}
                canReply={commentingAllowed}
                onReply={() => (requireLogin() ? undefined : setReplyTo(replyTo === comment.id ? null : comment.id))}
                onDelete={() => setDeleteTarget(comment.id)}
                onReport={() => (requireLogin() ? undefined : setReportTarget(comment.id))}
              />
              {replyTo === comment.id && (
                <div className="ml-8 flex flex-col gap-2">
                  <Textarea
                    placeholder="Write a reply..."
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    rows={1}
                    autoFocus
                    className="min-h-0 resize-none rounded-none border-0 border-b px-0 shadow-none focus-visible:border-primary focus-visible:ring-0"
                  />
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => setReplyTo(null)}>
                      Cancel
                    </Button>
                    <Button size="sm" disabled={!replyContent.trim() || isPending} onClick={() => handleReply(comment.id)}>
                      Reply
                    </Button>
                  </div>
                </div>
              )}
              {repliesFor(comment.id).map((reply) => (
                <div key={reply.id} className="ml-8">
                  <CommentItem
                    comment={reply}
                    isLoggedIn={isLoggedIn}
                    viewerUsername={username}
                    canReply={commentingAllowed}
                    onReply={() => (requireLogin() ? undefined : setReplyTo(replyTo === reply.id ? null : reply.id))}
                    onDelete={() => setDeleteTarget(reply.id)}
                    onReport={() => (requireLogin() ? undefined : setReportTarget(reply.id))}
                  />
                  {replyTo === reply.id && (
                    <div className="ml-8 mt-2 flex flex-col gap-2">
                      <Textarea
                        placeholder="Write a reply..."
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        rows={1}
                        autoFocus
                        className="min-h-0 resize-none rounded-none border-0 border-b px-0 shadow-none focus-visible:border-primary focus-visible:ring-0"
                      />
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => setReplyTo(null)}>
                          Cancel
                        </Button>
                        <Button size="sm" disabled={!replyContent.trim() || isPending} onClick={() => handleReply(reply.id)}>
                          Reply
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))
        )}
        {hasMore && (
          <Button variant="outline" onClick={loadMore} disabled={isLoadingMore} className="self-center">
            {isLoadingMore ? "Loading..." : "Load more comments"}
          </Button>
        )}
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(next) => !next && setDeleteTarget(null)}
        title="Delete this comment?"
        description="This can't be undone. If it has replies, it will be removed but the thread stays intact."
        confirmLabel="Delete"
        onConfirm={handleDelete}
      />

      <Dialog open={!!reportTarget} onOpenChange={closeReportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report this comment</DialogTitle>
            <DialogDescription>Let us know what&apos;s wrong. Our team will review it.</DialogDescription>
          </DialogHeader>
          {reportSubmitted ? (
            <p className="text-sm text-muted-foreground">Thanks — your report has been submitted.</p>
          ) : (
            <>
              <Textarea
                placeholder="Describe the issue..."
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                rows={4}
                className="resize-none"
              />
              <Button onClick={handleReport} disabled={!reportReason.trim()} className="w-full">
                Submit report
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function CommentItem({
  comment,
  isLoggedIn,
  viewerUsername,
  canReply,
  onReply,
  onDelete,
  onReport,
}: {
  comment: Comment
  isLoggedIn: boolean
  viewerUsername: string | null
  canReply: boolean
  onReply: () => void
  onDelete: () => void
  onReport: () => void
}) {
  if (comment.deleted) {
    return (
      <div className="flex items-start gap-2 text-sm text-muted-foreground italic">
        <div className="h-[22px] w-[22px] shrink-0 rounded-full bg-muted" />
        Comment deleted
      </div>
    )
  }

  return (
    <div className="group flex items-start gap-2">
      <AuthorAvatar username={comment.authorUsername ?? "?"} avatar={comment.authorAvatar} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 text-sm">
          {comment.authorUsername && (
            <ProfileHoverCard username={comment.authorUsername} avatar={comment.authorAvatar} isLoggedIn={isLoggedIn} viewerUsername={viewerUsername}>
              <span className="inline-flex items-center gap-1">
                <Link href={`/u/${encodeURIComponent(comment.authorUsername)}`} className="font-medium hover:underline">
                  {comment.authorUsername}
                </Link>
                <NameBadge code={comment.authorBadge} />
              </span>
            </ProfileHoverCard>
          )}
          <span className="text-xs text-muted-foreground">{timeAgo(comment.createdDate)}</span>
        </div>
        <p className="text-sm">{comment.content}</p>
        <div className="mt-1 flex items-center gap-3">
          {canReply && (
            <button type="button" onClick={onReply} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
              <Reply className="h-3 w-3" />
              Reply
            </button>
          )}
          {comment.canDelete && (
            <button type="button" onClick={onDelete} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive">
              <Trash2 className="h-3 w-3" />
              Delete
            </button>
          )}
          {!comment.canDelete && (
            <button type="button" onClick={onReport} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
              <Flag className="h-3 w-3" />
              Report
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
