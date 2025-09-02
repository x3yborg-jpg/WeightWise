
"use client";

import { usePathname } from 'next/navigation';
import { SidebarProvider } from '@/components/ui/sidebar';

const AUTH_ROUTES = ['/login'];

export function AppWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthRoute = AUTH_ROUTES.includes(pathname);

  if (isAuthRoute) {
    return <div className="relative flex min-h-screen flex-col">{children}</div>;
  }

  return (
    <SidebarProvider>
        <div className="relative flex min-h-screen flex-col">
            {children}
        </div>
    </SidebarProvider>
  );
}
