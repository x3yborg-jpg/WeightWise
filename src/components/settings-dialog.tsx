
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useBins, type BinConfig } from '@/context/bin-context';
import { Loader2 } from 'lucide-react';

interface SettingsDialogProps {
  bin: BinConfig;
  children: React.ReactNode;
}

export function SettingsDialog({ bin, children }: SettingsDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState(bin.name);
  const [location, setLocation] = useState(bin.location);
  const { updateBin, loading } = useBins();

  const handleSave = async () => {
    await updateBin(bin.id, { name, location });
    setIsOpen(false);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      // Reset fields if dialog is closed without saving
      setName(bin.name);
      setLocation(bin.location);
    }
    setIsOpen(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
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
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
          <Button type="submit" onClick={handleSave} disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
