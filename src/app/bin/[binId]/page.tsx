
"use client";

import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, use, useState, useMemo } from 'react';
import { Dashboard } from '@/components/dashboard';
import { Clock, Settings } from 'lucide-react';
import { AppSidebar } from '@/components/app-sidebar';
import { Button } from '@/components/ui/button';
import { SettingsDialog } from '@/components/settings-dialog';
import { useBins } from '@/context/bin-context';
import ConcentricLoader from '@/components/ui/concentric-loader';
import { useLoadcellData } from '@/hooks/use-loadcell-data';
import { formatDistanceToNow } from 'date-fns';

interface BinPageProps {
    params: Promise<{
        binId: string;
    }>
}

export default function BinPage({ params }: BinPageProps) {
  const { binId } = use(params);
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { bins, loading: binsLoading } = useBins();
  const currentBin = useMemo(() => bins.find(b => b.id === binId), [bins, binId]);
  const { data, history, loading: dashboardLoading, error, isConnected, isAlarmActive } = useLoadcellData(binId);
  const [lastSeenText, setLastSeenText] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (data?.lastSeen) {
      const updateText = () => {
        setLastSeenText(formatDistanceToNow(new Date(data.lastSeen), { addSuffix: true }));
      };
      updateText();
      const intervalId = setInterval(updateText, 10000); // Update every 10 seconds
      return () => clearInterval(intervalId);
    } else {
        setLastSeenText('');
    }
  }, [data?.lastSeen]);


  const loading = authLoading || binsLoading || dashboardLoading;

  if (loading || !user) {
    return (
      <div className="flex h-screen w-screen items-center justify-center fixed inset-0 bg-background/80 backdrop-blur-sm z-50">
        <ConcentricLoader />
      </div>
    );
  }
  
  if (!currentBin && !loading) {
    return (
      <div className="flex">
        <AppSidebar />
        <main className="flex-1 flex items-center justify-center p-4 md:p-8">
            <div className="text-center">
                <h1 className="text-2xl font-semibold text-destructive">Bin not found</h1>
                <p className="text-muted-foreground">The bin with ID '{binId}' does not exist.</p>
                <Button onClick={() => router.push('/')} variant="outline" className="mt-4">Go Back</Button>
            </div>
        </main>
      </div>
    )
  }

  return (
    <div className="flex">
        <AppSidebar />
        <main className="relative flex min-h-screen flex-1 flex-col items-center justify-center p-4 md:p-8">
            <div 
                className="absolute inset-0 -z-10 h-full w-full bg-background 
                        bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] 
                        bg-[size:14px_24px]"
            >
                <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-primary/20 opacity-20 blur-[100px]"></div>
            </div>
            
            <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
                 {currentBin && (
                    <div className="absolute top-0 right-4">
                        <SettingsDialog bin={currentBin}>
                            <Button variant="ghost" size="icon">
                                <Settings className="h-6 w-6 text-muted-foreground transition-transform hover:rotate-45" />
                            </Button>
                        </SettingsDialog>
                    </div>
                 )}

                <div className="text-center mb-12">
                  <div className="flex items-center justify-center gap-4">
                    <h1 className="text-4xl font-bold tracking-tighter text-foreground sm:text-5xl md:text-6xl font-heading capitalize">
                        {currentBin?.name ?? binId.replace('-', ' ')}
                    </h1>
                  </div>
                  <p className="mt-4 text-lg text-muted-foreground">
                      Live Load Cell Monitoring
                  </p>
                  {lastSeenText && (
                    <div className="flex items-center justify-center gap-2 mt-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>Last updated {lastSeenText}</span>
                    </div>
                  )}
                </div>
                <Dashboard 
                    binId={binId} 
                    data={data}
                    history={history}
                    isConnected={isConnected}
                    isAlarmActive={isAlarmActive}
                    error={error}
                />
            </div>
        </main>
    </div>
  );
}
