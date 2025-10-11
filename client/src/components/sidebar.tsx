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
  FileText,
  UserCog
} from "lucide-react";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useState } from "react";
import type { Task, LeaveRequest, User } from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";

export default function Sidebar() {
  const { user } = useAuth();
  const [location, setLocation] = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showMeetingDialog, setShowMeetingDialog] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const { toast } = useToast();

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

  // Fetch all users for meeting scheduling
  const { data: allUsers = [], isLoading: isLoadingUsers } = useQuery<Pick<User, 'id' | 'fullName' | 'email' | 'department' | 'jobTitle' | 'profilePicture'>[]>({
    queryKey: ["/api/users"],
    enabled: !!user,
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
      name: "إدارة المستخدمين",
      href: "/user-management",
      icon: UserCog,
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

  const handleToggleUser = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleScheduleMeeting = () => {
    if (selectedUsers.length === 0) {
      toast({
        title: "لم يتم تحديد مستخدمين",
        description: "الرجاء تحديد مستخدم واحد على الأقل للاجتماع",
        variant: "destructive",
      });
      return;
    }

    const selectedEmails = allUsers
      .filter(u => selectedUsers.includes(u.id))
      .map(u => u.email)
      .join(',');

    // Create Google Meet link with calendar integration
    const meetingUrl = `https://meet.google.com/new`;
    
    // Alternative: Open Google Calendar with pre-filled event
    const calendarUrl = `https://calendar.google.com/calendar/u/0/r/eventedit?add=${encodeURIComponent(selectedEmails)}`;

    // Open Google Meet in a new tab
    window.open(meetingUrl, '_blank');

    toast({
      title: "تم فتح Google Meet",
      description: `تم تحديد ${selectedUsers.length} مشارك للاجتماع`,
    });

    setShowMeetingDialog(false);
    setSelectedUsers([]);
  };

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
                  onClick={() => setShowMeetingDialog(true)}
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

      {/* Schedule Meeting Dialog */}
      <Dialog open={showMeetingDialog} onOpenChange={setShowMeetingDialog}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right">جدولة اجتماع</DialogTitle>
            <DialogDescription className="text-right">
              اختر المستخدمين الذين تريد دعوتهم للاجتماع
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {isLoadingUsers ? (
              <div className="text-center text-muted-foreground py-8" data-testid="loading-users">
                جاري تحميل المستخدمين...
              </div>
            ) : allUsers.length === 0 ? (
              <div className="text-center text-muted-foreground py-8" data-testid="no-users">
                لا يوجد مستخدمين متاحين
              </div>
            ) : (
              <ScrollArea className="h-[300px] pr-4">
                <div className="space-y-2">
                  {allUsers
                    .filter(u => u.id !== user?.id) // Exclude current user
                    .map((u) => (
                      <div
                        key={u.id}
                        className="flex items-center space-x-3 space-x-reverse p-3 rounded-lg border border-border hover:bg-accent transition-colors"
                        data-testid={`user-item-${u.id}`}
                      >
                        <Checkbox
                          id={`user-${u.id}`}
                          checked={selectedUsers.includes(u.id)}
                          onCheckedChange={() => handleToggleUser(u.id)}
                          data-testid={`checkbox-user-${u.id}`}
                        />
                        <label
                          htmlFor={`user-${u.id}`}
                          className="flex-1 flex items-center gap-3 cursor-pointer"
                        >
                          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            {u.profilePicture ? (
                              <img
                                src={u.profilePicture}
                                alt={u.fullName}
                                className="w-10 h-10 rounded-full object-cover"
                              />
                            ) : (
                              <span className="text-primary font-semibold">
                                {u.fullName.charAt(0)}
                              </span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground truncate" data-testid={`text-username-${u.id}`}>
                              {u.fullName}
                            </p>
                            <p className="text-sm text-muted-foreground truncate" data-testid={`text-email-${u.id}`}>
                              {u.email}
                            </p>
                            {u.department && (
                              <p className="text-xs text-muted-foreground truncate">
                                {u.department} {u.jobTitle && `- ${u.jobTitle}`}
                              </p>
                            )}
                          </div>
                        </label>
                      </div>
                    ))}
                </div>
              </ScrollArea>
            )}
          </div>

          <DialogFooter className="flex-row-reverse gap-2">
            <Button
              onClick={handleScheduleMeeting}
              disabled={selectedUsers.length === 0}
              data-testid="button-schedule-meeting"
            >
              <Calendar className="ml-2 h-4 w-4" />
              جدولة الاجتماع ({selectedUsers.length})
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setShowMeetingDialog(false);
                setSelectedUsers([]);
              }}
              data-testid="button-cancel-meeting"
            >
              إلغاء
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
