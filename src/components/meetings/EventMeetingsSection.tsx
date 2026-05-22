import { useState } from 'react';
import { motion } from 'framer-motion';
import { Video, Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MeetingCard } from './MeetingCard';
import { ScheduleMeetingDialog } from './ScheduleMeetingDialog';
import { useMeetings, useDeleteMeeting, useMarkAttendance } from '@/hooks/useMeetings';
import { useAuth } from '@/contexts/AuthContext';

interface EventMeetingsSectionProps {
  eventId: string;
  eventTitle: string;
  isOrganizer: boolean;
}

export function EventMeetingsSection({
  eventId,
  eventTitle,
  isOrganizer,
}: EventMeetingsSectionProps) {
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const { role } = useAuth();
  const { data: meetings, isLoading } = useMeetings(eventId);
  const deleteMeeting = useDeleteMeeting();
  const markAttendance = useMarkAttendance();

  const canSchedule = isOrganizer || role === 'admin';

  const handleJoin = (meetingId: string, link: string) => {
    markAttendance.mutate({ meetingId, action: 'join' });
    window.open(link, '_blank');
  };

  if (isLoading) {
    return (
      <div className="bg-card rounded-2xl border border-border p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-2xl border border-border p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Video className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">Planning Meetings</h3>
            <p className="text-sm text-muted-foreground">
              {meetings?.length || 0} meeting{meetings?.length !== 1 ? 's' : ''} scheduled
            </p>
          </div>
        </div>

        {canSchedule && (
          <Button size="sm" onClick={() => setShowScheduleDialog(true)}>
            <Plus className="w-4 h-4 mr-1" />
            Schedule
          </Button>
        )}
      </div>

      {meetings && meetings.length > 0 ? (
        <div className="space-y-4">
          {meetings.map((meeting) => (
            <MeetingCard
              key={meeting.id}
              meeting={meeting}
              showEventTitle={false}
              onDelete={canSchedule ? (id) => deleteMeeting.mutate(id) : undefined}
              onJoin={handleJoin}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          <Video className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No planning meetings scheduled yet.</p>
          {canSchedule && (
            <p className="text-sm mt-1">
              Click "Schedule" to create a meeting.
            </p>
          )}
        </div>
      )}

      <ScheduleMeetingDialog
        open={showScheduleDialog}
        onOpenChange={setShowScheduleDialog}
        eventId={eventId}
        eventTitle={eventTitle}
      />
    </motion.div>
  );
}
