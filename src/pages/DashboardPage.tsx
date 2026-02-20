import { motion } from 'framer-motion';
import {
  Calendar,
  Users,
  TrendingUp,
  Clock,
  CheckCircle,
  ArrowRight,
  Sparkles,
  Loader2
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { StatCard } from '@/components/ui/stat-card';
import { EventCard } from '@/components/events/EventCard';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useEvents, useUpdateEventStatus } from '@/hooks/useEvents';


export default function DashboardPage() {
  const { profile, role } = useAuth();
  const { data: events, isLoading } = useEvents();
  const updateStatusMutation = useUpdateEventStatus();

  const approvedEvents = events?.filter(e => e.status === 'approved') || [];
  const pendingEvents = events?.filter(e => e.status === 'pending') || [];
  const upcomingEvents = approvedEvents.slice(0, 3);

  // Calculate analytics from real data
  const totalEvents = events?.length || 0;
  const totalRegistrations = events?.reduce((sum, e) => sum + e.registered_count, 0) || 0;
  const totalAttendance = events?.reduce((sum, e) => sum + e.attended_count, 0) || 0;
  const attendanceRate = totalRegistrations > 0 ? ((totalAttendance / totalRegistrations) * 100).toFixed(1) : '0';



  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const handleApprove = async (eventId: string) => {
    await updateStatusMutation.mutateAsync({ id: eventId, status: 'approved' });
  };

  const handleReject = async (eventId: string) => {
    await updateStatusMutation.mutateAsync({ id: eventId, status: 'rejected' });
  };

  return (
    <MainLayout>
      <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 text-primary mb-2"
          >
            <Sparkles className="w-5 h-5" />
            <span className="text-sm font-medium">{greeting()}</span>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-3xl font-bold"
          >
            Welcome back, {profile?.name?.split(' ')[0] || 'User'}!
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-muted-foreground mt-1"
          >
            Here's what's happening with your events today.
          </motion.p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Events"
            value={totalEvents}
            icon={Calendar}
            variant="primary"
            delay={0}
          />
          <StatCard
            title="Total Registrations"
            value={totalRegistrations.toLocaleString()}
            icon={Users}
            variant="success"
            delay={0.1}
          />
          <StatCard
            title="Attendance Rate"
            value={`${attendanceRate}%`}
            icon={TrendingUp}
            variant="accent"
            delay={0.2}
          />
          <StatCard
            title="Pending Approvals"
            value={pendingEvents.length}
            icon={Clock}
            variant="warning"
            delay={0.3}
          />
        </div>



        {/* Quick Actions & Pending */}
        {role === 'admin' && pendingEvents.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="mb-8"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-warning" />
                <h2 className="text-xl font-semibold">Pending Approvals</h2>
              </div>
              <Link to="/approvals">
                <Button variant="ghost" size="sm">
                  View all <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingEvents.slice(0, 4).map((event) => (
                <div key={event.id} className="bg-warning/5 border border-warning/20 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">{event.title}</h3>
                    <p className="text-sm text-muted-foreground">{event.organizer_name}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-destructive text-destructive hover:bg-destructive/10"
                      onClick={() => handleReject(event.id)}
                      disabled={updateStatusMutation.isPending}
                    >
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      className="gradient-success text-white"
                      onClick={() => handleApprove(event.id)}
                      disabled={updateStatusMutation.isPending}
                    >
                      <CheckCircle className="w-4 h-4 mr-1" /> Approve
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Upcoming Events */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Upcoming Events</h2>
            <Link to="/events">
              <Button variant="ghost" size="sm">
                View all <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : upcomingEvents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No upcoming events yet
            </div>
          )}
        </motion.div>
      </div>
    </MainLayout>
  );
}
