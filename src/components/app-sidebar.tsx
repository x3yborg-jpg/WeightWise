"use client"

import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter
} from "@/components/ui/sidebar"
import { Archive, LogOut, Package2, MapPin, Wifi, WifiOff } from "lucide-react"
import { usePathname } from "next/navigation"
import Link from 'next/link';
import { useAuth } from "@/context/auth-context"
import { useEffect, useState } from "react";
import { onValue, ref } from "firebase/database";
import { database } from "@/lib/firebase";

const BINS_CONFIG = [
    { id: "bin1", name: "Main Warehouse Bin", deviceId: "DEV-1001", location: "Warehouse A" },
];

interface BinStatus {
    [key: string]: boolean;
}

export function AppSidebar() {
  const pathname = usePathname();
  const { logout } = useAuth();
  const [binStatus, setBinStatus] = useState<BinStatus>({});

  useEffect(() => {
    const statusListeners: (() => void)[] = [];

    BINS_CONFIG.forEach(bin => {
        const dbRef = ref(database, `${bin.id}/IsON`);
        const listener = onValue(dbRef, (snapshot) => {
            setBinStatus(prevStatus => ({...prevStatus, [bin.id]: snapshot.exists() }));
        });

        // A basic timeout to consider offline if no update for a long time
        const timeout = setInterval(() => {
             const dbRefCheck = ref(database, `${bin.id}/IsON`);
             onValue(dbRefCheck, (snapshot) => {
                if(!snapshot.exists()){
                     setBinStatus(prevStatus => ({...prevStatus, [bin.id]: false}));
                }
             }, { onlyOnce: true });
        }, 35 * 60 * 1000); // Check every 35 mins

        statusListeners.push(() => {
            clearInterval(timeout);
            // Detach listener if needed, though onValue returns an unsubscribe function
        });
    });

    return () => {
        statusListeners.forEach(cleanup => cleanup());
    }
  }, []);
  
  return (
    <Sidebar>
      <SidebarContent>
        <SidebarHeader>
          <div className="flex items-center gap-2">
            <Package2 className="h-7 w-7 text-primary" />
            <span className="text-lg font-semibold font-heading">WeightWise</span>
          </div>
        </SidebarHeader>
        <SidebarMenu>
          {BINS_CONFIG.map(bin => {
            const isOnline = binStatus[bin.id] ?? false;
            return (
                <SidebarMenuItem key={bin.id}>
                <Link href={`/bin/${bin.id}`}>
                    <SidebarMenuButton
                    isActive={pathname === `/bin/${bin.id}`}
                    className="h-auto flex-col items-start"
                    >
                    <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2 font-semibold text-foreground">
                            <Archive className="h-4 w-4" />
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
