"use client";

import { useState, useEffect, useRef } from 'react';

interface WeightDisplayProps {
  weight: number;
}

const useAnimatedCounter = (targetValue: number, duration: number = 500) => {
  const [displayValue, setDisplayValue] = useState(targetValue);
  const frameRef = useRef<number>();
  const prevValueRef = useRef(targetValue);

  useEffect(() => {
    const startValue = prevValueRef.current;
    const endValue = targetValue;
    let startTime: number | null = null;

    const animate = (currentTime: number) => {
      if (startTime === null) {
        startTime = currentTime;
      }
      const elapsedTime = currentTime - startTime;
      const progress = Math.min(elapsedTime / duration, 1);
      
      const easedProgress = 1 - Math.pow(1 - progress, 3); // Ease-out cubic
      const currentValue = startValue + (endValue - startValue) * easedProgress;
      setDisplayValue(currentValue);

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      } else {
        prevValueRef.current = endValue;
        setDisplayValue(endValue); // Ensure it ends exactly on the target
      }
    };

    frameRef.current = requestAnimationFrame(animate);

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [targetValue, duration]);

  return displayValue;
}

export function WeightDisplay({ weight }: WeightDisplayProps) {
  const animatedWeight = useAnimatedCounter(weight);

  // Use kg if weight is >= 1000g, otherwise use g
  const displayUnit = weight >= 1000 ? 'kg' : 'g';
  const displayValue = weight >= 1000 ? animatedWeight / 1000 : animatedWeight;
  const decimalPlaces = displayUnit === 'kg' ? 3 : 0;

  return (
    <div className="text-center">
      <p className="text-lg text-muted-foreground font-medium tracking-wide">Current Weight</p>
      <div className="flex items-baseline justify-center gap-2">
        <span className="text-7xl font-bold tracking-tighter text-primary font-code">
          {displayValue.toFixed(decimalPlaces)}
        </span>
        <span className="text-2xl font-medium text-muted-foreground">{displayUnit}</span>
      </div>
    </div>
  );
}
