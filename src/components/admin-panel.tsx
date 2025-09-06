
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
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Shield } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useSettings } from '@/context/settings-context';
import { useAuth } from '@/context/auth-context';

interface AdminPanelDialogProps {
  children: React.ReactNode;
}

export function AdminPanelDialog({ children }: AdminPanelDialogProps) {
  const { userRole } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { settings, updateSettings, loading } = useSettings();
  const { toast } = useToast();

  const [recipientNumbers, setRecipientNumbers] = useState('');

  useEffect(() => {
    if (isDialogOpen) {
      setRecipientNumbers(settings.recipientNumbers);
    }
  }, [settings, isDialogOpen]);

  const handleSave = async () => {
    // Basic validation: ensure numbers are comma-separated digits
    const cleanedNumbers = recipientNumbers
      .split(',')
      .map(num => num.trim().replace(/\D/g, ''))
      .filter(Boolean)
      .join(', ');
      
    await updateSettings({ 
      recipientNumbers: cleanedNumbers,
    });
    setIsDialogOpen(false);
    toast({ title: "Admin Settings Updated", description: "The list of recipient numbers has been saved." });
  };

  if (userRole !== 'admin') {
    return null;
  }

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[480px] bg-card/90 backdrop-blur-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Admin Panel
          </DialogTitle>
          <DialogDescription>
            Manage administrator-level settings for the application.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-4">
           <div className="space-y-2">
                <Label htmlFor="recipient-numbers" className="text-sm font-medium">
                    WhatsApp Alert Recipients
                </Label>
                <Textarea
                    id="recipient-numbers"
                    placeholder="e.g., 919876543210, 919123456789"
                    value={recipientNumbers}
                    onChange={(e) => setRecipientNumbers(e.target.value)}
                    className="min-h-[100px] bg-input/50"
                />
                 <p className="text-xs text-muted-foreground">
                    Enter 10-digit mobile numbers separated by commas. The country code (91) will be added automatically.
                 </p>
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
