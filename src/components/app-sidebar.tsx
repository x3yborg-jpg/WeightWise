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
import { Archive, LogOut, Package2 } from "lucide-react"
import { usePathname } from "next/navigation"
import Link from 'next/link';
import { useAuth } from "@/context/auth-context"

const BINS = [
    { id: "bin1", name: "Bin 1" },
    // { id: "bin2", name: "Bin 2" }, // Future bins can be added here
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
              <Link href={`/bin/${bin.id}`} legacyBehavior passHref>
                <SidebarMenuButton
                  isActive={pathname === `/bin/${bin.id}`}
                  asChild
                >
                  <Archive />
                  <span>{bin.name}</span>
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
