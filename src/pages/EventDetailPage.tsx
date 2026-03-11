import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  ArrowLeft,
  Share2,
  Heart,
  CheckCircle,
  User,
  Ticket,
  Edit,
  Loader2,
  Video,
  ExternalLink,
  Package,
  RotateCcw,
} from 'lucide-react';

import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useEvent, useUpdateEventMeetingStatus } from '@/hooks/useEvents';

import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { EditEventDialog } from '@/components/events/EditEventDialog';
import { EventMeetingsSection } from '@/components/meetings/EventMeetingsSection';
import { ReturnResourceDialog } from '@/components/resources/ReturnResourceDialog';
import { ResourceAuditLog } from '@/components/resources/ResourceAuditLog';
import { useIsRegistered, useRegisterForEvent, useCancelRegistration } from '@/hooks/useRegistrations';
import { useEventResources } from '@/hooks/useResources';

const categoryColors: Record<string, string> = {
  academic: 'bg-blue-100 text-blue-700',
  social: 'bg-pink-100 text-pink-700',
  sports: 'bg-green-100 text-green-700',
  cultural: 'bg-purple-100 text-purple-700',
  workshop: 'bg-orange-100 text-orange-700',
  seminar: 'bg-indigo-100 text-indigo-700',
};

// Inline sub-component: Event Resource Summary
function EventResourceSummary({
  eventId,
  isPastEvent,
  canEdit,
  onReturnClick,
}: {
  eventId: string;
  isPastEvent: boolean;
  canEdit: boolean;
  onReturnClick: () => void;
}) {
  const { data: resources, isLoading } = useEventResources(eventId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      </div>
    );
  }

  if (!resources || resources.length === 0) return null;

  const totalAllocated = resources.reduce((sum, r) => sum + r.quantity, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-2xl border border-border overflow-hidden mt-6"
    >
      <div className="px-6 py-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-lg">Allocated Resources</h3>
          <Badge variant="secondary" className="ml-2">{totalAllocated} total</Badge>
        </div>
        {isPastEvent && canEdit && (
          <Button
            variant="outline"
            size="sm"
            onClick={onReturnClick}
            className="border-primary/30 text-primary hover:bg-primary/5"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Return Resources
          </Button>
        )}
      </div>
      <div className="divide-y divide-border">
        {resources.map((r) => (
          <div key={r.id} className="flex items-center justify-between px-6 py-3 hover:bg-muted/20 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Package className="w-4 h-4 text-primary" />
              </div>
              <span className="font-medium text-sm">{r.resource_type?.name || 'Unknown'}</span>
            </div>
            <Badge variant="outline">{r.quantity} units</Badge>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, role } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { data: event, isLoading } = useEvent(id || '');
  const { data: registration, isLoading: isCheckingRegistration } = useIsRegistered(id || '');
  const isRegistered = !!registration;
  const registerMutation = useRegisterForEvent();
  const cancelMutation = useCancelRegistration();
  const updateMeetingStatus = useUpdateEventMeetingStatus();
  const [showQRModal, setShowQRModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showReturnDialog, setShowReturnDialog] = useState(false);

  if (isLoading) {
    return (
      <MainLayout>
        <div className="p-8 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  if (!event) {
    return (
      <MainLayout>
        <div className="p-8 text-center">
          <h1 className="text-2xl font-bold">Event not found</h1>
          <Link to="/events">
            <Button variant="link">Back to events</Button>
          </Link>
        </div>
      </MainLayout>
    );
  }

  const spotsLeft = event.capacity - event.registered_count;
  const isAlmostFull = spotsLeft < event.capacity * 0.1;
  const isOwner = user?.id === event.organizer_id;
  const canEdit = isOwner || role === 'admin';

  // Combine date + time to get a precise past-event cutoff
  const isPastEvent = new Date(`${event.date}T${event.time}`) < new Date();

  const handleRegister = () => {
    if (event) {
      registerMutation.mutate(event.id);
    }
  };

  const handleUnregister = () => {
    if (event) {
      cancelMutation.mutate(event.id);
    }
  };

  return (
    <MainLayout>
      <div className="p-8 max-w-5xl mx-auto">
        {/* Back Button */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-2"
          >
            {/* Header */}
            <div className="bg-card rounded-2xl border border-border overflow-hidden">
              <div className="h-2 gradient-primary" />
              <div className="p-8">
                <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                  <div className="flex flex-wrap gap-2">
                    <Badge className={cn("font-medium capitalize", categoryColors[event.category])}>
                      {event.category}
                    </Badge>
                    <Badge variant="outline" className="capitalize font-medium">
                      {event.status}
                    </Badge>
                  </div>
                  {canEdit && (
                    <Button variant="outline" size="sm" onClick={() => setShowEditModal(true)}>
                      <Edit className="w-4 h-4 mr-2" />
                      Edit Event
                    </Button>
                  )}
                </div>

                <h1 className="text-3xl font-bold mb-4">{event.title}</h1>

                {/* Online Meeting Controls */}
                {event.category === 'online_meeting' && (
                  <div className="mb-6 p-4 rounded-xl bg-primary/5 border border-primary/10 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Video className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold">Online Meeting</p>
                        <p className="text-sm text-muted-foreground capitalize">
                          Status: <span className="text-primary font-medium">{event.meeting_status}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {/* Start Meeting Button (Organizer/Admin) */}
                      {(isOwner || role === 'admin') && event.meeting_status === 'scheduled' && (
                        <Button
                          onClick={() => {
                            updateMeetingStatus.mutate({ id: event.id, status: 'live' });
                            if (event.meeting_link) window.open(event.meeting_link, '_blank');
                          }}
                          className="gradient-primary text-white"
                          disabled={updateMeetingStatus.isPending}
                        >
                          <Video className="w-4 h-4 mr-2" />
                          Start Meeting
                        </Button>
                      )}


                      {/* Join Meeting Button (Participants) */}
                      {event.meeting_status === 'live' && (
                        <Button
                          onClick={() => {
                            if (event.meeting_link) window.open(event.meeting_link, '_blank');
                          }}
                          className="gradient-success text-white"
                        >
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Join Meeting
                        </Button>
                      )}

                      {/* End Meeting Button (Organizer/Admin) */}
                      {(isOwner || role === 'admin') && event.meeting_status === 'live' && (
                        <Button
                          variant="outline"
                          onClick={() => updateMeetingStatus.mutate({ id: event.id, status: 'ended' })}
                          disabled={updateMeetingStatus.isPending}
                        >
                          End Meeting
                        </Button>
                      )}
                    </div>
                  </div>
                )}


                <div className="flex items-center gap-4 mb-6 text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    <span>{event.organizer_name}</span>
                  </div>
                </div>

                <p className="text-muted-foreground leading-relaxed mb-8">
                  {event.description}
                </p>

                {/* Event Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/50">
                    <div className="p-3 rounded-lg bg-primary/10">
                      <Calendar className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Date</p>
                      <p className="font-medium">
                        {new Date(event.date).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/50">
                    <div className="p-3 rounded-lg bg-primary/10">
                      <Clock className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Time</p>
                      <p className="font-medium">{event.time}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/50 md:col-span-2">
                    <div className="p-3 rounded-lg bg-primary/10">
                      <MapPin className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Venue</p>
                      <p className="font-medium">{event.venue}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Planning Meetings Section */}
            {(role === 'admin' || role === 'organizer') && (
              <EventMeetingsSection
                eventId={event.id}
                eventTitle={event.title}
                isOrganizer={isOwner}
              />
            )}

            {/* Resource Summary Section */}
            {(role === 'admin' || role === 'organizer') && (
              <EventResourceSummary
                eventId={event.id}
                isPastEvent={isPastEvent}
                canEdit={canEdit}
                onReturnClick={() => setShowReturnDialog(true)}
              />
            )}

            {/* Audit Log for this event */}
            {(role === 'admin' || role === 'organizer') && (
              <ResourceAuditLog eventId={event.id} title="Resource Activity Log" />
            )}
          </motion.div>

          {/* Sidebar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-6"
          >
            {/* Registration Card */}
            <div className="bg-card rounded-2xl border border-border p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Capacity</span>
                </div>
                <span className={cn(
                  "font-semibold",
                  isAlmostFull ? "text-warning" : ""
                )}>
                  {event.registered_count}/{event.capacity}
                </span>
              </div>

              <div className="w-full bg-muted rounded-full h-2 mb-4">
                <div
                  className={cn(
                    "h-2 rounded-full transition-all",
                    isAlmostFull ? "bg-warning" : "bg-primary"
                  )}
                  style={{ width: `${(event.registered_count / event.capacity) * 100}%` }}
                />
              </div>

              {spotsLeft <= 20 && spotsLeft > 0 && (
                <p className="text-sm text-warning mb-4">Only {spotsLeft} spots left!</p>
              )}

              {(role === 'user' || role === 'student') && event.status === 'approved' && (
                <>
                  {isPastEvent ? (
                    // Event is in the past — show info only
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground text-center py-2">
                        This event has already taken place.
                      </p>
                      {isRegistered && (
                        <Button
                          className="w-full gradient-success text-white"
                          onClick={() => setShowQRModal(true)}
                        >
                          <Ticket className="w-4 h-4 mr-2" />
                          View My Ticket
                        </Button>
                      )}
                    </div>
                  ) : isCheckingRegistration ? (
                    <Button className="w-full" disabled>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Checking...
                    </Button>
                  ) : isRegistered ? (
                    <div className="space-y-3">
                      <Button
                        className="w-full gradient-success text-white"
                        onClick={() => setShowQRModal(true)}
                      >
                        <Ticket className="w-4 h-4 mr-2" />
                        View My Ticket
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full border-destructive text-destructive hover:bg-destructive/10"
                        onClick={handleUnregister}
                        disabled={cancelMutation.isPending}
                      >
                        {cancelMutation.isPending ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : null}
                        {cancelMutation.isPending ? 'Cancelling...' : 'Cancel Registration'}
                      </Button>
                    </div>
                  ) : (
                    <Button
                      className="w-full gradient-primary text-white"
                      onClick={handleRegister}
                      disabled={spotsLeft <= 0 || registerMutation.isPending}
                    >
                      {registerMutation.isPending ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <CheckCircle className="w-4 h-4 mr-2" />
                      )}
                      {registerMutation.isPending ? 'Registering...' : spotsLeft <= 0 ? 'Event Full' : 'Register Now'}
                    </Button>
                  )}
                </>
              )}

              {event.status === 'pending' && (
                <p className="text-sm text-warning text-center">
                  This event is pending approval
                </p>
              )}
            </div>

            {/* Share Card */}
            <div className="bg-card rounded-2xl border border-border p-6">
              <h3 className="font-semibold mb-4">Share Event</h3>
              <div className="flex gap-2">
                <Button variant="outline" size="icon">
                  <Share2 className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="icon">
                  <Heart className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* QR Code Preview */}
            {(role === 'organizer' || role === 'admin') && (
              <div className="bg-card rounded-2xl border border-border p-6">
                <h3 className="font-semibold mb-4">Event QR Code</h3>
                <div className="flex justify-center p-4 bg-white rounded-xl">
                  <QRCodeSVG
                    value={`event:${event.id}`}
                    size={150}
                    level="H"
                    includeMargin
                  />
                </div>
                <p className="text-sm text-muted-foreground text-center mt-3">
                  Scan to check in attendees
                </p>
              </div>
            )}
          </motion.div>
        </div>

        {/* QR Code Modal for Users */}
        <Dialog open={showQRModal} onOpenChange={setShowQRModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-center">Your Event Ticket</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col items-center p-6">
              <div className="bg-white p-6 rounded-2xl shadow-lg mb-4">
                <QRCodeSVG
                  value={`attendance:${registration?.id}`}
                  size={200}
                  level="H"
                  includeMargin
                />
              </div>
              <h3 className="font-semibold text-lg">{event.title}</h3>
              <p className="text-muted-foreground text-sm mt-1">
                {new Date(event.date).toLocaleDateString()} at {event.time}
              </p>
              <p className="text-muted-foreground text-sm">{event.venue}</p>
              <div className="mt-4 p-3 bg-success/10 rounded-lg text-success text-sm flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Show this QR code at the venue
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Event Modal */}
        {
          showEditModal && (
            <EditEventDialog
              open={showEditModal}
              onOpenChange={setShowEditModal}
              event={{
                id: event.id,
                title: event.title,
                description: event.description,
                date: event.date,
                time: event.time,
                venue: event.venue,
                category: event.category,
                capacity: event.capacity,
                meeting_link: event.meeting_link,
                meeting_status: event.meeting_status,
              }}

            />
          )
        }
        {/* Return Resources Dialog */}
        {showReturnDialog && (
          <ReturnResourceDialog
            open={showReturnDialog}
            onOpenChange={setShowReturnDialog}
            eventId={event.id}
            eventTitle={event.title}
          />
        )}
      </div >
    </MainLayout >
  );
}
