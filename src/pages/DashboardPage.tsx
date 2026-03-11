import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Calendar,
  Users,
  Clock,
  CheckCircle,
  ArrowRight,
  Sparkles,
  Loader2,
  Download,
  Video,
  Ticket,
} from 'lucide-react';

import { Link } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { StatCard } from '@/components/ui/stat-card';
import { EventCard } from '@/components/events/EventCard';
import { MeetingCard } from '@/components/meetings/MeetingCard';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useEvents, useUpdateEventStatus } from '@/hooks/useEvents';
import { useMeetings, useUserMeetings, useMarkAttendance } from '@/hooks/useMeetings';
import { useRecentRegistrations } from '@/hooks/useRegistrations';
import { ReportDownloadDialog } from '@/components/reports/ReportDownloadDialog';
import { AttendanceTrackingWidget } from '@/components/attendance/AttendanceTrackingWidget';
import { parseISO, isToday, isFuture } from 'date-fns';


export default function DashboardPage() {
  const { profile, role } = useAuth();
  const { data: events, isLoading: eventsLoading } = useEvents();
  const { data: allMeetings, isLoading: loadingAll } = useMeetings();
  const { data: userMeetings, isLoading: loadingUser } = useUserMeetings();
  const { data: recentRegistrations, isLoading: registrationsLoading } = useRecentRegistrations(5);
  const markAttendance = useMarkAttendance();
  const updateStatusMutation = useUpdateEventStatus();
  const [reportOpen, setReportOpen] = useState(false);

  const isAdmin = role === 'admin';
  const isOrganizer = role === 'organizer';
  const meetings = isAdmin || isOrganizer ? allMeetings : userMeetings;
  const meetingsLoading = isAdmin || isOrganizer ? loadingAll : loadingUser;

  const approvedEvents = events?.filter(e => e.status === 'approved') || [];
  const pendingEvents = events?.filter(e => e.status === 'pending') || [];
  const upcomingEvents = approvedEvents.slice(0, 3);

  const upcomingMeetings = meetings?.filter(m => {
    const date = parseISO(m.meeting_date);
    return (isToday(date) || isFuture(date)) && m.status !== 'ended';
  }).slice(0, 3) || [];


  // Calculate analytics from real data — role-aware
  const dashboardEvents = isAdmin ? (events || []) : (events?.filter(e => e.organizer_id === profile?.user_id) || []);
  const totalEvents = dashboardEvents.length;
  const totalRegistrations = dashboardEvents.reduce((sum, e) => sum + (e.registered_count || 0), 0);
  const totalAttended = dashboardEvents.reduce((sum, e) => sum + (e.attended_count || 0), 0);
  const rolePendingEvents = dashboardEvents.filter(e => e.status === 'pending');

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

  const handleJoinMeeting = (meetingId: string, link: string) => {
    markAttendance.mutate({ meetingId, action: 'join' });
    window.open(link, '_blank');
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

          {/* Title row — Download Report button lives here (admin only) */}
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
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

            {/* Admin-only Download Report button */}
            {role === 'admin' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
              >
                <Button
                  onClick={() => setReportOpen(true)}
                  className="flex items-center gap-2 bg-primary hover:bg-primary/90 shadow-md"
                >
                  <Download className="w-4 h-4" />
                  Download Report
                </Button>
              </motion.div>
            )}
          </div>
        </div>

        {/* Stats Grid — admin and organizer */}
        {(isAdmin || isOrganizer) && (
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
              badge={totalRegistrations > 0 ? totalRegistrations : undefined}
            />
            <StatCard
              title={isAdmin ? "Pending Approvals" : "My Pending Events"}
              value={rolePendingEvents.length}
              icon={Clock}
              variant="warning"
              delay={0.2}
            />
            <StatCard
              title="Total Attendance"
              value={totalAttended.toLocaleString()}
              icon={CheckCircle}
              variant="accent"
              delay={0.3}
              badge={totalAttended > 0 ? totalAttended : undefined}
            />
          </div>
        )}

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

        {/* Attendance Tracking & Recent Registrations — admin & organizer only */}
        {(isAdmin || isOrganizer) && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
            <div className="lg:col-span-2">
              <AttendanceTrackingWidget events={events || []} />
            </div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
              className="bg-card rounded-2xl border border-border p-6 h-full flex flex-col"
            >
              <div className="flex items-center gap-2 mb-6">
                <Users className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-semibold">Recent Registrations</h2>
              </div>

              {registrationsLoading ? (
                <div className="flex-1 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : recentRegistrations && recentRegistrations.length > 0 ? (
                <div className="space-y-4 flex-1">
                  {recentRegistrations.map((reg) => (
                    <div key={reg.id} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-muted/30 border border-border/50">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                          {reg.user?.name?.charAt(0) || 'U'}
                        </div>
                        <div>
                          <p className="text-sm font-medium leading-none">{reg.user?.name || 'Anonymous'}</p>
                          <p className="text-[11px] text-muted-foreground mt-1 truncate max-w-[120px]">
                            {reg.event?.title}
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                        {new Date(reg.registered_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center text-muted-foreground py-8">
                  <Ticket className="w-8 h-8 mb-2 opacity-20" />
                  <p className="text-sm">No recent sign-ups</p>
                </div>
              )}

              <Link to="/attendance" className="mt-6">
                <Button variant="outline" size="sm" className="w-full text-xs">
                  View All Registrants
                </Button>
              </Link>
            </motion.div>
          </div>
        )}

        {/* Upcoming & Live Meetings Highlight */}
        {upcomingMeetings.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65 }}
            className="mb-8"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Video className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-semibold">Upcoming Meetings</h2>
              </div>
              <Link to="/meetings">
                <Button variant="ghost" size="sm">
                  View all <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {upcomingMeetings.map((meeting) => (
                <MeetingCard
                  key={meeting.id}
                  meeting={meeting}
                  onJoin={handleJoinMeeting}
                />
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
          {eventsLoading ? (
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

      {/* Report Download Dialog — admin only, rendered at page level */}
      {role === 'admin' && (
        <ReportDownloadDialog
          open={reportOpen}
          onOpenChange={setReportOpen}
          events={events || []}
        />
      )}
    </MainLayout>
  );
}
