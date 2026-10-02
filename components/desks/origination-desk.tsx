"use client"

import { useState } from "react"
import { IdeaDialog } from "@/components/dialogs/editors"
import { Button } from "@/components/ui/button"
import { MiniActions, PageHead, Panel, TermTable } from "@/components/terminal/kit"
import { STAGE_LABEL } from "@/lib/capital"
import { usePortfolio } from "@/lib/store"
import type { Idea, IdeaStage } from "@/lib/types"

const IN_PLAY: IdeaStage[] = ["research", "greenlit"]
const WAITING: IdeaStage[] = ["weak", "parked"]

function ordered(ideas: Idea[], stages: IdeaStage[]) {
  return stages.flatMap((stage) => ideas.filter((idea) => idea.stage === stage))
}

function OnePager({ idea }: { idea: Idea }) {
  const link = idea.link.trim()
  return (
    <div>
      <div>{idea.summary}</div>
      {link ? (
        <a className="font-mono text-[10px] text-amber hover:underline" href={link} target="_blank" rel="noreferrer">
          {link}
        </a>
      ) : null}
      {idea.stage === "greenlit" ? (
        <div className="mt-1 font-mono text-[10px] text-amber uppercase">Permission to build. Not an operating company.</div>
      ) : null}
    </div>
  )
}

export function OriginationDesk() {
  const ideas = usePortfolio((state) => state.ideas)
  const remove = usePortfolio((state) => state.deleteIdea)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Idea | null>(null)
  const inPlay = ordered(ideas, IN_PLAY)
  const waiting = ordered(ideas, WAITING)

  return (
    <div>
      <PageHead
        kicker="Origination"
        title="Ideas"
        lede="A shelf for niche scouting and one-pagers. Research until you say go. Greenlit is permission to build, not an operating company. Passed and parked ideas stay here."
        actions={<Button size="sm" onClick={() => { setEditing(null); setOpen(true) }}>New idea</Button>}
      />
      <div className="grid gap-2 p-2 lg:p-3">
        <Panel title="In play" bodyClassName="p-0">
          <TermTable
            rows={inPlay}
            empty="Nothing in research or greenlit."
            getKey={(row) => row.id}
            columns={[
              { key: "name", header: "Idea", render: (row) => row.name },
              { key: "stage", header: "Stage", render: (row) => <span className="font-mono text-[10px] uppercase">{STAGE_LABEL[row.stage]}</span> },
              { key: "pager", header: "One-pager", render: (row) => <OnePager idea={row} /> },
              {
                key: "act",
                header: "",
                className: "text-right",
                render: (row) => (
                  <MiniActions
                    onEdit={() => { setEditing(row); setOpen(true) }}
                    onDelete={row.stage === "research" ? () => remove(row.id) : undefined}
                  />
                ),
              },
            ]}
          />
        </Panel>
        <Panel title="Passed or waiting" bodyClassName="p-0">
          <TermTable
            rows={waiting}
            empty="Nothing passed or parked."
            getKey={(row) => row.id}
            columns={[
              { key: "name", header: "Idea", render: (row) => row.name },
              { key: "stage", header: "Stage", render: (row) => <span className={`font-mono text-[10px] uppercase ${row.stage === "weak" ? "text-down" : "text-amber"}`}>{STAGE_LABEL[row.stage]}</span> },
              { key: "pager", header: "One-pager", render: (row) => row.summary },
              { key: "kill", header: "Kill reason", render: (row) => row.killReason || "—" },
              {
                key: "act",
                header: "",
                className: "text-right",
                render: (row) => <MiniActions onEdit={() => { setEditing(row); setOpen(true) }} />,
              },
            ]}
          />
        </Panel>
      </div>
      <IdeaDialog open={open} onOpenChange={setOpen} initial={editing} />
    </div>
  )
}
