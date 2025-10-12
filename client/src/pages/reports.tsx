import { useState } from "react";
import { useSidebar } from "@/contexts/sidebar-context";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import Navigation from "@/components/navigation";
import Sidebar from "@/components/sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { exportToExcel, exportToPDF } from "@/lib/export-utils";
import {
  BarChart3,
  PieChart,
  TrendingUp,
  Users,
  Clock,
  CheckCircle,
  Download,
  Calendar,
  Filter,
  FileText,
  Activity,
  Award,
  Sparkles
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function Reports() {
  const { user } = useAuth();
  const { isCollapsed } = useSidebar();

  const [timeRange, setTimeRange] = useState("7");
  const [departmentFilter, setDepartmentFilter] = useState("all");

  const { data: productivityStats } = useQuery<any>({
    queryKey: ["/api/analytics/productivity", timeRange],
  });

  const { data: departmentStats } = useQuery<any[]>({
    queryKey: ["/api/analytics/departments"],
    enabled: user?.role === 'admin' || user?.role === 'sub-admin',
  });

  const { data: adminStats } = useQuery<any>({
    queryKey: ["/api/admin/stats"],
    enabled: user?.role === 'admin' || user?.role === 'sub-admin',
  });

  const { data: auxSessions } = useQuery<any[]>({
    queryKey: ["/api/aux/sessions"],
  });

  const auxDistribution = auxSessions
    ? Object.entries(
        auxSessions.reduce((acc: any, session: any) => {
          const status = session.status;
          const duration = session.endTime
            ? (new Date(session.endTime).getTime() - new Date(session.startTime).getTime()) / (1000 * 60 * 60)
            : 0;
          
          if (!acc[status]) {
            acc[status] = { status, hours: 0 };
          }
          acc[status].hours += duration;
          return acc;
        }, {})
      ).map(([_, value]: any) => {
        const totalHours = Object.values(
          auxSessions.reduce((acc: any, s: any) => {
            const dur = s.endTime
              ? (new Date(s.endTime).getTime() - new Date(s.startTime).getTime()) / (1000 * 60 * 60)
              : 0;
            acc.total = (acc.total || 0) + dur;
            return acc;
          }, {})
        )[0] as number || 1;
        
        return {
          status: value.status,
          hours: Number(value.hours.toFixed(1)),
          percentage: Number(((value.hours / totalHours) * 100).toFixed(1))
        };
      })
    : [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "working": return "hsl(var(--chart-1))";
      case "ready": return "hsl(var(--chart-3))";
      case "break": return "hsl(var(--chart-5))";
      case "personal": return "hsl(var(--chart-4))";
      case "meeting": return "hsl(var(--chart-2))";
      default: return "hsl(var(--muted))";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "working": return "عمل على مشروع";
      case "ready": return "جاهز";
      case "break": return "استراحة";
      case "personal": return "شخصي";
      case "meeting": return "اجتماع";
      default: return status;
    }
  };

  const handleExportReport = (format: string) => {
    const exportData = {
      stats: {
        avgProductivity,
        totalWorkHours,
        completedTasksCount,
        activeEmployees,
        totalEmployees,
      },
      auxDistribution,
      departmentStats,
      timeRange,
      departmentFilter,
    };

    const timestamp = new Date().toISOString().split('T')[0];
    const baseFilename = `report-${timestamp}`;

    if (format === 'excel' || format === 'csv') {
      exportToExcel(exportData, baseFilename);
    } else if (format === 'pdf') {
      exportToPDF(exportData, baseFilename, 'Reports and Analytics');
    }
  };

  const avgProductivity = productivityStats?.averageProductivity ?? 0;
  const totalWorkHours = adminStats?.totalWorkHours ?? 0;
  const completedTasksCount = adminStats?.completedTasks ?? 0;
  const activeEmployees = adminStats?.activeEmployees ?? 0;
  const totalEmployees = adminStats?.totalEmployees ?? 0;

  const metricsVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.1,
        type: "spring",
        stiffness: 100,
      },
    }),
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5">
      <Navigation />

      <div className="flex">
        <Sidebar />

        <main className={cn("flex-1 p-6 transition-all duration-300", isCollapsed ? "mr-16" : "mr-64")}>
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between mb-8"
          >
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent mb-2">
                التقارير والتحليلات
              </h1>
              <p className="text-muted-foreground flex items-center gap-2">
                <Activity className="w-4 h-4" />
                تحليل شامل للأداء والإنتاجية مع رسوم بيانية تفاعلية
              </p>
            </div>

            <div className="flex gap-3">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button variant="outline" onClick={() => handleExportReport('pdf')} className="gap-2" data-testid="button-export-pdf">
                  <FileText className="w-4 h-4" />
                  تصدير PDF
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button variant="outline" onClick={() => handleExportReport('excel')} className="gap-2" data-testid="button-export-excel">
                  <Download className="w-4 h-4" />
                  تصدير Excel
                </Button>
              </motion.div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="mb-6 shadow-lg border-primary/10" data-testid="card-report-filters">
              <CardContent className="p-6">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-primary" />
                    <span className="text-sm font-medium">الفترة الزمنية:</span>
                  </div>

                  <Select value={timeRange} onValueChange={setTimeRange}>
                    <SelectTrigger className="w-[160px] h-11" data-testid="select-time-range">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">آخر 7 أيام</SelectItem>
                      <SelectItem value="30">آخر 30 يوم</SelectItem>
                      <SelectItem value="90">آخر 3 شهور</SelectItem>
                      <SelectItem value="365">آخر سنة</SelectItem>
                    </SelectContent>
                  </Select>

                  {(user?.role === 'admin' || user?.role === 'sub-admin') && (
                    <>
                      <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                        <SelectTrigger className="w-[160px] h-11" data-testid="select-department-filter">
                          <SelectValue placeholder="القسم" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">كل الأقسام</SelectItem>
                          <SelectItem value="التطوير">التطوير</SelectItem>
                          <SelectItem value="التصميم">التصميم</SelectItem>
                          <SelectItem value="التسويق">التسويق</SelectItem>
                          <SelectItem value="المبيعات">المبيعات</SelectItem>
                        </SelectContent>
                      </Select>
                    </>
                  )}

                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button variant="outline" size="sm" className="h-11" data-testid="button-reset-report-filters">
                      <Filter className="w-4 h-4 ml-2" />
                      إعادة تعيين
                    </Button>
                  </motion.div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <motion.div
              custom={0}
              initial="hidden"
              animate="visible"
              variants={metricsVariants}
            >
              <Card className="relative overflow-hidden group hover:shadow-2xl transition-all duration-300" data-testid="card-avg-productivity">
                <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-emerald-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                <motion.div
                  className="absolute -top-12 -right-12 w-32 h-32 bg-gradient-to-br from-primary to-accent rounded-full opacity-10"
                  animate={{ 
                    scale: [1, 1.2, 1],
                    rotate: [0, 90, 0]
                  }}
                  transition={{ duration: 10, repeat: Infinity }}
                />
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">متوسط الإنتاجية</CardTitle>
                  <motion.div
                    whileHover={{ rotate: 360 }}
                    transition={{ duration: 0.5 }}
                  >
                    <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-500" />
                  </motion.div>
                </CardHeader>
                <CardContent>
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
                    className="text-3xl font-bold text-green-600 dark:text-green-500"
                    data-testid="text-avg-productivity"
                  >
                    {avgProductivity}%
                  </motion.div>
                  <p className="text-xs text-muted-foreground mt-1">خلال الفترة المحددة</p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              custom={1}
              initial="hidden"
              animate="visible"
              variants={metricsVariants}
            >
              <Card className="relative overflow-hidden group hover:shadow-2xl transition-all duration-300" data-testid="card-total-work-hours">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                <motion.div
                  className="absolute -top-12 -right-12 w-32 h-32 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full opacity-10"
                  animate={{ 
                    scale: [1, 1.2, 1],
                    rotate: [0, -90, 0]
                  }}
                  transition={{ duration: 8, repeat: Infinity }}
                />
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">إجمالي ساعات العمل</CardTitle>
                  <motion.div
                    whileHover={{ rotate: 360 }}
                    transition={{ duration: 0.5 }}
                  >
                    <Clock className="h-5 w-5 text-blue-600 dark:text-blue-500" />
                  </motion.div>
                </CardHeader>
                <CardContent>
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200, delay: 0.3 }}
                    className="text-3xl font-bold text-blue-600 dark:text-blue-500"
                    data-testid="text-total-work-hours"
                  >
                    {Math.round(totalWorkHours)}
                  </motion.div>
                  <p className="text-xs text-muted-foreground mt-1">ساعة عمل</p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              custom={2}
              initial="hidden"
              animate="visible"
              variants={metricsVariants}
            >
              <Card className="relative overflow-hidden group hover:shadow-2xl transition-all duration-300" data-testid="card-completed-tasks-count">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                <motion.div
                  className="absolute -top-12 -right-12 w-32 h-32 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full opacity-10"
                  animate={{ 
                    scale: [1, 1.2, 1],
                    rotate: [0, 180, 0]
                  }}
                  transition={{ duration: 12, repeat: Infinity }}
                />
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">مهام مكتملة</CardTitle>
                  <motion.div
                    whileHover={{ rotate: 360 }}
                    transition={{ duration: 0.5 }}
                  >
                    <CheckCircle className="h-5 w-5 text-purple-600 dark:text-purple-500" />
                  </motion.div>
                </CardHeader>
                <CardContent>
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200, delay: 0.4 }}
                    className="text-3xl font-bold text-purple-600 dark:text-purple-500"
                    data-testid="text-completed-tasks-count"
                  >
                    {completedTasksCount}
                  </motion.div>
                  <p className="text-xs text-muted-foreground mt-1">مهمة مكتملة</p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              custom={3}
              initial="hidden"
              animate="visible"
              variants={metricsVariants}
            >
              <Card className="relative overflow-hidden group hover:shadow-2xl transition-all duration-300" data-testid="card-active-employees-count">
                <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                <motion.div
                  className="absolute -top-12 -right-12 w-32 h-32 bg-gradient-to-br from-orange-500 to-red-500 rounded-full opacity-10"
                  animate={{ 
                    scale: [1, 1.2, 1],
                    rotate: [0, -180, 0]
                  }}
                  transition={{ duration: 14, repeat: Infinity }}
                />
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">موظفين نشطين</CardTitle>
                  <motion.div
                    whileHover={{ rotate: 360 }}
                    transition={{ duration: 0.5 }}
                  >
                    <Users className="h-5 w-5 text-orange-600 dark:text-orange-500" />
                  </motion.div>
                </CardHeader>
                <CardContent>
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200, delay: 0.5 }}
                    className="text-3xl font-bold text-orange-600 dark:text-orange-500"
                    data-testid="text-active-employees"
                  >
                    {activeEmployees}
                  </motion.div>
                  <p className="text-xs text-muted-foreground mt-1">من أصل {totalEmployees} موظف</p>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
            >
              <Card className="shadow-lg hover:shadow-xl transition-shadow" data-testid="card-productivity-chart">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-primary" />
                    الإنتاجية
                  </CardTitle>
                  <CardDescription>
                    إحصائيات الإنتاجية خلال الفترة المحددة
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px] flex items-center justify-center relative">
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5 rounded-lg"
                      animate={{
                        opacity: [0.3, 0.5, 0.3],
                      }}
                      transition={{ duration: 3, repeat: Infinity }}
                    />
                    <div className="text-center relative z-10">
                      <motion.div
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: "spring", stiffness: 100, delay: 0.7 }}
                        className="text-7xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-4"
                      >
                        {avgProductivity}%
                      </motion.div>
                      <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.9 }}
                        className="text-muted-foreground flex items-center justify-center gap-2"
                      >
                        <Sparkles className="w-4 h-4" />
                        متوسط الإنتاجية
                      </motion.p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.7 }}
            >
              <Card className="shadow-lg hover:shadow-xl transition-shadow" data-testid="card-aux-distribution">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="w-5 h-5 text-primary" />
                    توزيع وقت AUX
                  </CardTitle>
                  <CardDescription>
                    كيفية قضاء الوقت خلال ساعات العمل
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {auxDistribution.length > 0 ? (
                    <div className="space-y-4">
                      <AnimatePresence mode="popLayout">
                        {auxDistribution.map((item, index) => (
                          <motion.div
                            key={item.status}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            transition={{ delay: index * 0.1 }}
                            className="group"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-3">
                                <motion.div
                                  className="w-4 h-4 rounded-full"
                                  style={{ backgroundColor: getStatusColor(item.status) }}
                                  whileHover={{ scale: 1.3 }}
                                  transition={{ type: "spring", stiffness: 300 }}
                                />
                                <span className="text-sm font-medium">{getStatusLabel(item.status)}</span>
                              </div>
                              <div className="flex items-center gap-4">
                                <span className="text-sm text-muted-foreground">
                                  {item.hours} ساعة
                                </span>
                                <span className="text-sm font-semibold w-12 text-left">
                                  {item.percentage}%
                                </span>
                              </div>
                            </div>
                            <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                              <motion.div
                                className="h-full rounded-full"
                                style={{ backgroundColor: getStatusColor(item.status) }}
                                initial={{ width: 0 }}
                                animate={{ width: `${item.percentage}%` }}
                                transition={{ 
                                  duration: 1, 
                                  delay: index * 0.1 + 0.5,
                                  type: "spring",
                                  stiffness: 50
                                }}
                              />
                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  ) : (
                    <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                      <div className="text-center">
                        <PieChart className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>لا توجد بيانات متاحة</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {(user?.role === 'admin' || user?.role === 'sub-admin') && departmentStats && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
            >
              <Card className="mb-8 shadow-lg hover:shadow-xl transition-shadow" data-testid="card-department-performance">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-primary" />
                    أداء الأقسام
                  </CardTitle>
                  <CardDescription>
                    مقارنة الأداء والإنتاجية بين الأقسام المختلفة
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <AnimatePresence mode="popLayout">
                      {departmentStats.map((dept: any, index) => (
                        <motion.div
                          key={dept.department}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          transition={{ delay: index * 0.1 }}
                          className="space-y-3 p-4 rounded-lg hover:bg-muted/50 transition-colors group"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-semibold text-foreground flex items-center gap-2">
                                <motion.div
                                  whileHover={{ rotate: 360 }}
                                  transition={{ duration: 0.5 }}
                                >
                                  <Award className="w-4 h-4 text-primary" />
                                </motion.div>
                                {dept.department}
                              </h4>
                              <p className="text-sm text-muted-foreground">
                                {dept.employeeCount} موظفين • {dept.completedTasks} مهمة مكتملة
                              </p>
                            </div>
                            <div className="text-left">
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: "spring", stiffness: 200, delay: index * 0.1 + 0.2 }}
                                className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent"
                              >
                                {dept.averageProductivity}%
                              </motion.div>
                              <p className="text-xs text-muted-foreground">الإنتاجية</p>
                            </div>
                          </div>
                          <div className="w-full bg-muted rounded-full h-4 overflow-hidden">
                            <motion.div
                              className="h-full bg-gradient-to-l from-primary via-accent to-primary rounded-full"
                              initial={{ width: 0 }}
                              animate={{ width: `${dept.averageProductivity}%` }}
                              transition={{ 
                                duration: 1.5, 
                                delay: index * 0.1 + 0.3,
                                type: "spring",
                                stiffness: 50
                              }}
                            />
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
          >
            <Card className="shadow-lg hover:shadow-xl transition-shadow" data-testid="card-export-options">
              <CardHeader>
                <CardTitle>تصدير التقارير</CardTitle>
                <CardDescription>
                  احصل على تقارير مفصلة بصيغ مختلفة للمشاركة والأرشفة
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <motion.div whileHover={{ scale: 1.05, y: -4 }} whileTap={{ scale: 0.95 }}>
                    <Button
                      variant="outline"
                      className="flex items-center justify-center gap-3 h-24 w-full relative overflow-hidden group"
                      onClick={() => handleExportReport('pdf')}
                      data-testid="button-export-detailed-pdf"
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                      <FileText className="w-10 h-10 text-red-600 dark:text-red-500 relative z-10" />
                      <div className="text-center relative z-10">
                        <div className="font-semibold">PDF مفصل</div>
                        <div className="text-xs text-muted-foreground">تقرير شامل</div>
                      </div>
                    </Button>
                  </motion.div>

                  <motion.div whileHover={{ scale: 1.05, y: -4 }} whileTap={{ scale: 0.95 }}>
                    <Button
                      variant="outline"
                      className="flex items-center justify-center gap-3 h-24 w-full relative overflow-hidden group"
                      onClick={() => handleExportReport('excel')}
                      data-testid="button-export-detailed-excel"
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-emerald-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                      <Download className="w-10 h-10 text-green-600 dark:text-green-500 relative z-10" />
                      <div className="text-center relative z-10">
                        <div className="font-semibold">Excel</div>
                        <div className="text-xs text-muted-foreground">بيانات قابلة للتحليل</div>
                      </div>
                    </Button>
                  </motion.div>

                  <motion.div whileHover={{ scale: 1.05, y: -4 }} whileTap={{ scale: 0.95 }}>
                    <Button
                      variant="outline"
                      className="flex items-center justify-center gap-3 h-24 w-full relative overflow-hidden group"
                      onClick={() => handleExportReport('csv')}
                      data-testid="button-export-csv"
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                      <BarChart3 className="w-10 h-10 text-blue-600 dark:text-blue-500 relative z-10" />
                      <div className="text-center relative z-10">
                        <div className="font-semibold">CSV</div>
                        <div className="text-xs text-muted-foreground">بيانات خام</div>
                      </div>
                    </Button>
                  </motion.div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </main>
      </div>
    </div>
  );
}
