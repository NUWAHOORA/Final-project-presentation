import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  FileText,
  Tags,
  Check,
  Loader2
} from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateEvent } from '@/hooks/useEvents';
import { useCreateBulkResourceRequests } from '@/hooks/useResourceRequests';
import { ResourceRequestSection, ResourceRequestItem } from '@/components/events/ResourceRequestSection';

type EventCategory = 'academic' | 'social' | 'sports' | 'cultural' | 'workshop' | 'seminar';

const categories: { value: EventCategory; label: string }[] = [
  { value: 'academic', label: 'Academic' },
  { value: 'social', label: 'Social' },
  { value: 'sports', label: 'Sports' },
  { value: 'cultural', label: 'Cultural' },
  { value: 'workshop', label: 'Workshop' },
  { value: 'seminar', label: 'Seminar' },
];

export default function CreateEventPage() {
  const navigate = useNavigate();
  const createEventMutation = useCreateEvent();
  const createResourceRequestsMutation = useCreateBulkResourceRequests();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: '',
    time: '',
    venue: '',
    category: '' as EventCategory,
    capacity: '',
  });
  const [resourceRequests, setResourceRequests] = useState<ResourceRequestItem[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const event = await createEventMutation.mutateAsync({
      title: formData.title,
      description: formData.description,
      date: formData.date,
      time: formData.time,
      venue: formData.venue,
      category: formData.category,
      capacity: parseInt(formData.capacity),
    });

    // Submit resource requests if any
    const validRequests = resourceRequests.filter(r => r.resource_type_id && r.requested_quantity > 0);
    if (validRequests.length > 0 && event?.id) {
      await createResourceRequestsMutation.mutateAsync({
        event_id: event.id,
        requests: validRequests,
      });
    }

    navigate('/events');
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const isSubmitting = createEventMutation.isPending || createResourceRequestsMutation.isPending;

  return (
    <MainLayout>
      <div className="p-8 max-w-3xl mx-auto">
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

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold">Create New Event</h1>
          <p className="text-muted-foreground mt-1">
            Fill in the details below to submit your event for approval
          </p>
        </motion.div>

        {/* Form */}
        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          onSubmit={handleSubmit}
          className="space-y-6"
        >
          <div className="bg-card rounded-2xl border border-border p-6 space-y-6">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title" className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                Event Title
              </Label>
              <Input
                id="title"
                placeholder="Enter a compelling event title"
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                className="h-12"
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description" className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                Description
              </Label>
              <Textarea
                id="description"
                placeholder="Describe your event, including key highlights and what attendees can expect..."
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                className="min-h-32 resize-none"
                required
              />
            </div>

            {/* Date and Time */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date" className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary" />
                  Date
                </Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => handleChange('date', e.target.value)}
                  className="h-12"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="time" className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  Time
                </Label>
                <Input
                  id="time"
                  type="time"
                  value={formData.time}
                  onChange={(e) => handleChange('time', e.target.value)}
                  className="h-12"
                  required
                />
              </div>
            </div>

            {/* Venue */}
            <div className="space-y-2">
              <Label htmlFor="venue" className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" />
                Venue
              </Label>
              <Input
                id="venue"
                placeholder="e.g., Main Auditorium, Building A"
                value={formData.venue}
                onChange={(e) => handleChange('venue', e.target.value)}
                className="h-12"
                required
              />
            </div>

            {/* Category and Capacity */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category" className="flex items-center gap-2">
                  <Tags className="w-4 h-4 text-primary" />
                  Category
                </Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => handleChange('category', value)}
                >
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="capacity" className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  Capacity
                </Label>
                <Input
                  id="capacity"
                  type="number"
                  placeholder="Max attendees"
                  value={formData.capacity}
                  onChange={(e) => handleChange('capacity', e.target.value)}
                  className="h-12"
                  min={1}
                  required
                />
              </div>
            </div>
          </div>

          {/* Resource Requests Section */}
          <div className="bg-card rounded-2xl border border-border p-6">
            <ResourceRequestSection
              requests={resourceRequests}
              onChange={setResourceRequests}
            />
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-4 justify-end">
            <Button type="button" variant="outline" onClick={() => navigate(-1)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="gradient-primary text-white min-w-32"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Submit for Approval
                </>
              )}
            </Button>
          </div>
        </motion.form>
      </div>
    </MainLayout>
  );
}
