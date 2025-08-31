
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Settings, Mail, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useSettings } from '@/context/settings-context';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

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

  const [alertEmail, setAlertEmail] = useState(settings.alertEmail);
  const [notificationInterval, setNotificationInterval] = useState(settings.notificationInterval);

  useEffect(() => {
    setAlertEmail(settings.alertEmail);
    setNotificationInterval(settings.notificationInterval);
  }, [settings, isDialogOpen]);

  const handleSave = async () => {
    await updateSettings({ alertEmail, notificationInterval });
    setIsDialogOpen(false);
    toast({ title: "Settings Updated", description: "Your global settings have been saved." });
  };

  const handleDialogStateChange = (open: boolean) => {
    if (!open) {
      // Reset fields if dialog is closed without saving
      setAlertEmail(settings.alertEmail);
      setNotificationInterval(settings.notificationInterval);
    }
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
            Manage notification settings for your account.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Alert Email
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter email for notifications"
              value={alertEmail}
              onChange={(e) => setAlertEmail(e.target.value)}
              className="bg-input/50"
            />
            <p className="text-xs text-muted-foreground">This email will receive alerts when bin levels are critical.</p>
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
