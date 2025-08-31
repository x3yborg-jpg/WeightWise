
import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { cn } from '@/lib/utils';
import { Inter, Space_Grotesk as SpaceGrotesk } from "next/font/google"
import { AuthProvider } from '@/context/auth-context';
import { BinProvider } from '@/context/bin-context';
import { SettingsProvider } from '@/context/settings-context';
import { AppWrapper } from './app-wrapper';

const fontSans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
})

const fontHeading = SpaceGrotesk({
  subsets: ["latin"],
  variable: "--font-heading",
})

export const metadata: Metadata = {
  title: 'WeightWise Dashboard',
  description: 'A visually engaging, animated real-time dashboard to display load cell data from a Firebase Realtime Database.',
  icons: {
    icon: '/trash-basket.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn(
        "min-h-screen bg-background font-sans antialiased",
        fontSans.variable,
        fontHeading.variable
      )}>
        <AuthProvider>
          <SettingsProvider>
            <BinProvider>
               <AppWrapper>
                  {children}
               </AppWrapper>
               <Toaster />
            </BinProvider>
          </SettingsProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
