import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, 
  Calendar, 
  Users, 
  BarChart3, 
  Bell, 
  QrCode,
  Plus,
  CheckCircle,
  LogOut,
  ChevronLeft,
  GraduationCap,
  Package,
  Video,
  Mail
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import ucuLogoFull from '@/assets/ucu-logo-full.png';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useUnreadNotificationCount } from '@/hooks/useNotifications';

interface SidebarLink {
  icon: React.ElementType;
  label: string;
  path: string;
  showBadge?: boolean;
}

const sidebarLinks: Record<string, SidebarLink[]> = {
  admin: [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
    { icon: Calendar, label: 'All Events', path: '/events' },
    { icon: CheckCircle, label: 'Approvals', path: '/approvals' },
    { icon: Video, label: 'Meetings', path: '/meetings' },
    { icon: Package, label: 'Resources', path: '/resources' },
    { icon: Users, label: 'Users', path: '/users' },
    { icon: BarChart3, label: 'Analytics', path: '/analytics' },
    { icon: Bell, label: 'Notifications', path: '/notifications', showBadge: true },
    { icon: Mail, label: 'Email Settings', path: '/email-settings' },
  ],
  organizer: [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
    { icon: Calendar, label: 'My Events', path: '/events' },
    { icon: Plus, label: 'Create Event', path: '/events/create' },
    { icon: Video, label: 'Meetings', path: '/meetings' },
    { icon: QrCode, label: 'Attendance', path: '/attendance' },
    { icon: BarChart3, label: 'Reports', path: '/analytics' },
    { icon: Bell, label: 'Notifications', path: '/notifications', showBadge: true },
    { icon: Mail, label: 'Email Preferences', path: '/email-settings' },
  ],
  student: [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
    { icon: Calendar, label: 'Browse Events', path: '/events' },
    { icon: Video, label: 'Meetings', path: '/meetings' },
    { icon: CheckCircle, label: 'My Registrations', path: '/registrations' },
    { icon: QrCode, label: 'My Tickets', path: '/tickets' },
    { icon: Bell, label: 'Notifications', path: '/notifications', showBadge: true },
    { icon: Mail, label: 'Email Preferences', path: '/email-settings' },
  ],
};

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { profile, role, signOut } = useAuth();
  const location = useLocation();
  const { data: unreadCount = 0 } = useUnreadNotificationCount();

  if (!profile || !role) return null;

  const links = sidebarLinks[role];
  const displayName = profile.name || profile.email.split('@')[0];
  const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase();

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 80 : 280 }}
      className="fixed left-0 top-0 h-screen bg-sidebar z-50 flex flex-col border-r border-sidebar-border"
    >
      {/* Header */}
      <div className="p-4 flex items-center gap-3 border-b border-sidebar-border">
        <img src={ucuLogoFull} alt="UCU Logo" className={cn("object-contain flex-shrink-0", collapsed ? "w-10 h-10" : "h-12")} />
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="flex-1 overflow-hidden"
            />
          )}
        </AnimatePresence>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="flex-shrink-0 text-sidebar-foreground hover:bg-sidebar-accent"
        >
          <motion.div animate={{ rotate: collapsed ? 180 : 0 }}>
            <ChevronLeft className="w-4 h-4" />
          </motion.div>
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {links.map((link) => {
          const isActive = location.pathname === link.path;
          const showBadge = link.showBadge && unreadCount > 0;
          return (
            <Link key={link.path} to={link.path}>
              <motion.div
                whileHover={{ x: 4 }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 relative",
                  isActive 
                    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-lg" 
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                )}
              >
                <div className="relative flex-shrink-0">
                  <link.icon className="w-5 h-5" />
                  {showBadge && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </div>
                <AnimatePresence>
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="font-medium truncate flex-1"
                    >
                      {link.label}
                    </motion.span>
                  )}
                </AnimatePresence>
                {!collapsed && showBadge && (
                  <span className="bg-destructive text-destructive-foreground text-xs font-bold px-2 py-0.5 rounded-full">
                    {unreadCount}
                  </span>
                )}
              </motion.div>
            </Link>
          );
        })}
      </nav>

      {/* User Section */}
      <div className="p-4 border-t border-sidebar-border">
        <div className={cn(
          "flex items-center gap-3 p-3 rounded-xl bg-sidebar-accent",
          collapsed && "justify-center"
        )}>
          <Avatar className="w-10 h-10 flex-shrink-0">
            <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 overflow-hidden"
              >
                <p className="font-medium text-sidebar-foreground text-sm truncate">{displayName}</p>
                <p className="text-xs text-sidebar-foreground/60 capitalize">{role}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <Button
          variant="ghost"
          onClick={signOut}
          className={cn(
            "w-full mt-2 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent",
            collapsed && "px-0"
          )}
        >
          <LogOut className="w-4 h-4" />
          {!collapsed && <span className="ml-2">Logout</span>}
        </Button>
      </div>
    </motion.aside>
  );
}
