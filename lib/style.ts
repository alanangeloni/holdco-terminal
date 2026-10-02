export const STYLE_KEY = "holdco-style"
export const MODE_KEY = "holdco-mode"

export const STYLES = [
  { id: "bloomberg", label: "Bloomberg", code: "BBG" },
  { id: "cash", label: "Cash", code: "APP" },
  { id: "windows", label: "Windows", code: "WIN" },
  { id: "journal", label: "Journal", code: "JNL" },
] as const

export type StyleId = (typeof STYLES)[number]["id"]
export type ModeId = "light" | "dark"

const STYLE_IDS = new Set<string>(STYLES.map((style) => style.id))

export function isStyleId(value: string | null): value is StyleId {
  return value !== null && STYLE_IDS.has(value)
}

export function readStored(): { style: StyleId; mode: ModeId } {
  if (typeof window === "undefined") return { style: "bloomberg", mode: "dark" }
  try {
    const style = window.localStorage.getItem(STYLE_KEY)
    const mode = window.localStorage.getItem(MODE_KEY)
    return {
      style: isStyleId(style) ? style : "bloomberg",
      mode: mode === "light" ? "light" : "dark",
    }
  } catch {
    return { style: "bloomberg", mode: "dark" }
  }
}

export function applyStyle(style: StyleId, mode: ModeId) {
  const root = document.documentElement
  root.dataset.style = style
  if (style === "cash") root.dataset.mode = mode
  else delete root.dataset.mode
  const dark = style === "bloomberg" || (style === "cash" && mode === "dark")
  root.classList.toggle("dark", dark)
}

export function writeStyle(style: StyleId, mode: ModeId) {
  try {
    window.localStorage.setItem(STYLE_KEY, style)
    window.localStorage.setItem(MODE_KEY, mode)
  } catch {
    // Private mode can block storage. The look still applies for this visit.
  }
  applyStyle(style, mode)
  window.dispatchEvent(new Event("holdco-style"))
}

export function subscribeStyle(onChange: () => void) {
  window.addEventListener("holdco-style", onChange)
  window.addEventListener("storage", onChange)
  return () => {
    window.removeEventListener("holdco-style", onChange)
    window.removeEventListener("storage", onChange)
  }
}

export function styleSnapshot() {
  const stored = readStored()
  return `${stored.style}:${stored.mode}`
}

export const STYLE_SERVER_SNAPSHOT = "bloomberg:dark"

export function parseStyleSnapshot(snapshot: string): { style: StyleId; mode: ModeId } {
  const [style, mode] = snapshot.split(":")
  return {
    style: isStyleId(style) ? style : "bloomberg",
    mode: mode === "light" ? "light" : "dark",
  }
}

export const STYLE_BOOT = `(function(){try{var style=localStorage.getItem(${JSON.stringify(STYLE_KEY)});var mode=localStorage.getItem(${JSON.stringify(MODE_KEY)});var known={bloomberg:1,cash:1,windows:1,journal:1};if(!known[style])style="bloomberg";if(mode!=="light")mode="dark";var root=document.documentElement;root.dataset.style=style;if(style==="cash")root.dataset.mode=mode;else root.removeAttribute("data-mode");var dark=style==="bloomberg"||(style==="cash"&&mode==="dark");root.classList.toggle("dark",dark);}catch(e){}})();`
