
"use client";

import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { AppSidebar } from '@/components/app-sidebar';
import ConcentricLoader from '@/components/ui/concentric-loader';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
       <div className="flex min-h-screen w-full">
         <AppSidebar />
         <main className="flex-1 flex items-center justify-center bg-background">
            <ConcentricLoader />
         </main>
       </div>
    );
  }

  return (
    <div className="flex">
      <AppSidebar />
      <main className="flex-1 min-h-screen">
          <div 
            className="relative flex h-full w-full flex-col items-center justify-center p-4 md:p-8"
          >
             <div 
              className="absolute inset-0 -z-10 h-full w-full bg-background 
                         bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] 
                         bg-[size:14px_24px]"
            >
              <div className="absolute left-0 right-0 top-1/4 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-primary/20 opacity-20 blur-[100px]"></div>
            </div>

            <div className="text-center p-8 border border-dashed border-border rounded-xl bg-card/20 backdrop-blur-sm">
                <div className="flex justify-center items-center mb-4">
                  <div className="p-3 bg-primary/10 rounded-full border-2 border-primary/20">
                    <ArrowLeft className="h-8 w-8 text-primary animate-pulse" />
                  </div>
                </div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground font-heading">
                    Select a Bin
                </h1>
                <p className="mt-2 text-base text-muted-foreground">
                    Choose a bin from the sidebar to view its live data.
                </p>
            </div>
          </div>
      </main>
    </div>
  );
}
