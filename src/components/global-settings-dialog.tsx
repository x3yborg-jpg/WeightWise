
"use client";

import { useEffect, useState } from 'react';
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
import { Label } from "@/components/ui/label";
import { Loader2, Settings, Clock, Percent } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useSettings } from '@/context/settings-context';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Slider } from './ui/slider';

interface GlobalSettingsDialogProps {
  children: React.ReactNode;
}

const intervalOptions = [
    { label: '30 Minutes', value: 30 * 60 * 1000 },
    { label: '1 Hour', value: 60 * 60 * 1000 },
    { label: '2 Hours', value: 2 * 60 * 60 * 1000 },
    { label: '4 Hours', value: 4 * 60 * 60 * 1000 },
];

export function GlobalSettingsDialog({ children }: GlobalSettingsDialogProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { settings, updateSettings, loading } = useSettings();
  const { toast } = useToast();

  const [notificationInterval, setNotificationInterval] = useState(settings.notificationInterval);
  const [warningThresholdLevel, setWarningThresholdLevel] = useState(settings.warningThresholdLevel);

  useEffect(() => {
    if(isDialogOpen) {
        setNotificationInterval(settings.notificationInterval);
        setWarningThresholdLevel(settings.warningThresholdLevel);
    }
  }, [settings, isDialogOpen]);

  const handleSave = async () => {
    await updateSettings({ 
        notificationInterval,
        warningThresholdLevel,
    });
    setIsDialogOpen(false);
    toast({ title: "Settings Updated", description: "Your global settings have been saved." });
  };

  const handleDialogStateChange = (open: boolean) => {
    setIsDialogOpen(open);
  };
  
  return (
    <Dialog open={isDialogOpen} onOpenChange={handleDialogStateChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[480px] bg-card/90 backdrop-blur-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            Global Application Settings
          </DialogTitle>
          <DialogDescription>
            Manage warning thresholds and dashboard alert frequency.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-4">
           <div className="space-y-2">
                <Label htmlFor="level-threshold" className="flex items-center gap-2 text-sm font-medium">
                    <Percent className="h-4 w-4" />
                    Warning Level Threshold
                </Label>
                <div className="flex items-center gap-4">
                    <Slider
                        id="level-threshold"
                        min={50}
                        max={100}
                        step={1}
                        value={[warningThresholdLevel]}
                        onValueChange={(value) => setWarningThresholdLevel(value[0])}
                        className="flex-1"
                    />
                    <div className="w-16 text-center text-lg font-mono font-semibold text-primary tabular-nums">
                        {warningThresholdLevel}%
                    </div>
                </div>
                 <p className="text-xs text-muted-foreground">A warning will be triggered when the bin's level exceeds this value.</p>
            </div>
          <div className="space-y-2">
            <Label htmlFor="interval" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Dashboard Warning Interval
            </Label>
             <Select
                value={String(notificationInterval)}
                onValueChange={(value) => setNotificationInterval(Number(value))}
             >
                <SelectTrigger id="interval" className="w-full bg-input/50">
                    <SelectValue placeholder="Select interval" />
                </SelectTrigger>
                <SelectContent>
                    {intervalOptions.map(option => (
                        <SelectItem key={option.value} value={String(option.value)}>
                            {option.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">How often to repeat the dashboard warning for a bin with high levels.</p>
          </div>
        </div>
        <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button type="submit" onClick={handleSave} disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save Changes
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
