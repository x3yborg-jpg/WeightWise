
"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"
import { format } from "date-fns"

import {
  ChartContainer,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card"
import { type LoadCellData, MAX_DATA_POINTS, MAX_WEIGHT_G } from "@/hooks/use-loadcell-data"

interface WeightChartProps {
  data: LoadCellData[];
  isModal?: boolean;
}

export function WeightChart({ data, isModal = false }: WeightChartProps) {
  const unit = 'kg';

  const chartData = data.map((item, index) => ({
    time: item.timestamp,
    index: index, // Use index for the x-axis
    weight: item.weight / 1000, // Always convert to kg
  }));

  const chartConfig = {
    weight: {
      label: `Weight (kg)`,
      color: "hsl(var(--primary))",
    },
  }

  // Ensure there's always at least one data point to prevent crashes
  const safeChartData = chartData.length > 0 ? chartData : [{time: Date.now(), weight: 0, index: 0}];

  // Set a dynamic domain for the Y-axis
  const yAxisDomain = [
    0,
    (dataMax: number) => {
      const buffer = 2;
      const upperLimit = MAX_WEIGHT_G / 1000;
      return Math.min(Math.max(dataMax * 1.2, buffer), upperLimit);
    }
  ];

  const chartComponent = (
     <ChartContainer config={chartConfig} className="h-full w-full">
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
            dataKey="index"
            type="number"
            domain={[0, MAX_DATA_POINTS - 1]} // Fixed domain for the scrolling effect
            tick={false} // Hide ticks
            axisLine={false} // Hide axis line
          />
           <YAxis
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            tickCount={isModal ? 10 : 6}
            domain={yAxisDomain}
            tickFormatter={(value: number) => `${value.toFixed(1)}kg`}
            width={45}
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
                   <span className="font-bold text-foreground">{`${item.payload.weight.toFixed(1)} ${unit}`}</span>
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
            isAnimationActive={false}
          />
        </AreaChart>
      </ChartContainer>
  )
  
  if (isModal) {
    return (
        <ResponsiveContainer width="100%" height="100%" className="p-6 pt-0">
           {chartComponent}
        </ResponsiveContainer>
    )
  }


  return (
    <>
       <CardHeader className="items-start p-6">
        <CardTitle className="font-heading tracking-tight">Weight Over Time</CardTitle>
        <CardDescription>
          A real-time view of the load cell readings.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-2 pt-0 h-[250px]">
        {chartComponent}
      </CardContent>
    </>
  )
}
