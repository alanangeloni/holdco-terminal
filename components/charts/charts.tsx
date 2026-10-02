"use client"

import { useEffect, useState, type ReactElement } from "react"
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  AreaChart,
  BarChart,
} from "recharts"
import { monthTick, compactMoney, pct } from "@/lib/format"

export const PALETTE = ["#f5a524", "#3dd68c", "#8aa0b4", "#6ea8fe", "#ff5d5d", "#d6d3d1", "#5c6b7a"]

interface ChartTheme {
  palette: string[]
  border: string
  card: string
  foreground: string
  muted: string
  amber: string
  up: string
  down: string
  radius: string
  font: string
}

const FALLBACK: ChartTheme = {
  palette: PALETTE,
  border: "#2a2f36",
  card: "#101318",
  foreground: "#e6e8eb",
  muted: "#8b95a3",
  amber: "#f5a524",
  up: "#3dd68c",
  down: "#ff5d5d",
  radius: "0px",
  font: "IBM Plex Mono, ui-monospace, monospace",
}

function readChartTheme(): ChartTheme {
  const style = getComputedStyle(document.documentElement)
  const pick = (name: string, fallback: string) => style.getPropertyValue(name).trim() || fallback
  return {
    palette: [1, 2, 3, 4, 5, 6, 7].map((slot, index) => pick(`--chart-${slot}`, PALETTE[index])),
    border: pick("--border", FALLBACK.border),
    card: pick("--card", FALLBACK.card),
    foreground: pick("--foreground", FALLBACK.foreground),
    muted: pick("--muted-foreground", FALLBACK.muted),
    amber: pick("--amber", FALLBACK.amber),
    up: pick("--up", FALLBACK.up),
    down: pick("--down", FALLBACK.down),
    radius: pick("--radius", FALLBACK.radius),
    font: pick("--app-font-mono", FALLBACK.font),
  }
}

function useChartTheme() {
  const [theme, setTheme] = useState<ChartTheme>(FALLBACK)
  useEffect(() => {
    const read = () => setTheme(readChartTheme())
    read()
    const observer = new MutationObserver(read)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-style", "data-mode", "class"] })
    return () => observer.disconnect()
  }, [])
  return theme
}

export function usePalette() {
  return useChartTheme().palette
}

export function ChartBox({
  height = "h-56",
  empty,
  children,
}: {
  height?: string
  empty?: boolean
  children: ReactElement
}) {
  if (empty) return <p className="px-2 py-8 text-sm text-muted-foreground">No closed months in this window. Enter a statement to draw the chart.</p>
  return (
    <div className={height}>
      <ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer>
    </div>
  )
}

function Grid({ orientation = "horizontal" }: { orientation?: "horizontal" | "vertical" }) {
  const theme = useChartTheme()
  return (
    <CartesianGrid
      stroke={theme.border}
      strokeDasharray="2 4"
      vertical={orientation === "vertical"}
      horizontal={orientation === "horizontal"}
    />
  )
}

function useAxisTick() {
  const theme = useChartTheme()
  return { fill: theme.muted, fontSize: 10, fontFamily: theme.font }
}

function useTip() {
  const theme = useChartTheme()
  return {
    contentStyle: {
      background: theme.card,
      border: `1px solid ${theme.border}`,
      borderRadius: theme.radius,
      fontSize: 11,
      color: theme.foreground,
    },
    labelStyle: { color: theme.amber },
    itemStyle: { color: theme.foreground },
  }
}

function X({ dataKey = "period" }: { dataKey?: string }) {
  const theme = useChartTheme()
  const axisTick = useAxisTick()
  return <XAxis dataKey={dataKey} tick={axisTick} axisLine={{ stroke: theme.border }} tickLine={false} minTickGap={20} tickFormatter={(value) => (String(value).includes("-") ? monthTick(String(value)) : String(value))} interval="preserveStartEnd" />
}

function Y({ money = true, percent = false }: { money?: boolean; percent?: boolean }) {
  const axisTick = useAxisTick()
  return (
    <YAxis
      tick={axisTick}
      axisLine={false}
      tickLine={false}
      width={52}
      tickFormatter={(value) => (percent ? pct(Number(value), 0) : money ? compactMoney(Number(value)) : String(value))}
    />
  )
}

export interface Series {
  key: string
  name: string
  color: string
}

export function TermLine({
  data,
  series,
  height,
  dual = false,
}: {
  data: Record<string, string | number>[]
  series: Series[]
  height?: string
  dual?: boolean
}) {
  const theme = useChartTheme()
  const axisTick = useAxisTick()
  const tipStyle = useTip()
  return (
    <ChartBox height={height} empty={!data.length}>
      <LineChart data={data} margin={{ top: 8, right: dual ? 8 : 8, left: 0, bottom: 0 }}>
        <Grid />
        <X />
        <Y />
        {dual ? (
          <YAxis yAxisId="right" orientation="right" tick={axisTick} axisLine={false} tickLine={false} width={48} tickFormatter={(value) => compactMoney(Number(value))} />
        ) : null}
        <Tooltip {...tipStyle} formatter={(value) => compactMoney(Number(value))} />
        <Legend wrapperStyle={{ fontSize: 11, color: theme.foreground }} />
        {series.map((item, index) => (
          <Line
            key={item.key}
            yAxisId={dual && index > 0 ? "right" : 0}
            type="monotone"
            dataKey={item.key}
            name={item.name}
            stroke={item.color}
            strokeWidth={1.6}
            dot={false}
          />
        ))}
      </LineChart>
    </ChartBox>
  )
}

export function TermArea({ data, dataKey, name, color, height }: { data: Record<string, string | number>[]; dataKey: string; name: string; color?: string; height?: string }) {
  const palette = usePalette()
  const tipStyle = useTip()
  const stroke = color ?? palette[0]
  return (
    <ChartBox height={height} empty={!data.length}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <Grid />
        <X />
        <Y />
        <Tooltip {...tipStyle} formatter={(value) => compactMoney(Number(value))} />
        <Area type="monotone" dataKey={dataKey} name={name} stroke={stroke} fill={stroke} fillOpacity={0.18} strokeWidth={1.6} />
      </AreaChart>
    </ChartBox>
  )
}

export function TermBars({ data, series, height }: { data: Record<string, string | number>[]; series: Series[]; height?: string }) {
  const theme = useChartTheme()
  const tipStyle = useTip()
  return (
    <ChartBox height={height} empty={!data.length}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <Grid />
        <X />
        <Y />
        <Tooltip {...tipStyle} formatter={(value) => compactMoney(Number(value))} />
        <Legend wrapperStyle={{ fontSize: 11, color: theme.foreground }} />
        {series.map((item) => (
          <Bar key={item.key} dataKey={item.key} name={item.name} fill={item.color} maxBarSize={18} />
        ))}
      </BarChart>
    </ChartBox>
  )
}

export function TermStacked({ data, series, height, area = false }: { data: Record<string, string | number>[]; series: Series[]; height?: string; area?: boolean }) {
  const theme = useChartTheme()
  const tipStyle = useTip()
  const Chart = area ? AreaChart : BarChart
  return (
    <ChartBox height={height} empty={!data.length}>
      <Chart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <Grid />
        <X />
        <Y />
        <Tooltip {...tipStyle} formatter={(value) => compactMoney(Number(value))} />
        <Legend wrapperStyle={{ fontSize: 11, color: theme.foreground }} />
        {series.map((item) =>
          area ? (
            <Area key={item.key} type="monotone" dataKey={item.key} name={item.name} stackId="a" stroke={item.color} fill={item.color} fillOpacity={0.75} />
          ) : (
            <Bar key={item.key} dataKey={item.key} name={item.name} stackId="a" fill={item.color} maxBarSize={22} />
          ),
        )}
      </Chart>
    </ChartBox>
  )
}

export function TermHBar({ data, color, height = "h-56", moneyAxis = true }: { data: { name: string; value: number }[]; color?: string; height?: string; moneyAxis?: boolean }) {
  const theme = useChartTheme()
  const axisTick = useAxisTick()
  const tipStyle = useTip()
  const fill = color ?? theme.palette[0]
  return (
    <ChartBox height={height} empty={!data.length}>
      <BarChart data={data} layout="vertical" margin={{ top: 8, right: 12, left: 8, bottom: 0 }}>
        <Grid orientation="vertical" />
        <XAxis type="number" tick={axisTick} axisLine={{ stroke: theme.border }} tickLine={false} tickFormatter={(value) => (moneyAxis ? compactMoney(Number(value)) : String(value))} />
        <YAxis type="category" dataKey="name" tick={axisTick} axisLine={false} tickLine={false} width={108} />
        <Tooltip {...tipStyle} formatter={(value) => (moneyAxis ? compactMoney(Number(value)) : String(value))} />
        <Bar dataKey="value" fill={fill} maxBarSize={14} />
      </BarChart>
    </ChartBox>
  )
}

export function TermWaterfall({ data }: { data: { name: string; base: number; rise: number; fall: number }[] }) {
  const theme = useChartTheme()
  const tipStyle = useTip()
  return (
    <ChartBox empty={!data.length}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <Grid />
        <X dataKey="name" />
        <Y />
        <Tooltip {...tipStyle} formatter={(value, name) => (name === "base" ? [null, null] : [compactMoney(Number(value)), name])} />
        <Bar dataKey="base" stackId="a" fill="transparent" legendType="none" />
        <Bar dataKey="rise" name="Up" stackId="a" fill={theme.up} maxBarSize={26} />
        <Bar dataKey="fall" name="Down" stackId="a" fill={theme.down} maxBarSize={26} />
      </BarChart>
    </ChartBox>
  )
}

export function TermCombo({ data }: { data: { period: string; revenue: number; grossMargin: number }[] }) {
  const theme = useChartTheme()
  const axisTick = useAxisTick()
  const tipStyle = useTip()
  return (
    <ChartBox empty={!data.length}>
      <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <Grid />
        <X />
        <Y />
        <YAxis yAxisId="right" orientation="right" tick={axisTick} axisLine={false} tickLine={false} width={40} tickFormatter={(value) => pct(Number(value), 0)} />
        <Tooltip {...tipStyle} />
        <Legend wrapperStyle={{ fontSize: 11, color: theme.foreground }} />
        <Bar yAxisId={0} dataKey="revenue" name="Revenue" fill={theme.palette[0]} maxBarSize={18} />
        <Line yAxisId="right" type="monotone" dataKey="grossMargin" name="Gross margin" stroke={theme.palette[1]} strokeWidth={1.6} dot={false} />
      </ComposedChart>
    </ChartBox>
  )
}

export function Spark({ data, color }: { data: number[]; color?: string }) {
  const palette = usePalette()
  const rows = data.map((value, index) => ({ index, value }))
  if (!rows.length) return <span className="text-muted-foreground">—</span>
  return (
    <div className="h-7 w-24">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows}>
          <Line type="monotone" dataKey="value" stroke={color ?? palette[0]} strokeWidth={1.3} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
