"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Camera, CircleOff, ImagePlus, Pencil, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog"
import { CropModal } from "@/components/profile/crop-modal"
import { BadgeIcon } from "@/components/profile/badges-panel"
import { updateMyProfile, type Badge } from "@/lib/profile"
import { updatePrivacySettings } from "@/lib/privacy"
import { uploadImage } from "@/lib/upload-image"
import { getSubscriptionStatus } from "@/lib/subscription"

const BANNER_SUPPORTER_MESSAGE = "Profile banners are a supporter perk. Upgrade to use one."

function initial(username: string) {
  return username.charAt(0).toUpperCase()
}

export function EditProfileModal({
  username,
  initialImageUrl,
  initialBannerUrl,
  initialBio,
  initialBirthDate,
  initialLocation,
  initialWebsite,
  initialShowAge,
  badges,
  initialSelectedBadge,
}: {
  username: string
  initialImageUrl: string | null
  initialBannerUrl: string | null
  initialBio: string | null
  initialBirthDate: string | null
  initialLocation: string | null
  initialWebsite: string | null
  initialShowAge: boolean
  badges: Badge[]
  initialSelectedBadge: string | null
}) {
  const [open, setOpen] = useState(false)
  const [bio, setBio] = useState(initialBio ?? "")
  const [birthDate, setBirthDate] = useState(initialBirthDate ?? "")
  const [location, setLocation] = useState(initialLocation ?? "")
  const [website, setWebsite] = useState(initialWebsite ?? "")
  const [showAge, setShowAge] = useState(initialShowAge)
  const [selectedBadge, setSelectedBadge] = useState(initialSelectedBadge ?? "")
  const earnedBadges = badges.filter((badge) => badge.earned)

  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState(initialImageUrl)
  const [avatarBlob, setAvatarBlob] = useState<Blob | null>(null)
  const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  const [bannerPreviewUrl, setBannerPreviewUrl] = useState(initialBannerUrl)
  const [bannerBlob, setBannerBlob] = useState<Blob | null>(null)
  const [pendingBannerFile, setPendingBannerFile] = useState<File | null>(null)
  const bannerInputRef = useRef<HTMLInputElement>(null)

  const [isSupporter, setIsSupporter] = useState<boolean | null>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    getSubscriptionStatus().then((status) => setIsSupporter(status.supporter)).catch(() => {})
  }, [])

  function resetFields() {
    setBio(initialBio ?? "")
    setBirthDate(initialBirthDate ?? "")
    setLocation(initialLocation ?? "")
    setWebsite(initialWebsite ?? "")
    setShowAge(initialShowAge)
    setSelectedBadge(initialSelectedBadge ?? "")
    setAvatarBlob(null)
    setAvatarPreviewUrl((prev) => {
      if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev)
      return initialImageUrl
    })
    setBannerBlob(null)
    setBannerPreviewUrl((prev) => {
      if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev)
      return initialBannerUrl
    })
    setError(null)
  }

  function startEditing() {
    resetFields()
    setOpen(true)
  }

  function closeAndReset() {
    resetFields()
    setOpen(false)
  }

  function handleAvatarFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return
    setPendingAvatarFile(file)
  }

  function handleAvatarCropConfirm(blob: Blob) {
    setPendingAvatarFile(null)
    setAvatarBlob(blob)
    setAvatarPreviewUrl((prev) => {
      if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev)
      return URL.createObjectURL(blob)
    })
  }

  function handleBannerClick() {
    if (isSupporter === false) {
      setError(BANNER_SUPPORTER_MESSAGE)
      return
    }
    bannerInputRef.current?.click()
  }

  function handleBannerFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return
    if (file.type === "image/gif") {
      setError("Animated GIF banners are not supported.")
      return
    }
    setPendingBannerFile(file)
  }

  function handleBannerCropConfirm(blob: Blob) {
    setPendingBannerFile(null)
    setBannerBlob(blob)
    setBannerPreviewUrl((prev) => {
      if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev)
      return URL.createObjectURL(blob)
    })
  }

  function handleSave() {
    if (isPending || !birthDate) return
    setError(null)
    startTransition(async () => {
      try {
        const fields: Parameters<typeof updateMyProfile>[0] = {
          bio: bio.trim(),
          birthDate,
          location: location.trim(),
          website: website.trim(),
          selectedBadge: selectedBadge || null,
        }
        if (avatarBlob) fields.imageUrl = await uploadImage(avatarBlob, "avatar")
        if (bannerBlob) fields.bannerUrl = await uploadImage(bannerBlob, "banner")

        const tasks: Promise<unknown>[] = [updateMyProfile(fields)]
        if (showAge !== initialShowAge) {
          tasks.push(updatePrivacySettings({ showAge }))
        }
        await Promise.all(tasks)
        setOpen(false)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't save, try again")
      }
    })
  }

  return (
    <>
      <Button type="button" variant="outline" onClick={startEditing}>
        <Pencil className="h-3.5 w-3.5" />
        Edit profile
      </Button>

      <Dialog open={open} onOpenChange={(next) => !next && closeAndReset()}>
        <DialogContent
          className="max-h-[85vh] gap-0 overflow-y-auto p-0 sm:max-w-2xl"
          showCloseButton={false}
          onOpenAutoFocus={(event) => event.preventDefault()}
        >
          <div className="sticky top-0 z-10 flex items-center gap-3 border-b bg-background px-6 py-4">
            <DialogClose
              disabled={isPending}
              className="rounded-xs opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </DialogClose>
            <DialogTitle className="text-base">Edit profile</DialogTitle>
            <Button type="button" size="sm" className="ml-auto" onClick={handleSave} disabled={isPending || !birthDate}>
              {isPending ? "Saving..." : "Save"}
            </Button>
          </div>

          <div className="mb-2">
            <div className="relative">
              <button
                type="button"
                onClick={handleBannerClick}
                disabled={isPending}
                className="group relative flex aspect-[6/1] w-full items-center justify-center overflow-hidden bg-muted"
                title={bannerPreviewUrl ? "Change banner" : "Add banner"}
              >
                {bannerPreviewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={bannerPreviewUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <ImagePlus className="h-4 w-4" />
                    Add banner
                  </span>
                )}
                <span className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100 bg-[rgba(0,0,0,0.5)]">
                  <ImagePlus className="h-5 w-5 text-white" />
                </span>
              </button>
              <input
                ref={bannerInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={handleBannerFileChange}
              />

              <p className="px-6 pt-3 text-xs text-muted-foreground">Avatars and banners are public. Do not upload confidential information.</p>
              {error && (
                <p className="absolute inset-x-3 top-2 z-20 rounded-md bg-black/60 px-2 py-1 text-center text-[11px] font-medium text-white">
                  {error}
                </p>
              )}
            </div>

            <div className="flex px-6 pt-2">
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                disabled={isPending}
                className="group relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-primary text-[34px] font-medium font-display text-primary-foreground ring-1 ring-border"
                title="Change avatar"
              >
                {avatarPreviewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarPreviewUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  initial(username)
                )}
                <span className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100 bg-[rgba(0,0,0,0.5)]">
                  <Camera className="h-5 w-5 text-white" />
                </span>
              </button>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarFileChange}
              />
            </div>
          </div>

          <div className="flex flex-col gap-3 px-6 pb-6">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-profile-bio">Bio</Label>
              <Textarea
                id="edit-profile-bio"
                value={bio}
                onChange={(event) => setBio(event.target.value)}
                rows={4}
                maxLength={255}
                placeholder="Tell people a bit about yourself"
                className="field-sizing-fixed resize-none rounded-xs px-4 py-2 shadow-none focus-visible:border-primary focus-visible:ring-0 focus-visible:shadow-[inset_0_0_0_1px_var(--primary)]"
              />
              <span className="self-end text-[11px] text-muted-foreground">
                {bio.length}/255
              </span>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-profile-birthdate">Date of birth</Label>
              <Input
                id="edit-profile-birthdate"
                type="date"
                value={birthDate}
                onChange={(event) => setBirthDate(event.target.value)}
                required
                disabled={!!initialBirthDate}
              />
              {initialBirthDate && (
                <span className="text-[11px] text-muted-foreground">
                  Date of birth can&apos;t be changed once set.
                </span>
              )}
              <div className="flex items-center justify-between pt-1">
                <span className="text-[13px] text-muted-foreground">Show my age on my public profile</span>
                <Switch checked={showAge} onCheckedChange={setShowAge} />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-profile-location">Location</Label>
              <Input
                id="edit-profile-location"
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                placeholder="Optional"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-profile-website">Website</Label>
              <Input
                id="edit-profile-website"
                value={website}
                onChange={(event) => setWebsite(event.target.value)}
                placeholder="Optional"
              />
            </div>

            <fieldset disabled={isPending || earnedBadges.length === 0}>
              <legend className="mb-1.5 text-sm font-medium">Showcase badge</legend>
              <p className="mb-3 text-xs text-muted-foreground">Choose the badge shown beside your name.</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {[null, ...earnedBadges].map((badge) => (
                  <label key={badge?.code ?? "none"} className="relative cursor-pointer">
                    <input
                      type="radio"
                      name="edit-profile-badge"
                      value={badge?.code ?? ""}
                      aria-label={badge?.name ?? "None"}
                      checked={selectedBadge === (badge?.code ?? "")}
                      onChange={(event) => setSelectedBadge(event.target.value)}
                      className="peer sr-only"
                    />
                    <span className="flex h-full items-center gap-3 rounded-xl border border-border p-3 transition-colors hover:bg-muted peer-checked:border-primary peer-checked:bg-muted peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-disabled:cursor-not-allowed peer-disabled:opacity-50">
                      {badge ? <BadgeIcon badge={badge} size={24} /> : (
                        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-tertiary text-muted-foreground">
                          <CircleOff className="size-6" />
                        </span>
                      )}
                      <span className="min-w-0">
                        <span className="block text-sm font-medium">{badge?.name ?? "None"}</span>
                        <span className="mt-1 block text-xs text-muted-foreground">{badge?.description ?? "Show your name without a badge."}</span>
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            {error && (
              <span className="text-xs font-medium text-destructive">{error}</span>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {pendingAvatarFile && (
        <CropModal
          file={pendingAvatarFile}
          title="Crop avatar"
          description="Drag to reposition, use the slider to zoom."
          frameWidth={320}
          frameHeight={320}
          exportWidth={256}
          exportHeight={256}
          rounded="rounded-full"
          onCancel={() => setPendingAvatarFile(null)}
          onConfirm={handleAvatarCropConfirm}
        />
      )}
      {pendingBannerFile && (
        <CropModal
          file={pendingBannerFile}
          title="Crop banner"
          description="Drag to reposition, use the slider to zoom."
          frameWidth={480}
          frameHeight={80}
          exportWidth={1440}
          exportHeight={240}
          rounded="rounded-[28px]"
          onCancel={() => setPendingBannerFile(null)}
          onConfirm={handleBannerCropConfirm}
        />
      )}
    </>
  )
}
