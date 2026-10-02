"use client"

import { useParams } from "next/navigation"
import { HoldcoDesk } from "@/components/desks/record-desks"

export default function Page() {
  const params = useParams<{ id: string }>()
  return <HoldcoDesk id={String(params.id)} />
}
