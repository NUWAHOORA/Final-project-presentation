import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ViewModeProvider } from "@/contexts/ViewModeContext";
import { useAuth } from "@/contexts/AuthContext";

import LoginPage from "@/pages/LoginPage";
import OtpVerificationPage from "@/pages/OtpVerificationPage";
import ResetPasswordPage from "@/pages/ResetPasswordPage";
import DashboardPage from "@/pages/DashboardPage";
import EventsPage from "@/pages/EventsPage";
import EventDetailPage from "@/pages/EventDetailPage";
import CreateEventPage from "@/pages/CreateEventPage";
import AnalyticsPage from "@/pages/AnalyticsPage";
import NotificationsPage from "@/pages/NotificationsPage";
import TicketsPage from "@/pages/TicketsPage";
import ApprovalsPage from "@/pages/ApprovalsPage";
import RegistrationsPage from "@/pages/RegistrationsPage";
import AttendancePage from "@/pages/AttendancePage";
import MarkAttendancePage from "@/pages/MarkAttendancePage";
import UsersPage from "@/pages/UsersPage";
import ResourcesPage from "@/pages/ResourcesPage";
import MeetingsPage from "@/pages/MeetingsPage";
import EmailSettingsPage from "@/pages/EmailSettingsPage";
import InvitationsPage from "@/pages/InvitationsPage";
import RejectedEventsPage from "@/pages/RejectedEventsPage";
import PendingApprovalPage from "@/pages/PendingApprovalPage";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

/**
 * Guard that redirects to /verify-otp if credentials are verified
 * but OTP has not yet been confirmed.
 */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, otpPending, isLoading, profile, role } = useAuth();

  if (isLoading) return null;

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (otpPending) {
    return <Navigate to="/verify-otp" replace />;
  }

  if (profile && !profile.is_approved && role !== 'admin') {
    return <Navigate to="/pending-approval" replace />;
  }

  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <ViewModeProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<Navigate to="/login" replace />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/verify-otp" element={<OtpVerificationPage />} />
              <Route path="/pending-approval" element={<PendingApprovalPage />} />

              {/* Protected routes — require auth + completed OTP */}
              <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
              <Route path="/events" element={<ProtectedRoute><EventsPage /></ProtectedRoute>} />
              <Route path="/events/create" element={<ProtectedRoute><CreateEventPage /></ProtectedRoute>} />
              <Route path="/events/:id" element={<ProtectedRoute><EventDetailPage /></ProtectedRoute>} />
              <Route path="/analytics" element={<ProtectedRoute><AnalyticsPage /></ProtectedRoute>} />
              <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
              <Route path="/tickets" element={<ProtectedRoute><TicketsPage /></ProtectedRoute>} />
              <Route path="/approvals" element={<ProtectedRoute><ApprovalsPage /></ProtectedRoute>} />
              <Route path="/registrations" element={<ProtectedRoute><RegistrationsPage /></ProtectedRoute>} />
              <Route path="/attendance" element={<ProtectedRoute><AttendancePage /></ProtectedRoute>} />
              <Route path="/mark-attendance/:eventId" element={<ProtectedRoute><MarkAttendancePage /></ProtectedRoute>} />
              <Route path="/users" element={<ProtectedRoute><UsersPage /></ProtectedRoute>} />
              <Route path="/resources" element={<ProtectedRoute><ResourcesPage /></ProtectedRoute>} />
              <Route path="/meetings" element={<ProtectedRoute><MeetingsPage /></ProtectedRoute>} />
              <Route path="/email-settings" element={<ProtectedRoute><EmailSettingsPage /></ProtectedRoute>} />
              <Route path="/invitations" element={<ProtectedRoute><InvitationsPage /></ProtectedRoute>} />
              <Route path="/rejected-events" element={<ProtectedRoute><RejectedEventsPage /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </ViewModeProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
