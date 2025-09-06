
"use client"

import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  useSidebar
} from "@/components/ui/sidebar"
import { Archive, LogOut, MapPin, Wifi, WifiOff, Bell, AlertCircle, Shield, User } from "lucide-react"
import { usePathname } from "next/navigation"
import Link from 'next/link';
import Image from "next/image";
import { useAuth, UserRole } from "@/context/auth-context"
import { useEffect, useState } from "react";
import { onValue, ref, off } from "firebase/database";
import { database } from "@/lib/firebase";
import { useBins, type BinConfig } from "@/context/bin-context";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "./ui/sheet";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { GlobalSettingsDialog } from "./global-settings-dialog";
import { AdminPanelDialog } from "./admin-panel";
import { cn } from "@/lib/utils";
import { HEARTBEAT_TIMEOUT } from "@/hooks/use-loadcell-data"


interface BinState {
    isOnline: boolean;
    isAlarmActive: boolean;
    level: number;
}

interface AllBinsState {
    [key: string]: BinState;
}

export function AppSidebar() {
  const pathname = usePathname();
  const { logout, userRole } = useAuth();
  const { isMobile, setOpenMobile } = useSidebar();
  const [allBinsState, setAllBinsState] = useState<AllBinsState>({});
  const { bins } = useBins();

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

    // Also set an interval to re-check the online status periodically
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
    }, 60000); // Check every minute


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

  const handleLinkClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  }


  return (
    <Sidebar>
      <SidebarContent>
        <SidebarHeader>
          <div className="flex items-center justify-between w-full">
            <GlobalSettingsDialog>
                <div className="flex items-center gap-2 cursor-pointer group">
                    <Image src="/trash-basket.png" alt="WeightWise Logo" width={28} height={28} className="transition-transform group-hover:rotate-12" />
                    <span className="text-lg font-semibold font-heading">WeightWise</span>
                </div>
            </GlobalSettingsDialog>
            <Sheet>
                <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="relative">
                        <Bell className={`h-5 w-5 ${activeWarnings.length > 0 ? 'text-destructive animate-pulse' : 'text-muted-foreground'}`} />
                         {activeWarnings.length > 0 && (
                            <span className="absolute top-0 right-0 flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-destructive"></span>
                            </span>
                         )}
                    </Button>
                </SheetTrigger>
                <SheetContent className="bg-card/90 backdrop-blur-sm">
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
                                            <Link href={`/bin/${warning.id}`} onClick={handleLinkClick}>View Bin</Link>
                                        </Button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </SheetContent>
            </Sheet>
          </div>
        </SidebarHeader>
        <SidebarMenu>
          {bins.map(bin => {
            const state = allBinsState[bin.id];
            const isOnline = state?.isOnline ?? false;
            const isActive = pathname === `/bin/${bin.id}`;
            const hasWarning = state?.isAlarmActive ?? false;

            return (
                <SidebarMenuItem key={bin.id} onClick={handleLinkClick}>
                    <Link href={`/bin/${bin.id}`} passHref>
                        <SidebarMenuButton
                        isActive={isActive}
                        className="h-auto flex-col items-start"
                        >
                        <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-2 font-semibold text-foreground">
                                <Archive className={cn("h-4 w-4", hasWarning && "text-destructive animate-pulse")} />
                                <span>{bin.name}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs">
                            {isOnline ? <Wifi className="h-3 w-3 text-green-400" /> : <WifiOff className="h-3 w-3 text-red-500" />}
                            <span className={isOnline ? 'text-green-400' : 'text-red-500'}>
                                {isOnline ? 'Online' : 'Offline'}
                            </span>
                            </div>
                        </div>
                        <div className="pl-6 text-xs text-muted-foreground space-y-1 mt-1">
                            <div className="flex items-center gap-2">
                                <MapPin className="h-3 w-3" />
                                <span>{bin.location}</span>
                            </div>
                            <p className="font-mono text-[10px]">ID: {bin.deviceId}</p>
                        </div>
                        </SidebarMenuButton>
                    </Link>
                </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
            {userRole === 'admin' && (
                <SidebarMenuItem>
                    <AdminPanelDialog>
                         <SidebarMenuButton>
                            <Shield />
                            <span>Admin Panel</span>
                         </SidebarMenuButton>
                    </AdminPanelDialog>
                </SidebarMenuItem>
            )}
           <SidebarMenuItem>
             <SidebarMenuButton onClick={logout}>
                <LogOut />
                <span>Logout</span>
             </SidebarMenuButton>
           </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
