"use client"

import { useState } from "react"
import { Link2, Plus, X } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Idea, Path } from "@/app/dashboard/types"

interface IdeaLinksPanelProps {
  idea: Idea;
  ideas: Record<string, Idea>;
  paths: Path[];
  onSelectIdea: (idea: Idea) => void;
  onLinkIdea: (ideaId: string, otherIdeaId: string) => void;
  onUnlinkIdea: (ideaId: string, otherIdeaId: string) => void;
  onLinkPath: (pathId: string, ideaId: string) => void;
  onUnlinkPath: (pathId: string, ideaId: string) => void;
}

export function IdeaLinksPanel({
  idea,
  ideas,
  paths,
  onSelectIdea,
  onLinkIdea,
  onUnlinkIdea,
  onLinkPath,
  onUnlinkPath,
}: IdeaLinksPanelProps) {
  const [isAddingPath, setIsAddingPath] = useState(false);
  const [pathSelection, setPathSelection] = useState("");
  const [isAddingIdea, setIsAddingIdea] = useState(false);
  const [ideaSelection, setIdeaSelection] = useState("");

  const memberPaths = paths.filter((path) => path.ideaIds.includes(idea.id));
  const linkablePaths = paths.filter((path) => !path.ideaIds.includes(idea.id));

  const linkedIdeas = idea.linkedIdeaIds
    .map((id) => ideas[id])
    .filter((linked): linked is Idea => Boolean(linked));
  const linkableIdeas = Object.values(ideas).filter(
    (other) => other.id !== idea.id && !idea.linkedIdeaIds.includes(other.id)
  );

  const submitLinkPath = () => {
    if (!pathSelection) return;
    onLinkPath(pathSelection, idea.id);
    setIsAddingPath(false);
    setPathSelection("");
  };

  const submitLinkIdea = () => {
    if (!ideaSelection) return;
    onLinkIdea(idea.id, ideaSelection);
    setIsAddingIdea(false);
    setIdeaSelection("");
  };

  return (
    <Card className="gap-0 border-b-0 py-5 px-6">
      <CardContent className="flex flex-col gap-3.5 p-0">
        <div className="flex flex-wrap items-center gap-3">
          <span
            className="w-24 shrink-0 text-[11px] font-bold uppercase"
            style={{ letterSpacing: "0.08em", color: "var(--color-neutral-600)" }}
          >
            Paths
          </span>
          {memberPaths.map((path) => (
            <Badge key={path.id} variant="secondary" className="tag tag-neutral gap-1 pr-1">
              {path.title}
              {memberPaths.length > 1 && (
                <button
                  type="button"
                  aria-label={`Remove ${idea.title} from ${path.title}`}
                  className="hover:opacity-70 cursor-pointer"
                  onClick={() => onUnlinkPath(path.id, idea.id)}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </Badge>
          ))}
          {isAddingPath ? (
            <div className="flex items-center gap-1">
              <select
                autoFocus
                className="h-7 rounded-md border border-input bg-background px-1 text-xs"
                value={pathSelection}
                onChange={(e) => setPathSelection(e.target.value)}
              >
                <option value="" disabled>
                  Choose a path...
                </option>
                {linkablePaths.map((path) => (
                  <option key={path.id} value={path.id}>
                    {path.title}
                  </option>
                ))}
              </select>
              <Button size="sm" className="h-7 px-2" disabled={!pathSelection} onClick={submitLinkPath}>
                Link
              </Button>
              <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => setIsAddingPath(false)}>
                Cancel
              </Button>
            </div>
          ) : (
            linkablePaths.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="tag tag-outline h-6 gap-1 px-2 text-xs"
                onClick={() => setIsAddingPath(true)}
              >
                <Plus className="h-3 w-3" />
                Link path
              </Button>
            )
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span
            className="w-24 shrink-0 text-[11px] font-bold uppercase"
            style={{ letterSpacing: "0.08em", color: "var(--color-neutral-600)" }}
          >
            Linked ideas
          </span>
          {linkedIdeas.length === 0 && !isAddingIdea && (
            <span className="text-xs italic" style={{ color: "var(--color-neutral-600)" }}>
              None yet
            </span>
          )}
          {linkedIdeas.map((linked) => (
            <Badge key={linked.id} variant="outline" className="tag tag-accent gap-1 pr-1">
              <button
                type="button"
                className="flex items-center gap-1 cursor-pointer"
                onClick={() => onSelectIdea(linked)}
              >
                <Link2 className="h-3 w-3" />
                {linked.title}
              </button>
              <button
                type="button"
                aria-label={`Unlink ${linked.title}`}
                className="hover:opacity-70 cursor-pointer"
                onClick={() => onUnlinkIdea(idea.id, linked.id)}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          {isAddingIdea ? (
            <div className="flex items-center gap-1">
              <select
                autoFocus
                className="h-7 rounded-md border border-input bg-background px-1 text-xs"
                value={ideaSelection}
                onChange={(e) => setIdeaSelection(e.target.value)}
              >
                <option value="" disabled>
                  Choose an idea...
                </option>
                {linkableIdeas.map((other) => (
                  <option key={other.id} value={other.id}>
                    {other.title}
                  </option>
                ))}
              </select>
              <Button size="sm" className="h-7 px-2" disabled={!ideaSelection} onClick={submitLinkIdea}>
                Link
              </Button>
              <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => setIsAddingIdea(false)}>
                Cancel
              </Button>
            </div>
          ) : (
            linkableIdeas.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="tag tag-outline h-6 gap-1 px-2 text-xs"
                onClick={() => setIsAddingIdea(true)}
              >
                <Plus className="h-3 w-3" />
                Link idea
              </Button>
            )
          )}
        </div>
      </CardContent>
    </Card>
  );
}
