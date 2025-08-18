"use client";

import { useLoadcellData } from '@/hooks/use-loadcell-data';
import { WeightDisplay } from '@/components/weight-display';
import { LevelGauge } from '@/components/level-gauge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, WifiOff, Wifi, Power } from 'lucide-react';
import { WeightChart } from './weight-chart';
import { Separator } from './ui/separator';

function DashboardSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card className="lg:col-span-1 bg-card/50 backdrop-blur-sm border-dashed">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Level</CardTitle>
            <Power className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="flex items-center justify-center pt-6">
             <Skeleton className="h-[200px] w-[200px] rounded-full" />
        </CardContent>
      </Card>
      <Card className="lg:col-span-1 bg-card/50 backdrop-blur-sm border-dashed">
         <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Weight</CardTitle>
            <Power className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
         <CardContent className="flex flex-col items-center justify-center pt-10 gap-2">
            <Skeleton className="h-16 w-48" />
            <Skeleton className="h-6 w-32" />
        </CardContent>
      </Card>
      <Card className="lg:col-span-3 bg-card/50 backdrop-blur-sm border-dashed">
        <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
            <Skeleton className="h-[200px] w-full" />
        </CardContent>
      </Card>
    </div>
  );
}

export function Dashboard() {
  const { data, history, loading, error, isConnected } = useLoadcellData();

  if (loading) {
    return <DashboardSkeleton />;
  }

  const ConnectionStatusAlert = () => (
     <Alert className="lg:col-span-3 bg-card/80 backdrop-blur-sm border-yellow-500/50 text-yellow-500">
        <WifiOff className="h-4 w-4" />
        <AlertTitle>Device Offline</AlertTitle>
        <AlertDescription>The device is not connected. Waiting for a signal...</AlertDescription>
      </Alert>
  );

  if (error) {
    return (
      <Alert variant="destructive" className="bg-destructive/10">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Connection Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {!isConnected && <ConnectionStatusAlert />}

        <Card className={`lg:col-span-1 bg-card/50 backdrop-blur-sm transition-opacity duration-500 ${!isConnected ? 'opacity-30' : 'opacity-100'}`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Level</CardTitle>
                <Power className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="flex items-center justify-center pt-6">
                <LevelGauge level={data?.level ?? 0} />
            </CardContent>
        </Card>

        <Card className={`lg:col-span-1 bg-card/50 backdrop-blur-sm transition-opacity duration-500 ${!isConnected ? 'opacity-30' : 'opacity-100'}`}>
             <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Weight</CardTitle>
                <Power className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="flex items-center justify-center pt-6">
                 <WeightDisplay weight={data?.weight ?? 0} />
            </CardContent>
        </Card>

         <Card className={`lg:col-span-3 bg-card/50 backdrop-blur-sm transition-opacity duration-500 ${!isConnected ? 'opacity-30' : 'opacity-100'}`}>
            <WeightChart data={history} />
         </Card>

         <div className="lg:col-span-3 mt-4 flex items-center justify-center text-sm text-muted-foreground">
           {isConnected && data ? (
              <div className="flex items-center gap-2 text-green-400">
                <Wifi className="h-4 w-4 animate-pulse" />
                <span>Device Online - Last update: {new Date(data.timestamp).toLocaleString()}</span>
              </div>
           ) : (
             !isConnected && !loading && (
                <div className="flex items-center gap-2 text-yellow-500">
                    <WifiOff className="h-4 w-4" />
                    <span>Awaiting connection...</span>
                </div>
             )
           )}
        </div>
    </div>
  );
}
