import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { 
  Home, 
  CheckSquare, 
  Users, 
  Clock, 
  BarChart3, 
  Calendar, 
  Briefcase, 
  Settings,
  ChevronLeft,
  Building,
  FileText
} from "lucide-react";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useState } from "react";
import type { Task, LeaveRequest } from "@db/schema";

export default function Sidebar() {
  const { user } = useAuth();
  const [location, setLocation] = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Fetch user tasks for badge count
  const { data: userTasks = [] } = useQuery<Task[]>({
    queryKey: ["/api/tasks/my"],
    enabled: !!user,
  });

  const { data: assignedTasks = [] } = useQuery<Task[]>({
    queryKey: ["/api/tasks/assigned"],
    enabled: !!user,
  });

  // Fetch leave requests for HR badge
  const { data: leaveRequests = [] } = useQuery<LeaveRequest[]>({
    queryKey: ["/api/leave-requests/pending"],
    enabled: !!user && (user.role === 'admin' || user.role === 'sub-admin'),
  });

  const totalTasks = [...userTasks, ...assignedTasks].filter(t => t.status !== 'completed').length;
  const pendingLeaves = leaveRequests.length;

  const navigation = [
    {
      name: "لوحة التحكم",
      href: "/",
      icon: Home,
      badge: null,
    },
    {
      name: "المهام",
      href: "/tasks",
      icon: CheckSquare,
      badge: totalTasks > 0 ? totalTasks.toString() : null,
    },
    {
      name: "التقارير",
      href: "/reports",
      icon: BarChart3,
      badge: null,
    },
    {
      name: "الملف الشخصي",
      href: `/profile/${user?.id}`,
      icon: Users,
      badge: null,
    },
  ];

  const adminNavigation = [
    {
      name: "لوحة المدير",
      href: "/admin",
      icon: Building,
      badge: null,
    },
    {
      name: "الموارد البشرية",
      href: "/hr",
      icon: Briefcase,
      badge: pendingLeaves > 0 ? pendingLeaves.toString() : null,
    },
  ];

  const isActive = (href: string) => {
    if (href === "/") {
      return location === "/";
    }
    return location.startsWith(href);
  };

  const allNavigation = [
    ...navigation,
    ...(user?.role === 'admin' || user?.role === 'sub-admin' ? adminNavigation : []),
  ];

  return (
    <div className={cn(
      "fixed right-0 top-16 z-40 h-[calc(100vh-4rem)] bg-card border-l border-border transition-all duration-300",
      isCollapsed ? "w-16" : "w-64"
    )}>
      <div className="flex h-full flex-col">
        {/* Toggle Button */}
        <div className="flex h-14 items-center justify-between px-4 border-b border-border">
          {!isCollapsed && (
            <h2 className="text-lg font-semibold text-foreground">القائمة الرئيسية</h2>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(!isCollapsed)}
            data-testid="sidebar-toggle"
          >
            <ChevronLeft className={cn(
              "h-4 w-4 transition-transform duration-200",
              isCollapsed ? "rotate-180" : ""
            )} />
          </Button>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 px-3 py-4">
          <nav className="space-y-2">
            {allNavigation.map((item) => (
              <Button
                key={item.name}
                variant={isActive(item.href) ? "default" : "ghost"}
                className={cn(
                  "w-full justify-start gap-3 text-right",
                  isCollapsed && "justify-center px-2"
                )}
                onClick={() => setLocation(item.href)}
                data-testid={`sidebar-link-${item.href.replace('/', '')}`}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                {!isCollapsed && (
                  <>
                    <span className="flex-1">{item.name}</span>
                    {item.badge && (
                      <Badge variant="secondary" className="mr-auto">
                        {item.badge}
                      </Badge>
                    )}
                  </>
                )}
              </Button>
            ))}
          </nav>

          {/* Quick Actions */}
          {!isCollapsed && (
            <div className="mt-8 space-y-2">
              <h3 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                إجراءات سريعة
              </h3>
              <div className="space-y-1">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full justify-start gap-3" 
                  onClick={() => setLocation('/tasks')}
                  data-testid="sidebar-quick-task"
                >
                  <CheckSquare className="h-4 w-4" />
                  إضافة مهمة
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full justify-start gap-3" 
                  onClick={() => setLocation('/reports')}
                  data-testid="sidebar-quick-report"
                >
                  <FileText className="h-4 w-4" />
                  تقرير سريع
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full justify-start gap-3" 
                  onClick={() => setLocation('/tasks')}
                  data-testid="sidebar-quick-schedule"
                >
                  <Calendar className="h-4 w-4" />
                  جدولة اجتماع
                </Button>
              </div>
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        <div className="border-t border-border p-4">
          <div className={cn(
            "flex items-center gap-3",
            isCollapsed && "justify-center"
          )}>
            <div className={cn(
              "w-2 h-2 rounded-full bg-success animate-pulse",
              isCollapsed && "w-3 h-3"
            )}></div>
            {!isCollapsed && (
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">متصل كـ</p>
                <p className="text-sm font-medium text-foreground truncate">
                  {user?.fullName}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
