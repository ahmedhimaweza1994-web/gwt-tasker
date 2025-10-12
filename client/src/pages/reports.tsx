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
  FileText
} from "lucide-react";

export default function Reports() {
  const { user } = useAuth();
  const { isCollapsed } = useSidebar();

  const [timeRange, setTimeRange] = useState("7");
  const [departmentFilter, setDepartmentFilter] = useState("all");

  // Fetch analytics data
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

  // Calculate AUX distribution from real sessions
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

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="flex">
        <Sidebar />

        <main className={cn("flex-1 p-6 transition-all duration-300", isCollapsed ? "mr-16" : "mr-64")}>
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                التقارير والتحليلات
              </h1>
              <p className="text-muted-foreground">
                تحليل شامل للأداء والإنتاجية مع رسوم بيانية تفاعلية
              </p>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => handleExportReport('pdf')} data-testid="button-export-pdf">
                <FileText className="w-4 h-4 ml-2" />
                تصدير PDF
              </Button>
              <Button variant="outline" onClick={() => handleExportReport('excel')} data-testid="button-export-excel">
                <Download className="w-4 h-4 ml-2" />
                تصدير Excel
              </Button>
            </div>
          </div>

          {/* Filters */}
          <Card className="mb-6" data-testid="card-report-filters">
            <CardContent className="p-4">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">الفترة الزمنية:</span>
                </div>

                <Select value={timeRange} onValueChange={setTimeRange}>
                  <SelectTrigger className="w-[150px]" data-testid="select-time-range">
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
                      <SelectTrigger className="w-[150px]" data-testid="select-department-filter">
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

                <Button variant="outline" size="sm" data-testid="button-reset-report-filters">
                  <Filter className="w-4 h-4 ml-2" />
                  إعادة تعيين
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card data-testid="card-avg-productivity">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">متوسط الإنتاجية</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-success" data-testid="text-avg-productivity">
                  {avgProductivity}%
                </div>
                <p className="text-xs text-muted-foreground">خلال الفترة المحددة</p>
              </CardContent>
            </Card>

            <Card data-testid="card-total-work-hours">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">إجمالي ساعات العمل</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-total-work-hours">
                  {Math.round(totalWorkHours)}
                </div>
                <p className="text-xs text-muted-foreground">ساعة عمل</p>
              </CardContent>
            </Card>

            <Card data-testid="card-completed-tasks-count">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">مهام مكتملة</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-completed-tasks-count">
                  {completedTasksCount}
                </div>
                <p className="text-xs text-muted-foreground">مهمة مكتملة</p>
              </CardContent>
            </Card>

            <Card data-testid="card-active-employees-count">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">موظفين نشطين</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-active-employees">
                  {activeEmployees}
                </div>
                <p className="text-xs text-muted-foreground">من أصل {totalEmployees} موظف</p>
              </CardContent>
            </Card>
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Productivity Trend Chart */}
            <Card data-testid="card-productivity-chart">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  الإنتاجية
                </CardTitle>
                <CardDescription>
                  إحصائيات الإنتاجية خلال الفترة المحددة
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-6xl font-bold text-primary mb-2">
                      {avgProductivity}%
                    </div>
                    <p className="text-muted-foreground">متوسط الإنتاجية</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* AUX Time Distribution */}
            <Card data-testid="card-aux-distribution">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="w-5 h-5" />
                  توزيع وقت AUX
                </CardTitle>
                <CardDescription>
                  كيفية قضاء الوقت خلال ساعات العمل
                </CardDescription>
              </CardHeader>
              <CardContent>
                {auxDistribution.length > 0 ? (
                  <div className="space-y-4">
                    {auxDistribution.map((item) => (
                      <div key={item.status} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: getStatusColor(item.status) }}
                          ></div>
                          <span className="text-sm font-medium">{getStatusLabel(item.status)}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-sm text-muted-foreground">
                            {item.hours} ساعة
                          </span>
                          <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${item.percentage}%`,
                                backgroundColor: getStatusColor(item.status)
                              }}
                            ></div>
                          </div>
                          <span className="text-sm font-semibold w-12 text-left">
                            {item.percentage}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                    لا توجد بيانات متاحة
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Department Performance (Admin only) */}
          {(user?.role === 'admin' || user?.role === 'sub-admin') && departmentStats && (
            <Card className="mb-8" data-testid="card-department-performance">
              <CardHeader>
                <CardTitle>أداء الأقسام</CardTitle>
                <CardDescription>
                  مقارنة الأداء والإنتاجية بين الأقسام المختلفة
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {departmentStats.map((dept: any) => (
                    <div key={dept.department} className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold text-foreground">{dept.department}</h4>
                          <p className="text-sm text-muted-foreground">
                            {dept.employeeCount} موظفين • {dept.completedTasks} مهمة مكتملة
                          </p>
                        </div>
                        <div className="text-left">
                          <div className="text-2xl font-bold text-foreground">
                            {dept.averageProductivity}%
                          </div>
                          <p className="text-xs text-muted-foreground">الإنتاجية</p>
                        </div>
                      </div>
                      <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-l from-primary to-accent rounded-full transition-all duration-500"
                          style={{ width: `${dept.averageProductivity}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Export Options */}
          <Card data-testid="card-export-options">
            <CardHeader>
              <CardTitle>تصدير التقارير</CardTitle>
              <CardDescription>
                احصل على تقارير مفصلة بصيغ مختلفة للمشاركة والأرشفة
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button
                  variant="outline"
                  className="flex items-center justify-center gap-2 h-20"
                  onClick={() => handleExportReport('pdf')}
                  data-testid="button-export-detailed-pdf"
                >
                  <FileText className="w-8 h-8 text-destructive" />
                  <div className="text-center">
                    <div className="font-semibold">PDF مفصل</div>
                    <div className="text-xs text-muted-foreground">تقرير شامل</div>
                  </div>
                </Button>

                <Button
                  variant="outline"
                  className="flex items-center justify-center gap-2 h-20"
                  onClick={() => handleExportReport('excel')}
                  data-testid="button-export-detailed-excel"
                >
                  <Download className="w-8 h-8 text-success" />
                  <div className="text-center">
                    <div className="font-semibold">Excel</div>
                    <div className="text-xs text-muted-foreground">بيانات قابلة للتحليل</div>
                  </div>
                </Button>

                <Button
                  variant="outline"
                  className="flex items-center justify-center gap-2 h-20"
                  onClick={() => handleExportReport('csv')}
                  data-testid="button-export-csv"
                >
                  <BarChart3 className="w-8 h-8 text-primary" />
                  <div className="text-center">
                    <div className="font-semibold">CSV</div>
                    <div className="text-xs text-muted-foreground">بيانات خام</div>
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
