import { Dashboard } from '@/components/dashboard';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-8 md:p-12">
      <div className="w-full max-w-md text-center">
        <h1 className="text-4xl font-bold text-foreground/90 font-headline">
          WeightWise Dashboard
        </h1>
        <p className="text-muted-foreground mt-2 mb-8">
          Live Load Cell Monitoring
        </p>
        <Dashboard />
      </div>
    </main>
  );
}
