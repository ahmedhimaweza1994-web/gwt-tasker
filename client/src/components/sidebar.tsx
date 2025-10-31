import { useAuth } from "@/hooks/use-auth";
import { useSidebar } from "@/contexts/sidebar-context";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation } from "@tanstack/react-query";
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
  Building2,
  FileText,
  UserCog,
  MessageSquare,
  DollarSign,
  AlertCircle,
  Lightbulb
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function Sidebar() {
  const { user } = useAuth();
  const [location, setLocation] = useLocation();
  const { isCollapsed, setIsCollapsed } = useSidebar();
  const [showMeetingDialog, setShowMeetingDialog] = useState(false);
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [meetingTitle, setMeetingTitle] = useState("");
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    priority: "medium",
    assignedTo: "",
    dueDate: "",
    companyName: "",
  });
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

  // Check Google Calendar connection status
  const { data: calendarStatus, isLoading: isLoadingCalendarStatus } = useQuery<{ connected: boolean }>({
    queryKey: ["/api/google-calendar/status"],
    enabled: !!user && showMeetingDialog,
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
      name: "الشركات",
      href: "/companies",
      icon: Building,
      badge: null,
    },
    {
      name: "الدردشة",
      href: "/chat",
      icon: MessageSquare,
      badge: null,
    },
    {
      name: "طلباتي",
      href: "/my-requests",
      icon: DollarSign,
      badge: null,
    },
    {
      name: "التقارير",
      href: "/reports",
      icon: BarChart3,
      badge: null,
    },
    {
      name: "المقترحات",
      href: "/suggestions",
      icon: Lightbulb,
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
      icon: Building2,
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

  const handleConnectGoogleCalendar = async () => {
    try {
      const res = await apiRequest("GET", "/api/google-calendar/auth");
      const data = await res.json();
      
      if (data.authUrl) {
        // Open Google OAuth page in new window
        window.open(data.authUrl, '_blank', 'width=600,height=700');
        
        toast({
          title: "جاري الربط",
          description: "يرجى إكمال عملية الربط في النافذة الجديدة",
        });
      }
    } catch (error) {
      toast({
        title: "حدث خطأ",
        description: "فشل في بدء عملية ربط Google Calendar",
        variant: "destructive",
      });
    }
  };

  const scheduleMeetingMutation = useMutation({
    mutationFn: async (data: { title: string; participantIds: string[] }) => {
      const res = await apiRequest("POST", "/api/meetings/schedule", data);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/rooms"] });
      toast({
        title: "تم جدولة الاجتماع",
        description: "تم إنشاء الاجتماع وإرسال الرابط للمشاركين في الدردشة",
      });
      window.open(data.meetingLink, '_blank');
      setShowMeetingDialog(false);
      setSelectedUsers([]);
      setMeetingTitle("");
    },
    onError: () => {
      toast({
        title: "خطأ",
        description: "حدث خطأ في جدولة الاجتماع",
        variant: "destructive",
      });
    },
  });

  const handleScheduleMeeting = () => {
    if (selectedUsers.length === 0) {
      toast({
        title: "لم يتم تحديد مستخدمين",
        description: "الرجاء تحديد مستخدم واحد على الأقل للاجتماع",
        variant: "destructive",
      });
      return;
    }

    if (!meetingTitle.trim()) {
      toast({
        title: "لم يتم إدخال عنوان",
        description: "الرجاء إدخال عنوان للاجتماع",
        variant: "destructive",
      });
      return;
    }

    scheduleMeetingMutation.mutate({
      title: meetingTitle,
      participantIds: selectedUsers,
    });
  };

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const createTaskMutation = useMutation({
    mutationFn: async (taskData: any) => {
      const res = await apiRequest("POST", "/api/tasks", taskData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/my"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/assigned"] });
      setShowTaskDialog(false);
      setNewTask({
        title: "",
        description: "",
        priority: "medium",
        assignedTo: "",
        dueDate: "",
        companyName: "",
      });
      toast({
        title: "تم إنشاء المهمة بنجاح",
        description: "تمت إضافة المهمة الجديدة",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "خطأ في إنشاء المهمة",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    createTaskMutation.mutate({
      ...newTask,
      dueDate: newTask.dueDate ? new Date(newTask.dueDate) : undefined,
      assignedTo: newTask.assignedTo || undefined,
      companyName: newTask.companyName || undefined,
    });
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
            <h2 className="text-lg font-semibold text-foreground dark:text-white">القائمة الرئيسية</h2>
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
                    <span className="flex-1 dark:text-white">{item.name}</span>
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
                  onClick={() => setShowTaskDialog(true)}
                  data-testid="sidebar-quick-task"
                >
                  <CheckSquare className="h-4 w-4" />
                  إضافة مهمة
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
                <p className="text-xs text-muted-foreground dark:text-gray-400">متصل كـ</p>
                <p className="text-sm font-medium text-foreground dark:text-white truncate">
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
              أدخل عنوان الاجتماع واختر المشاركين
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Google Calendar Connection Status */}
            {isLoadingCalendarStatus ? (
              <Alert data-testid="alert-calendar-loading">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-right">
                  جاري التحقق من اتصال Google Calendar...
                </AlertDescription>
              </Alert>
            ) : calendarStatus && !calendarStatus.connected ? (
              <Alert variant="destructive" data-testid="alert-calendar-disconnected">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-right space-y-3">
                  <p className="font-semibold">Google Calendar غير متصل</p>
                  <p className="text-sm">
                    لجدولة اجتماعات Google Meet، يجب ربط حساب Google Calendar الخاص بك أولاً.
                  </p>
                  <Button
                    onClick={handleConnectGoogleCalendar}
                    variant="outline"
                    className="w-full"
                    data-testid="button-connect-google-calendar"
                  >
                    ربط Google Calendar
                  </Button>
                </AlertDescription>
              </Alert>
            ) : calendarStatus?.connected ? (
              <Alert className="bg-success/10 border-success text-success" data-testid="alert-calendar-connected">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-right">
                  ✓ Google Calendar متصل - سيتم إنشاء رابط Google Meet تلقائياً
                </AlertDescription>
              </Alert>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="meeting-title" className="text-right">عنوان الاجتماع</Label>
              <Input
                id="meeting-title"
                value={meetingTitle}
                onChange={(e) => setMeetingTitle(e.target.value)}
                placeholder="مثال: اجتماع فريق التطوير"
                data-testid="input-meeting-title"
              />
            </div>
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

      {/* Create Task Dialog */}
      <Dialog open={showTaskDialog} onOpenChange={setShowTaskDialog}>
        <DialogContent className="sm:max-w-[500px]" dir="rtl" data-testid="dialog-create-task">
          <DialogHeader>
            <DialogTitle className="text-right">إنشاء مهمة جديدة</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleCreateTask} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="task-title">عنوان المهمة *</Label>
              <Input
                id="task-title"
                placeholder="أدخل عنوان المهمة"
                value={newTask.title}
                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                required
                data-testid="input-task-title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-description">الوصف</Label>
              <Textarea
                id="task-description"
                placeholder="وصف تفصيلي للمهمة..."
                value={newTask.description}
                onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                rows={3}
                data-testid="input-task-description"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-company">اسم الشركة</Label>
              <Input
                id="task-company"
                placeholder="أدخل اسم الشركة (اختياري)"
                value={newTask.companyName}
                onChange={(e) => setNewTask({ ...newTask, companyName: e.target.value })}
                data-testid="input-task-company"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="task-priority">الأولوية</Label>
                <Select
                  value={newTask.priority}
                  onValueChange={(value) => setNewTask({ ...newTask, priority: value })}
                >
                  <SelectTrigger id="task-priority" data-testid="select-task-priority">
                    <SelectValue placeholder="اختر الأولوية" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">منخفضة</SelectItem>
                    <SelectItem value="medium">متوسطة</SelectItem>
                    <SelectItem value="high">عالية</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="task-due-date">تاريخ الاستحقاق</Label>
                <Input
                  id="task-due-date"
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                  value={newTask.dueDate}
                  onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                  data-testid="input-task-due-date"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-assigned-to">تعيين إلى</Label>
              <Select
                value={newTask.assignedTo}
                onValueChange={(value) => setNewTask({ ...newTask, assignedTo: value })}
              >
                <SelectTrigger id="task-assigned-to" data-testid="select-task-assigned-to">
                  <SelectValue placeholder="اختر موظف (اختياري)" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.fullName} - {u.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowTaskDialog(false)}
                data-testid="button-cancel-task"
              >
                إلغاء
              </Button>
              <Button type="submit" data-testid="button-submit-task">
                إنشاء المهمة
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
