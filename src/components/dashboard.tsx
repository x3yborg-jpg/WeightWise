"use client";

import { useLoadcellData } from '@/hooks/use-loadcell-data';
import { WeightDisplay } from '@/components/weight-display';
import { LevelGauge } from '@/components/level-gauge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

function DashboardSkeleton() {
  return (
    <Card className="w-full shadow-lg border-none bg-card/50">
      <CardHeader className="items-center pb-4">
        <Skeleton className="h-[200px] w-[200px] rounded-full" />
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-2">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-16 w-48" />
      </CardContent>
      <CardFooter className="flex justify-center text-sm text-muted-foreground pt-4">
        <Skeleton className="h-4 w-56" />
      </CardFooter>
    </Card>
  );
}

export function Dashboard() {
  const { data, loading, error } = useLoadcellData();

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <Alert variant="destructive" className="bg-destructive/10">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Connection Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!data) {
    return (
       <Alert className="bg-card/80">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Waiting for Data</AlertTitle>
        <AlertDescription>No data received yet. Listening for updates...</AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className="w-full shadow-lg border-none bg-card/50 backdrop-blur-sm">
      <CardHeader className="items-center pb-4">
        <LevelGauge level={data.level} />
      </CardHeader>
      <CardContent className="flex justify-center">
        <WeightDisplay weight={data.weight} />
      </CardContent>
      <CardFooter className="flex justify-center text-sm text-muted-foreground pt-4">
        <p>Last update: {new Date(data.timestamp).toLocaleString()}</p>
      </CardFooter>
    </Card>
  );
}
