
"use client";

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useBins, type BinConfig } from '@/context/bin-context';
import { Loader2, Trash2 } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

interface SettingsDialogProps {
  bin: BinConfig;
  children: React.ReactNode;
}

export function SettingsDialog({ bin, children }: SettingsDialogProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [name, setName] = useState(bin.name);
  const [location, setLocation] = useState(bin.location);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const { updateBin, deleteBin, loading } = useBins();
  const { reauthenticate } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const handleSave = async () => {
    await updateBin(bin.id, { name, location });
    setIsDialogOpen(false);
    toast({ title: "Bin Updated", description: `'${name}' has been updated successfully.` });
  };

  const handleDelete = async () => {
    setDeleteError(null);
    try {
      await reauthenticate(password);
      await deleteBin(bin.id);
      setIsAlertOpen(false);
      setIsDialogOpen(false);
      router.push('/');
      toast({ title: "Bin Deleted", description: `The bin has been permanently deleted.` });
    } catch (error: any) {
      console.error("Delete error:", error);
      setDeleteError(error.code === 'auth/wrong-password' ? 'Incorrect password. Please try again.' : 'An error occurred during deletion.');
    }
  }

  const handleDialogStateChange = (open: boolean) => {
    if (!open) {
      // Reset fields if dialog is closed without saving
      setName(bin.name);
      setLocation(bin.location);
    }
    setIsDialogOpen(open);
  };
  
  const handleAlertStateChange = (open: boolean) => {
    if(!open) {
        setDeleteError(null);
        setPassword('');
    }
    setIsAlertOpen(open);
  }

  return (
    <>
    <Dialog open={isDialogOpen} onOpenChange={handleDialogStateChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-card/90 backdrop-blur-sm">
        <DialogHeader>
          <DialogTitle>Edit Bin Settings</DialogTitle>
          <DialogDescription>
            Change the details for '{bin.name}'. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Name
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="location" className="text-right">
              Location
            </Label>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="col-span-3"
            />
          </div>
           <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="deviceId" className="text-right">
              Device ID
            </Label>
            <Input
              id="deviceId"
              value={bin.deviceId}
              disabled
              className="col-span-3 bg-muted/50"
            />
          </div>
        </div>
        <DialogFooter className="justify-between sm:justify-between">
           <Button variant="destructive" onClick={() => setIsAlertOpen(true)}>
             <Trash2 className="mr-2 h-4 w-4" />
             Delete Bin
           </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button type="submit" onClick={handleSave} disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save changes
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <AlertDialog open={isAlertOpen} onOpenChange={handleAlertStateChange}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the bin
                and all of its associated data from our servers.
            </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-2">
                <Label htmlFor="password">Please enter your password to confirm:</Label>
                <Input 
                    id="password" 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••" 
                />
                {deleteError && <p className="text-sm text-destructive">{deleteError}</p>}
            </div>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setIsAlertOpen(false)}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} disabled={loading || !password}>
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Confirm Deletion
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
