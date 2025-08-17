"use client"

import * as React from "react"
import { Line, LineChart, CartesianGrid, XAxis, YAxis, Tooltip } from "recharts"
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

  const unit = chartData.length > 0 ? chartData[0].unit : 'g';

  const chartConfig = {
    weight: {
      label: `Weight (${unit})`,
      color: "hsl(var(--accent))",
    },
  }

  return (
    <Card className="border-none bg-transparent shadow-none">
       <CardHeader className="items-center p-2">
        <CardTitle>Weight Over Time</CardTitle>
        <CardDescription>
          A real-time view of the load cell weight readings.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-2">
        <ChartContainer config={chartConfig} className="h-[200px] w-full">
          <LineChart
            data={chartData}
            margin={{
              top: 5,
              right: 10,
              left: 10,
              bottom: 0,
            }}
          >
            <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-muted/50" />
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
            />
            <Tooltip
              cursor={false}
              content={<ChartTooltipContent
                indicator="line"
                nameKey="weight"
                labelFormatter={(value, payload) => {
                  if (payload && payload.length > 0) {
                     return format(new Date(payload[0].payload.time), "PPpp")
                  }
                  return ""
                }}
                formatter={(value, name, item) => (
                  <div className="flex flex-col">
                     <span className="font-bold">{`${item.payload.weight.toFixed(2)} ${item.payload.unit}`}</span>
                  </div>
                )}
                 />}
            />
            <Line
              dataKey="weight"
              type="monotone"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={true}
              isAnimationActive={true}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
