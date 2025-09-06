
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
import { Loader2, Shield, MessageSquare, AlertTriangle, Weight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useSettings } from '@/context/settings-context';
import { useAuth } from '@/context/auth-context';
import { Separator } from './ui/separator';

interface AdminPanelDialogProps {
  children: React.ReactNode;
}

export function AdminPanelDialog({ children }: AdminPanelDialogProps) {
  const { userRole } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { settings, updateSettings, loading } = useSettings();
  const { toast } = useToast();

  const [recipientNumbers, setRecipientNumbers] = useState('');
  const [isTestSending, setIsTestSending] = useState(false);
  const [testTemplate, setTestTemplate] = useState<'level_alert' | 'weight_alert' | null>(null);

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
  
  const handleTestMessage = async (template: 'level_alert' | 'weight_alert') => {
    setIsTestSending(true);
    setTestTemplate(template);
    try {
      const response = await fetch('/api/send-test-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateName: template }),
      });
      const result = await response.json();

      if (response.ok) {
          toast({
              title: "Test Message Sent",
              description: result.message || `Test message using '${template}' sent.`
          });
      } else {
          toast({
              title: "Test Message Failed",
              description: result.message || "Could not send test message. Check logs.",
              variant: 'destructive',
          });
      }
    } catch (error) {
        toast({
            title: "Test Message Failed",
            description: "An unexpected error occurred. Check the browser console and server logs.",
            variant: 'destructive',
        });
    } finally {
        setIsTestSending(false);
        setTestTemplate(null);
    }
  }


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
            <Separator />
            <div className="space-y-2">
                <Label className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    WhatsApp Notification Test
                </Label>
                <p className="text-xs text-muted-foreground">Click a button to send a test message to all configured recipients.</p>
                <div className="flex flex-wrap gap-2">
                    <Button variant="secondary" onClick={() => handleTestMessage('level_alert')} disabled={isTestSending}>
                        {isTestSending && testTemplate === 'level_alert' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <AlertTriangle className="mr-2 h-4 w-4" />}
                        Send Level Alert Test
                    </Button>
                    <Button variant="secondary" onClick={() => handleTestMessage('weight_alert')} disabled={isTestSending}>
                        {isTestSending && testTemplate === 'weight_alert' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Weight className="mr-2 h-4 w-4" />}
                        Send Weight Alert Test
                    </Button>
                </div>
            </div>
        </div>
        <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button type="submit" onClick={handleSave} disabled={loading || isTestSending}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save Changes
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
