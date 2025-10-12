import { useState, useEffect } from "react";
import { useSidebar } from "@/contexts/sidebar-context";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import Navigation from "@/components/navigation";
import Sidebar from "@/components/sidebar";
import Leaderboard from "@/components/leaderboard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  Play, 
  Pause, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Coffee, 
  User, 
  Calendar,
  TrendingUp,
  Target,
  Zap,
  Award,
  Activity,
  BarChart3,
  CheckSquare,
  ListTodo
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { AuxSession, Task } from "@shared/schema";

interface ProductivityStats {
  productivityPercentage: number;
}

export default function Dashboard() {
  const { user } = useAuth();
  const { isCollapsed } = useSidebar();
  const { toast } = useToast();
 
  const [currentNotes, setCurrentNotes] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("ready");

  // Fetch current AUX session
  const { data: currentSession, refetch: refetchCurrentSession } = useQuery<AuxSession | null>({
    queryKey: ["/api/aux/current"],
    refetchInterval: 1000,
    retry: 1,
  });

  // Fetch productivity stats
  const { data: productivityStats } = useQuery<ProductivityStats>({
    queryKey: ["/api/analytics/productivity"],
  });

  // Fetch user tasks
  const { data: userTasks = [] } = useQuery<Task[]>({
    queryKey: ["/api/tasks/my"],
  });
  const { data: assignedTasks = [] } = useQuery<Task[]>({
    queryKey: ["/api/tasks/assigned"],
  });

  // AUX session mutations
  const startSessionMutation = useMutation({
    mutationFn: async (data: { status: string; notes?: string }) => {
      const res = await apiRequest("POST", "/api/aux/start", data);
      return res.json();
    },
    onSuccess: async (newSession) => {
      queryClient.invalidateQueries({ queryKey: ["/api/aux/current"] });
      await refetchCurrentSession();
      toast({
        title: "تم تغيير الحالة بنجاح",
        description: "تم تحديث حالة AUX الخاصة بك",
      });
    },
  });

  const endSessionMutation = useMutation({
    mutationFn: async (data: { id: string; notes?: string }) => {
      const res = await apiRequest("POST", `/api/aux/end/${data.id}`, { notes: data.notes });
      return res.json();
    },
    onSuccess: async (endedSession) => {
      queryClient.invalidateQueries({ queryKey: ["/api/aux/current"] });
      await refetchCurrentSession();
      toast({
        title: "تم إنهاء الشيفت بنجاح",
        description: "تم حفظ الوقت والملاحظات",
      });
    },
  });

  const toggleShiftMutation = useMutation({
    mutationFn: async (notes?: string) => {
      if (currentSession && !currentSession.endTime) {
        const res = await apiRequest("POST", `/api/aux/end/${currentSession.id}`, { notes });
        return res.json();
      } else {
        const res = await apiRequest("POST", "/api/aux/start", { status: "ready", notes });
        return res.json();
      }
    },
    onSuccess: async (result) => {
      queryClient.invalidateQueries({ queryKey: ["/api/aux/current"] });
      await refetchCurrentSession();
      if (currentSession && !currentSession.endTime) {
        toast({
          title: "تم إنهاء الشيفت",
          description: "الحالة الآن: غير نشط",
        });
      } else {
        toast({
          title: "تم بدء الشيفت",
          description: "الحالة الآن: جاهز",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "خطأ في تبديل الشيفت",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Calculate current session duration
  const [currentDuration, setCurrentDuration] = useState("00:00:00");
  useEffect(() => {
    if (currentSession?.startTime) {
      const interval = setInterval(() => {
        const start = new Date(currentSession.startTime);
        const now = new Date();
        const diff = now.getTime() - start.getTime();
       
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
       
        setCurrentDuration(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setCurrentDuration("00:00:00");
    }
  }, [currentSession]);

  const handleStatusChange = (status: string) => {
    if (currentSession && !currentSession.endTime) {
      endSessionMutation.mutate({
        id: currentSession.id,
        notes: currentNotes
      }, {
        onSuccess: () => {
          startSessionMutation.mutate({
            status,
            notes: currentNotes
          });
        }
      });
    } else {
      startSessionMutation.mutate({
        status,
        notes: currentNotes
      });
    }
   
    setSelectedStatus(status);
    setCurrentNotes("");
  };

  const handleToggleShift = () => {
    toggleShiftMutation.mutate(currentNotes);
    setCurrentNotes("");
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case "ready":
        return {
          label: "في انتظار مهمة",
          color: "bg-green-500",
          icon: CheckCircle,
          bgColor: "bg-green-50 dark:bg-green-900/20",
          textColor: "text-green-700 dark:text-green-300"
        };
      case "working_on_project":
        return {
          label: "يعمل على مشروع",
          color: "bg-blue-500",
          icon: Play,
          bgColor: "bg-blue-50 dark:bg-blue-900/20",
          textColor: "text-blue-700 dark:text-blue-300"
        };
      case "personal":
        return {
          label: "شخصي",
          color: "bg-yellow-500",
          icon: User,
          bgColor: "bg-yellow-50 dark:bg-yellow-900/20",
          textColor: "text-yellow-700 dark:text-yellow-300"
        };
      case "break":
        return {
          label: "استراحة",
          color: "bg-red-500",
          icon: Coffee,
          bgColor: "bg-red-50 dark:bg-red-900/20",
          textColor: "text-red-700 dark:text-red-300"
        };
      default:
        return {
          label: "غير متصل",
          color: "bg-gray-500",
          icon: AlertCircle,
          bgColor: "bg-gray-50 dark:bg-gray-900/20",
          textColor: "text-gray-700 dark:text-gray-300"
        };
    }
  };

  const currentStatusInfo = currentSession ? getStatusInfo(currentSession.status) : {
    label: "لم يتم اختيار حالة",
    color: "bg-gray-400",
    icon: AlertCircle,
    bgColor: "bg-gray-50 dark:bg-gray-900/20",
    textColor: "text-gray-500 dark:text-gray-400"
  };

  const StatusIcon = currentStatusInfo.icon;
  const allTasks = [...userTasks, ...assignedTasks];
  const pendingTasks = allTasks.filter(task => task.status === 'pending');
  const inProgressTasks = allTasks.filter(task => task.status === 'in-progress');
  const completedTasks = allTasks.filter(task => task.status === 'completed');

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
     
      <div className="flex">
        <Sidebar />
       
        <main className={cn("flex-1 transition-all duration-300", isCollapsed ? "mr-16" : "mr-64")}>
          {/* Hero Section with Gradient */}
          <div className="relative bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 overflow-hidden">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yLjIxIDEuNzktNCA0LTRzNCAxLjc5IDQgNC0xLjc5IDQtNCA0LTQtMS43OS00LTR6bTAgNGMwLTIuMjEgMS43OS00IDQtNHM0IDEuNzkgNCA0LTEuNzkgNC00IDQtNC0xLjc5LTQtNHptLTIwIDRjMC0yLjIxIDEuNzktNCA0LTRzNCAxLjc5IDQgNC0xLjc5IDQtNCA0LTQtMS43OS00LTR6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-30"></div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
            
            <div className="relative container mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <Avatar className="w-16 h-16 md:w-20 md:h-20 border-4 border-white/20 shadow-2xl">
                    <AvatarImage src={user?.profilePicture} alt={user?.fullName} />
                    <AvatarFallback className="text-2xl font-bold bg-white/10 backdrop-blur text-white">
                      {user?.fullName?.split(" ")[0]?.charAt(0) || "م"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-1">
                      مرحباً، {user?.fullName?.split(' ')[0]}! 👋
                    </h1>
                    <p className="text-white/80 text-sm md:text-base">
                      إليك نظرة عامة على يومك ونشاطك الحالي
                    </p>
                  </div>
                </div>

                {/* Current Status Badge */}
                <div className="flex items-center gap-3 bg-white/10 backdrop-blur-lg rounded-xl px-4 py-3 border border-white/20">
                  <div className={cn("w-3 h-3 rounded-full", currentStatusInfo.color, "animate-pulse")}></div>
                  <div>
                    <p className="text-xs text-white/60">الحالة الحالية</p>
                    <p className="text-white font-semibold">{currentStatusInfo.label}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <Card className="border-l-4 border-l-blue-500 hover:shadow-lg transition-all hover:scale-105" data-testid="card-total-time">
                <CardContent className="p-4 md:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs md:text-sm text-muted-foreground mb-1">إجمالي الوقت</p>
                      <p className="text-xl md:text-2xl font-bold text-foreground">{currentSession ? currentDuration : '00:00:00'}</p>
                    </div>
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                      <Clock className="w-5 h-5 md:w-6 md:h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-green-500 hover:shadow-lg transition-all hover:scale-105" data-testid="card-completed-tasks">
                <CardContent className="p-4 md:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs md:text-sm text-muted-foreground mb-1">مهام مكتملة</p>
                      <p className="text-xl md:text-2xl font-bold text-foreground">{completedTasks.length}</p>
                    </div>
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 md:w-6 md:h-6 text-green-600 dark:text-green-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-orange-500 hover:shadow-lg transition-all hover:scale-105" data-testid="card-pending-tasks">
                <CardContent className="p-4 md:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs md:text-sm text-muted-foreground mb-1">مهام معلقة</p>
                      <p className="text-xl md:text-2xl font-bold text-foreground">{pendingTasks.length}</p>
                    </div>
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-orange-100 dark:bg-orange-900/20 rounded-lg flex items-center justify-center">
                      <AlertCircle className="w-5 h-5 md:w-6 md:h-6 text-orange-600 dark:text-orange-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-purple-500 hover:shadow-lg transition-all hover:scale-105" data-testid="card-productivity">
                <CardContent className="p-4 md:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs md:text-sm text-muted-foreground mb-1">الإنتاجية</p>
                      <p className="text-xl md:text-2xl font-bold text-foreground">
                        {productivityStats?.productivityPercentage != null ? `${Math.round(productivityStats.productivityPercentage)}%` : '-'}
                      </p>
                    </div>
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 md:w-6 md:h-6 text-purple-600 dark:text-purple-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Main Content - Tabbed Interface */}
            <Tabs defaultValue="status" className="space-y-6">
              <TabsList className="grid w-full max-w-2xl grid-cols-3">
                <TabsTrigger value="status" className="gap-2">
                  <Activity className="w-4 h-4" />
                  حالة العمل
                </TabsTrigger>
                <TabsTrigger value="tasks" className="gap-2">
                  <ListTodo className="w-4 h-4" />
                  المهام
                </TabsTrigger>
                <TabsTrigger value="leaderboard" className="gap-2">
                  <Award className="w-4 h-4" />
                  لوحة المتصدرين
                </TabsTrigger>
              </TabsList>

              {/* Status Tab */}
              <TabsContent value="status" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Current Status Card */}
                  <Card className="border-2">
                    <CardHeader className="flex flex-col space-y-1.5 p-6 text-right">
                      <CardTitle className="flex items-center gap-2">
                        <Zap className="w-5 h-5 text-primary" />
                        الحالة الحالية
                      </CardTitle>
                      <CardDescription>تتبع نشاطك ووقت العمل الفعلي</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className={cn("p-6 rounded-xl", currentStatusInfo.bgColor)}>
                        <div className="flex items-center gap-4 mb-4">
                          <div className={cn("w-14 h-14 rounded-full flex items-center justify-center", currentStatusInfo.color)}>
                            <StatusIcon className="w-7 h-7 text-white" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm text-muted-foreground">الحالة</p>
                            <p className={cn("text-2xl font-bold", currentStatusInfo.textColor)}>{currentStatusInfo.label}</p>
                          </div>
                        </div>
                        
                        {currentSession && (
                          <div className="flex items-center justify-between pt-4 border-t border-border/50">
                            <div className="flex items-center gap-2">
                              <Clock className="w-5 h-5 text-muted-foreground" />
                              <span className="text-sm text-muted-foreground">المدة</span>
                            </div>
                            <span className="text-3xl font-mono font-bold text-foreground">{currentDuration}</span>
                          </div>
                        )}
                      </div>

                      <Button
                        onClick={handleToggleShift}
                        size="lg"
                        className="w-full text-lg shadow-lg"
                        disabled={toggleShiftMutation.isPending}
                        data-testid="button-toggle-shift"
                      >
                        {currentSession && !currentSession.endTime ? (
                          <>
                            <Pause className="ml-2 h-5 w-5" />
                            إنهاء الشيفت
                          </>
                        ) : (
                          <>
                            <Play className="ml-2 h-5 w-5" />
                            بدء الشيفت
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Change Status Card */}
                  <Card className="border-2">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <CheckSquare className="w-5 h-5 text-primary" />
                        تغيير الحالة
                      </CardTitle>
                      <CardDescription>اختر الحالة المناسبة لنشاطك الحالي</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <Button
                          variant={selectedStatus === "ready" ? "default" : "outline"}
                          onClick={() => handleStatusChange("ready")}
                          className="h-auto py-4 flex-col gap-2"
                          disabled={startSessionMutation.isPending || endSessionMutation.isPending}
                          data-testid="button-status-ready"
                        >
                          <CheckCircle className="w-6 h-6" />
                          <span className="text-sm">جاهز</span>
                        </Button>

                        <Button
                          variant={selectedStatus === "working_on_project" ? "default" : "outline"}
                          onClick={() => handleStatusChange("working_on_project")}
                          className="h-auto py-4 flex-col gap-2"
                          disabled={startSessionMutation.isPending || endSessionMutation.isPending}
                          data-testid="button-status-working"
                        >
                          <Play className="w-6 h-6" />
                          <span className="text-sm">يعمل على مشروع</span>
                        </Button>

                        <Button
                          variant={selectedStatus === "personal" ? "default" : "outline"}
                          onClick={() => handleStatusChange("personal")}
                          className="h-auto py-4 flex-col gap-2"
                          disabled={startSessionMutation.isPending || endSessionMutation.isPending}
                          data-testid="button-status-personal"
                        >
                          <User className="w-6 h-6" />
                          <span className="text-sm">شخصي</span>
                        </Button>

                        <Button
                          variant={selectedStatus === "break" ? "default" : "outline"}
                          onClick={() => handleStatusChange("break")}
                          className="h-auto py-4 flex-col gap-2"
                          disabled={startSessionMutation.isPending || endSessionMutation.isPending}
                          data-testid="button-status-break"
                        >
                          <Coffee className="w-6 h-6" />
                          <span className="text-sm">استراحة</span>
                        </Button>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">ملاحظات (اختياري)</label>
                        <Textarea
                          value={currentNotes}
                          onChange={(e) => setCurrentNotes(e.target.value)}
                          placeholder="أضف ملاحظات حول نشاطك الحالي..."
                          rows={3}
                          data-testid="textarea-notes"
                        />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Tasks Tab */}
              <TabsContent value="tasks" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* My Tasks */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Target className="w-5 h-5 text-primary" />
                        مهامي
                      </CardTitle>
                      <CardDescription>المهام المسندة لي</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {userTasks && userTasks.length > 0 ? (
                        <div className="space-y-3">
                          {userTasks.slice(0, 5).map((task: any) => (
                            <div key={task.id} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                              {task.status === "completed" ? (
                                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                              ) : task.status === "in-progress" ? (
                                <Play className="w-5 h-5 text-blue-500 flex-shrink-0" />
                              ) : (
                                <Clock className="w-5 h-5 text-orange-500 flex-shrink-0" />
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">{task.title}</p>
                                <p className="text-sm text-muted-foreground truncate">{task.description}</p>
                              </div>
                              <Badge variant={task.priority === "high" ? "destructive" : task.priority === "medium" ? "default" : "secondary"}>
                                {task.priority === "high" ? "عالية" : task.priority === "medium" ? "متوسطة" : "منخفضة"}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-12">
                          <Target className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                          <p className="text-muted-foreground">لا توجد مهام حالياً</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Task Statistics */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-primary" />
                        إحصائيات المهام
                      </CardTitle>
                      <CardDescription>نظرة عامة على توزيع المهام</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/40 rounded-lg flex items-center justify-center">
                            <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                          </div>
                          <span className="font-medium">مهام معلقة</span>
                        </div>
                        <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">{pendingTasks.length}</span>
                      </div>

                      <div className="flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/40 rounded-lg flex items-center justify-center">
                            <Play className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                          </div>
                          <span className="font-medium">مهام جارية</span>
                        </div>
                        <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">{inProgressTasks.length}</span>
                      </div>

                      <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-green-100 dark:bg-green-900/40 rounded-lg flex items-center justify-center">
                            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                          </div>
                          <span className="font-medium">مهام مكتملة</span>
                        </div>
                        <span className="text-2xl font-bold text-green-600 dark:text-green-400">{completedTasks.length}</span>
                      </div>

                      {allTasks.length > 0 && (
                        <div className="pt-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium">معدل الإنجاز</span>
                            <span className="text-sm font-bold text-primary">
                              {Math.round((completedTasks.length / allTasks.length) * 100)}%
                            </span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-500"
                              style={{ width: `${(completedTasks.length / allTasks.length) * 100}%` }}
                            ></div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Leaderboard Tab */}
              <TabsContent value="leaderboard">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Award className="w-6 h-6 text-yellow-500" />
                      لوحة المتصدرين
                    </CardTitle>
                    <CardDescription>أفضل الموظفين أداءً هذا الشهر</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Leaderboard />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  );
}
