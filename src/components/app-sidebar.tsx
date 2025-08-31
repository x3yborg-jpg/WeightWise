"use client"

import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
  SidebarFooter
} from "@/components/ui/sidebar"
import { Archive, LogOut, Package2, MapPin } from "lucide-react"
import { usePathname } from "next/navigation"
import Link from 'next/link';
import { useAuth } from "@/context/auth-context"

const BINS = [
    { id: "bin1", name: "Main Warehouse Bin", deviceId: "DEV-1001", location: "Warehouse A" },
    // { id: "bin2", name: "Bin 2", deviceId: "DEV-1002", location: "Warehouse B" }, 
];

export function AppSidebar() {
  const pathname = usePathname();
  const { logout } = useAuth();
  
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
          {BINS.map(bin => (
            <SidebarMenuItem key={bin.id}>
              <Link href={`/bin/${bin.id}`}>
                <SidebarMenuButton
                  isActive={pathname === `/bin/${bin.id}`}
                  className="h-auto flex-col items-start"
                >
                  <div className="flex items-center gap-2 font-semibold text-foreground">
                    <Archive className="h-4 w-4" />
                    <span>{bin.name}</span>
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
          ))}
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
