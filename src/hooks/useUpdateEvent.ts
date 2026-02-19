import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { checkSchedulingConflict } from '@/hooks/useSchedulingConflict';

export function useUpdateEvent() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: {
      id: string;
      title?: string;
      description?: string;
      date?: string;
      time?: string;
      venue?: string;
      category?: 'academic' | 'social' | 'sports' | 'cultural' | 'workshop' | 'seminar';
      capacity?: number;
    }) => {
      const { id, ...updateData } = data;

      // Check for scheduling conflicts if date or venue changed
      if (updateData.date && updateData.venue) {
        const conflict = await checkSchedulingConflict(updateData.date, updateData.venue, id);
        if (conflict.hasConflict) {
          throw new Error(`Scheduling conflict: "${conflict.conflictingEvent}" is already booked at ${updateData.venue} on ${updateData.date}`);
        }
      }

      const { error } = await supabase
        .from('events')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast({
        title: 'Event updated',
        description: 'The event has been updated successfully.',
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
