import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { checkSchedulingConflict } from '@/hooks/useSchedulingConflict';

export interface Event {
  id: string;
  title: string;
  description: string | null;
  date: string;
  time: string;
  venue: string;
  category: 'academic' | 'social' | 'sports' | 'cultural' | 'workshop' | 'seminar' | 'online_meeting';
  capacity: number;
  registered_count: number;
  attended_count: number;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'live';
  meeting_link?: string | null;
  meeting_status?: 'scheduled' | 'live' | 'ended' | null;
  organizer_id: string;
  image_url: string | null;
  qr_code: string | null;
  created_at: string;
  updated_at: string;
  organizer_name?: string;
  organizer_role?: 'admin' | 'organizer' | 'user' | 'student';
}

export function useEvents() {
  return useQuery({
    queryKey: ['events'],
    queryFn: async () => {
      const { data: events, error } = await supabase
        .from('events')
        .select('*')
        .order('date', { ascending: true });

      if (error) throw error;

      // Fetch organizer details (name and role)
      const organizerIds = [...new Set(events?.map(e => e.organizer_id) || [])];

      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, name')
        .in('user_id', organizerIds);

      const { data: roles } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('user_id', organizerIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p.name]) || []);
      const roleMap = new Map(roles?.map(r => [r.user_id, r.role]) || []);

      return events?.map(event => ({
        ...event,
        organizer_name: profileMap.get(event.organizer_id) || 'Unknown',
        organizer_role: roleMap.get(event.organizer_id) as 'admin' | 'organizer' | 'user' | 'student' || 'user'
      })) as Event[];
    },
  });
}

export function useEvent(id: string) {
  return useQuery({
    queryKey: ['events', id],
    queryFn: async () => {
      const { data: event, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      if (!event) return null;

      const { data: profile } = await supabase
        .from('profiles')
        .select('name')
        .eq('user_id', event.organizer_id)
        .maybeSingle();

      return {
        ...event,
        organizer_name: profile?.name || 'Unknown'
      } as Event;
    },
    enabled: !!id,
  });
}


export function useCreateEvent() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (eventData: {
      title: string;
      description: string;
      date: string;
      time: string;
      venue: string;
      category: 'academic' | 'social' | 'sports' | 'cultural' | 'workshop' | 'seminar';
      capacity: number;
    }) => {
      if (!user) throw new Error('Not authenticated');

      // Check for scheduling conflicts
      const conflict = await checkSchedulingConflict(eventData.date, eventData.venue);
      if (conflict.hasConflict) {
        throw new Error(`Scheduling conflict: "${conflict.conflictingEvent}" is already booked at ${eventData.venue} on ${eventData.date}`);
      }

      const { data, error } = await supabase
        .from('events')
        .insert([{
          title: eventData.title,
          description: eventData.description,
          date: eventData.date,
          time: eventData.time,
          venue: eventData.venue,
          category: eventData.category,
          capacity: eventData.capacity,
          organizer_id: user.id,
        }])
        .select()
        .single();

      if (error) throw error;

      // Create notification for the organizer
      await supabase.from('notifications').insert([{
        user_id: user.id,
        type: 'event_created',
        title: 'Event Created',
        message: `Your event "${eventData.title}" has been created and is pending approval.`,
        event_id: data.id,
      }]);

      // Fetch all admins to notify them
      const { data: adminRoles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin');

      if (adminRoles && adminRoles.length > 0) {
        // Filter out the organizer in case they are also an admin
        const adminIdsToNotify = adminRoles
          .map(r => r.user_id)
          .filter(id => id !== user.id);

        if (adminIdsToNotify.length > 0) {
          const adminNotifications = adminIdsToNotify.map(adminId => ({
            user_id: adminId,
            type: 'event_pending_approval',
            title: 'Event Requires Approval',
            message: `A new event "${eventData.title}" has been created and requires your approval.`,
            event_id: data.id,
          }));

          await supabase.from('notifications').insert(adminNotifications);
        }
      }

      return data as Event;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast({
        title: 'Event submitted',
        description: 'Your event has been submitted for approval.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error creating event',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateEventStatus() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'approved' | 'rejected' }) => {
      // If approving, check that resources have been allocated
      if (status === 'approved') {
        const { data: allocations, error: allocError } = await supabase
          .from('event_resources')
          .select('id')
          .eq('event_id', id);

        if (allocError) throw allocError;

        if (!allocations || allocations.length === 0) {
          throw new Error('Resources must be allocated before approving the event. Please allocate resources first.');
        }
      }

      const { error } = await supabase
        .from('events')
        .update({ status })
        .eq('id', id);

      if (error) throw error;

      // Fetch event details for the notification
      const { data: eventData } = await supabase
        .from('events')
        .select('title, organizer_id')
        .eq('id', id)
        .single();

      if (eventData) {
        // Automatically promote user to organizer if they are currently just a 'user'
        const { data: currentRoleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', eventData.organizer_id)
          .single();

        if (currentRoleData && ((currentRoleData.role as any) === 'user' || (currentRoleData.role as any) === 'student') && status === 'approved') {
          await supabase
            .from('user_roles')
            .update({ role: 'organizer' })
            .eq('user_id', eventData.organizer_id);
        }

        await supabase.from('notifications').insert([{
          user_id: eventData.organizer_id,
          type: `event_${status}`,
          title: `Event ${status === 'approved' ? 'Approved' : 'Rejected'}`,
          message: `Your event "${eventData.title}" has been ${status}${status === 'approved' ? '. You have also been promoted to Organizer.' : '.'}`,
          event_id: id,
        }]);
      }
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });

      const isPromotion = status === 'approved'; // Logic for promotion is handled inside mutationFn

      toast({
        title: status === 'approved' ? 'Event Approved' : 'Event Rejected',
        description: status === 'approved'
          ? 'The event is now visible to all users. The requester has been promoted to Organizer.'
          : 'The event has been rejected.',
        variant: status === 'approved' ? 'default' : 'destructive',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error updating event',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}


export function useUpdateEventMeetingStatus() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'scheduled' | 'live' | 'ended' }) => {
      const { error } = await supabase
        .from('events')
        .update({ meeting_status: status })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast({
        title: `Meeting is now ${status}`,
        description: status === 'live' ? 'The meeting has started.' : 'The meeting status has been updated.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error updating meeting status',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteEvent() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast({
        title: 'Event deleted',
        description: 'The event has been removed.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error deleting event',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}


