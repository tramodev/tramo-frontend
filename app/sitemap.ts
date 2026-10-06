// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
import type { MetadataRoute } from "next"
import { API_BASE_URL, SITE_URL } from "@/lib/config"

export const revalidate = 3600

interface SitemapProject {
  id: string
  modifiedDate: string
}

interface SitemapUser {
  username: string
  updatedAt: string
}

async function getSitemapProjects(): Promise<SitemapProject[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/public/sitemap/projects`)
    if (!response.ok) return []
    return await response.json()
  } catch {
    return []
  }
}

async function getSitemapUsers(): Promise<SitemapUser[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/public/sitemap/users`)
    if (!response.ok) return []
    return await response.json()
  } catch {
    return []
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [projects, users] = await Promise.all([getSitemapProjects(), getSitemapUsers()])

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/explore`, changeFrequency: "hourly", priority: 0.9 },
    { url: `${SITE_URL}/login`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/signup`, changeFrequency: "yearly", priority: 0.3 },
  ]

  const projectRoutes: MetadataRoute.Sitemap = projects.map((project) => ({
    url: `${SITE_URL}/p/${project.id}`,
    lastModified: project.modifiedDate,
    changeFrequency: "weekly",
    priority: 0.7,
  }))

  const userRoutes: MetadataRoute.Sitemap = users.map((user) => ({
    url: `${SITE_URL}/u/${encodeURIComponent(user.username)}`,
    lastModified: user.updatedAt,
    changeFrequency: "weekly",
    priority: 0.5,
  }))

  return [...staticRoutes, ...projectRoutes, ...userRoutes]
}
