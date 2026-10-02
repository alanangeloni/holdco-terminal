"use client"

import type { ReactElement } from "react"
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

export const PALETTE = ["#f5a524", "#3dd68c", "#8aa0b4", "#6ea8fe", "#ff5d5d", "#d6d3d1"]

const axisTick = { fill: "#8b95a3", fontSize: 10, fontFamily: "IBM Plex Mono, ui-monospace, monospace" }
const grid = <CartesianGrid stroke="#2a2f36" strokeDasharray="2 4" vertical={false} />
const tipStyle = {
  contentStyle: { background: "#101318", border: "1px solid #2a2f36", borderRadius: 0, fontSize: 11 },
  labelStyle: { color: "#f5a524" },
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

function X({ dataKey = "period" }: { dataKey?: string }) {
  return <XAxis dataKey={dataKey} tick={axisTick} axisLine={{ stroke: "#2a2f36" }} tickLine={false} minTickGap={20} tickFormatter={(value) => (String(value).includes("-") ? monthTick(String(value)) : String(value))} interval="preserveStartEnd" />
}

function Y({ money = true, percent = false }: { money?: boolean; percent?: boolean }) {
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
  return (
    <ChartBox height={height} empty={!data.length}>
      <LineChart data={data} margin={{ top: 8, right: dual ? 8 : 8, left: 0, bottom: 0 }}>
        {grid}
        <X />
        <Y />
        {dual ? (
          <YAxis yAxisId="right" orientation="right" tick={axisTick} axisLine={false} tickLine={false} width={48} tickFormatter={(value) => compactMoney(Number(value))} />
        ) : null}
        <Tooltip {...tipStyle} formatter={(value) => compactMoney(Number(value))} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
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

export function TermArea({ data, dataKey, name, color = "#f5a524", height }: { data: Record<string, string | number>[]; dataKey: string; name: string; color?: string; height?: string }) {
  return (
    <ChartBox height={height} empty={!data.length}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        {grid}
        <X />
        <Y />
        <Tooltip {...tipStyle} formatter={(value) => compactMoney(Number(value))} />
        <Area type="monotone" dataKey={dataKey} name={name} stroke={color} fill={color} fillOpacity={0.18} strokeWidth={1.6} />
      </AreaChart>
    </ChartBox>
  )
}

export function TermBars({ data, series, height }: { data: Record<string, string | number>[]; series: Series[]; height?: string }) {
  return (
    <ChartBox height={height} empty={!data.length}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        {grid}
        <X />
        <Y />
        <Tooltip {...tipStyle} formatter={(value) => compactMoney(Number(value))} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        {series.map((item) => (
          <Bar key={item.key} dataKey={item.key} name={item.name} fill={item.color} maxBarSize={18} />
        ))}
      </BarChart>
    </ChartBox>
  )
}

export function TermStacked({ data, series, height, area = false }: { data: Record<string, string | number>[]; series: Series[]; height?: string; area?: boolean }) {
  const Chart = area ? AreaChart : BarChart
  return (
    <ChartBox height={height} empty={!data.length}>
      <Chart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        {grid}
        <X />
        <Y />
        <Tooltip {...tipStyle} formatter={(value) => compactMoney(Number(value))} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
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

export function TermHBar({ data, color = "#f5a524", height = "h-56", moneyAxis = true }: { data: { name: string; value: number }[]; color?: string; height?: string; moneyAxis?: boolean }) {
  return (
    <ChartBox height={height} empty={!data.length}>
      <BarChart data={data} layout="vertical" margin={{ top: 8, right: 12, left: 8, bottom: 0 }}>
        <CartesianGrid stroke="#2a2f36" strokeDasharray="2 4" horizontal={false} />
        <XAxis type="number" tick={axisTick} axisLine={{ stroke: "#2a2f36" }} tickLine={false} tickFormatter={(value) => (moneyAxis ? compactMoney(Number(value)) : String(value))} />
        <YAxis type="category" dataKey="name" tick={axisTick} axisLine={false} tickLine={false} width={108} />
        <Tooltip {...tipStyle} formatter={(value) => (moneyAxis ? compactMoney(Number(value)) : String(value))} />
        <Bar dataKey="value" fill={color} maxBarSize={14} />
      </BarChart>
    </ChartBox>
  )
}

export function TermWaterfall({ data }: { data: { name: string; base: number; rise: number; fall: number }[] }) {
  return (
    <ChartBox empty={!data.length}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        {grid}
        <X dataKey="name" />
        <Y />
        <Tooltip {...tipStyle} formatter={(value, name) => (name === "base" ? [null, null] : [compactMoney(Number(value)), name])} />
        <Bar dataKey="base" stackId="a" fill="transparent" legendType="none" />
        <Bar dataKey="rise" name="Up" stackId="a" fill="#3dd68c" maxBarSize={26} />
        <Bar dataKey="fall" name="Down" stackId="a" fill="#ff5d5d" maxBarSize={26} />
      </BarChart>
    </ChartBox>
  )
}

export function TermCombo({ data }: { data: { period: string; revenue: number; grossMargin: number }[] }) {
  return (
    <ChartBox empty={!data.length}>
      <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        {grid}
        <X />
        <Y />
        <YAxis yAxisId="right" orientation="right" tick={axisTick} axisLine={false} tickLine={false} width={40} tickFormatter={(value) => pct(Number(value), 0)} />
        <Tooltip {...tipStyle} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Bar yAxisId={0} dataKey="revenue" name="Revenue" fill="#f5a524" maxBarSize={18} />
        <Line yAxisId="right" type="monotone" dataKey="grossMargin" name="Gross margin" stroke="#3dd68c" strokeWidth={1.6} dot={false} />
      </ComposedChart>
    </ChartBox>
  )
}

export function Spark({ data, color = "#f5a524" }: { data: number[]; color?: string }) {
  const rows = data.map((value, index) => ({ index, value }))
  if (!rows.length) return <span className="text-muted-foreground">—</span>
  return (
    <div className="h-7 w-24">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows}>
          <Line type="monotone" dataKey="value" stroke={color} strokeWidth={1.3} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
