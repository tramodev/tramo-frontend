"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Flag, MessageCircle, Reply, Trash2 } from "lucide-react"

import { AuthorAvatar } from "@/components/author-avatar"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ConfirmDialog } from "@/components/confirm-dialog"
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

export function CommentsSection({
  projectId,
  isLoggedIn,
  commentCount,
}: {
  projectId: string
  isLoggedIn: boolean
  commentCount: number
}) {
  const [comments, setComments] = useState<Comment[] | null>(null)
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
    getComments(projectId).then(setComments)
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
      refresh()
    })
  }

  function handleDelete() {
    if (!deleteTarget) return
    const id = deleteTarget
    setDeleteTarget(null)
    startTransition(async () => {
      await deleteComment(id)
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
    <div id="comments" className="mx-auto flex w-full max-w-[820px] flex-col gap-4 px-6 py-8">
      <h2 className="flex items-center gap-2 text-lg font-medium">
        <MessageCircle className="h-5 w-5" />
        Comments {commentCount > 0 && <span className="text-muted-foreground">({commentCount})</span>}
      </h2>

      {comments === null ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : topLevel.length === 0 ? (
        <p className="text-sm text-muted-foreground">No comments yet. Be the first to say something.</p>
      ) : null}

      <div className="flex flex-col gap-2">
        <Textarea
          placeholder="Add a comment..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={2}
          className="resize-none"
        />
        <Button
          onClick={handlePost}
          disabled={!content.trim() || isPending}
          className="self-end disabled:opacity-100 disabled:bg-primary/40"
        >
          {isPending ? "Posting..." : "Post"}
        </Button>
      </div>

      <div className="flex flex-col gap-4">
        {comments !== null && topLevel.length > 0 && (
          topLevel.map((comment) => (
            <div key={comment.id} className="flex flex-col gap-3">
              <CommentItem
                comment={comment}
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
                    rows={2}
                    autoFocus
                    className="resize-none"
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
                        rows={2}
                        autoFocus
                        className="resize-none"
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
  onReply,
  onDelete,
  onReport,
}: {
  comment: Comment
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
            <Link href={`/u/${encodeURIComponent(comment.authorUsername)}`} className="font-medium hover:underline">
              {comment.authorUsername}
            </Link>
          )}
          <span className="text-xs text-muted-foreground">{timeAgo(comment.createdDate)}</span>
        </div>
        <p className="text-sm">{comment.content}</p>
        <div className="mt-1 flex items-center gap-3">
          <button type="button" onClick={onReply} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <Reply className="h-3 w-3" />
            Reply
          </button>
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
