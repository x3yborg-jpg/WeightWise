
"use client";

import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, use } from 'react';
import { Dashboard } from '@/components/dashboard';
import { Settings } from 'lucide-react';
import { AppSidebar } from '@/components/app-sidebar';
import { Button } from '@/components/ui/button';
import { SettingsDialog } from '@/components/settings-dialog';
import { useBins } from '@/context/bin-context';
import ConcentricLoader from '@/components/ui/concentric-loader';

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
  const currentBin = bins.find(b => b.id === binId);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const loading = authLoading || binsLoading;

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
        <main className="relative flex min-h-screen flex-1 flex-col p-4 md:p-8">
            <div 
                className="absolute inset-0 -z-10 h-full w-full bg-background 
                        bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] 
                        bg-[size:14px_24px]"
            >
                <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-primary/20 opacity-20 blur-[100px]"></div>
            </div>
            
            <div className="flex-1 flex flex-col items-center justify-center">
                <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-12">
                      <div className="flex items-center justify-center gap-4">
                        <h1 className="text-4xl font-bold tracking-tighter text-foreground sm:text-5xl md:text-6xl font-heading capitalize">
                            {currentBin?.name ?? binId.replace('-', ' ')}
                        </h1>
                        {currentBin && (
                          <SettingsDialog bin={currentBin}>
                             <Button variant="ghost" size="icon">
                                <Settings className="h-6 w-6 text-muted-foreground transition-transform hover:rotate-45" />
                             </Button>
                          </SettingsDialog>
                        )}
                      </div>
                      <p className="mt-4 text-lg text-muted-foreground">
                          Live Load Cell Monitoring
                      </p>
                    </div>
                    <Dashboard binId={binId} />
                </div>
            </div>
        </main>
    </div>
  );
}
