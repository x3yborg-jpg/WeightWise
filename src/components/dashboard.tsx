
"use client";

import { useState, useEffect, useRef } from 'react';
import { type LoadCellData, useLoadcellData } from '@/hooks/use-loadcell-data';
import { WeightDisplay } from '@/components/weight-display';
import { LevelGauge } from '@/components/level-gauge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, WifiOff, Wifi, Power, Waves, LineChart, Maximize, Siren } from 'lucide-react';
import { WeightChart } from './weight-chart';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAuth } from '@/context/auth-context';
import { cn } from '@/lib/utils';
import { playWarningSound } from '@/lib/audio';
import { useToast } from '@/hooks/use-toast';
import { useSettings } from '@/context/settings-context';
import { useBins } from '@/context/bin-context';

interface DashboardProps {
    binId: string;
    data: LoadCellData | null;
    history: LoadCellData[];
    isConnected: boolean;
    isAlarmActive: boolean;
    error: string | null;
}

function DashboardSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
      {/* Level Card Skeleton */}
      <Card className="md:col-span-1 bg-card/50 backdrop-blur-sm border-dashed">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Container Level</CardTitle>
            <Waves className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="flex items-center justify-center pt-6">
             <Skeleton className="h-[200px] w-[200px] rounded-full" />
        </CardContent>
      </Card>

      {/* Weight Card Skeleton */}
      <Card className="md:col-span-2 bg-card/50 backdrop-blur-sm border-dashed">
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
      <Card className="md:col-span-3 bg-card/50 backdrop-blur-sm border-dashed">
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

export function Dashboard({ binId, data, history, isConnected, isAlarmActive, error }: DashboardProps) {
  const [openModal, setOpenModal] = useState<'level' | 'weight' | 'chart' | null>(null);
  const { settings } = useSettings();
  const { bins } = useBins();
  const { toast } = useToast();
  const warningIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasTriggeredInitialWarning = useRef(false);

   const triggerDashboardWarning = () => {
      const currentBin = bins.find(b => b.id === binId);
      if (!currentBin || !data) return;

      playWarningSound();
      toast({
          title: `URGENT: ${currentBin.name} Level High`,
          description: `The bin level is at ${data.level.toFixed(1)}%. Please empty it soon.`,
          variant: 'destructive',
          duration: 3000,
      });
  };
  

  useEffect(() => {
    if (isAlarmActive) {
        if (!hasTriggeredInitialWarning.current) {
            triggerDashboardWarning();
            hasTriggeredInitialWarning.current = true;
        }

        if (warningIntervalRef.current) clearInterval(warningIntervalRef.current);
        warningIntervalRef.current = setInterval(() => {
            triggerDashboardWarning();
        }, settings.notificationInterval);

    } else {
        hasTriggeredInitialWarning.current = false;
        if (warningIntervalRef.current) {
            clearInterval(warningIntervalRef.current);
        }
    }

    return () => {
        if (warningIntervalRef.current) {
            clearInterval(warningIntervalRef.current);
        }
    };
  }, [isAlarmActive, binId, settings.notificationInterval, bins, toast, data]);

  const ConnectionStatusAlert = () => (
     <Alert className="md:col-span-3 bg-yellow-500/10 border-yellow-500/50 text-yellow-400">
        <WifiOff className="h-4 w-4" />
        <AlertTitle>Device Offline</AlertTitle>
        <AlertDescription>The device is not sending data. Showing last known values.</AlertDescription>
      </Alert>
  );
  
  const HighLevelWarningAlert = () => (
     <Alert variant="destructive" className="md:col-span-3 animate-pulse">
        <Siren className="h-4 w-4" />
        <AlertTitle>URGENT: High Bin Level!</AlertTitle>
        <AlertDescription>The container level is critical. Please arrange for emptying as soon as possible.</AlertDescription>
      </Alert>
  );


  if (error) {
    return (
      <Alert variant="destructive" className="bg-destructive/10">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }
  
  const cardBaseClasses = "bg-card/50 backdrop-blur-sm transition-all duration-300 ease-in-out cursor-pointer hover:bg-card/80 hover:scale-[1.03] hover:border-primary/50 relative group";

  return (
    <>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        {isAlarmActive && <HighLevelWarningAlert />}
        {!isConnected && <ConnectionStatusAlert />}

        {/* Level Gauge Card & Modal */}
        <Dialog open={openModal === 'level'} onOpenChange={(isOpen) => !isOpen && setOpenModal(null)}>
            <DialogTrigger asChild onClick={() => setOpenModal('level')}>
                <Card className={cn(cardBaseClasses, "md:col-span-1", isAlarmActive && "border-destructive hover:border-destructive/80")}>
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
                <div className="flex items-center justify-center pt-8">
                     <LevelGauge level={data?.level ?? 0} size={300} />
                </div>
                 <DialogHeader className="pt-4">
                    <DialogTitle className="flex items-center justify-center gap-2 text-foreground">
                        <Waves className="h-5 w-5 text-primary" />
                        Container Level
                    </DialogTitle>
                </DialogHeader>
            </DialogContent>
        </Dialog>


        {/* Weight Display Card & Modal */}
         <Dialog open={openModal === 'weight'} onOpenChange={(isOpen) => !isOpen && setOpenModal(null)}>
            <DialogTrigger asChild onClick={() => setOpenModal('weight')}>
                <Card className={cn(cardBaseClasses, "md:col-span-2")}>
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
                <Card className={cn(cardBaseClasses, "md:col-span-3")}>
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


         <div className="md:col-span-3 mt-4 flex items-center justify-between text-sm text-muted-foreground">
             <div className="flex items-center gap-2">
                {isConnected ? (
                    <div className="flex items-center gap-2 text-green-400">
                        <Wifi className="h-4 w-4 animate-pulse" />
                        <span>Device Online</span>
                    </div>
                ) : (
                    <div className="flex items-center gap-2 text-yellow-500">
                        <WifiOff className="h-4 w-4" />
                        <span>Awaiting connection...</span>
                    </div>
                )}
            </div>
        </div>
    </div>
    </>
  );
}

    

    

    