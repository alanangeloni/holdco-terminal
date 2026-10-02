"use client"

import { useSyncExternalStore } from "react"
import { PageHead } from "@/components/terminal/kit"
import { cn } from "cn"
import {
  parseStyleSnapshot,
  STYLE_SERVER_SNAPSHOT,
  STYLES,
  styleSnapshot,
  subscribeStyle,
  writeStyle,
  type ModeId,
  type StyleOption,
  type Swatch,
} from "@/lib/style"

function useHoldcoStyle() {
  const snapshot = useSyncExternalStore(subscribeStyle, styleSnapshot, () => STYLE_SERVER_SNAPSHOT)
  return parseStyleSnapshot(snapshot)
}

function toneFor(item: StyleOption, mode: ModeId): Swatch {
  if (item.id === "cash" && mode === "light") return item.swatchLight
  return item.swatch
}

function Preview({ item, mode }: { item: StyleOption; mode: ModeId }) {
  const tone = toneFor(item, mode)
  if (item.flat) {
    return (
      <div className="flex h-28 w-full shrink-0 flex-col justify-between p-3 sm:w-48" style={{ background: tone.bg, color: tone.ink }}>
        <div>
          <div className="text-[11px]" style={{ color: tone.muted }}>Balance</div>
          <div className="text-[1.65rem] leading-none font-semibold tracking-tight">$12,480</div>
        </div>
        <span className="h-6 w-14 rounded-full" style={{ background: tone.accent }} />
      </div>
    )
  }
  return (
    <div className="flex h-28 w-full shrink-0 flex-col overflow-hidden sm:w-48" style={{ background: tone.bg, color: tone.ink }}>
      <div className="flex items-center justify-between px-2 py-1 text-[10px] font-semibold" style={{ background: tone.bar, color: tone.barInk }}>
        <span>{item.code}</span>
        <span>12,480</span>
      </div>
      <div className="grid flex-1 grid-cols-2 gap-px" style={{ background: tone.muted }}>
        <div className="px-2 py-2" style={{ background: tone.paper }}>
          <div className="text-[9px] tracking-wider" style={{ color: tone.accent }}>REV</div>
          <div className="text-xs">128.4k</div>
        </div>
        <div className="px-2 py-2" style={{ background: tone.paper }}>
          <div className="text-[9px] tracking-wider" style={{ color: tone.accent }}>CASH</div>
          <div className="text-xs">12,480</div>
        </div>
      </div>
    </div>
  )
}

export function StyleDesk() {
  const { style, mode } = useHoldcoStyle()
  return (
    <div>
      <PageHead
        kicker="Look"
        title="Styles"
        lede="One skin for the whole book. It stays on this browser."
      />
      <div className="style-list flex max-w-3xl flex-col gap-3 p-3">
        {STYLES.map((item) => {
          const on = style === item.id
          return (
            <div key={item.id} className={cn("style-card border border-border", on && "border-amber")} data-active={on ? "true" : "false"}>
              <button
                type="button"
                aria-pressed={on}
                onClick={() => writeStyle(item.id, mode)}
                className="flex w-full flex-col gap-3 p-3 text-left sm:flex-row sm:items-center"
              >
                <Preview item={item} mode={mode} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="w-8 font-mono text-[10px] text-amber">{item.code}</span>
                    <span className="text-base font-medium">{item.label}</span>
                    {on ? <span className="style-on ml-auto text-[10px] font-medium tracking-wider text-amber uppercase">On</span> : null}
                  </div>
                  <p className="mt-1 max-w-xl text-sm text-muted-foreground">{item.blurb}</p>
                </div>
              </button>
              {item.id === "cash" ? (
                <div className="flex gap-2 px-3 pb-3">
                  {(["dark", "light"] as const).map((next) => {
                    const selected = style === "cash" && mode === next
                    return (
                      <button
                        key={next}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => writeStyle("cash", next)}
                        className={cn(
                          "rounded-full px-3 py-1 text-xs font-semibold",
                          selected ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {next === "dark" ? "Black" : "White"}
                      </button>
                    )
                  })}
                </div>
              ) : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}
