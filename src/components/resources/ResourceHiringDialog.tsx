import { useState, useMemo } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertTriangle, CheckCircle, Package } from 'lucide-react';
import { useResourceTypes, useBulkAllocateResources, useEventResources } from '@/hooks/useResources';
import { useResourceRequests } from '@/hooks/useResourceRequests';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useUpdateEventStatus } from '@/hooks/useEvents';

interface ResourceHiringDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  eventTitle: string;
  onSuccess?: () => void;
}

export function ResourceHiringDialog({
  open,
  onOpenChange,
  eventId,
  eventTitle,
  onSuccess
}: ResourceHiringDialogProps) {
  const { data: resourceTypes, isLoading: loadingTypes } = useResourceTypes();
  const { data: resourceRequests, isLoading: loadingRequests } = useResourceRequests(eventId);
  const { data: eventResources, isLoading: loadingAllocations } = useEventResources(eventId);
  const bulkAllocateMutation = useBulkAllocateResources();
  const updateStatusMutation = useUpdateEventStatus();
  
  const [unitCosts, setUnitCosts] = useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isLoading = loadingTypes || loadingRequests || loadingAllocations;

  // Calculate missing resources
  const requestedItems = useMemo(() => {
    if (!resourceRequests || !resourceTypes) return [];

    return resourceRequests.map(req => {
      const type = resourceTypes.find(t => t.id === req.resource_type_id);
      const available = type ? type.available_quantity : 0;
      const requested = req.requested_quantity;
      
      const existingAlloc = eventResources?.find(r => r.resource_type_id === req.resource_type_id);
      const alreadyAllocated = existingAlloc?.quantity || 0;
      
      const remainingNeeded = Math.max(0, requested - alreadyAllocated);
      
      const allocatingFromStock = remainingNeeded > available ? available : remainingNeeded;
      const missing = remainingNeeded - allocatingFromStock;

      return {
        resourceTypeId: req.resource_type_id,
        name: type?.name || 'Unknown',
        requested,
        available,
        alreadyAllocated,
        remainingNeeded,
        missing,
        allocatingFromStock
      };
    }).filter(item => item.remainingNeeded > 0); // Only show items that still need allocation
  }, [resourceRequests, resourceTypes, eventResources]);

  const hasMissingResources = requestedItems.some(item => item.missing > 0);

  const totalCost = useMemo(() => {
    let total = 0;
    requestedItems.forEach(item => {
      if (item.missing > 0) {
        const costPerUnit = unitCosts[item.resourceTypeId] || 0;
        total += item.missing * costPerUnit;
      }
    });
    return total;
  }, [requestedItems, unitCosts]);

  const handleUnitCostChange = (resourceTypeId: string, costStr: string) => {
    const cost = parseInt(costStr) || 0;
    setUnitCosts(prev => ({ ...prev, [resourceTypeId]: cost }));
  };

  const handleApprove = async () => {
    try {
      setIsSubmitting(true);
      // 1. Bulk Allocate
      const allocations = requestedItems.map(item => {
        const costPerUnit = unitCosts[item.resourceTypeId] || 0;
        return {
          resourceTypeId: item.resourceTypeId,
          quantity: item.allocatingFromStock,
          hiredQuantity: item.missing,
          hireCost: item.missing * costPerUnit
        };
      });

      if (allocations.length > 0) {
        await bulkAllocateMutation.mutateAsync({
          eventId,
          allocations,
          totalResourceCost: totalCost
        });
      }

      // 2. Approve Event
      await updateStatusMutation.mutateAsync({ id: eventId, status: 'approved' });
      
      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Failed to approve event with resources:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isPending = isSubmitting || bulkAllocateMutation.isPending || updateStatusMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {hasMissingResources ? (
              <AlertTriangle className="w-5 h-5 text-warning" />
            ) : (
              <CheckCircle className="w-5 h-5 text-success" />
            )}
            Review Resources & Approve Event
          </DialogTitle>
          <DialogDescription>
            {hasMissingResources 
              ? `Some requested resources for "${eventTitle}" are out of stock. You can hire them to proceed.`
              : `All requested resources for "${eventTitle}" are available in stock.`}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-4 pr-4">
              
              {requestedItems.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground border border-dashed rounded-xl">
                  <CheckCircle className="w-8 h-8 mx-auto mb-2 text-success opacity-80" />
                  <p className="text-sm">All requested resources are already fully allocated!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {requestedItems.map((item) => (
                    <div 
                      key={item.resourceTypeId} 
                      className={`p-4 rounded-xl border ${item.missing > 0 ? 'bg-warning/5 border-warning/30' : 'bg-card border-border'}`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-semibold flex items-center gap-2">
                            {item.name}
                            {item.missing > 0 ? (
                              <Badge variant="outline" className="text-warning border-warning">Out of Stock</Badge>
                            ) : (
                              <Badge variant="outline" className="text-success border-success">Available</Badge>
                            )}
                          </h4>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-4 text-sm mt-3 bg-background/50 p-2 rounded-lg">
                        <div className="flex flex-col">
                          <span className="text-muted-foreground text-xs">Required</span>
                          <span className="font-medium">{item.requested}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-muted-foreground text-xs">Available</span>
                          <span className="font-medium text-success">{item.available}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-muted-foreground text-xs">Missing</span>
                          <span className={`font-medium ${item.missing > 0 ? 'text-destructive' : ''}`}>{item.missing}</span>
                        </div>
                      </div>

                      {item.missing > 0 && (
                        <div className="mt-4 pt-4 border-t border-warning/10">
                          <label className="text-sm font-medium mb-1.5 block">
                            Hire Missing Resources: Unit Cost (UGX)
                          </label>
                          <div className="flex items-center gap-3">
                            <div className="relative flex-1 max-w-[200px]">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">UGX</span>
                              <Input 
                                type="number" 
                                min={0}
                                className="pl-12"
                                placeholder="0"
                                value={unitCosts[item.resourceTypeId] || ''}
                                onChange={(e) => handleUnitCostChange(item.resourceTypeId, e.target.value)}
                              />
                            </div>
                            <div className="text-sm">
                              <span className="text-muted-foreground">Subtotal: </span>
                              <span className="font-semibold text-primary">
                                UGX {(item.missing * (unitCosts[item.resourceTypeId] || 0)).toLocaleString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {hasMissingResources && (
                <div className="mt-6 p-4 rounded-xl bg-primary/10 border border-primary/20 flex justify-between items-center">
                  <div>
                    <h3 className="font-semibold text-primary">Total Hiring Cost</h3>
                    <p className="text-sm text-muted-foreground">Will be recorded under event expenses</p>
                  </div>
                  <div className="text-2xl font-bold text-primary">
                    UGX {totalCost.toLocaleString()}
                  </div>
                </div>
              )}

            </div>
          </ScrollArea>
        )}

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button
            onClick={handleApprove}
            disabled={isPending || isLoading}
            className="gradient-success text-white"
          >
            {isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle className="w-4 h-4 mr-2" />
            )}
            {hasMissingResources ? 'Approve & Hire Resources' : 'Approve & Allocate Stock'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
