
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
import { useBins } from '@/context/bin-context';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AddBinDialogProps {
  children: React.ReactNode;
}

export function AddBinDialog({ children }: AddBinDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const { addBin, loading } = useBins();
  const { toast } = useToast();

  const handleAdd = async () => {
    if (!name || !location) {
        toast({
            variant: "destructive",
            title: "Missing Information",
            description: "Please provide both a name and a location for the new bin.",
        });
        return;
    }
    await addBin(name, location);
    toast({
        title: "Bin Added!",
        description: `Bin '${name}' has been successfully created.`,
    });
    setIsOpen(false);
    setName('');
    setLocation('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-card/90 backdrop-blur-sm">
        <DialogHeader>
          <DialogTitle>Add a New Bin</DialogTitle>
          <DialogDescription>
            Enter the details for your new bin. A unique Device ID will be generated automatically.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="add-name" className="text-right">
              Name
            </Label>
            <Input
              id="add-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="col-span-3"
              placeholder="e.g., Warehouse Shelf A"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="add-location" className="text-right">
              Location
            </Label>
            <Input
              id="add-location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="col-span-3"
              placeholder="e.g., Main Building, Floor 2"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
          <Button type="submit" onClick={handleAdd} disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Add Bin
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
