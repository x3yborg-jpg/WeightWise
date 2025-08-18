"use client";

import { useState, useEffect, useRef } from 'react';

interface WeightDisplayProps {
  weight: number;
  size?: 'normal' | 'large';
}

const useAnimatedCounter = (targetValue: number, duration: number = 800) => {
  const [displayValue, setDisplayValue] = useState(0);
  const frameRef = useRef<number>();
  const prevValueRef = useRef(0);

  useEffect(() => {
    prevValueRef.current = displayValue;
  }, [displayValue]);

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
      
      const easedProgress = 1 - Math.pow(1 - progress, 5); // easeOutQuint
      const currentValue = startValue + (endValue - startValue) * easedProgress;
      setDisplayValue(currentValue);

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayValue(endValue);
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

export function WeightDisplay({ weight, size = 'normal' }: WeightDisplayProps) {
  const animatedWeight = useAnimatedCounter(weight);

  const displayUnit = animatedWeight >= 1000 ? 'kg' : 'g';
  const displayValue = animatedWeight >= 1000 ? animatedWeight / 1000 : animatedWeight;
  const decimalPlaces = displayUnit === 'kg' ? 2 : 0;
  
  const textSizeClass = size === 'large' ? 'text-8xl' : 'text-6xl';
  const unitSizeClass = size === 'large' ? 'text-3xl' : 'text-xl';

  return (
    <div className="text-center">
      <div className="flex items-baseline justify-center gap-2">
        <span className={`${textSizeClass} font-bold tracking-tighter text-primary font-heading`}>
          {displayValue.toFixed(decimalPlaces)}
        </span>
        <span className={`${unitSizeClass} font-medium text-muted-foreground`}>{displayUnit}</span>
      </div>
    </div>
  );
}
