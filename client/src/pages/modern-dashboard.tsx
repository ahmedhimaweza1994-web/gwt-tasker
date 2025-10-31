import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { motion } from "framer-motion";
import {
  CheckSquare,
  Clock,
  CheckCircle2,
  Users,
  TrendingUp,
  Calendar,
  Plus,
  MessageSquare,
  Building,
  Sparkles,
  ArrowRight,
  Activity,
  Target,
  Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Background3D from "@/components/3d-background";
import ModernNavigation from "@/components/modern-navigation";
import ModernSidebar from "@/components/modern-sidebar";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

interface DashboardStats {
  totalTasks: number;
  pendingTasks: number;
  completedTasks: number;
  teamMembers: number;
  completionRate: number;
  activeProjects: number;
}

interface RecentActivity {
  id: number;
  type: string;
  message: string;
  timestamp: string;
  user?: string;
  icon?: string;
}

interface Task {
  id: number;
  title: string;
  status: string;
  priority: string;
  dueDate: string;
  assignedTo: number;
}

function StatCard({
  title,
  value,
  icon: Icon,
  gradient,
  trend,
  trendValue,
  delay = 0
}: {
  title: string;
  value: string | number;
  icon: any;
  gradient: string;
  trend?: "up" | "down";
  trendValue?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, type: "spring", stiffness: 200, damping: 20 }}
      whileHover={{ scale: 1.05, y: -5 }}
      className="card-3d"
    >
      <Card className="glass-dark border-white/10 shadow-glow hover:shadow-glow-hover transition-all overflow-hidden relative group">
        {/* Gradient Background */}
        <div className={cn(
          "absolute inset-0 bg-gradient-to-br opacity-5 group-hover:opacity-10 transition-opacity",
          gradient
        )} />

        {/* Animated Particles */}
        <motion.div
          className={cn(
            "absolute inset-0 bg-gradient-to-r opacity-0 group-hover:opacity-20 blur-xl transition-opacity",
            gradient
          )}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.1, 0.2, 0.1],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        <CardContent className="p-6 relative">
          <div className="flex items-center justify-between mb-4">
            <div className={cn(
              "p-3 rounded-xl bg-gradient-to-r shadow-lg",
              gradient
            )}>
              <Icon className="w-6 h-6 text-white" />
            </div>
            {trend && (
              <Badge
                variant="outline"
                className={cn(
                  "border-0 gap-1",
                  trend === "up"
                    ? "bg-green-500/10 text-green-400"
                    : "bg-red-500/10 text-red-400"
                )}
              >
                <TrendingUp className={cn(
                  "w-3 h-3",
                  trend === "down" && "rotate-180"
                )} />
                {trendValue}
              </Badge>
            )}
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: delay + 0.2 }}
          >
            <h3 className="text-3xl font-bold text-white mb-1 text-gradient">
              {value}
            </h3>
            <p className="text-sm text-gray-400">{title}</p>
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function QuickActionButton({
  title,
  icon: Icon,
  gradient,
  onClick,
  delay = 0
}: {
  title: string;
  icon: any;
  gradient: string;
  onClick: () => void;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, type: "spring" }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
    >
      <Button
        onClick={onClick}
        className={cn(
          "w-full h-24 bg-gradient-to-r text-white border-0 shadow-glow hover:shadow-glow-hover rounded-xl flex flex-col gap-2 relative overflow-hidden group",
          gradient
        )}
      >
        <motion.div
          className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors"
          whileHover={{ scale: 1.5 }}
          transition={{ duration: 0.3 }}
        />
        <Icon className="w-6 h-6 relative z-10" />
        <span className="text-sm font-semibold relative z-10">{title}</span>
      </Button>
    </motion.div>
  );
}

function ActivityItem({
  activity,
  index
}: {
  activity: RecentActivity;
  index: number;
}) {
  const getIcon = (type: string) => {
    switch (type) {
      case "task_created": return CheckSquare;
      case "task_completed": return CheckCircle2;
      case "message": return MessageSquare;
      case "team_join": return Users;
      default: return Activity;
    }
  };

  const getGradient = (type: string) => {
    switch (type) {
      case "task_created": return "from-blue-500 to-cyan-500";
      case "task_completed": return "from-green-500 to-emerald-500";
      case "message": return "from-purple-500 to-pink-500";
      case "team_join": return "from-orange-500 to-red-500";
      default: return "from-gray-500 to-gray-600";
    }
  };

  const Icon = getIcon(activity.type);
  const gradient = getGradient(activity.type);

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      className="flex items-start gap-4 p-4 glass rounded-xl hover:bg-white/10 transition-all group"
    >
      <div className={cn(
        "p-2 rounded-lg bg-gradient-to-r shadow-lg shrink-0",
        gradient
      )}>
        <Icon className="w-4 h-4 text-white" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm text-white/90 mb-1">{activity.message}</p>
        <div className="flex items-center gap-2">
          {activity.user && (
            <span className="text-xs text-gray-400">{activity.user}</span>
          )}
          <span className="text-xs text-gray-500">
            {format(new Date(activity.timestamp), "dd/MM/yyyy HH:mm", { locale: ar })}
          </span>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        whileHover={{ opacity: 1, x: 5 }}
        className="opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <ArrowRight className="w-4 h-4 text-gray-400" />
      </motion.div>
    </motion.div>
  );
}

export default function ModernDashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  // Fetch dashboard stats
  const { data: stats } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
    initialData: {
      totalTasks: 0,
      pendingTasks: 0,
      completedTasks: 0,
      teamMembers: 0,
      completionRate: 0,
      activeProjects: 0,
    },
  });

  // Fetch recent activity
  const { data: recentActivity = [] } = useQuery<RecentActivity[]>({
    queryKey: ["/api/dashboard/activity"],
    initialData: [],
  });

  // Fetch upcoming tasks
  const { data: upcomingTasks = [] } = useQuery<Task[]>({
    queryKey: ["/api/tasks", { status: "pending", limit: 5 }],
    initialData: [],
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "bg-red-500/10 text-red-400 border-red-500/20";
      case "medium": return "bg-yellow-500/10 text-yellow-400 border-yellow-500/20";
      case "low": return "bg-green-500/10 text-green-400 border-green-500/20";
      default: return "bg-gray-500/10 text-gray-400 border-gray-500/20";
    }
  };

  return (
    <div className="min-h-screen pb-8">
      <Background3D />
      <ModernNavigation />
      <ModernSidebar />

      <div className="container mx-auto px-4 pt-24 space-y-8">
        {/* Welcome Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="glass-dark rounded-2xl p-8 border border-white/10 shadow-glow relative overflow-hidden"
        >
          {/* Animated Gradient Background */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10"
            animate={{
              backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
            }}
            transition={{
              duration: 10,
              repeat: Infinity,
              ease: "linear",
            }}
          />

          <div className="relative z-10">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <motion.h1
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-4xl font-bold text-white mb-2 flex items-center gap-3"
                >
                  مرحباً، {user?.fullName}!
                  <motion.span
                    animate={{ rotate: [0, 14, -8, 14, -4, 10, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 2 }}
                  >
                    👋
                  </motion.span>
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-gray-400"
                >
                  لديك {stats.pendingTasks} مهمة قيد الانتظار اليوم
                </motion.p>
              </div>

              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 }}
                className="flex items-center gap-2"
              >
                <Badge className="bg-gradient-primary border-0 text-white px-4 py-2 text-sm shadow-glow">
                  <Zap className="w-4 h-4 ml-1" />
                  {user?.role === "admin" ? "مدير" : "موظف"}
                </Badge>
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="إجمالي المهام"
            value={stats.totalTasks}
            icon={Target}
            gradient="from-blue-500 to-cyan-500"
            trend="up"
            trendValue="12%"
            delay={0.1}
          />
          <StatCard
            title="قيد الانتظار"
            value={stats.pendingTasks}
            icon={Clock}
            gradient="from-orange-500 to-red-500"
            trend="down"
            trendValue="5%"
            delay={0.2}
          />
          <StatCard
            title="مكتملة"
            value={stats.completedTasks}
            icon={CheckCircle2}
            gradient="from-green-500 to-emerald-500"
            trend="up"
            trendValue="23%"
            delay={0.3}
          />
          <StatCard
            title="أعضاء الفريق"
            value={stats.teamMembers}
            icon={Users}
            gradient="from-purple-500 to-pink-500"
            trend="up"
            trendValue="8%"
            delay={0.4}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content - 2 columns */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quick Actions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <Card className="glass-dark border-white/10 shadow-glow">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Sparkles className="w-5 h-5" />
                    إجراءات سريعة
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <QuickActionButton
                      title="مهمة جديدة"
                      icon={Plus}
                      gradient="from-blue-500 to-cyan-500"
                      onClick={() => setLocation("/tasks")}
                      delay={0.6}
                    />
                    <QuickActionButton
                      title="المحادثات"
                      icon={MessageSquare}
                      gradient="from-green-500 to-emerald-500"
                      onClick={() => setLocation("/chat")}
                      delay={0.7}
                    />
                    <QuickActionButton
                      title="الشركات"
                      icon={Building}
                      gradient="from-orange-500 to-red-500"
                      onClick={() => setLocation("/companies")}
                      delay={0.8}
                    />
                    <QuickActionButton
                      title="مساعد AI"
                      icon={Sparkles}
                      gradient="from-purple-500 to-pink-500"
                      onClick={() => setLocation("/ai-models")}
                      delay={0.9}
                    />
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Upcoming Tasks */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
            >
              <Card className="glass-dark border-white/10 shadow-glow">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-white flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    المهام القادمة
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setLocation("/tasks")}
                    className="text-primary hover:bg-white/5"
                  >
                    عرض الكل
                    <ArrowRight className="w-4 h-4 mr-2" />
                  </Button>
                </CardHeader>
                <CardContent className="space-y-3">
                  {upcomingTasks.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                      <CheckCircle2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>لا توجد مهام قادمة</p>
                    </div>
                  ) : (
                    upcomingTasks.map((task, index) => (
                      <motion.div
                        key={task.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.8 + index * 0.1 }}
                        className="glass rounded-xl p-4 hover:bg-white/10 transition-all group cursor-pointer"
                        onClick={() => setLocation(`/tasks`)}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <h4 className="text-white font-medium mb-2 group-hover:text-primary transition-colors">
                              {task.title}
                            </h4>
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge
                                variant="outline"
                                className={getPriorityColor(task.priority)}
                              >
                                {task.priority === "high" ? "عالية" :
                                 task.priority === "medium" ? "متوسطة" : "منخفضة"}
                              </Badge>
                              <span className="text-xs text-gray-500 flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {format(new Date(task.dueDate), "dd/MM/yyyy", { locale: ar })}
                              </span>
                            </div>
                          </div>
                          <motion.div
                            initial={{ opacity: 0 }}
                            whileHover={{ opacity: 1, x: 5 }}
                            className="opacity-0 group-hover:opacity-100"
                          >
                            <ArrowRight className="w-5 h-5 text-gray-400" />
                          </motion.div>
                        </div>
                      </motion.div>
                    ))
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Sidebar - 1 column */}
          <div className="space-y-6">
            {/* Recent Activity */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
            >
              <Card className="glass-dark border-white/10 shadow-glow">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Activity className="w-5 h-5" />
                    النشاط الأخير
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 max-h-[600px] overflow-y-auto">
                  {recentActivity.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                      <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>لا يوجد نشاط حديث</p>
                    </div>
                  ) : (
                    recentActivity.map((activity, index) => (
                      <ActivityItem
                        key={activity.id}
                        activity={activity}
                        index={index}
                      />
                    ))
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Performance Chart */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.8 }}
            >
              <Card className="glass-dark border-white/10 shadow-glow">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    معدل الإنجاز
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Circular Progress */}
                    <div className="flex items-center justify-center py-8">
                      <div className="relative w-40 h-40">
                        <svg className="w-full h-full -rotate-90">
                          <circle
                            cx="80"
                            cy="80"
                            r="70"
                            fill="none"
                            stroke="rgba(255,255,255,0.1)"
                            strokeWidth="12"
                          />
                          <motion.circle
                            cx="80"
                            cy="80"
                            r="70"
                            fill="none"
                            stroke="url(#gradient)"
                            strokeWidth="12"
                            strokeLinecap="round"
                            initial={{ strokeDasharray: "0 440" }}
                            animate={{
                              strokeDasharray: `${(stats.completionRate / 100) * 440} 440`,
                            }}
                            transition={{ duration: 1.5, ease: "easeOut" }}
                          />
                          <defs>
                            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                              <stop offset="0%" stopColor="#6366f1" />
                              <stop offset="100%" stopColor="#ec4899" />
                            </linearGradient>
                          </defs>
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center flex-col">
                          <span className="text-4xl font-bold text-gradient">
                            {Math.round(stats.completionRate)}%
                          </span>
                          <span className="text-sm text-gray-400">إنجاز</span>
                        </div>
                      </div>
                    </div>

                    {/* Stats Breakdown */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-400">مهام مكتملة</span>
                        <span className="text-white font-semibold">{stats.completedTasks}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-400">مهام نشطة</span>
                        <span className="text-white font-semibold">{stats.pendingTasks}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-400">مشاريع نشطة</span>
                        <span className="text-white font-semibold">{stats.activeProjects}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
