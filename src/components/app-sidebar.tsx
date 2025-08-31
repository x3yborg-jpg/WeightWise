
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
import { onValue, ref, off } from "firebase/database";
import { database } from "@/lib/firebase";
import { useBins } from "@/context/bin-context";

interface BinStatus {
    [key: string]: boolean;
}

export function AppSidebar() {
  const pathname = usePathname();
  const { logout } = useAuth();
  const [binStatus, setBinStatus] = useState<BinStatus>({});
  const { bins } = useBins();


  useEffect(() => {
    if (!bins.length) return;

    const listeners: (() => void)[] = [];

    bins.forEach(bin => {
        const dbRef = ref(database, `${bin.id}/IsON`);
        const listener = onValue(dbRef, (snapshot) => {
            const isOnline = snapshot.exists() && snapshot.val() !== 0;
            setBinStatus(prevStatus => ({...prevStatus, [bin.id]: isOnline }));
        });

        const timeout = setInterval(() => {
             const dbRefCheck = ref(database, `${bin.id}/IsON`);
             onValue(dbRefCheck, (snapshot) => {
                if(!snapshot.exists() || snapshot.val() === 0){
                     setBinStatus(prevStatus => ({...prevStatus, [bin.id]: false}));
                }
             }, { onlyOnce: true });
        }, 35 * 60 * 1000);

        listeners.push(() => {
            clearInterval(timeout);
            off(dbRef, 'value', listener);
        });
    });

    return () => {
        listeners.forEach(cleanup => cleanup());
    }
  }, [bins]);

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
          {bins.map(bin => {
            const isOnline = binStatus[bin.id] ?? false;
            const isActive = pathname === `/bin/${bin.id}`;

            return (
                <SidebarMenuItem key={bin.id}>
                    <Link href={`/bin/${bin.id}`} passHref>
                        <SidebarMenuButton
                        isActive={isActive}
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
