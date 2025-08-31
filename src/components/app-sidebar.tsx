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
import { Archive, LogOut, Package2, MapPin, Wifi, WifiOff, Pencil, X, Check } from "lucide-react"
import { usePathname } from "next/navigation"
import Link from 'next/link';
import { useAuth } from "@/context/auth-context"
import { useEffect, useState } from "react";
import { onValue, ref } from "firebase/database";
import { database } from "@/lib/firebase";
import { Input } from "./ui/input";
import { Button } from "./ui/button";

interface BinConfig {
    id: string;
    name: string;
    deviceId: string;
    location: string;
}

const INITIAL_BINS_CONFIG: BinConfig[] = [
    { id: "bin1", name: "Main Warehouse Bin", deviceId: "DEV-1001", location: "Warehouse A" },
];

interface BinStatus {
    [key: string]: boolean;
}

export function AppSidebar() {
  const pathname = usePathname();
  const { logout } = useAuth();
  const [binStatus, setBinStatus] = useState<BinStatus>({});
  const [bins, setBins] = useState<BinConfig[]>(INITIAL_BINS_CONFIG);
  const [editingBinId, setEditingBinId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<{name: string, location: string}>({ name: '', location: '' });


  useEffect(() => {
    const statusListeners: (() => void)[] = [];

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

        statusListeners.push(() => {
            clearInterval(timeout);
        });
    });

    return () => {
        statusListeners.forEach(cleanup => cleanup());
    }
  }, [bins]);

  const handleEditClick = (bin: BinConfig) => {
    setEditingBinId(bin.id);
    setEditFormData({ name: bin.name, location: bin.location });
  };

  const handleCancelEdit = () => {
    setEditingBinId(null);
  };

  const handleSaveEdit = () => {
    if (!editingBinId) return;
    setBins(prevBins => 
        prevBins.map(b => 
            b.id === editingBinId ? { ...b, name: editFormData.name, location: editFormData.location } : b
        )
    );
    setEditingBinId(null);
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditFormData(prevData => ({ ...prevData, [name]: value }));
  };

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
            const isEditing = editingBinId === bin.id;

            return (
                <SidebarMenuItem key={bin.id}>
                    <div className="relative">
                        {isEditing ? (
                             <div className="p-2 space-y-3 bg-accent/50 rounded-md">
                                <Input 
                                    name="name"
                                    value={editFormData.name} 
                                    onChange={handleInputChange}
                                    className="h-8 bg-input/80"
                                />
                                <Input
                                    name="location"
                                    value={editFormData.location} 
                                    onChange={handleInputChange}
                                    className="h-8 bg-input/80"
                                />
                                 <div className="flex justify-end gap-2">
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCancelEdit}>
                                        <X className="h-4 w-4" />
                                    </Button>
                                    <Button variant="default" size="icon" className="h-7 w-7" onClick={handleSaveEdit}>
                                        <Check className="h-4 w-4" />
                                    </Button>
                                 </div>
                             </div>
                        ) : (
                            <Link href={`/bin/${bin.id}`}>
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
                        )}
                         {isActive && !isEditing && (
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="absolute top-1 right-1 h-6 w-6"
                                onClick={() => handleEditClick(bin)}
                            >
                                <Pencil className="h-3 w-3" />
                            </Button>
                        )}
                    </div>
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
