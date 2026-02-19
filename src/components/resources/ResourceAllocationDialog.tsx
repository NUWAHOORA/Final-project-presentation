import { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle,
  DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Package, 
  Plus, 
  Minus, 
  Loader2,
  Monitor,
  Music,
  Armchair,
  Presentation,
  Mic,
  Speaker,
  ClipboardList,
  Box
} from 'lucide-react';
import { useResourceTypes, useAllocateResource, useEventResources, useDeallocateResource } from '@/hooks/useResources';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ResourceAllocationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  eventTitle: string;
}

const resourceIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  'Chairs': Armchair,
  'Computers': Monitor,
  'Music Instruments': Music,
  'Projectors': Presentation,
  'Microphones': Mic,
  'Speakers': Speaker,
  'Whiteboards': ClipboardList,
  'Tables': Box,
};

export function ResourceAllocationDialog({ 
  open, 
  onOpenChange, 
  eventId, 
  eventTitle 
}: ResourceAllocationDialogProps) {
  const { data: resourceTypes, isLoading: loadingTypes } = useResourceTypes();
  const { data: eventResources, isLoading: loadingResources } = useEventResources(eventId);
  const allocateMutation = useAllocateResource();
  const deallocateMutation = useDeallocateResource();

  const [selectedResource, setSelectedResource] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');

  const getAllocatedQuantity = (resourceTypeId: string) => {
    return eventResources?.find(r => r.resource_type_id === resourceTypeId)?.quantity || 0;
  };

  const getAllocation = (resourceTypeId: string) => {
    return eventResources?.find(r => r.resource_type_id === resourceTypeId);
  };

  const handleAllocate = async () => {
    if (!selectedResource) return;
    
    await allocateMutation.mutateAsync({
      eventId,
      resourceTypeId: selectedResource,
      quantity,
      notes: notes || undefined,
    });

    setSelectedResource(null);
    setQuantity(1);
    setNotes('');
  };

  const handleDeallocate = async (resourceTypeId: string) => {
    const allocation = getAllocation(resourceTypeId);
    if (!allocation) return;

    await deallocateMutation.mutateAsync({
      allocationId: allocation.id,
      resourceTypeId,
      quantity: allocation.quantity,
    });
  };

  const getIcon = (name: string) => {
    const Icon = resourceIcons[name] || Package;
    return Icon;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            Allocate Resources
          </DialogTitle>
          <DialogDescription>
            Manage resource allocation for "{eventTitle}"
          </DialogDescription>
        </DialogHeader>

        {loadingTypes || loadingResources ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-4 pr-4">
              {/* Currently Allocated */}
              {eventResources && eventResources.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium mb-3 text-muted-foreground">
                    Currently Allocated
                  </h4>
                  <div className="space-y-2">
                    {eventResources.map((allocation) => {
                      const Icon = getIcon(allocation.resource_type?.name || '');
                      return (
                        <div 
                          key={allocation.id}
                          className="flex items-center justify-between p-3 bg-primary/5 rounded-lg border border-primary/20"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                              <Icon className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">{allocation.resource_type?.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {allocation.quantity} allocated
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleDeallocate(allocation.resource_type_id)}
                            disabled={deallocateMutation.isPending}
                          >
                            <Minus className="w-4 h-4 mr-1" />
                            Remove
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Available Resources */}
              <div>
                <h4 className="text-sm font-medium mb-3 text-muted-foreground">
                  Available Resources
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {resourceTypes?.map((resource) => {
                    const Icon = getIcon(resource.name);
                    const allocated = getAllocatedQuantity(resource.id);
                    const isSelected = selectedResource === resource.id;
                    
                    return (
                      <div
                        key={resource.id}
                        className={`p-4 rounded-xl border cursor-pointer transition-all ${
                          isSelected 
                            ? 'border-primary bg-primary/5 ring-2 ring-primary/20' 
                            : 'border-border hover:border-primary/50'
                        } ${allocated > 0 ? 'opacity-50' : ''}`}
                        onClick={() => {
                          if (allocated === 0) {
                            setSelectedResource(isSelected ? null : resource.id);
                          }
                        }}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                              isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted'
                            }`}>
                              <Icon className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="font-medium">{resource.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {resource.description}
                              </p>
                            </div>
                          </div>
                          <Badge variant={resource.available_quantity > 0 ? 'secondary' : 'destructive'}>
                            {resource.available_quantity} available
                          </Badge>
                        </div>
                        {allocated > 0 && (
                          <Badge className="mt-2 bg-primary/10 text-primary border-0">
                            {allocated} already allocated
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Allocation Form */}
              {selectedResource && (
                <div className="mt-6 p-4 bg-muted/50 rounded-xl border space-y-4">
                  <h4 className="font-medium">
                    Allocate {resourceTypes?.find(r => r.id === selectedResource)?.name}
                  </h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Quantity</Label>
                      <Input
                        type="number"
                        min={1}
                        max={resourceTypes?.find(r => r.id === selectedResource)?.available_quantity || 1}
                        value={quantity}
                        onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Available</Label>
                      <div className="h-10 flex items-center px-3 bg-background rounded-md border text-muted-foreground">
                        {resourceTypes?.find(r => r.id === selectedResource)?.available_quantity}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Notes (optional)</Label>
                    <Textarea
                      placeholder="Add any special notes about this allocation..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="resize-none"
                    />
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {selectedResource && (
            <Button 
              onClick={handleAllocate}
              disabled={allocateMutation.isPending}
              className="gradient-primary text-white"
            >
              {allocateMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              Allocate Resource
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
