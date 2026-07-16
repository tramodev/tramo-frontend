"use client"

import { useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Camera } from "lucide-react"
import { updateMyProfile } from "@/lib/profile"
import { AvatarCropModal } from "@/components/avatar-crop-modal"

function initial(username: string) {
  return username.charAt(0).toUpperCase()
}

export function AvatarUpload({ username, imageUrl }: { username: string; imageUrl: string | null }) {
  const [preview, setPreview] = useState(imageUrl)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return
    setError(false)
    setPendingFile(file)
  }

  function handleCropConfirm(dataUrl: string) {
    setPendingFile(null)
    startTransition(async () => {
      try {
        await updateMyProfile({ imageUrl: dataUrl })
        setPreview(dataUrl)
        router.refresh()
      } catch {
        setError(true)
      }
    })
  }

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={isPending}
        className="group relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-primary text-[34px] font-medium font-display text-primary-foreground"
        title="Change avatar"
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="" className="h-full w-full object-cover" />
        ) : (
          initial(username)
        )}
        <span
          className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100 bg-[rgba(0,0,0,0.5)]"
        >
          <Camera className="h-5 w-5 text-white" />
        </span>
      </button>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
      {error && (
        <span
          className="absolute left-0 top-full mt-1 whitespace-nowrap text-[11px] font-medium text-destructive"
        >
          Upload failed, try again
        </span>
      )}
      {pendingFile && (
        <AvatarCropModal file={pendingFile} onCancel={() => setPendingFile(null)} onConfirm={handleCropConfirm} />
      )}
    </div>
  )
}
