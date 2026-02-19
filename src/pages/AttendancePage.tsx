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
import { mockEvents } from '@/lib/mockData';
import { useToast } from '@/hooks/use-toast';

export default function AttendancePage() {
  const { toast } = useToast();
  const [selectedEvent, setSelectedEvent] = useState('');
  const [manualCode, setManualCode] = useState('');
  const [recentScans, setRecentScans] = useState<{ name: string; time: string; success: boolean }[]>([
    { name: 'Alex Rivera', time: '2 min ago', success: true },
    { name: 'Jordan Lee', time: '5 min ago', success: true },
    { name: 'Sam Chen', time: '8 min ago', success: false },
  ]);

  const approvedEvents = mockEvents.filter(e => e.status === 'approved');
  const event = approvedEvents.find(e => e.id === selectedEvent);

  const handleManualCheckIn = () => {
    if (!manualCode) return;
    
    toast({
      title: "Check-in successful",
      description: "Attendee has been checked in.",
    });
    
    setRecentScans(prev => [
      { name: `Attendee #${manualCode}`, time: 'Just now', success: true },
      ...prev.slice(0, 9)
    ]);
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
                  <div className="aspect-video bg-muted rounded-xl flex flex-col items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-4 border-2 border-dashed border-primary/30 rounded-lg" />
                    <Camera className="w-16 h-16 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground text-center">
                      Camera scanner would be active here<br />
                      <span className="text-sm">Scan attendee QR codes</span>
                    </p>
                  </div>

                  <div className="mt-6">
                    <p className="text-sm text-muted-foreground mb-2">Or enter ticket code manually:</p>
                    <div className="flex gap-3">
                      <Input
                        placeholder="Enter ticket code"
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
                    <span className="font-semibold">{event.registeredCount}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      Checked In
                    </span>
                    <span className="font-semibold text-success">{event.attendedCount}</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className="h-2 rounded-full bg-success transition-all"
                      style={{ width: `${(event.attendedCount / event.registeredCount) * 100}%` }}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground text-center">
                    {Math.round((event.attendedCount / event.registeredCount) * 100)}% check-in rate
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
