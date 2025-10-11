import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import Navigation from "@/components/navigation";
import Sidebar from "@/components/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useQuery } from "@tanstack/react-query";
import { Users, Clock, CheckCircle, AlertTriangle, Search, Filter, Eye, Mail, Briefcase, Building, Play, Pause } from "lucide-react";
import { Redirect, useLocation } from "wouter";
import type { User, AuxSession } from "@db/schema";
interface SystemStats {
  totalUsers: number;
  activeUsers: number;
  totalTasks: number;
  completedTasks: number;
  pendingLeaveRequests: number;
}
interface ActiveEmployee extends AuxSession {
  user: User;
}
export default function AdminDashboard() {
  const { user } = useAuth();
 
  // Check if user has admin/sub-admin role
  if (!user || (user.role !== 'admin' && user.role !== 'sub-admin')) {
    return <Redirect to="/" />;
  }
  const [searchTerm, setSearchTerm] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedEmployee, setSelectedEmployee] = useState<ActiveEmployee | null>(null);
  const [, setLocation] = useLocation();
  // Fetch admin stats
  const { data: adminStats } = useQuery<SystemStats>({
    queryKey: ["/api/admin/stats"],
  });
  // Fetch active employees
  const { data: activeEmployees = [], refetch: refetchEmployees } = useQuery<ActiveEmployee[]>({
    queryKey: ["/api/admin/employees"],
    refetchInterval: 5000, // Refresh every 5 seconds
  });
  // WebSocket for real-time updates
  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const socket = new WebSocket(wsUrl);
    socket.onopen = () => {
      console.log("Admin WebSocket connected");
    };
    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'employee_status_update') {
        refetchEmployees();
      }
    };
    socket.onclose = () => {
      console.log("Admin WebSocket disconnected");
    };
    return () => {
      socket.close();
    };
  }, [refetchEmployees]);
  const getStatusInfo = (status: string) => {
    switch (status) {
      case "ready":
        return { label: "جاهز", color: "bg-green-500", variant: "default" as const };
      case "working_on_project":
        return { label: "عمل على مشروع", color: "bg-blue-500", variant: "default" as const };
      case "personal":
        return { label: "شخصي", color: "bg-yellow-500", variant: "secondary" as const };
      case "break":
        return { label: "استراحة", color: "bg-red-500", variant: "destructive" as const };
      default:
        return { label: "غير محدد", color: "bg-gray-500", variant: "outline" as const };
    }
  };
  const formatDuration = (startTime: string) => {
    const start = new Date(startTime);
    const now = new Date();
    const diff = now.getTime() - start.getTime();
   
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
   
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };
  // Filter employees based on search and filters
  const filteredEmployees = activeEmployees.filter((employee) => {
    const matchesSearch = employee.user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         employee.user.email.toLowerCase().includes(searchTerm.toLowerCase());
   
    const matchesDepartment = departmentFilter === "all" || employee.user.department === departmentFilter;
    const matchesStatus = statusFilter === "all" || employee.status === statusFilter;
   
    return matchesSearch && matchesDepartment && matchesStatus;
  });
  const departments = [...new Set(activeEmployees.map(emp => emp.user.department))];
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
     
      <div className="flex">
        <Sidebar />
       
        <main className="flex-1 p-6 mr-64">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                لوحة تحكم المدير
              </h1>
              <p className="text-muted-foreground">
                مراقبة وإدارة جميع الموظفين في الوقت الفعلي
              </p>
            </div>
            <Button data-testid="button-add-employee">
              <Users className="w-4 h-4 ml-2" />
              إضافة موظف
            </Button>
          </div>
          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card data-testid="card-total-employees">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">إجمالي الموظفين</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{adminStats?.totalUsers || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {adminStats?.activeUsers || 0} نشط
                </p>
              </CardContent>
            </Card>
            <Card data-testid="card-online-now">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">متصل الآن</CardTitle>
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{activeEmployees.length}</div>
                <p className="text-xs text-success">تحديث تلقائي</p>
              </CardContent>
            </Card>
            <Card data-testid="card-total-tasks">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">إجمالي المهام</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{adminStats?.totalTasks || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {adminStats?.completedTasks || 0} مكتمل
                </p>
              </CardContent>
            </Card>
            <Card data-testid="card-pending-requests">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">طلبات معلقة</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{adminStats?.pendingLeaveRequests || 0}</div>
                <p className="text-xs text-warning">إجازات</p>
              </CardContent>
            </Card>
          </div>
          {/* Filters */}
          <Card className="mb-6" data-testid="card-employee-filters">
            <CardContent className="p-4">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex-1 min-w-[200px]">
                  <div className="relative">
                    <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="البحث عن موظف..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pr-10"
                      data-testid="input-search-employees"
                    />
                  </div>
                </div>
               
                <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                  <SelectTrigger className="w-[150px]" data-testid="select-filter-department">
                    <SelectValue placeholder="القسم" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">كل الأقسام</SelectItem>
                    {departments.map((dept) => (
                      <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[150px]" data-testid="select-filter-status">
                    <SelectValue placeholder="الحالة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">كل الحالات</SelectItem>
                    <SelectItem value="ready">جاهز</SelectItem>
                    <SelectItem value="working_on_project">عمل على مشروع</SelectItem>
                    <SelectItem value="personal">شخصي</SelectItem>
                    <SelectItem value="break">استراحة</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" onClick={() => {
                  setSearchTerm("");
                  setDepartmentFilter("all");
                  setStatusFilter("all");
                }} data-testid="button-reset-filters">
                  <Filter className="w-4 h-4 ml-2" />
                  إعادة تعيين
                </Button>
              </div>
            </CardContent>
          </Card>
          {/* Employee Grid */}
          <Card data-testid="card-employee-grid">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>الموظفين النشطين</CardTitle>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  تحديث مباشر
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-right py-3 px-4 text-sm font-semibold text-foreground">الموظف</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-foreground">القسم</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-foreground">الحالة</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-foreground">المدة</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-foreground">الملاحظات</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-foreground">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEmployees.map((employee) => {
                      const statusInfo = getStatusInfo(employee.status);
                      return (
                        <tr key={employee.id} className="border-b hover:bg-muted/50 transition-colors" data-testid={`row-employee-${employee.user.id}`}>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <Avatar className="w-10 h-10">
                                <AvatarImage src={employee.user.profilePicture || undefined} />
                                <AvatarFallback>
                                  {employee.user.fullName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium text-foreground">{employee.user.fullName}</p>
                                <p className="text-sm text-muted-foreground">{employee.user.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <Badge variant="outline">{employee.user.department}</Badge>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${statusInfo.color} animate-pulse`}></div>
                              <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-mono text-sm">
                              {formatDuration(employee.startTime)}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <p className="text-sm text-muted-foreground max-w-xs truncate">
                              {employee.notes || "—"}
                            </p>
                          </td>
                          <td className="py-3 px-4">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setSelectedEmployee(employee)}
                              data-testid={`button-view-employee-${employee.user.id}`}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
               
                {filteredEmployees.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    {searchTerm || departmentFilter !== "all" || statusFilter !== "all"
                      ? "لا توجد نتائج تطابق البحث"
                      : "لا يوجد موظفين متصلين حالياً"
                    }
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
      {/* Employee Detail Dialog */}
      <Dialog open={!!selectedEmployee} onOpenChange={(open) => !open && setSelectedEmployee(null)}>
        <DialogContent className="sm:max-w-[600px]" data-testid="dialog-employee-detail">
          <DialogHeader>
            <DialogTitle>تفاصيل الموظف</DialogTitle>
            <DialogDescription>معلومات تفصيلية عن الموظف وحالته الحالية</DialogDescription>
          </DialogHeader>
         
          {selectedEmployee && (
            <div className="space-y-6">
              {/* Employee Header */}
              <div className="flex items-center gap-4">
                <Avatar className="w-20 h-20">
                  <AvatarImage src={selectedEmployee.user.profilePicture || undefined} />
                  <AvatarFallback className="text-xl">
                    {selectedEmployee.user.fullName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-foreground" data-testid="text-employee-name">
                    {selectedEmployee.user.fullName}
                  </h3>
                  <p className="text-sm text-muted-foreground">{selectedEmployee.user.jobTitle || "لا يوجد مسمى وظيفي"}</p>
                </div>
              </div>
              {/* Employee Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">البريد الإلكتروني</span>
                  </div>
                  <p className="text-sm font-medium" data-testid="text-employee-email">{selectedEmployee.user.email}</p>
                </div>
               
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm">
                    <Building className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">القسم</span>
                  </div>
                  <p className="text-sm font-medium" data-testid="text-employee-department">{selectedEmployee.user.department}</p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm">
                    <Briefcase className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">المسمى الوظيفي</span>
                  </div>
                  <p className="text-sm font-medium">{selectedEmployee.user.jobTitle || "—"}</p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">الدور</span>
                  </div>
                  <Badge variant="outline">{selectedEmployee.user.role}</Badge>
                </div>
              </div>
              {/* Current Status */}
              <div className="border-t pt-4">
                <h4 className="font-semibold mb-3">الحالة الحالية</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <span className="text-sm text-muted-foreground">الحالة</span>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${getStatusInfo(selectedEmployee.status).color} animate-pulse`}></div>
                      <Badge variant={getStatusInfo(selectedEmployee.status).variant} data-testid="badge-employee-status">
                        {getStatusInfo(selectedEmployee.status).label}
                      </Badge>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-sm text-muted-foreground">المدة</span>
                    <p className="font-mono text-sm font-medium" data-testid="text-employee-duration">
                      {formatDuration(selectedEmployee.startTime)}
                    </p>
                  </div>
                </div>
                {selectedEmployee.notes && (
                  <div className="mt-3">
                    <span className="text-sm text-muted-foreground">الملاحظات</span>
                    <p className="text-sm mt-1 p-3 bg-muted rounded-md" data-testid="text-employee-notes">
                      {selectedEmployee.notes}
                    </p>
                  </div>
                )}
              </div>
              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setSelectedEmployee(null);
                    setLocation(`/user-profile/${selectedEmployee.user.id}`);
                  }}
                  data-testid="button-view-full-profile"
                >
                  عرض الملف الكامل
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setSelectedEmployee(null)}
                  data-testid="button-close-detail"
                >
                  إغلاق
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}