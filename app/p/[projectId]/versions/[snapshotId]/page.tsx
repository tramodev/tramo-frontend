// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { getPublicProjectSnapshot } from "@/lib/project-snapshots"
import { EditorImagesProvider } from "@/components/editor/editor-images-provider"
import { LexicalReadOnly } from "@/components/project/lexical-read-only"

export const metadata: Metadata = {
  title: "Older version",
  robots: { index: false, follow: false },
}

export default async function PublicVersionPage({
  params,
}: {
  params: Promise<{ projectId: string; snapshotId: string }>
}) {
  const { projectId, snapshotId } = await params
  const snapshot = await getPublicProjectSnapshot(projectId, snapshotId)

  if (!snapshot) {
    notFound()
  }

  return (
    <EditorImagesProvider projectId={projectId} publicRead={true} snapshotId={Number(snapshotId)}>
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-10">
      <div className="rounded-lg border border-border bg-muted/50 p-3 text-sm text-muted-foreground">
        You&apos;re viewing an old version (Version {snapshot.version} ·{" "}
        {new Date(snapshot.createdAt).toLocaleString()}).{" "}
        <Link href={`/p/${projectId}`} className="font-medium text-foreground underline">
          See the latest version
        </Link>
      </div>

      <div className="flex flex-col gap-8">
        {snapshot.trails.map((trail) => (
          <div key={trail.id} className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold">{trail.title}</h2>
            {trail.items.map((item) => (
              <div key={item.id} className="flex flex-col gap-1">
                <p className="text-sm font-medium">{item.title}</p>
                {item.content && (
                  <div className="text-sm text-muted-foreground">
                    <LexicalReadOnly content={item.content} />
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
    </EditorImagesProvider>
  )
}
