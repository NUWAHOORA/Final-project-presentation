import { useState } from 'react';
import { motion } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import {
  ScanLine,
  CheckCircle,
  XCircle,
  Users,
  Clock,
  Camera
} from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEvents } from '@/hooks/useEvents';
import { useEventRegistrations } from '@/hooks/useRegistrations';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { QRScanner } from '@/components/attendance/QRScanner';

export default function AttendancePage() {
  const { toast } = useToast();
  const [selectedEvent, setSelectedEvent] = useState('');
  const [manualCode, setManualCode] = useState('');
  const [recentScans, setRecentScans] = useState<{ name: string; time: string; success: boolean }[]>([
    { name: 'Alex Rivera', time: '2 min ago', success: true },
    { name: 'Jordan Lee', time: '5 min ago', success: true },
    { name: 'Sam Chen', time: '8 min ago', success: false },
  ]);

  const { data: events } = useEvents();
  const approvedEvents = events?.filter(e => e.status === 'approved') || [];
  const event = approvedEvents.find(e => e.id === selectedEvent);

  // Get registrations for the selected event to check attendance list
  const { data: registrations, refetch: refetchRegistrations } = useEventRegistrations(selectedEvent || '');

  const handleScan = async (decodedText: string) => {
    if (!selectedEvent) {
      toast({
        title: "Error",
        description: "Please select an event first.",
        variant: "destructive",
      });
      return;
    }

    // Secure UUID Format: attendance:[registration_id]
    // Legacy/Manual Format fallback: attendance:event_id:user_id
    const parts = decodedText.split(':');
    if (parts[0] !== 'attendance' || parts.length < 2) {
      toast({
        title: "Invalid QR Code",
        description: "This is not a valid attendance QR code.",
        variant: "destructive",
      });
      return;
    }

    try {
      let registrationId = '';
      let isUuidFormat = false;

      if (parts.length === 2) {
        // New secure format
        registrationId = parts[1];
        isUuidFormat = true;
      } else if (parts.length === 3) {
        // Legacy format: attendance:event_id:user_id
        const [_, eventId, userId] = parts;
        if (eventId !== selectedEvent) {
          toast({
            title: "Wrong Event",
            description: "This ticket is for a different event.",
            variant: "destructive",
          });
          return;
        }
      }

      // 1. Fetch registration
      let query = supabase.from('registrations').select('*');

      if (isUuidFormat) {
        query = query.eq('id', registrationId);
      } else {
        query = query.eq('event_id', parts[1]).eq('user_id', parts[2]);
      }

      const { data: registration, error: fetchError } = await query.single();

      if (fetchError || !registration) {
        toast({
          title: "Not Registered",
          description: "This ticket is invalid or not registered for this event.",
          variant: "destructive",
        });
        setRecentScans(prev => [
          { name: 'Unknown Student', time: 'Just now', success: false },
          ...prev.slice(0, 9)
        ]);
        return;
      }

      // 2. Validate event match for UUID format
      if (isUuidFormat && registration.event_id !== selectedEvent) {
        toast({
          title: "Wrong Event",
          description: "This ticket is for a different event.",
          variant: "destructive",
        });
        return;
      }

      // 3. Check if already attended
      if (registration.attended) {
        toast({
          title: "Already Attended",
          description: "Attendee has already been checked in.",
          variant: "destructive",
        });
        return;
      }

      // 4. Fetch profile data
      const { data: profile } = await supabase
        .from('profiles')
        .select('name')
        .eq('user_id', registration.user_id)
        .single();

      const studentName = profile?.name || 'Student';

      // 5. Mark attendance
      const { error: updateError } = await supabase
        .from('registrations')
        .update({
          attended: true,
          attended_at: new Date().toISOString()
        })
        .eq('id', registration.id);

      if (updateError) throw updateError;

      toast({
        title: "Check-in successful",
        description: `${studentName} has been checked in.`,
      });

      setRecentScans(prev => [
        { name: studentName, time: 'Just now', success: true },
        ...prev.slice(0, 9)
      ]);

      // Refresh statistics
      refetchRegistrations();

    } catch (error) {
      console.error('Error marking attendance:', error);
      toast({
        title: "Error",
        description: "Failed to mark attendance. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleManualCheckIn = () => {
    if (!manualCode) return;
    handleScan(`attendance:${selectedEvent}:${manualCode}`);
    setManualCode('');
  };

  return (
    <MainLayout>
      <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl font-bold"
          >
            Attendance Scanner
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-muted-foreground mt-1"
          >
            Scan QR codes to check in attendees
          </motion.p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Scanner Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-2 space-y-6"
          >
            {/* Event Selection */}
            <div className="bg-card rounded-2xl border border-border p-6">
              <h3 className="text-lg font-semibold mb-4">Select Event</h3>
              <Select value={selectedEvent} onValueChange={setSelectedEvent}>
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Choose an event to scan for" />
                </SelectTrigger>
                <SelectContent>
                  {approvedEvents.map((event) => (
                    <SelectItem key={event.id} value={event.id}>
                      {event.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedEvent && (
              <>
                {/* Scanner Area */}
                <div className="bg-card rounded-2xl border border-border p-6">
                  <h3 className="text-lg font-semibold mb-4">QR Scanner</h3>
                  <div className="min-h-[300px] flex flex-col items-center justify-center relative overflow-hidden">
                    <QRScanner onScanSuccess={handleScan} />
                  </div>

                  <div className="mt-6">
                    <p className="text-sm text-muted-foreground mb-2">Or enter Student ID manually:</p>
                    <div className="flex gap-3">
                      <Input
                        placeholder="Enter Student ID"
                        value={manualCode}
                        onChange={(e) => setManualCode(e.target.value)}
                        className="h-11"
                      />
                      <Button
                        onClick={handleManualCheckIn}
                        className="gradient-primary text-white"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Check In
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Event QR Code */}
                <div className="bg-card rounded-2xl border border-border p-6">
                  <h3 className="text-lg font-semibold mb-4">Event Check-in QR</h3>
                  <p className="text-muted-foreground text-sm mb-4">
                    Display this QR code for self check-in
                  </p>
                  <div className="flex justify-center p-6 bg-white rounded-xl">
                    <QRCodeSVG
                      value={`event-checkin:${selectedEvent}`}
                      size={200}
                      level="H"
                      includeMargin
                    />
                  </div>
                </div>
              </>
            )}
          </motion.div>

          {/* Stats & Recent Scans */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-6"
          >
            {event && (
              <div className="bg-card rounded-2xl border border-border p-6">
                <h3 className="text-lg font-semibold mb-4">Event Stats</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Registered
                    </span>
                    <span className="font-semibold">{event.registered_count}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      Checked In
                    </span>
                    <span className="font-semibold text-success">{event.attended_count}</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="h-2 rounded-full bg-success transition-all"
                      style={{ width: `${(event.attended_count / (event.registered_count || 1)) * 100}%` }}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground text-center">
                    {event.registered_count > 0 ? Math.round((event.attended_count / event.registered_count) * 100) : 0}% check-in rate
                  </p>
                </div>
              </div>
            )}

            <div className="bg-card rounded-2xl border border-border p-6">
              <h3 className="text-lg font-semibold mb-4">Recent Scans</h3>
              <div className="space-y-3">
                {recentScans.map((scan, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      {scan.success ? (
                        <CheckCircle className="w-5 h-5 text-success" />
                      ) : (
                        <XCircle className="w-5 h-5 text-destructive" />
                      )}
                      <span className="font-medium">{scan.name}</span>
                    </div>
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {scan.time}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </MainLayout>
  );
}
