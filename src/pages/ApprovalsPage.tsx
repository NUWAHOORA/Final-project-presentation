import { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Clock, Loader2, Package, AlertTriangle } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useEvents, useUpdateEventStatus } from '@/hooks/useEvents';
import { useEventResources } from '@/hooks/useResources';
import { ResourceAllocationDialog } from '@/components/resources/ResourceAllocationDialog';
import { useToast } from '@/hooks/use-toast';

function EventResourceStatus({ eventId }: { eventId: string }) {
  const { data: resources } = useEventResources(eventId);
  const hasResources = resources && resources.length > 0;

  return (
    <Badge 
      className={`flex items-center gap-1 border-0 ${
        hasResources 
          ? 'bg-success/10 text-success' 
          : 'bg-destructive/10 text-destructive'
      }`}
    >
      {hasResources ? (
        <>
          <Package className="w-3 h-3" />
          Resources Allocated ({resources.length})
        </>
      ) : (
        <>
          <AlertTriangle className="w-3 h-3" />
          No Resources Allocated
        </>
      )}
    </Badge>
  );
}

export default function ApprovalsPage() {
  const { data: events, isLoading } = useEvents();
  const updateStatusMutation = useUpdateEventStatus();
  const pendingEvents = events?.filter(e => e.status === 'pending') || [];
  const { toast } = useToast();

  const [resourceDialogOpen, setResourceDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<{ id: string; title: string } | null>(null);

  const handleApprove = async (eventId: string) => {
    try {
      await updateStatusMutation.mutateAsync({ id: eventId, status: 'approved' });
    } catch (error) {
      // Error toast is already handled by the mutation's onError
    }
  };

  const handleReject = async (eventId: string) => {
    await updateStatusMutation.mutateAsync({ id: eventId, status: 'rejected' });
  };

  const openResourceDialog = (eventId: string, eventTitle: string) => {
    setSelectedEvent({ id: eventId, title: eventTitle });
    setResourceDialogOpen(true);
  };

  return (
    <MainLayout>
      <div className="p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <motion.h1
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-3xl font-bold"
            >
              Pending Approvals
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-muted-foreground mt-1"
            >
              {pendingEvents.length} events awaiting review
            </motion.p>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}

        {/* Pending Events List */}
        {!isLoading && (
          <div className="space-y-4">
            {pendingEvents.map((event, index) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-card rounded-xl border border-warning/20 p-6"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <Badge className="bg-warning/10 text-warning border-0 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Pending Review
                      </Badge>
                      <Badge variant="outline" className="capitalize">
                        {event.category}
                      </Badge>
                      <EventResourceStatus eventId={event.id} />
                    </div>
                    <h3 className="text-xl font-semibold mb-1">{event.title}</h3>
                    <p className="text-muted-foreground text-sm mb-2">
                      Submitted by {event.organizer_name}
                    </p>
                    <p className="text-muted-foreground text-sm line-clamp-2">
                      {event.description}
                    </p>
                    <div className="flex flex-wrap gap-4 mt-3 text-sm text-muted-foreground">
                      <span>📅 {new Date(event.date).toLocaleDateString()}</span>
                      <span>🕐 {event.time}</span>
                      <span>📍 {event.venue}</span>
                      <span>👥 Capacity: {event.capacity}</span>
                    </div>
                  </div>

                  <div className="flex gap-3 flex-shrink-0 flex-wrap">
                    <Button
                      variant="outline"
                      onClick={() => openResourceDialog(event.id, event.title)}
                    >
                      <Package className="w-4 h-4 mr-2" />
                      Allocate Resources
                    </Button>
                    <Button
                      variant="outline"
                      className="border-destructive text-destructive hover:bg-destructive/10"
                      onClick={() => handleReject(event.id)}
                      disabled={updateStatusMutation.isPending}
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Reject
                    </Button>
                    <Button
                      className="gradient-success text-white"
                      onClick={() => handleApprove(event.id)}
                      disabled={updateStatusMutation.isPending}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Approve
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {!isLoading && pendingEvents.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-success" />
            </div>
            <h3 className="text-lg font-semibold mb-2">All caught up!</h3>
            <p className="text-muted-foreground">No events pending approval</p>
          </motion.div>
        )}
      </div>

      {/* Resource Allocation Dialog */}
      {selectedEvent && (
        <ResourceAllocationDialog
          open={resourceDialogOpen}
          onOpenChange={setResourceDialogOpen}
          eventId={selectedEvent.id}
          eventTitle={selectedEvent.title}
        />
      )}
    </MainLayout>
  );
}
