export const STYLE_KEY = "holdco-style"
export const MODE_KEY = "holdco-mode"

export interface Swatch {
  bg: string
  ink: string
  accent: string
  paper: string
  bar: string
  barInk: string
  muted: string
}

export const STYLES = [
  {
    id: "bloomberg",
    label: "Bloomberg",
    code: "BBG",
    night: true,
    flat: false,
    blurb: "Amber on charcoal. Dense, monospace, built for the close.",
    swatch: {
      bg: "#07080a",
      ink: "#e6e8eb",
      accent: "#f5a524",
      paper: "#101318",
      bar: "#101318",
      barInk: "#f5a524",
      muted: "#8b95a3",
    },
  },
  {
    id: "cash",
    label: "Cash",
    code: "APP",
    night: false,
    flat: true,
    blurb: "Black or white, one green, big figures. No boxes.",
    swatch: {
      bg: "#000000",
      ink: "#ffffff",
      accent: "#00d632",
      paper: "#000000",
      bar: "#000000",
      barInk: "#ffffff",
      muted: "#8a8a8a",
    },
    swatchLight: {
      bg: "#ffffff",
      ink: "#000000",
      accent: "#00d632",
      paper: "#ffffff",
      bar: "#ffffff",
      barInk: "#000000",
      muted: "#6b6b6b",
    },
  },
  {
    id: "windows",
    label: "Windows",
    code: "WIN",
    night: false,
    flat: false,
    blurb: "Navy title bar, gray panels, and a beveled edge.",
    swatch: {
      bg: "#c0c0c0",
      ink: "#000000",
      accent: "#000080",
      paper: "#c0c0c0",
      bar: "#000080",
      barInk: "#ffffff",
      muted: "#808080",
    },
  },
  {
    id: "journal",
    label: "Journal",
    code: "JNL",
    night: false,
    flat: false,
    blurb: "Ink on warm paper. A broadsheet, not a dashboard.",
    swatch: {
      bg: "#f4efe4",
      ink: "#1a140e",
      accent: "#7a1f2b",
      paper: "#f4efe4",
      bar: "#efe8d8",
      barInk: "#1a140e",
      muted: "#5c5348",
    },
  },
  {
    id: "phosphor",
    label: "Phosphor",
    code: "CRT",
    night: true,
    flat: false,
    blurb: "Green glass. A CRT that stayed on.",
    swatch: {
      bg: "#010803",
      ink: "#c8ffc0",
      accent: "#39ff14",
      paper: "#03150a",
      bar: "#010803",
      barInk: "#39ff14",
      muted: "#1f6b32",
    },
  },
  {
    id: "swiss",
    label: "Swiss",
    code: "SWS",
    night: false,
    flat: false,
    blurb: "A poster grid. Black, white, and one red.",
    swatch: {
      bg: "#f7f7f5",
      ink: "#111111",
      accent: "#e10600",
      paper: "#f7f7f5",
      bar: "#f7f7f5",
      barInk: "#111111",
      muted: "#111111",
    },
  },
  {
    id: "blueprint",
    label: "Blueprint",
    code: "BLU",
    night: true,
    flat: false,
    blurb: "White lines on drafting blue.",
    swatch: {
      bg: "#0d3d6e",
      ink: "#e7f3ff",
      accent: "#ffffff",
      paper: "#0a325c",
      bar: "#0a325c",
      barInk: "#ffffff",
      muted: "#9fd0f5",
    },
  },
  {
    id: "signal",
    label: "Signal",
    code: "SGN",
    night: true,
    flat: false,
    blurb: "Hazard black and safety yellow.",
    swatch: {
      bg: "#101010",
      ink: "#f4f1e4",
      accent: "#ffe500",
      paper: "#17170f",
      bar: "#ffe500",
      barInk: "#111111",
      muted: "#3a3818",
    },
  },
] as const

export type StyleId = (typeof STYLES)[number]["id"]
export type ModeId = "light" | "dark"
export type StyleOption = (typeof STYLES)[number]

const STYLE_IDS = new Set<string>(STYLES.map((style) => style.id))
const NIGHT_IDS = Object.fromEntries(STYLES.filter((style) => style.night).map((style) => [style.id, 1]))
const KNOWN_IDS = Object.fromEntries(STYLES.map((style) => [style.id, 1]))

export function isStyleId(value: string | null): value is StyleId {
  return value !== null && STYLE_IDS.has(value)
}

export function isDarkStyle(style: StyleId, mode: ModeId) {
  if (style === "cash") return mode === "dark"
  return STYLES.find((item) => item.id === style)?.night === true
}

export function wordmarkFor(style: StyleId) {
  switch (style) {
    case "cash":
    case "journal":
    case "swiss":
      return "Holdco"
    case "signal":
      return "HOLDCO"
    case "bloomberg":
    case "windows":
    case "phosphor":
    case "blueprint":
      return "HOLDCO TERMINAL"
  }
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
  root.classList.toggle("dark", isDarkStyle(style, mode))
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

export const STYLE_BOOT = `(function(){try{var style=localStorage.getItem(${JSON.stringify(STYLE_KEY)});var mode=localStorage.getItem(${JSON.stringify(MODE_KEY)});var known=${JSON.stringify(KNOWN_IDS)};var darkSet=${JSON.stringify(NIGHT_IDS)};if(!known[style])style="bloomberg";if(mode!=="light")mode="dark";var root=document.documentElement;root.dataset.style=style;if(style==="cash")root.dataset.mode=mode;else root.removeAttribute("data-mode");var dark=!!darkSet[style]||(style==="cash"&&mode==="dark");root.classList.toggle("dark",dark);}catch(e){}})();`
