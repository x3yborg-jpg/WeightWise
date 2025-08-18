"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"
import { format } from "date-fns"

import {
  ChartContainer,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card"
import { type LoadCellData } from "@/hooks/use-loadcell-data"

interface WeightChartProps {
  data: LoadCellData[];
  isModal?: boolean;
}

export function WeightChart({ data, isModal = false }: WeightChartProps) {
  // Determine the unit based on the maximum weight in the current dataset
  const maxWeight = Math.max(...data.map(item => item.weight), 0);
  const unit = maxWeight >= 1000 ? 'kg' : 'g';

  const chartData = data.map(item => ({
    time: item.timestamp,
    // Consistently use the determined unit for all points in the chart
    weight: unit === 'kg' ? item.weight / 1000 : item.weight,
  }));

  const chartConfig = {
    weight: {
      label: `Weight (${unit})`,
      color: "hsl(var(--primary))",
    },
  }

  // Ensure there's always at least one data point to prevent crashes
  const safeChartData = chartData.length > 0 ? chartData : [{time: Date.now(), weight: 0}];

  // Set a dynamic domain for the Y-axis
  const yAxisDomain = [
    0,
    (dataMax: number) => {
      // If we are in kg, the max can be 10. Otherwise, it can be 10000g.
      // Give a little buffer (e.g., 20%) to the max value for better visualization.
      const buffer = unit === 'kg' ? 1 : 100;
      const upperLimit = unit === 'kg' ? 10 : 10000;
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
            dataKey="time"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            tickFormatter={(value) => format(new Date(value), isModal ? "HH:mm:ss" : "HH:mm")}
            type="number"
            domain={['dataMin', 'dataMax']}
          />
           <YAxis
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            tickCount={isModal ? 10 : 6}
            domain={yAxisDomain}
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
                   <span className="font-bold text-foreground">{`${item.payload.weight.toFixed(2)} ${unit}`}</span>
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
          A real-time view of the load cell readings. Max capacity: 10kg.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-2 pt-0 h-[250px]">
        {chartComponent}
      </CardContent>
    </>
  )
}