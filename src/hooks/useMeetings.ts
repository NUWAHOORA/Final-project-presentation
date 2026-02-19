import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface Meeting {
  id: string;
  event_id: string;
  title: string;
  description: string | null;
  meeting_link: string;
  meeting_date: string;
  meeting_time: string;
  duration_minutes: number;
  agenda: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  event_title?: string;
  creator_name?: string;
}

export interface MeetingParticipant {
  id: string;
  meeting_id: string;
  user_id: string;
  status: 'invited' | 'accepted' | 'declined';
  attended: boolean;
  joined_at: string | null;
  left_at: string | null;
  invited_at: string;
  user_name?: string;
  user_email?: string;
}

export function useMeetings(eventId?: string) {
  return useQuery({
    queryKey: ['meetings', eventId],
    queryFn: async () => {
      let query = supabase
        .from('meetings')
        .select('*')
        .order('meeting_date', { ascending: true });

      if (eventId) {
        query = query.eq('event_id', eventId);
      }

      const { data: meetings, error } = await query;

      if (error) throw error;

      // Fetch event titles and creator names
      const eventIds = [...new Set(meetings?.map(m => m.event_id) || [])];
      const creatorIds = [...new Set(meetings?.map(m => m.created_by) || [])];

      const [{ data: events }, { data: profiles }] = await Promise.all([
        supabase.from('events').select('id, title').in('id', eventIds),
        supabase.from('profiles').select('user_id, name').in('user_id', creatorIds),
      ]);

      const eventMap = new Map(events?.map(e => [e.id, e.title]) || []);
      const profileMap = new Map(profiles?.map(p => [p.user_id, p.name]) || []);

      return meetings?.map(meeting => ({
        ...meeting,
        event_title: eventMap.get(meeting.event_id) || 'Unknown Event',
        creator_name: profileMap.get(meeting.created_by) || 'Unknown',
      })) as Meeting[];
    },
  });
}

export function useMeeting(id: string) {
  return useQuery({
    queryKey: ['meetings', 'detail', id],
    queryFn: async () => {
      const { data: meeting, error } = await supabase
        .from('meetings')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      if (!meeting) return null;

      const [{ data: event }, { data: profile }] = await Promise.all([
        supabase.from('events').select('title').eq('id', meeting.event_id).maybeSingle(),
        supabase.from('profiles').select('name').eq('user_id', meeting.created_by).maybeSingle(),
      ]);

      return {
        ...meeting,
        event_title: event?.title || 'Unknown Event',
        creator_name: profile?.name || 'Unknown',
      } as Meeting;
    },
    enabled: !!id,
  });
}

export function useMeetingParticipants(meetingId: string) {
  return useQuery({
    queryKey: ['meeting-participants', meetingId],
    queryFn: async () => {
      const { data: participants, error } = await supabase
        .from('meeting_participants')
        .select('*')
        .eq('meeting_id', meetingId);

      if (error) throw error;

      // Fetch user details
      const userIds = participants?.map(p => p.user_id) || [];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, name, email')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      return participants?.map(p => ({
        ...p,
        user_name: profileMap.get(p.user_id)?.name || 'Unknown',
        user_email: profileMap.get(p.user_id)?.email || '',
      })) as MeetingParticipant[];
    },
    enabled: !!meetingId,
  });
}

export function useUserMeetings() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['user-meetings', user?.id],
    queryFn: async () => {
      if (!user) return [];

      // Get meetings where user is a participant
      const { data: participations, error: partError } = await supabase
        .from('meeting_participants')
        .select('meeting_id')
        .eq('user_id', user.id);

      if (partError) throw partError;

      // Get meetings for events user is registered for
      const { data: registrations, error: regError } = await supabase
        .from('registrations')
        .select('event_id')
        .eq('user_id', user.id);

      if (regError) throw regError;

      const registeredEventIds = registrations?.map(r => r.event_id) || [];
      const participantMeetingIds = participations?.map(p => p.meeting_id) || [];

      if (registeredEventIds.length === 0 && participantMeetingIds.length === 0) return [];

      // Fetch meetings from both sources
      let allMeetings: any[] = [];

      if (participantMeetingIds.length > 0) {
        const { data } = await supabase
          .from('meetings')
          .select('*')
          .in('id', participantMeetingIds);
        if (data) allMeetings.push(...data);
      }

      if (registeredEventIds.length > 0) {
        const { data } = await supabase
          .from('meetings')
          .select('*')
          .in('event_id', registeredEventIds);
        if (data) allMeetings.push(...data);
      }

      // Deduplicate by id
      const meetingMap = new Map(allMeetings.map(m => [m.id, m]));
      const meetings = [...meetingMap.values()].sort(
        (a, b) => a.meeting_date.localeCompare(b.meeting_date)
      );

      if (meetings.length === 0) return [];

      // Fetch event titles and creator names
      const eventIds = [...new Set(meetings.map(m => m.event_id))];
      const creatorIds = [...new Set(meetings.map(m => m.created_by))];

      const [{ data: events }, { data: profiles }] = await Promise.all([
        supabase.from('events').select('id, title').in('id', eventIds),
        supabase.from('profiles').select('user_id, name').in('user_id', creatorIds),
      ]);

      const eventMap = new Map(events?.map(e => [e.id, e.title]) || []);
      const profileMap = new Map(profiles?.map(p => [p.user_id, p.name]) || []);

      return meetings.map(meeting => ({
        ...meeting,
        event_title: eventMap.get(meeting.event_id) || 'Unknown Event',
        creator_name: profileMap.get(meeting.created_by) || 'Unknown',
      })) as Meeting[];
    },
    enabled: !!user,
  });
}

export function useCreateMeeting() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: {
      event_id: string;
      title: string;
      description?: string;
      meeting_link: string;
      meeting_date: string;
      meeting_time: string;
      duration_minutes?: number;
      agenda?: string;
      participant_ids?: string[];
    }) => {
      if (!user) throw new Error('Not authenticated');

      const { data: meeting, error } = await supabase
        .from('meetings')
        .insert([{
          event_id: data.event_id,
          title: data.title,
          description: data.description || null,
          meeting_link: data.meeting_link,
          meeting_date: data.meeting_date,
          meeting_time: data.meeting_time,
          duration_minutes: data.duration_minutes || 60,
          agenda: data.agenda || null,
          created_by: user.id,
        }])
        .select()
        .single();

      if (error) throw error;

      // Add participants if provided
      if (data.participant_ids && data.participant_ids.length > 0) {
        const participants = data.participant_ids.map(userId => ({
          meeting_id: meeting.id,
          user_id: userId,
        }));

        const { error: partError } = await supabase
          .from('meeting_participants')
          .insert(participants);

        if (partError) {
          console.error('Error adding participants:', partError);
        }
      }

      return meeting;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
      queryClient.invalidateQueries({ queryKey: ['meetings', variables.event_id] });
      toast({
        title: 'Meeting scheduled',
        description: 'Participants have been notified.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error creating meeting',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateMeeting() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...data }: {
      id: string;
      title?: string;
      description?: string;
      meeting_link?: string;
      meeting_date?: string;
      meeting_time?: string;
      duration_minutes?: number;
      agenda?: string;
    }) => {
      const { error } = await supabase
        .from('meetings')
        .update(data)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
      toast({
        title: 'Meeting updated',
        description: 'Meeting details have been saved.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error updating meeting',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteMeeting() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('meetings')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
      toast({
        title: 'Meeting deleted',
        description: 'The meeting has been removed.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error deleting meeting',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useAddParticipant() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ meetingId, userId }: { meetingId: string; userId: string }) => {
      const { error } = await supabase
        .from('meeting_participants')
        .insert([{ meeting_id: meetingId, user_id: userId }]);

      if (error) throw error;
    },
    onSuccess: (_, { meetingId }) => {
      queryClient.invalidateQueries({ queryKey: ['meeting-participants', meetingId] });
      toast({
        title: 'Participant added',
        description: 'The user has been invited to the meeting.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error adding participant',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateParticipantStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ meetingId, status }: { meetingId: string; status: 'accepted' | 'declined' }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('meeting_participants')
        .update({ status })
        .eq('meeting_id', meetingId)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: (_, { meetingId }) => {
      queryClient.invalidateQueries({ queryKey: ['meeting-participants', meetingId] });
      queryClient.invalidateQueries({ queryKey: ['user-meetings'] });
    },
  });
}

export function useMarkAttendance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ meetingId, action }: { meetingId: string; action: 'join' | 'leave' }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const updates = action === 'join'
        ? { attended: true, joined_at: new Date().toISOString() }
        : { left_at: new Date().toISOString() };

      const { error } = await supabase
        .from('meeting_participants')
        .update(updates)
        .eq('meeting_id', meetingId)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: (_, { meetingId }) => {
      queryClient.invalidateQueries({ queryKey: ['meeting-participants', meetingId] });
    },
  });
}
