
"use client";

import { useSidebar } from "@/components/ui/sidebar";
import { Button } from "./ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "./ui/sheet";
import { AlertCircle, Bell, Settings, Shield } from "lucide-react";
import { useBins } from "@/context/bin-context";
import { useEffect, useState } from "react";
import { ref, onValue, off } from "firebase/database";
import { database } from "@/lib/firebase";
import { HEARTBEAT_TIMEOUT } from "@/hooks/use-loadcell-data";
import { Badge } from "./ui/badge";
import Link from "next/link";
import Image from "next/image";
import { GlobalSettingsDialog } from "./global-settings-dialog";
import { AdminPanelDialog } from "./admin-panel";
import { useAuth } from "@/context/auth-context";
import { cn } from "@/lib/utils";


interface BinState {
    isOnline: boolean;
    isAlarmActive: boolean;
    level: number;
}

interface AllBinsState {
    [key: string]: BinState;
}


export function MobileHeader() {
  const { isMobile, toggleSidebar } = useSidebar();
  const [allBinsState, setAllBinsState] = useState<AllBinsState>({});
  const { bins } = useBins();
  const { userRole } = useAuth();

  useEffect(() => {
    if (!bins.length) return;

    const listeners: (() => void)[] = [];

    bins.forEach(bin => {
        const binRef = ref(database, bin.id);
        const listener = onValue(binRef, (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.val();
                
                const now = Date.now();
                const lastSeenTime = data.lastSeen ?? 0;
                const isOnline = now - lastSeenTime < HEARTBEAT_TIMEOUT;
                
                setAllBinsState(prevState => ({
                    ...prevState,
                    [bin.id]: {
                        isOnline: isOnline,
                        isAlarmActive: data.levelAlarmSent || data.weightAlarmSent,
                        level: data.level ?? 0,
                    }
                }));
            }
        });

        listeners.push(() => off(binRef, 'value', listener));
    });

    const intervalId = setInterval(() => {
        setAllBinsState(prevState => {
            const newState = { ...prevState };
            const now = Date.now();
            bins.forEach(bin => {
                 const binRef = ref(database, bin.id);
                 onValue(binRef, (snapshot) => {
                    if (snapshot.exists()) {
                        const data = snapshot.val();
                        const lastSeenTime = data.lastSeen ?? 0;
                        const isOnline = now - lastSeenTime < HEARTBEAT_TIMEOUT;
                        if(newState[bin.id]) {
                            newState[bin.id].isOnline = isOnline;
                        }
                    }
                 }, { onlyOnce: true });
            });
            return newState;
        });
    }, 60000); 


    return () => {
        listeners.forEach(cleanup => cleanup());
        clearInterval(intervalId);
    }
  }, [bins]);

  const activeWarnings = bins
    .filter(bin => allBinsState[bin.id]?.isAlarmActive)
    .map(bin => ({
        ...bin,
        level: allBinsState[bin.id]?.level ?? 0,
    }));


  if (!isMobile) return null;

  return (
    <div className="md:hidden fixed top-0 left-0 right-0 z-40 flex h-14 items-center justify-between gap-2 border-b bg-background/80 px-4 backdrop-blur-sm">
      <div onClick={toggleSidebar} className="flex items-center gap-2 cursor-pointer group">
         <Image 
            src="/trash-basket.png" 
            alt="WeightWise Logo" 
            width={24} 
            height={24} 
            className={cn("transition-transform group-hover:rotate-12", {
                "animate-swing": activeWarnings.length > 0
            })}
         />
         <span className="font-semibold font-heading">WeightWise</span>
      </div>
      <div className="flex items-center gap-1">
         {userRole === 'admin' && (
            <AdminPanelDialog>
                 <Button variant="ghost" size="icon">
                    <Shield className="h-5 w-5 text-muted-foreground transition-transform hover:text-primary" />
                </Button>
            </AdminPanelDialog>
         )}
         <Sheet>
            <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Bell className={`h-5 w-5 ${activeWarnings.length > 0 ? 'text-destructive animate-pulse' : 'text-muted-foreground'}`} />
                        {activeWarnings.length > 0 && (
                        <span className="absolute top-1 right-1 flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-destructive"></span>
                        </span>
                        )}
                </Button>
            </SheetTrigger>
            <SheetContent>
                <SheetHeader>
                    <SheetTitle className="flex items-center gap-2">
                        <AlertCircle className="h-6 w-6 text-destructive" />
                        Active Warnings
                    </SheetTitle>
                </SheetHeader>
                <div className="mt-4 space-y-4">
                    {activeWarnings.length === 0 ? (
                        <p className="text-muted-foreground text-sm">No active warnings. All systems are normal.</p>
                    ) : (
                        activeWarnings.map(warning => (
                            <div key={warning.id} className="relative p-3 rounded-lg border border-destructive/50 bg-destructive/10">
                                <h3 className="font-semibold text-destructive-foreground">{warning.name}</h3>
                                <p className="text-sm text-muted-foreground">{warning.location}</p>
                                <div className="mt-2 flex items-center justify-between">
                                    <Badge variant="destructive">Level: {warning.level.toFixed(1)}%</Badge>
                                    <Button asChild variant="secondary" size="sm">
                                        <Link href={`/bin/${warning.id}`}>View Bin</Link>
                                    </Button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </SheetContent>
        </Sheet>
        <GlobalSettingsDialog>
            <Button variant="ghost" size="icon">
                <Settings className="h-5 w-5 text-muted-foreground transition-transform hover:rotate-45" />
            </Button>
        </GlobalSettingsDialog>
      </div>
    </div>
  );
}
