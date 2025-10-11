import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import Navigation from "@/components/navigation";
import Sidebar from "@/components/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Play, Pause, Clock, CheckCircle, AlertCircle, Coffee, User, Calendar } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
export default function Dashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
 
  const [currentNotes, setCurrentNotes] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("ready");
  // Fetch current AUX session
  const { data: currentSession, refetch: refetchCurrentSession } = useQuery({
    queryKey: ["/api/aux/current"],
    refetchInterval: 1000, // Refresh every second for real-time updates
    retry: 1,
  });
  // Fetch productivity stats
  const { data: productivityStats } = useQuery({
    queryKey: ["/api/analytics/productivity"],
  });
  // Fetch user tasks
  const { data: userTasks = [] } = useQuery({
    queryKey: ["/api/tasks/my"],
  });
  const { data: assignedTasks = [] } = useQuery({
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
  // Toggle shift mutation (end if active, start ready if not)
  const toggleShiftMutation = useMutation({
    mutationFn: async (notes?: string) => {
      if (currentSession && !currentSession.endTime) {
        // End current session
        const res = await apiRequest("POST", `/api/aux/end/${currentSession.id}`, { notes });
        return res.json();
      } else {
        // Start new ready session
        const res = await apiRequest("POST", "/api/aux/start", { status: "ready", notes });
        return res.json();
      }
    },
    onSuccess: async (result) => {
      queryClient.invalidateQueries({ queryKey: ["/api/aux/current"] });
      await refetchCurrentSession();
      // Update cache based on action
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
      // If needed, force reload for immediate UI update (remove if invalidate works)
      // window.location.reload();
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
      // Reset duration when no session
      setCurrentDuration("00:00:00");
    }
  }, [currentSession]);
  const handleStatusChange = (status: string) => {
    if (currentSession && !currentSession.endTime) {
      // End current session first, then start new one
      endSessionMutation.mutate({
        id: currentSession.id,
        notes: currentNotes
      }, {
        onSuccess: () => {
          // Start new session after ending current one
          startSessionMutation.mutate({
            status,
            notes: currentNotes
          });
        }
      });
    } else {
      // No active session, just start new one
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
    setCurrentNotes("");  // Clear notes after toggle
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
          label: "العمل علي مهمة",
          color: "bg-blue-500",
          icon: Play,
          bgColor: "bg-blue-50 dark:bg-blue-900/20",
          textColor: "text-blue-700 dark:text-blue-300"
        };
      case "personal":
        return {
          label: "شخصي'",
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
  const completedTasks = allTasks.filter(task => task.status === 'completed');
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
     
      <div className="flex">
        <Sidebar />
       
        <main className="flex-1 p-6 mr-64">
          {/* Welcome Section */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              مرحباً، {user?.fullName?.split(' ')[0]}! 👋
            </h1>
            <p className="text-muted-foreground">
              إليك نظرة عامة على يومك ونشاطك الحالي
            </p>
          </div>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card data-testid="card-total-time">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">إجمالي الوقت</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{currentSession ? currentDuration : '00:00:00'}</div>
                <p className="text-xs text-muted-foreground">اليوم</p>
              </CardContent>
            </Card>
            <Card data-testid="card-completed-tasks">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">مهام مكتملة</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{completedTasks.length}</div>
                <p className="text-xs text-muted-foreground">هذا الأسبوع</p>
              </CardContent>
            </Card>
            <Card data-testid="card-pending-tasks">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">مهام معلقة</CardTitle>
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{pendingTasks.length}</div>
                <p className="text-xs text-muted-foreground">تحتاج متابعة</p>
              </CardContent>
            </Card>
            <Card data-testid="card-productivity">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">الإنتاجية</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {productivityStats?.productivityPercentage != null ? `${Math.round(productivityStats.productivityPercentage)}%` : '-'}
                </div>
                <p className="text-xs text-muted-foreground">هذا الأسبوع</p>
              </CardContent>
            </Card>
          </div>
          {/* AUX Status & Control */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Current Status Display */}
            <div className="lg:col-span-2">
              <Card className={currentStatusInfo.bgColor} data-testid="card-current-aux-status">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${currentStatusInfo.color} animate-pulse`}></div>
                    الحالة الحالية
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <StatusIcon className={`w-8 h-8 ${currentStatusInfo.textColor}`} />
                      <div>
                        <h3 className={`text-xl font-bold ${currentStatusInfo.textColor}`}>
                          {currentStatusInfo.label}
                        </h3>
                        {currentSession?.startTime && (
                          <p className="text-sm text-muted-foreground">
                            منذ {new Date(currentSession.startTime).toLocaleTimeString('ar-EG')}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-3xl font-bold ${currentStatusInfo.textColor} timer-active`}>
                        {currentDuration}
                      </div>
                    </div>
                  </div>
                  {/* Notes Section */}
                  <div className="space-y-3">
                    <label className="text-sm font-medium text-foreground">
                      شغال على إيه دلوقتي؟
                    </label>
                    <Textarea
                      placeholder="اكتب ملاحظة عن نشاطك الحالي..."
                      value={currentNotes}
                      onChange={(e) => setCurrentNotes(e.target.value)}
                      rows={3}
                      data-testid="textarea-current-notes"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
            {/* AUX Status Controls */}
            <div>
              <Card data-testid="card-aux-controls">
                <CardHeader>
                  <CardTitle>تغيير الحالة</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* زرار الـ Toggle Shift الجديد */}
                  <Button
                    onClick={handleToggleShift}
                    variant={currentSession && !currentSession.endTime ? "destructive" : "default"}
                    className="w-full justify-start"
                    disabled={toggleShiftMutation.isPending}
                    data-testid="button-toggle-shift"
                  >
                    {currentSession && !currentSession.endTime ? (
                      <>
                        <Pause className="w-4 h-4 ml-2" />
                        إنهاء الشيفت
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 ml-2" />
                        بدء الشيفت
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={() => handleStatusChange("ready")}
                    variant={currentSession?.status === "ready" ? "default" : "outline"}
                    className="w-full justify-start"
                    disabled={startSessionMutation.isPending}
                    data-testid="button-status-ready"
                  >
                    <CheckCircle className="w-4 h-4 ml-2" />
                    في انتظار مهمة
                  </Button>
                  <Button
                    onClick={() => handleStatusChange("working_on_project")}
                    variant={currentSession?.status === "working_on_project" ? "default" : "outline"}
                    className="w-full justify-start"
                    disabled={startSessionMutation.isPending}
                    data-testid="button-status-working"
                  >
                    <Play className="w-4 h-4 ml-2" />
                   قيد العمل علي مهمة
                  </Button>
                  <Button
                    onClick={() => handleStatusChange("personal")}
                    variant={currentSession?.status === "personal" ? "default" : "outline"}
                    className="w-full justify-start"
                    disabled={startSessionMutation.isPending}
                    data-testid="button-status-personal"
                  >
                    <User className="w-4 h-4 ml-2" />
                    شخصي
                  </Button>
                  <Button
                    onClick={() => handleStatusChange("break")}
                    variant={currentSession?.status === "break" ? "default" : "outline"}
                    className="w-full justify-start"
                    disabled={startSessionMutation.isPending}
                    data-testid="button-status-break"
                  >
                    <Coffee className="w-4 h-4 ml-2" />
                    استراحة
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
          {/* Recent Tasks */}
          <Card data-testid="card-recent-tasks">
            <CardHeader>
              <CardTitle>المهام الأخيرة</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {allTasks.slice(0, 5).map((task) => (
                  <div key={task.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <CheckCircle className={`w-5 h-5 ${task.status === 'completed' ? 'text-success' : 'text-muted-foreground'}`} />
                      <div>
                        <p className={`font-medium ${task.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>
                          {task.title}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {task.description}
                        </p>
                      </div>
                    </div>
                    <Badge variant={task.status === 'completed' ? 'default' : 'secondary'}>
                      {task.status === 'pending' ? 'معلق' :
                       task.status === 'in_progress' ? 'قيد التنفيذ' : 'مكتمل'}
                    </Badge>
                  </div>
                ))}
               
                {allTasks.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    لا توجد مهام حالياً
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}