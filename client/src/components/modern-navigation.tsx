import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bell, Search, Moon, Sun, LogOut, User, Settings, Sparkles, Menu, X } from "lucide-react";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useWebSocket } from "@/lib/websocket";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import type { Notification, Task, User as UserType } from "@shared/schema";

export default function ModernNavigation() {
  const { user, logoutMutation } = useAuth();
  const [location, setLocation] = useLocation();
  const [isDark, setIsDark] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const { lastMessage } = useWebSocket();
  const { toast } = useToast();

  // Fetch notifications
  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
    enabled: !!user,
    refetchInterval: 30000,
  });

  const unreadNotifications = notifications.filter(n => !n.isRead);

  // Fetch tasks for search
  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ["/api/tasks/all"],
    enabled: !!user && !!searchTerm,
  });

  // Fetch users for search
  const { data: users = [] } = useQuery<UserType[]>({
    queryKey: ["/api/users"],
    enabled: !!user && !!searchTerm,
  });

  // Filter search results
  const searchResults = {
    tasks: tasks.filter(task =>
      task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.description?.toLowerCase().includes(searchTerm.toLowerCase())
    ).slice(0, 5),
    users: users.filter(u =>
      u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase())
    ).slice(0, 5),
  };

  const hasResults = searchResults.tasks.length > 0 || searchResults.users.length > 0;

  const markAsReadMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("PUT", `/api/notifications/${id}/read`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
  });

  useEffect(() => {
    if (searchTerm) {
      setShowSearchResults(true);
    } else {
      setShowSearchResults(false);
    }
  }, [searchTerm]);

  // Auto-mark notifications as read
  useEffect(() => {
    if (!location || !notifications.length) return;

    const routeToNotificationTypes: Record<string, string[]> = {
      '/tasks': ['task_assigned', 'task_status_update', 'task'],
      '/chat': ['new_message', 'message'],
      '/employee-requests': ['leave_request', 'salary_advance_request', 'deduction_request'],
      '/my-requests': ['leave_status_update', 'salary_advance_status_update', 'deduction_status_update'],
      '/hr-management': ['leave_request', 'salary_advance_request', 'deduction_request'],
      '/companies': ['company'],
      '/suggestions': ['suggestion'],
    };

    const notificationTypes = routeToNotificationTypes[location];
    if (!notificationTypes) return;

    const notificationsToMark = unreadNotifications.filter(notification => {
      const metadata = notification.metadata as any;
      if (!metadata?.type) return false;
      return notificationTypes.includes(metadata.type);
    });

    notificationsToMark.forEach(notification => {
      markAsReadMutation.mutate(notification.id);
    });
  }, [location, notifications]);

  // Listen for real-time notifications
  useEffect(() => {
    if (lastMessage) {
      if (lastMessage.type === 'new_notification' && lastMessage.data) {
        const notification = lastMessage.data as Notification;
        if (notification.userId === user?.id) {
          toast({
            title: notification.title,
            description: notification.message,
            variant: notification.type === 'error' ? 'destructive' : 'default',
          });
          queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
        }
      } else if (lastMessage.type === 'new_notifications' && lastMessage.data) {
        const notifications = lastMessage.data as Notification[];
        const userNotifications = notifications.filter(n => n.userId === user?.id);
        userNotifications.forEach(notification => {
          toast({
            title: notification.title,
            description: notification.message,
            variant: notification.type === 'error' ? 'destructive' : 'default',
          });
        });
        if (userNotifications.length > 0) {
          queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
        }
      } else if (lastMessage.type === 'new_message' && lastMessage.data) {
        queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      }
    }
  }, [lastMessage, user, toast, queryClient]);

  useEffect(() => {
    const darkMode = localStorage.getItem('darkMode') === 'true';
    setIsDark(darkMode);
    if (darkMode) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleDarkMode = () => {
    const newDarkMode = !isDark;
    setIsDark(newDarkMode);
    localStorage.setItem('darkMode', String(newDarkMode));
    if (newDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  if (!user) return null;

  return (
    <>
      {/* Modern Glassmorphism Navigation */}
      <motion.nav
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="fixed top-0 left-0 right-0 z-50 px-4 py-3"
      >
        <div className="glass-dark rounded-2xl shadow-glow px-6 py-3 max-w-[98%] mx-auto backdrop-blur-2xl">
          <div className="flex items-center justify-between gap-4">
            {/* Logo & Brand */}
            <motion.div
              className="flex items-center gap-3"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-primary rounded-xl blur-xl opacity-50 animate-pulse-slow" />
                <div className="relative bg-gradient-primary p-2 rounded-xl">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
              </div>
              <h1 className="text-xl font-bold text-gradient hidden sm:block">GWT Tasker</h1>
            </motion.div>

            {/* Search Bar */}
            <div className="hidden md:flex flex-1 max-w-md relative">
              <div className="relative w-full group">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="بحث في المهام والموظفين..."
                  className="pr-10 glass-dark border-white/10 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>

              {/* Search Results Dropdown */}
              <AnimatePresence>
                {showSearchResults && hasResults && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="absolute top-full left-0 right-0 mt-2 glass-dark rounded-xl shadow-2xl border border-white/10 overflow-hidden"
                  >
                    <ScrollArea className="max-h-[400px]">
                      {searchResults.tasks.length > 0 && (
                        <div className="p-3">
                          <p className="text-xs font-semibold text-muted-foreground mb-2 px-2">المهام</p>
                          {searchResults.tasks.map((task) => (
                            <motion.div
                              key={task.id}
                              whileHover={{ scale: 1.02, x: -5 }}
                              className="px-3 py-2 hover:bg-white/5 rounded-lg cursor-pointer transition-all"
                              onClick={() => {
                                setLocation('/tasks');
                                setSearchTerm("");
                              }}
                            >
                              <p className="font-medium text-sm">{task.title}</p>
                              <p className="text-xs text-muted-foreground truncate">{task.description}</p>
                            </motion.div>
                          ))}
                        </div>
                      )}
                      {searchResults.users.length > 0 && (
                        <div className="p-3 border-t border-white/10">
                          <p className="text-xs font-semibold text-muted-foreground mb-2 px-2">الموظفون</p>
                          {searchResults.users.map((u) => (
                            <motion.div
                              key={u.id}
                              whileHover={{ scale: 1.02, x: -5 }}
                              className="px-3 py-2 hover:bg-white/5 rounded-lg cursor-pointer flex items-center gap-3 transition-all"
                            >
                              <Avatar className="w-8 h-8">
                                <AvatarFallback className="text-xs">{u.fullName[0]}</AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium text-sm">{u.fullName}</p>
                                <p className="text-xs text-muted-foreground">{u.department}</p>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-2">
              {/* Dark Mode Toggle */}
              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleDarkMode}
                  className="glass hover:bg-white/10 rounded-xl"
                >
                  <AnimatePresence mode="wait">
                    {isDark ? (
                      <motion.div
                        key="sun"
                        initial={{ rotate: -180, opacity: 0 }}
                        animate={{ rotate: 0, opacity: 1 }}
                        exit={{ rotate: 180, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <Sun className="w-5 h-5" />
                      </motion.div>
                    ) : (
                      <motion.div
                        key="moon"
                        initial={{ rotate: 180, opacity: 0 }}
                        animate={{ rotate: 0, opacity: 1 }}
                        exit={{ rotate: -180, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <Moon className="w-5 h-5" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Button>
              </motion.div>

              {/* Notifications */}
              <Popover>
                <PopoverTrigger asChild>
                  <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="glass hover:bg-white/10 rounded-xl relative"
                    >
                      <Bell className="w-5 h-5" />
                      {unreadNotifications.length > 0 && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute -top-1 -right-1"
                        >
                          <Badge className="bg-gradient-secondary border-none px-1.5 py-0.5 text-xs shadow-glow">
                            {unreadNotifications.length}
                          </Badge>
                        </motion.div>
                      )}
                    </Button>
                  </motion.div>
                </PopoverTrigger>
                <PopoverContent className="w-[380px] p-0 glass-dark border-white/10 rounded-xl shadow-2xl" align="end">
                  <div className="p-4 border-b border-white/10">
                    <h3 className="font-semibold text-lg">الإشعارات</h3>
                    <p className="text-xs text-muted-foreground">لديك {unreadNotifications.length} إشعار جديد</p>
                  </div>
                  <ScrollArea className="h-[400px]">
                    <div className="p-2">
                      {notifications.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <Bell className="w-12 h-12 mx-auto mb-2 opacity-50" />
                          <p>لا توجد إشعارات</p>
                        </div>
                      ) : (
                        notifications.map((notification) => (
                          <motion.div
                            key={notification.id}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            whileHover={{ scale: 1.02, x: -5 }}
                            className={`p-3 rounded-lg cursor-pointer transition-all mb-2 ${
                              notification.isRead ? 'bg-white/5' : 'bg-primary/10 border border-primary/20'
                            }`}
                            onClick={() => {
                              if (!notification.isRead) {
                                markAsReadMutation.mutate(notification.id);
                              }
                              if (notification.metadata && (notification.metadata as any).redirectUrl) {
                                setLocation((notification.metadata as any).redirectUrl);
                              }
                            }}
                          >
                            <div className="flex items-start gap-3">
                              <div className="flex-1">
                                <p className="font-medium text-sm">{notification.title}</p>
                                <p className="text-xs text-muted-foreground mt-1">{notification.message}</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {new Date(notification.createdAt).toLocaleDateString('ar-EG')}
                                </p>
                              </div>
                              {!notification.isRead && (
                                <div className="w-2 h-2 bg-primary rounded-full animate-pulse-slow" />
                              )}
                            </div>
                          </motion.div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </PopoverContent>
              </Popover>

              {/* User Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button variant="ghost" className="gap-2 glass hover:bg-white/10 rounded-xl px-3">
                      <Avatar className="w-8 h-8 border-2 border-white/20">
                        <AvatarImage src={user.avatarUrl || undefined} />
                        <AvatarFallback className="bg-gradient-primary text-white">
                          {user.fullName[0]}
                        </AvatarFallback>
                      </Avatar>
                      <span className="hidden md:block font-medium">{user.fullName}</span>
                    </Button>
                  </motion.div>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 glass-dark border-white/10 rounded-xl" align="end">
                  <DropdownMenuLabel className="text-sm">
                    <div>
                      <p className="font-semibold">{user.fullName}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-white/10" />
                  <DropdownMenuItem onClick={() => setLocation('/profile')} className="cursor-pointer">
                    <User className="ml-2 w-4 h-4" />
                    الملف الشخصي
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setLocation('/settings')} className="cursor-pointer">
                    <Settings className="ml-2 w-4 h-4" />
                    الإعدادات
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-white/10" />
                  <DropdownMenuItem
                    onClick={() => logoutMutation.mutate()}
                    className="cursor-pointer text-destructive focus:text-destructive"
                  >
                    <LogOut className="ml-2 w-4 h-4" />
                    تسجيل الخروج
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Mobile Menu Toggle */}
              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} className="md:hidden">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowMobileMenu(!showMobileMenu)}
                  className="glass hover:bg-white/10 rounded-xl"
                >
                  {showMobileMenu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </Button>
              </motion.div>
            </div>
          </div>
        </div>
      </motion.nav>

      {/* Spacer */}
      <div className="h-20" />
    </>
  );
}
