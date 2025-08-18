"use client";

import { useState } from 'react';
import { useLoadcellData } from '@/hooks/use-loadcell-data';
import { WeightDisplay } from '@/components/weight-display';
import { LevelGauge } from '@/components/level-gauge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, WifiOff, Wifi, Power, Waves, LineChart, Maximize } from 'lucide-react';
import { WeightChart } from './weight-chart';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from './ui/button';

function DashboardSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Level Card Skeleton */}
      <Card className="lg:col-span-1 bg-card/50 backdrop-blur-sm border-dashed">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Container Level</CardTitle>
            <Waves className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="flex items-center justify-center pt-6">
             <Skeleton className="h-[200px] w-[200px] rounded-full" />
        </CardContent>
      </Card>

      {/* Weight Card Skeleton */}
      <Card className="lg:col-span-2 bg-card/50 backdrop-blur-sm border-dashed">
         <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Weight</CardTitle>
            <Power className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
         <CardContent className="flex flex-col items-center justify-center pt-10 gap-2">
            <Skeleton className="h-16 w-48" />
            <Skeleton className="h-6 w-32" />
        </CardContent>
      </Card>
      
      {/* Chart Card Skeleton */}
      <Card className="lg:col-span-3 bg-card/50 backdrop-blur-sm border-dashed">
        <CardHeader className="flex flex-row items-start p-6">
            <div className="flex-1">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-64 mt-2" />
            </div>
        </CardHeader>
        <CardContent>
            <Skeleton className="h-[250px] w-full" />
        </CardContent>
      </Card>
    </div>
  );
}

export function Dashboard() {
  const { data, history, loading, error, isConnected } = useLoadcellData();
  const [openModal, setOpenModal] = useState<'level' | 'weight' | 'chart' | null>(null);

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
  
  const cardBaseClasses = "bg-card/50 backdrop-blur-sm transition-all duration-300 ease-in-out cursor-pointer hover:bg-card/80 hover:scale-105 hover:border-primary/50 relative group";
  const cardOpacityClass = !isConnected ? 'opacity-30 pointer-events-none' : 'opacity-100';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {!isConnected && <ConnectionStatusAlert />}

        {/* Level Gauge Card & Modal */}
        <Dialog open={openModal === 'level'} onOpenChange={(isOpen) => !isOpen && setOpenModal(null)}>
            <DialogTrigger asChild onClick={() => setOpenModal('level')}>
                <Card className={`${cardBaseClasses} ${cardOpacityClass} lg:col-span-1`}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Container Level</CardTitle>
                        <Waves className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent className="flex items-center justify-center pt-6 min-h-[224px]">
                        <LevelGauge level={data?.level ?? 0} />
                    </CardContent>
                     <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Maximize className="h-4 w-4 text-muted-foreground" />
                    </div>
                </Card>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] bg-background/80 backdrop-blur-md border-primary/20">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-foreground">
                        <Waves className="h-5 w-5 text-primary" />
                        Container Level
                    </DialogTitle>
                </DialogHeader>
                <div className="flex items-center justify-center py-8">
                     <LevelGauge level={data?.level ?? 0} size={300} />
                </div>
            </DialogContent>
        </Dialog>


        {/* Weight Display Card & Modal */}
         <Dialog open={openModal === 'weight'} onOpenChange={(isOpen) => !isOpen && setOpenModal(null)}>
            <DialogTrigger asChild onClick={() => setOpenModal('weight')}>
                <Card className={`${cardBaseClasses} ${cardOpacityClass} lg:col-span-2`}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Current Weight</CardTitle>
                        <Power className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent className="flex items-center justify-center pt-6 min-h-[224px]">
                        <WeightDisplay weight={data?.weight ?? 0} />
                    </CardContent>
                     <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Maximize className="h-4 w-4 text-muted-foreground" />
                    </div>
                </Card>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] bg-background/80 backdrop-blur-md border-primary/20">
                <DialogHeader>
                     <DialogTitle className="flex items-center gap-2 text-foreground">
                        <Power className="h-5 w-5 text-primary" />
                        Current Weight
                    </DialogTitle>
                </DialogHeader>
                <div className="flex items-center justify-center py-8">
                    <WeightDisplay weight={data?.weight ?? 0} size="large" />
                </div>
            </DialogContent>
        </Dialog>

         {/* Weight Chart Card & Modal */}
        <Dialog open={openModal === 'chart'} onOpenChange={(isOpen) => !isOpen && setOpenModal(null)}>
             <DialogTrigger asChild onClick={() => setOpenModal('chart')}>
                <Card className={`${cardBaseClasses} ${cardOpacityClass} lg:col-span-3`}>
                    <div className="relative">
                        <WeightChart data={history} />
                        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                           <Maximize className="h-4 w-4 text-muted-foreground" />
                        </div>
                    </div>
                </Card>
             </DialogTrigger>
            <DialogContent className="max-w-4xl h-[80vh] bg-background/80 backdrop-blur-md border-primary/20 flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-foreground">
                         <LineChart className="h-5 w-5 text-primary" />
                        Weight Over Time
                    </DialogTitle>
                </DialogHeader>
                <div className="flex-grow h-full w-full -ml-4 -mr-4 -mb-4">
                     <WeightChart data={history} isModal={true} />
                </div>
            </DialogContent>
        </Dialog>


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
