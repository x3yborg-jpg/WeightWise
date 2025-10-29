
"use client";

import { useEffect, useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Shield, MessageSquare, AlertTriangle, Weight, Trash2, UserPlus, Crown, Edit2, Check, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useSettings } from '@/context/settings-context';
import { useAuth } from '@/context/auth-context';
import { Separator } from './ui/separator';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';

interface AdminPanelDialogProps {
  children: React.ReactNode;
}

export function AdminPanelDialog({ children }: AdminPanelDialogProps) {
  const { userRole } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const { settings, updateSettings, loading } = useSettings();
  const { toast } = useToast();

  const [recipientNumbers, setRecipientNumbers] = useState('');
  const [isTestSending, setIsTestSending] = useState(false);
  const [testTemplate, setTestTemplate] = useState<'level_alert' | 'weight_alert' | null>(null);

  // User management state
  const [users, setUsers] = useState<Array<{ uid: string; email: string | null; name: string | null; role: 'admin' | 'user' }>>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newIsAdmin, setNewIsAdmin] = useState(false);
  const [mutating, setMutating] = useState(false);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  useEffect(() => {
    if (isOpen) {
      setRecipientNumbers(settings.recipientNumbers);
      void fetchUsers();
    }
  }, [settings, isOpen]);

  const maskPin = (email: string | null) => {
    if (!email) return 'Unknown';
    const pin = email.split('@')[0];
    if (!pin || pin.length < 4) return pin;
    return '******' + pin.slice(-4);
  };

  const getUserDisplay = (user: { uid: string; email: string | null; name: string | null; role: 'admin' | 'user' }) => {
    if (user.name) return user.name;
    return maskPin(user.email);
  };

  const fetchUsers = async () => {
    try {
      setUsersLoading(true);
      const res = await fetch('/api/admin/users', { cache: 'no-store' });
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        const text = await res.text();
        throw new Error(text.slice(0, 200));
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load users');
      setUsers(data.users);
    } catch (e: any) {
      toast({ title: 'Failed to load users', description: e.message, variant: 'destructive' });
    } finally {
      setUsersLoading(false);
    }
  };

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
    setIsOpen(false);
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

      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Non-JSON response:', text);
        throw new Error('Server returned non-JSON response. Check server logs.');
      }

      const result = await response.json();
      console.log('WhatsApp test result:', result);

      if (response.ok && result.success) {
          toast({
              title: "✅ Test Message Sent",
              description: result.message || `Test message sent successfully!`,
          });
      } else {
          toast({
              title: "❌ Test Message Failed",
              description: result.message || result.error || "Could not send test message. Check logs.",
              variant: 'destructive',
          });
      }
    } catch (error: any) {
        console.error('Test message error:', error);
        toast({
            title: "❌ Test Message Failed",
            description: error.message || "An unexpected error occurred. Check the browser console and server logs.",
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
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-lg flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Admin Panel
          </SheetTitle>
          <SheetDescription>
            Manage administrator-level settings for the application.
          </SheetDescription>
        </SheetHeader>
        <ScrollArea className="flex-1 -mx-6 px-6">
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

            <Separator />
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Crown className="h-4 w-4" />
                User Management
              </Label>
              <div className="space-y-2">
                <div className="flex-1 space-y-1">
                  <Label htmlFor="new-pin">New User PIN (10 digits)</Label>
                  <Input id="new-pin" inputMode="numeric" pattern="\\d{10}" maxLength={10} value={newPin} onChange={(e) => setNewPin(e.target.value.replace(/[^0-9]/g, '').slice(0, 10))} placeholder="e.g., 1234567890" />
                </div>
                <div className="flex-1 space-y-1">
                  <Label htmlFor="new-name">User Name (optional)</Label>
                  <Input id="new-name" value={newUserName} onChange={(e) => setNewUserName(e.target.value)} placeholder="e.g., John Doe" />
                </div>
                <div className="flex items-center gap-2">
                  <input id="is-admin" type="checkbox" checked={newIsAdmin} onChange={(e) => setNewIsAdmin(e.target.checked)} />
                  <Label htmlFor="is-admin">Admin</Label>
                </div>
                <Button onClick={async () => {
                  if (newPin.length !== 10) {
                    toast({ title: 'Invalid PIN', description: 'PIN must be 10 digits', variant: 'destructive' });
                    return;
                  }
                  try {
                    setMutating(true);
                    const res = await fetch('/api/admin/users', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ pin: newPin, role: newIsAdmin ? 'admin' : 'user', name: newUserName || null }),
                    });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data.error || 'Failed to create user');
                    setNewPin('');
                    setNewUserName('');
                    setNewIsAdmin(false);
                    await fetchUsers();
                    toast({ title: 'User created', description: data.email });
                  } catch (e: any) {
                    toast({ title: 'Create failed', description: e.message, variant: 'destructive' });
                  } finally {
                    setMutating(false);
                  }
                }} disabled={mutating}>
                  {mutating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
                  Add User
                </Button>
              </div>

              <div className="rounded-md border">
                <ScrollArea className="max-h-[400px]">
                  <div className="divide-y">
                    {usersLoading ? (
                      <div className="p-4 text-sm text-muted-foreground">Loading users...</div>
                    ) : users.length === 0 ? (
                      <div className="p-4 text-sm text-muted-foreground">No users found.</div>
                    ) : (
                      users.map(u => (
                    <div key={u.uid} className="p-3">
                      {editingUser === u.uid ? (
                        // Edit Mode - Mobile Friendly
                        <div className="space-y-3">
                          <div className="space-y-2">
                            <Label htmlFor={`edit-name-${u.uid}`} className="text-xs text-muted-foreground">Edit Name</Label>
                            <Input 
                              id={`edit-name-${u.uid}`}
                              value={editingName} 
                              onChange={(e) => setEditingName(e.target.value)}
                              placeholder="Enter user name"
                              autoFocus
                              className="h-9"
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              className="flex-1"
                              onClick={async () => {
                                try {
                                  setMutating(true);
                                  const res = await fetch('/api/admin/users', {
                                    method: 'PATCH',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ uid: u.uid, name: editingName || null }),
                                  });
                                  const data = await res.json();
                                  if (!res.ok) throw new Error(data.error);
                                  setEditingUser(null);
                                  setEditingName('');
                                  await fetchUsers();
                                  toast({ title: 'Name updated', description: 'User name saved successfully' });
                                } catch (e: any) {
                                  toast({ title: 'Update failed', description: e.message, variant: 'destructive' });
                                } finally {
                                  setMutating(false);
                                }
                              }}
                              disabled={mutating}
                            >
                              {mutating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                              Save
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => {
                                setEditingUser(null);
                                setEditingName('');
                              }}
                              disabled={mutating}
                            >
                              <X className="mr-2 h-4 w-4" />
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        // View Mode - Mobile Friendly
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="font-medium truncate">{getUserDisplay(u)}</div>
                              <div className="text-xs text-muted-foreground capitalize flex items-center gap-1">
                                {u.role === 'admin' && <Crown className="h-3 w-3" />}
                                {u.role}
                              </div>
                            </div>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => { 
                                setEditingUser(u.uid); 
                                setEditingName(u.name || ''); 
                              }}
                              className="h-8 w-8 p-0"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button 
                              variant={u.role === 'admin' ? 'secondary' : 'outline'} 
                              size="sm"
                              className="flex-1 min-w-[120px]"
                              onClick={async () => {
                                try {
                                  setMutating(true);
                                  const newRole = u.role === 'admin' ? 'user' : 'admin';
                                  const res = await fetch('/api/admin/users', {
                                    method: 'PATCH',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ uid: u.uid, role: newRole }),
                                  });
                                  const data = await res.json();
                                  if (!res.ok) throw new Error(data.error || 'Failed to update role');
                                  await fetchUsers();
                                  toast({ title: 'Role updated', description: `User is now ${newRole}` });
                                } catch (e: any) {
                                  toast({ title: 'Update failed', description: e.message, variant: 'destructive' });
                                } finally {
                                  setMutating(false);
                                }
                              }}
                              disabled={mutating}
                            >
                              {u.role === 'admin' ? (
                                <>Remove Admin</>
                              ) : (
                                <>Make Admin</>
                              )}
                            </Button>
                            <Button 
                              variant="destructive" 
                              size="sm"
                              className="flex-1 min-w-[100px]"
                              onClick={async () => {
                                if (!confirm(`Remove ${getUserDisplay(u)}?`)) return;
                                try {
                                  setMutating(true);
                                  const res = await fetch('/api/admin/users', {
                                    method: 'DELETE',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ uid: u.uid }),
                                  });
                                  const data = await res.json();
                                  if (!res.ok) throw new Error(data.error || 'Failed to delete user');
                                  await fetchUsers();
                                  toast({ title: 'User removed', description: 'User deleted successfully' });
                                } catch (e: any) {
                                  toast({ title: 'Delete failed', description: e.message, variant: 'destructive' });
                                } finally {
                                  setMutating(false);
                                }
                              }}
                              disabled={mutating}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </Button>
                          </div>
                        </div>
                      )}
                      </div>
                    ))
                  )}
                  </div>
                </ScrollArea>
              </div>
            </div>
          </div>
        </ScrollArea>
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => setIsOpen(false)}>Close</Button>
          <Button type="button" onClick={handleSave} disabled={loading || isTestSending}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save Changes
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
