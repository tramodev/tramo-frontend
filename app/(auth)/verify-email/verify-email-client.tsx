'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { CheckCircle2, Loader2, XCircle } from 'lucide-react'
import { verifyEmailHandler, type VerifyEmailResult } from './actions'

export function VerifyEmailClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const [result, setResult] = useState<VerifyEmailResult | null>(null)

  useEffect(() => {
    if (!token) return
    let cancelled = false
    verifyEmailHandler(token).then((r) => {
      if (!cancelled) setResult(r)
    })
    return () => {
      cancelled = true
    }
  }, [token])

  useEffect(() => {
    if (!result?.success) return
    const timeout = setTimeout(() => router.push('/'), 1200)
    return () => clearTimeout(timeout)
  }, [result, router])

  const status: 'verifying' | 'success' | 'error' = !token
    ? 'error'
    : result === null
      ? 'verifying'
      : result.success
        ? 'success'
        : 'error'

  const error = !token
    ? 'Missing verification token.'
    : result && !result.success
      ? result.error
      : ''

  return (
    <div className="flex w-full max-w-[400px] flex-col items-start gap-4">
      {status === 'verifying' && (
        <>
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-[15px] text-muted-foreground">
            Verifying your email...
          </p>
        </>
      )}
      {status === 'success' && (
        <>
          <CheckCircle2 className="h-8 w-8 text-success" />
          <p className="text-[15px] text-muted-foreground">
            Email verified. Redirecting...
          </p>
        </>
      )}
      {status === 'error' && (
        <>
          <XCircle className="h-8 w-8 text-destructive" />
          <p className="text-[15px] text-muted-foreground">
            {error}
          </p>
          <a href="/login" className="text-sm font-medium text-primary">
            Back to log in
          </a>
        </>
      )}
    </div>
  )
}
