import { Idea, Path } from "@/app/dashboard/types";

export interface Project {
  id: string;
  title: string;
  paths: Path[];
  ideas: Record<string, Idea>;
  createdAt: string;
  updatedAt: string;
}

// Data-access layer for projects. Backed by localStorage today; every
// function is async so the localStorage calls below can be swapped for
// real API calls (e.g. authenticatedFetch) without touching call sites.

const STORAGE_KEY = "mypath.projects";

function readAll(): Project[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as Project[];
  } catch {
    return [];
  }
}

function writeAll(projects: Project[]): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}

export async function listProjects(): Promise<Project[]> {
  return readAll().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getProject(id: string): Promise<Project | null> {
  return readAll().find((project) => project.id === id) ?? null;
}

export async function createProject(title: string): Promise<Project> {
  const now = new Date().toISOString();
  const project: Project = {
    id: `project-${crypto.randomUUID()}`,
    title,
    paths: [],
    ideas: {},
    createdAt: now,
    updatedAt: now,
  };
  const projects = readAll();
  projects.push(project);
  writeAll(projects);
  return project;
}

export async function renameProject(id: string, title: string): Promise<void> {
  const projects = readAll();
  const project = projects.find((p) => p.id === id);
  if (!project) return;
  project.title = title;
  project.updatedAt = new Date().toISOString();
  writeAll(projects);
}

export async function deleteProject(id: string): Promise<void> {
  writeAll(readAll().filter((project) => project.id !== id));
}

export async function saveProjectContent(
  id: string,
  content: { paths: Path[]; ideas: Record<string, Idea> },
): Promise<void> {
  const projects = readAll();
  const project = projects.find((p) => p.id === id);
  if (!project) return;
  project.paths = content.paths;
  project.ideas = content.ideas;
  project.updatedAt = new Date().toISOString();
  writeAll(projects);
}
