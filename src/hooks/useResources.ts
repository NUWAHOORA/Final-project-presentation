import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface ResourceType {
  id: string;
  name: string;
  description: string | null;
  total_quantity: number;
  available_quantity: number;
  created_at: string;
}

export interface EventResource {
  id: string;
  event_id: string;
  resource_type_id: string;
  quantity: number;
  allocated_by: string;
  allocated_at: string;
  notes: string | null;
  resource_type?: ResourceType;
}

export function useResourceTypes() {
  return useQuery({
    queryKey: ['resource-types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('resource_types')
        .select('*')
        .order('name');

      if (error) throw error;
      return data as ResourceType[];
    },
  });
}

export function useEventResources(eventId: string) {
  return useQuery({
    queryKey: ['event-resources', eventId],
    queryFn: async () => {
      const { data: allocations, error } = await supabase
        .from('event_resources')
        .select('*')
        .eq('event_id', eventId);

      if (error) throw error;

      // Fetch resource type details
      const resourceTypeIds = allocations?.map(a => a.resource_type_id) || [];
      if (resourceTypeIds.length === 0) return [];

      const { data: resourceTypes } = await supabase
        .from('resource_types')
        .select('*')
        .in('id', resourceTypeIds);

      const resourceMap = new Map(resourceTypes?.map(r => [r.id, r]) || []);

      return allocations?.map(allocation => ({
        ...allocation,
        resource_type: resourceMap.get(allocation.resource_type_id)
      })) as EventResource[];
    },
    enabled: !!eventId,
  });
}

export function useAllocateResource() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      eventId,
      resourceTypeId,
      quantity,
      notes,
    }: {
      eventId: string;
      resourceTypeId: string;
      quantity: number;
      notes?: string;
    }) => {
      if (!user) throw new Error('Not authenticated');

      // Check available quantity
      const { data: resource, error: resourceError } = await supabase
        .from('resource_types')
        .select('available_quantity, name')
        .eq('id', resourceTypeId)
        .single();

      if (resourceError) throw resourceError;
      if (resource.available_quantity < quantity) {
        throw new Error(`Only ${resource.available_quantity} ${resource.name} available`);
      }

      // Allocate resource
      const { error: allocError } = await supabase
        .from('event_resources')
        .upsert({
          event_id: eventId,
          resource_type_id: resourceTypeId,
          quantity,
          allocated_by: user.id,
          notes,
        }, {
          onConflict: 'event_id,resource_type_id'
        });

      if (allocError) throw allocError;

      // Update available quantity
      const { error: updateError } = await supabase
        .from('resource_types')
        .update({ 
          available_quantity: resource.available_quantity - quantity 
        })
        .eq('id', resourceTypeId);

      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event-resources'] });
      queryClient.invalidateQueries({ queryKey: ['resource-types'] });
      toast({
        title: 'Resource allocated',
        description: 'The resource has been allocated to this event.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error allocating resource',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useDeallocateResource() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      allocationId,
      resourceTypeId,
      quantity,
    }: {
      allocationId: string;
      resourceTypeId: string;
      quantity: number;
    }) => {
      // Delete allocation
      const { error: deleteError } = await supabase
        .from('event_resources')
        .delete()
        .eq('id', allocationId);

      if (deleteError) throw deleteError;

      // Restore available quantity
      const { data: resource, error: resourceError } = await supabase
        .from('resource_types')
        .select('available_quantity')
        .eq('id', resourceTypeId)
        .single();

      if (resourceError) throw resourceError;

      const { error: updateError } = await supabase
        .from('resource_types')
        .update({ 
          available_quantity: resource.available_quantity + quantity 
        })
        .eq('id', resourceTypeId);

      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event-resources'] });
      queryClient.invalidateQueries({ queryKey: ['resource-types'] });
      toast({
        title: 'Resource deallocated',
        description: 'The resource has been returned to inventory.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error deallocating resource',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useCreateResourceType() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: {
      name: string;
      description?: string;
      total_quantity: number;
    }) => {
      const { error } = await supabase
        .from('resource_types')
        .insert({
          ...data,
          available_quantity: data.total_quantity,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resource-types'] });
      toast({
        title: 'Resource type created',
        description: 'New resource type has been added.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error creating resource type',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
