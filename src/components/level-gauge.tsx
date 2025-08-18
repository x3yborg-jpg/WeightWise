"use client";

import { useEffect, useState } from "react";

interface LevelGaugeProps {
  level: number;
  size?: number;
}

export function LevelGauge({ level, size = 200 }: LevelGaugeProps) {
  const [displayLevel, setDisplayLevel] = useState(0);

  useEffect(() => {
    // Animate to the new level
    const id = requestAnimationFrame(() => setDisplayLevel(level));
    return () => cancelAnimationFrame(id);
  }, [level]);

  const strokeWidth = size * 0.06; // 6% of size
  const center = size / 2;
  const radius = center - strokeWidth / 2;
  const circumference = 2 * Math.PI * radius;

  const offset = circumference - (displayLevel / 100) * circumference;

  const getLevelColor = (l: number): string => {
    if (l > 90) return 'hsl(var(--destructive))';
    if (l > 75) return 'hsl(var(--primary))';
    if (l > 50) return 'hsl(var(--chart-2))';
    return 'hsl(var(--chart-1))';
  };
  
  const progressColor = getLevelColor(level);

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        {/* Background track */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          strokeWidth={strokeWidth}
          className="stroke-muted/20"
          fill="transparent"
        />
        {/* Foreground progress */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - (level / 100) * circumference}
          className="opacity-20"
          style={{ stroke: progressColor }}
        />
        {/* Animated progress */}
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
        <span className="font-bold font-heading text-foreground transition-colors duration-500" style={{color: progressColor, fontSize: `${size * 0.25}px`}}>
          {Math.round(displayLevel)}
          <span className="text-muted-foreground" style={{fontSize: `${size * 0.15}px`}}>%</span>
        </span>
      </div>
    </div>
  );
}