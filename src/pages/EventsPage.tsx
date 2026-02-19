import { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Plus, Grid, List, Loader2 } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { EventCard } from '@/components/events/EventCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useEvents } from '@/hooks/useEvents';
import { Link } from 'react-router-dom';

const categories = ['all', 'academic', 'social', 'sports', 'cultural', 'workshop', 'seminar'];

export default function EventsPage() {
  const { role } = useAuth();
  const { data: events, isLoading } = useEvents();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const today = new Date().toISOString().split('T')[0];

  const filteredEvents = events?.filter(event => {
    const matchesSearch = event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (event.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    const matchesCategory = selectedCategory === 'all' || event.category === selectedCategory;
    return matchesSearch && matchesCategory;
  }) || [];

  const upcomingEvents = filteredEvents.filter(e => e.date >= today);
  const pastEvents = filteredEvents.filter(e => e.date < today);

  return (
    <MainLayout>
      <div className="p-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <motion.h1
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-3xl font-bold"
            >
              {role === 'student' ? 'Browse Events' : 'Events'}
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-muted-foreground mt-1"
            >
              {filteredEvents.length} events available
            </motion.p>
          </div>

          {(role === 'organizer' || role === 'admin') && (
            <Link to="/events/create">
              <Button className="gradient-primary text-white">
                <Plus className="w-4 h-4 mr-2" />
                Create Event
              </Button>
            </Link>
          )}
        </div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex flex-col md:flex-row gap-4 mb-8"
        >
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Search events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-11"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {categories.map((category) => (
              <Badge
                key={category}
                variant={selectedCategory === category ? 'default' : 'outline'}
                className={`cursor-pointer capitalize px-4 py-2 transition-all ${
                  selectedCategory === category 
                    ? 'gradient-primary text-white border-0' 
                    : 'hover:bg-muted'
                }`}
                onClick={() => setSelectedCategory(category)}
              >
                {category}
              </Badge>
            ))}
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              size="icon"
              onClick={() => setViewMode('grid')}
            >
              <Grid className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="icon"
              onClick={() => setViewMode('list')}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </motion.div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}

        {/* Upcoming Events */}
        {!isLoading && upcomingEvents.length > 0 && (
          <>
            <h2 className="text-xl font-semibold mb-4">Upcoming Events</h2>
            <div className={viewMode === 'grid' 
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10'
              : 'flex flex-col gap-4 mb-10'
            }>
              {upcomingEvents.map((event, index) => (
                <EventCard 
                  key={event.id} 
                  event={{
                    id: event.id,
                    title: event.title,
                    description: event.description || '',
                    date: event.date,
                    time: event.time,
                    venue: event.venue,
                    category: event.category,
                    capacity: event.capacity,
                    registeredCount: event.registered_count,
                    attendedCount: event.attended_count,
                    status: event.status,
                    organizerId: event.organizer_id,
                    organizerName: event.organizer_name || 'Unknown',
                    imageUrl: event.image_url || undefined,
                    qrCode: event.qr_code || undefined,
                    createdAt: event.created_at
                  }} 
                  index={index} 
                />
              ))}
            </div>
          </>
        )}

        {/* Past Events */}
        {!isLoading && pastEvents.length > 0 && (
          <>
            <h2 className="text-xl font-semibold mb-4 text-muted-foreground">Past Events</h2>
            <div className={viewMode === 'grid' 
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 opacity-75'
              : 'flex flex-col gap-4 opacity-75'
            }>
              {pastEvents.map((event, index) => (
                <EventCard 
                  key={event.id} 
                  event={{
                    id: event.id,
                    title: event.title,
                    description: event.description || '',
                    date: event.date,
                    time: event.time,
                    venue: event.venue,
                    category: event.category,
                    capacity: event.capacity,
                    registeredCount: event.registered_count,
                    attendedCount: event.attended_count,
                    status: event.status,
                    organizerId: event.organizer_id,
                    organizerName: event.organizer_name || 'Unknown',
                    imageUrl: event.image_url || undefined,
                    qrCode: event.qr_code || undefined,
                    createdAt: event.created_at
                  }} 
                  index={index} 
                />
              ))}
            </div>
          </>
        )}

        {/* Empty State */}
        {!isLoading && filteredEvents.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No events found</h3>
            <p className="text-muted-foreground">Try adjusting your search or filter criteria</p>
          </motion.div>
        )}
      </div>
    </MainLayout>
  );
}
