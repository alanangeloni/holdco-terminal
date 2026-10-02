"use client"

import { Suspense } from "react"
import { useParams } from "next/navigation"
import { Cockpit } from "@/components/desks/cockpit"

export default function Page() {
  const params = useParams<{ id: string }>()
  return (
    <Suspense fallback={<div className="p-6 font-mono text-xs tracking-[0.16em] text-amber">LOADING COMPANY</div>}>
      <Cockpit id={String(params.id)} />
    </Suspense>
  )
}
