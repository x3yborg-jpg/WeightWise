"use client";

import { useEffect, useState } from "react";

interface LevelGaugeProps {
  level: number;
}

export function LevelGauge({ level }: LevelGaugeProps) {
  const [displayLevel, setDisplayLevel] = useState(0);

  useEffect(() => {
    // A simple animation for the percentage text
    const timeout = setTimeout(() => setDisplayLevel(level), 150);
    return () => clearTimeout(timeout);
  }, [level]);


  const size = 200;
  const strokeWidth = 16;
  const center = size / 2;
  const radius = center - strokeWidth / 2;
  const circumference = 2 * Math.PI * radius;

  const offset = circumference - (level / 100) * circumference;

  const getLevelColor = (l: number): string => {
    if (l > 90) return 'hsl(var(--destructive))';
    if (l >= 75) return 'hsl(var(--chart-4))';
    return 'hsl(var(--accent))';
  };
  
  const progressColor = getLevelColor(level);

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle
          cx={center}
          cy={center}
          r={radius}
          strokeWidth={strokeWidth}
          className="stroke-muted/30"
          fill="transparent"
        />
        <circle
          cx={center}
          cy={center}
          r={radius}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ 
            stroke: progressColor, 
            transition: 'stroke-dashoffset 0.5s ease-out, stroke 0.5s ease-out' 
          }}
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center">
        <span className="text-5xl font-bold font-headline text-foreground">
          {Math.round(displayLevel)}
          <span className="text-3xl text-muted-foreground">%</span>
        </span>
        <span className="text-sm text-muted-foreground mt-1 font-medium tracking-wide">Load Level</span>
      </div>
    </div>
  );
}
