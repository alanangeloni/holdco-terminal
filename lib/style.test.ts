import { describe, expect, it } from "vitest"
import { STYLES, STYLE_BOOT, isDarkStyle, wordmarkFor } from "./style"

describe("styles", () => {
  it("boots every style and only the night looks", () => {
    for (const style of STYLES) {
      expect(STYLE_BOOT).toContain(`"${style.id}":1`)
    }
    const darkSet = STYLE_BOOT.match(/var darkSet=(\{.*?\});/)?.[1] ?? ""
    expect(darkSet).toContain('"phosphor":1')
    expect(darkSet).toContain('"blueprint":1')
    expect(darkSet).toContain('"signal":1')
    expect(darkSet).toContain('"flap":1')
    expect(darkSet).toContain('"chalk":1')
    expect(darkSet).toContain('"led":1')
    expect(darkSet).not.toContain("cash")
    expect(darkSet).not.toContain("swiss")
    expect(darkSet).not.toContain("journal")
    expect(darkSet).not.toContain("windows")
    expect(darkSet).not.toContain("gameboy")
    expect(darkSet).not.toContain("etch")
    expect(darkSet).not.toContain("berkshire")
    expect(darkSet).not.toContain("thermal")
    expect(darkSet).not.toContain("riso")
    expect(STYLE_BOOT).toContain('style==="cash"&&mode==="dark"')
  })

  it("keeps cash light and treats phosphor as night", () => {
    expect(isDarkStyle("cash", "light")).toBe(false)
    expect(isDarkStyle("cash", "dark")).toBe(true)
    expect(isDarkStyle("phosphor", "light")).toBe(true)
    expect(isDarkStyle("swiss", "dark")).toBe(false)
    expect(isDarkStyle("blueprint", "light")).toBe(true)
    expect(isDarkStyle("signal", "light")).toBe(true)
    expect(isDarkStyle("journal", "dark")).toBe(false)
    expect(isDarkStyle("gameboy", "dark")).toBe(false)
    expect(isDarkStyle("etch", "dark")).toBe(false)
    expect(isDarkStyle("berkshire", "dark")).toBe(false)
    expect(isDarkStyle("thermal", "dark")).toBe(false)
    expect(isDarkStyle("riso", "dark")).toBe(false)
    expect(isDarkStyle("flap", "light")).toBe(true)
    expect(isDarkStyle("chalk", "light")).toBe(true)
    expect(isDarkStyle("led", "light")).toBe(true)
  })

  it("shortens the wordmark for the quiet looks", () => {
    expect(wordmarkFor("cash")).toBe("Holdco")
    expect(wordmarkFor("swiss")).toBe("Holdco")
    expect(wordmarkFor("signal")).toBe("HOLDCO")
    expect(wordmarkFor("bloomberg")).toBe("HOLDCO TERMINAL")
    expect(wordmarkFor("berkshire")).toBe("Holdco")
    expect(wordmarkFor("etch")).toBe("Holdco")
    expect(wordmarkFor("gameboy")).toBe("HOLDCO")
    expect(wordmarkFor("led")).toBe("HOLDCO")
  })
})
