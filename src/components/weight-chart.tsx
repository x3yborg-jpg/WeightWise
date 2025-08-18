"use client"

import * as React from "react"
import { Line, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, Area, AreaChart } from "recharts"
import { format } from "date-fns"

import {
  ChartContainer,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card"
import { LoadCellData } from "@/hooks/use-loadcell-data"

interface WeightChartProps {
  data: LoadCellData[]
}

export function WeightChart({ data }: WeightChartProps) {
  const chartData = data.map(item => ({
    time: item.timestamp,
    weight: item.weight >= 1000 ? item.weight / 1000 : item.weight,
    unit: item.weight >= 1000 ? 'kg' : 'g',
  }));

  const unit = chartData.length > 0 ? chartData[chartData.length-1].unit : 'g';

  const chartConfig = {
    weight: {
      label: `Weight (${unit})`,
      color: "hsl(var(--primary))",
    },
  }

  // Ensure there's always at least one data point to prevent crashes
  const safeChartData = chartData.length > 0 ? chartData : [{time: Date.now(), weight: 0, unit: 'g'}];


  return (
    <>
       <CardHeader className="items-start p-6">
        <CardTitle className="font-heading tracking-tight">Weight Over Time</CardTitle>
        <CardDescription>
          A real-time view of the load cell weight readings.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-2 pt-0">
        <ChartContainer config={chartConfig} className="h-[250px] w-full">
          <AreaChart
            data={safeChartData}
            margin={{
              top: 5,
              right: 20,
              left: 10,
              bottom: 0,
            }}
          >
            <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-muted/30" />
            <XAxis
              dataKey="time"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => format(new Date(value), "HH:mm:ss")}
              type="number"
              domain={['dataMin', 'dataMax']}
            />
             <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickCount={6}
              domain={['auto', 'auto']}
              tickFormatter={(value) => `${value}`}
              width={30}
            />
            <Tooltip
              cursor={{
                stroke: "hsl(var(--border))",
                strokeWidth: 1,
                strokeDasharray: "3 3",
              }}
              content={<ChartTooltipContent
                indicator="dot"
                nameKey="weight"
                labelFormatter={(value, payload) => {
                  if (payload && payload.length > 0) {
                     return format(new Date(payload[0].payload.time), "PPp")
                  }
                  return ""
                }}
                formatter={(value, name, item) => (
                  <div className="flex items-baseline gap-2">
                     <div className="w-2.5 h-2.5 rounded-full" style={{backgroundColor: chartConfig.weight.color}}></div>
                     <span className="text-muted-foreground">Weight:</span>
                     <span className="font-bold text-foreground">{`${item.payload.weight.toFixed(2)} ${item.payload.unit}`}</span>
                  </div>
                )}
                 />}
            />
             <defs>
                <linearGradient id="fillWeight" x1="0" y1="0" x2="0" y2="1">
                    <stop
                    offset="5%"
                    stopColor="hsl(var(--primary))"
                    stopOpacity={0.8}
                    />
                    <stop
                    offset="95%"
                    stopColor="hsl(var(--primary))"
                    stopOpacity={0.1}
                    />
                </linearGradient>
            </defs>
            <Area
              dataKey="weight"
              type="monotone"
              fill="url(#fillWeight)"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={false}
              isAnimationActive={true}
              animationDuration={300}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </>
  )
}
