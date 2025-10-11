import { useAuth } from "@/hooks/use-auth";
import Navigation from "@/components/navigation";
import Sidebar from "@/components/sidebar";
import AuxStatusTracker from "@/components/aux-status-tracker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Clock, CheckCircle2, TrendingUp, Coffee } from "lucide-react";

export default function EmployeeDashboard() {
  const { user } = useAuth();

  // Fetch user tasks
  const { data: myTasks = [] } = useQuery({
    queryKey: ["/api/tasks/my"],
  });

  const { data: assignedTasks = [] } = useQuery({
    queryKey: ["/api/tasks/assigned"],
  });

  // Fetch notifications
  const { data: notifications = [] } = useQuery({
    queryKey: ["/api/notifications"],
  });

  const completedTasks = [...myTasks, ...assignedTasks].filter(task => task.status === 'completed');
  const pendingTasks = [...myTasks, ...assignedTasks].filter(task => task.status === 'pending');

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="flex">
        <Sidebar />
        
        <main className="flex-1 p-6 mr-64">
          {/* Welcome Section */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              مرحباً، {user?.fullName}! 👋
            </h1>
            <p className="text-muted-foreground">
              إليك ملخص يومك وأنشطتك الحالية
            </p>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="hover:shadow-lg transition-shadow" data-testid="card-daily-hours">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">ساعات اليوم</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">7:45</div>
                <p className="text-xs text-muted-foreground">+1.2 ساعة من أمس</p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow" data-testid="card-completed-tasks">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">مهام مكتملة</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-success">{completedTasks.length}</div>
                <p className="text-xs text-muted-foreground">
                  من {myTasks.length + assignedTasks.length} مهمة
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow" data-testid="card-productivity">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">الإنتاجية</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-secondary">87%</div>
                <p className="text-xs text-muted-foreground">+5% من الأسبوع الماضي</p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow" data-testid="card-break-time">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">وقت الاستراحة</CardTitle>
                <Coffee className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-warning">45 د</div>
                <p className="text-xs text-muted-foreground">طبيعي</p>
              </CardContent>
            </Card>
          </div>

          {/* AUX Status Tracker */}
          <div className="mb-8">
            <AuxStatusTracker />
          </div>

          {/* Tasks and Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Today's Tasks */}
            <Card data-testid="card-todays-tasks">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>مهام اليوم</span>
                  <span className="text-sm text-muted-foreground">
                    {pendingTasks.length} قيد التنفيذ
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {pendingTasks.slice(0, 5).map((task) => (
                  <div key={task.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors" data-testid={`task-item-${task.id}`}>
                    <input type="checkbox" className="mt-1 w-4 h-4 text-primary rounded" />
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-foreground">{task.title}</h4>
                      {task.description && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {task.description.substring(0, 100)}...
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          task.priority === 'high' ? 'bg-destructive/20 text-destructive' :
                          task.priority === 'medium' ? 'bg-warning/20 text-warning' :
                          'bg-muted text-muted-foreground'
                        }`}>
                          {task.priority === 'high' ? 'عالي' : task.priority === 'medium' ? 'متوسط' : 'منخفض'}
                        </span>
                        {task.dueDate && (
                          <span className="text-xs text-muted-foreground">
                            موعد: {new Date(task.dueDate).toLocaleDateString('ar-EG')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                
                {pendingTasks.length === 0 && (
                  <div className="text-center py-6 text-muted-foreground">
                    <CheckCircle2 className="w-12 h-12 mx-auto mb-2 text-success" />
                    <p>رائع! لا توجد مهام معلقة</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card data-testid="card-recent-activity">
              <CardHeader>
                <CardTitle>النشاط الأخير</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {notifications.slice(0, 5).map((notification) => (
                  <div key={notification.id} className="flex items-start gap-3" data-testid={`notification-${notification.id}`}>
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-foreground">{notification.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">{notification.message}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(notification.createdAt).toLocaleString('ar-EG')}
                      </p>
                    </div>
                  </div>
                ))}

                {notifications.length === 0 && (
                  <div className="text-center py-6 text-muted-foreground">
                    <p>لا توجد إشعارات جديدة</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
