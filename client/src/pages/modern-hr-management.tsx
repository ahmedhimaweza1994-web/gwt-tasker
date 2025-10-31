import { useState } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import Background3D from "@/components/3d-background";
import ModernNavigation from "@/components/modern-navigation";
import ModernSidebar from "@/components/modern-sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery, useMutation } from "@tantml:react-query";
import {
  Users, Calendar, DollarSign, Clock, CheckCircle, XCircle, AlertCircle,
  Plus, FileText, UserPlus, Building, History, TrendingUp, Download,
  Edit, Trash2, Eye, Filter, Search, BarChart3, PieChart, User
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Redirect } from "wouter";
import { exportToExcel, exportToPDF } from "@/lib/export-utils";
import type { User as UserType, LeaveRequest, SalaryAdvanceRequest } from "@shared/schema";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

interface HRStats {
  totalEmployees: number;
  presentToday: number;
  onLeave: number;
  pendingRequests: number;
  attendanceRate?: number;
  avgWorkHoursPerDay?: number;
  usedLeaveDays?: number;
  departmentDistribution?: Array<{ dept: string; count: number; percentage: number }>;
}

export default function ModernHRManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedTab, setSelectedTab] = useState("overview");
  const [isAddEmployeeOpen, setIsAddEmployeeOpen] = useState(false);
  const [isEditEmployeeOpen, setIsEditEmployeeOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [isLeaveDialogOpen, setIsLeaveDialogOpen] = useState(false);
  const [isSalaryAdvanceDialogOpen, setIsSalaryAdvanceDialogOpen] = useState(false);
  const [employeeSearchQuery, setEmployeeSearchQuery] = useState("");

  const [newEmployee, setNewEmployee] = useState({
    email: "",
    password: "",
    fullName: "",
    department: "",
    role: "employee" as "admin" | "sub-admin" | "employee",
    salary: "",
    position: "",
    joinDate: "",
  });

  const [newLeaveRequest, setNewLeaveRequest] = useState({
    userId: user?.id || "",
    type: "annual",
    startDate: "",
    endDate: "",
    days: 0,
    reason: "",
  });

  const [newSalaryAdvance, setNewSalaryAdvance] = useState({
    amount: "",
    reason: "",
    repaymentDate: "",
  });

  if (!user) return <Redirect to="/" />;

  const isAdmin = user.role === 'admin' || user.role === 'sub-admin';

  // Fetch data
  const { data: stats } = useQuery<HRStats>({
    queryKey: ["/api/hr/stats"],
    initialData: {
      totalEmployees: 0,
      presentToday: 0,
      onLeave: 0,
      pendingRequests: 0,
      attendanceRate: 0,
      avgWorkHoursPerDay: 0,
      usedLeaveDays: 0,
    },
  });

  const { data: employees = [] } = useQuery<UserType[]>({
    queryKey: ["/api/users"],
  });

  const { data: leaveRequests = [] } = useQuery<LeaveRequest[]>({
    queryKey: isAdmin ? ["/api/hr/leave-requests"] : ["/api/hr/leave-requests/my"],
  });

  const { data: salaryAdvanceRequests = [] } = useQuery<SalaryAdvanceRequest[]>({
    queryKey: isAdmin ? ["/api/hr/salary-advances"] : ["/api/hr/salary-advances/my"],
  });

  // Mutations
  const addEmployeeMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/auth/register", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setIsAddEmployeeOpen(false);
      setNewEmployee({
        email: "",
        password: "",
        fullName: "",
        department: "",
        role: "employee",
        salary: "",
        position: "",
        joinDate: "",
      });
      toast({ title: "تم إضافة الموظف بنجاح" });
    },
  });

  const editEmployeeMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await apiRequest("PATCH", `/api/users/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setIsEditEmployeeOpen(false);
      toast({ title: "تم تحديث بيانات الموظف" });
    },
  });

  const deleteEmployeeMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/users/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "تم حذف الموظف" });
    },
  });

  const addLeaveRequestMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/hr/leave-requests", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hr/leave-requests"] });
      setIsLeaveDialogOpen(false);
      setNewLeaveRequest({
        userId: user?.id || "",
        type: "annual",
        startDate: "",
        endDate: "",
        days: 0,
        reason: "",
      });
      toast({ title: "تم إرسال طلب الإجازة" });
    },
  });

  const updateLeaveRequestMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await apiRequest("PATCH", `/api/hr/leave-requests/${id}`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hr/leave-requests"] });
      toast({ title: "تم تحديث حالة الطلب" });
    },
  });

  const addSalaryAdvanceMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/hr/salary-advances", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hr/salary-advances"] });
      setIsSalaryAdvanceDialogOpen(false);
      setNewSalaryAdvance({
        amount: "",
        reason: "",
        repaymentDate: "",
      });
      toast({ title: "تم إرسال طلب السلفة" });
    },
  });

  const updateSalaryAdvanceMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await apiRequest("PATCH", `/api/hr/salary-advances/${id}`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hr/salary-advances"] });
      toast({ title: "تم تحديث حالة الطلب" });
    },
  });

  const handleExportEmployees = () => {
    const exportData = employees.map(emp => ({
      "الاسم": emp.fullName,
      "البريد الإلكتروني": emp.email,
      "القسم": emp.department,
      "المنصب": emp.position || "-",
      "الراتب": emp.salary || "-",
      "تاريخ الانضمام": emp.joinDate ? format(new Date(emp.joinDate), "dd/MM/yyyy", { locale: ar }) : "-",
    }));
    exportToExcel(exportData, "employees");
  };

  const handleExportLeaveRequests = () => {
    const exportData = leaveRequests.map(req => ({
      "الموظف": req.userName,
      "النوع": req.type === "annual" ? "سنوية" : req.type === "sick" ? "مرضية" : "طارئة",
      "من تاريخ": format(new Date(req.startDate), "dd/MM/yyyy", { locale: ar }),
      "إلى تاريخ": format(new Date(req.endDate), "dd/MM/yyyy", { locale: ar }),
      "الأيام": req.days,
      "الحالة": req.status === "pending" ? "قيد المراجعة" : req.status === "approved" ? "موافق عليها" : "مرفوضة",
    }));
    exportToExcel(exportData, "leave-requests");
  };

  const filteredEmployees = employees.filter(emp =>
    emp.fullName.toLowerCase().includes(employeeSearchQuery.toLowerCase()) ||
    emp.email.toLowerCase().includes(employeeSearchQuery.toLowerCase()) ||
    emp.department?.toLowerCase().includes(employeeSearchQuery.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
      approved: "bg-green-500/10 text-green-400 border-green-500/20",
      rejected: "bg-red-500/10 text-red-400 border-red-500/20",
    };
    return styles[status as keyof typeof styles] || styles.pending;
  };

  const getStatusText = (status: string) => {
    const texts = {
      pending: "قيد المراجعة",
      approved: "موافق عليه",
      rejected: "مرفوض",
    };
    return texts[status as keyof typeof texts] || status;
  };

  return (
    <div className="min-h-screen pb-8">
      <Background3D />
      <ModernNavigation />
      <ModernSidebar />

      <div className="container mx-auto px-4 pt-24 space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-dark rounded-2xl p-6 border border-white/10 shadow-glow"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                <Users className="w-8 h-8" />
                إدارة الموارد البشرية
              </h1>
              <p className="text-gray-400 mt-1">إدارة الموظفين والطلبات والحضور</p>
            </div>
            {isAdmin && (
              <Button
                onClick={() => setIsAddEmployeeOpen(true)}
                className="bg-gradient-primary hover:bg-gradient-primary/90 shadow-glow"
              >
                <UserPlus className="w-5 h-5 ml-2" />
                إضافة موظف
              </Button>
            )}
          </div>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { title: "إجمالي الموظفين", value: stats.totalEmployees, icon: Users, gradient: "from-blue-500 to-cyan-500" },
            { title: "حاضر اليوم", value: stats.presentToday, icon: CheckCircle, gradient: "from-green-500 to-emerald-500" },
            { title: "في إجازة", value: stats.onLeave, icon: Calendar, gradient: "from-orange-500 to-red-500" },
            { title: "طلبات قيد المراجعة", value: stats.pendingRequests, icon: Clock, gradient: "from-purple-500 to-pink-500" },
          ].map((stat, index) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.05, y: -5 }}
              className="card-3d"
            >
              <Card className="glass-dark border-white/10 shadow-glow hover:shadow-glow-hover transition-all relative overflow-hidden group">
                <div className={cn("absolute inset-0 bg-gradient-to-br opacity-5 group-hover:opacity-10", stat.gradient)} />
                <CardContent className="p-6 relative">
                  <div className="flex items-center justify-between mb-4">
                    <div className={cn("p-3 rounded-xl bg-gradient-to-r shadow-lg", stat.gradient)}>
                      <stat.icon className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <h3 className="text-3xl font-bold text-white mb-1 text-gradient">{stat.value}</h3>
                  <p className="text-sm text-gray-400">{stat.title}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Main Content Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
            <TabsList className="glass-dark border border-white/10 p-1 h-auto flex-wrap">
              <TabsTrigger
                value="overview"
                className="data-[state=active]:bg-gradient-primary data-[state=active]:text-white"
              >
                <BarChart3 className="w-4 h-4 ml-2" />
                نظرة عامة
              </TabsTrigger>
              {isAdmin && (
                <TabsTrigger
                  value="employees"
                  className="data-[state=active]:bg-gradient-primary data-[state=active]:text-white"
                >
                  <Users className="w-4 h-4 ml-2" />
                  الموظفين
                </TabsTrigger>
              )}
              <TabsTrigger
                value="leave"
                className="data-[state=active]:bg-gradient-primary data-[state=active]:text-white"
              >
                <Calendar className="w-4 h-4 ml-2" />
                طلبات الإجازة
              </TabsTrigger>
              <TabsTrigger
                value="salary"
                className="data-[state=active]:bg-gradient-primary data-[state=active]:text-white"
              >
                <DollarSign className="w-4 h-4 ml-2" />
                السلف
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Attendance Chart */}
                <Card className="glass-dark border-white/10 shadow-glow">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <PieChart className="w-5 h-5" />
                      نسبة الحضور
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-center py-8">
                      <div className="relative w-48 h-48">
                        <svg className="w-full h-full -rotate-90">
                          <circle cx="96" cy="96" r="80" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="16" />
                          <motion.circle
                            cx="96"
                            cy="96"
                            r="80"
                            fill="none"
                            stroke="url(#attendanceGradient)"
                            strokeWidth="16"
                            strokeLinecap="round"
                            initial={{ strokeDasharray: "0 502" }}
                            animate={{ strokeDasharray: `${((stats.attendanceRate || 0) / 100) * 502} 502` }}
                            transition={{ duration: 1.5, ease: "easeOut" }}
                          />
                          <defs>
                            <linearGradient id="attendanceGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                              <stop offset="0%" stopColor="#10b981" />
                              <stop offset="100%" stopColor="#059669" />
                            </linearGradient>
                          </defs>
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center flex-col">
                          <span className="text-4xl font-bold text-gradient">
                            {Math.round(stats.attendanceRate || 0)}%
                          </span>
                          <span className="text-sm text-gray-400">حضور</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Department Distribution */}
                <Card className="glass-dark border-white/10 shadow-glow">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Building className="w-5 h-5" />
                      توزيع الأقسام
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-64">
                      <div className="space-y-4">
                        {stats.departmentDistribution?.map((dept, index) => (
                          <motion.div
                            key={dept.dept}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="space-y-2"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-white">{dept.dept}</span>
                              <span className="text-gray-400">{dept.count} ({dept.percentage}%)</span>
                            </div>
                            <div className="h-2 glass rounded-full overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${dept.percentage}%` }}
                                transition={{ duration: 1, delay: index * 0.1 }}
                                className="h-full bg-gradient-primary"
                              />
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { label: "متوسط ساعات العمل", value: `${stats.avgWorkHoursPerDay?.toFixed(1) || 0} ساعة`, icon: Clock },
                  { label: "أيام الإجازة المستخدمة", value: `${stats.usedLeaveDays || 0} يوم`, icon: Calendar },
                  { label: "معدل الأداء", value: "92%", icon: TrendingUp },
                ].map((item, index) => (
                  <motion.div
                    key={item.label}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.5 + index * 0.1 }}
                  >
                    <Card className="glass-dark border-white/10 shadow-glow">
                      <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                          <div className="p-3 rounded-xl bg-gradient-secondary">
                            <item.icon className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <p className="text-2xl font-bold text-white">{item.value}</p>
                            <p className="text-sm text-gray-400">{item.label}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </TabsContent>

            {/* Employees Tab */}
            {isAdmin && (
              <TabsContent value="employees" className="space-y-6">
                <Card className="glass-dark border-white/10 shadow-glow">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-white">قائمة الموظفين</CardTitle>
                      <div className="flex gap-2">
                        <div className="relative">
                          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <Input
                            value={employeeSearchQuery}
                            onChange={(e) => setEmployeeSearchQuery(e.target.value)}
                            placeholder="بحث..."
                            className="pr-10 glass border-white/10 text-white"
                          />
                        </div>
                        <Button
                          onClick={handleExportEmployees}
                          variant="outline"
                          className="glass border-white/10 hover:bg-white/10"
                        >
                          <Download className="w-4 h-4 ml-2" />
                          تصدير
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[600px]">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <AnimatePresence>
                          {filteredEmployees.map((emp, index) => (
                            <motion.div
                              key={emp.id}
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.9 }}
                              transition={{ delay: index * 0.05 }}
                              whileHover={{ scale: 1.02, y: -5 }}
                            >
                              <Card className="glass border-white/10 hover:shadow-glow-hover transition-all group">
                                <CardContent className="p-6">
                                  <div className="flex items-start justify-between mb-4">
                                    <Avatar className="w-16 h-16 border-2 border-white/10">
                                      <AvatarFallback className="bg-gradient-primary text-white text-xl">
                                        {emp.fullName[0]}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        onClick={() => {
                                          setSelectedEmployee(emp);
                                          setIsEditEmployeeOpen(true);
                                        }}
                                        className="h-8 w-8 glass hover:bg-white/10"
                                      >
                                        <Edit className="w-4 h-4" />
                                      </Button>
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        onClick={() => {
                                          if (confirm(`هل تريد حذف ${emp.fullName}؟`)) {
                                            deleteEmployeeMutation.mutate(emp.id);
                                          }
                                        }}
                                        className="h-8 w-8 glass hover:bg-white/10 hover:text-red-400"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    </div>
                                  </div>
                                  <h3 className="text-lg font-bold text-white mb-1">{emp.fullName}</h3>
                                  <p className="text-sm text-gray-400 mb-4">{emp.department}</p>
                                  <div className="space-y-2 text-sm">
                                    <div className="flex items-center gap-2">
                                      <Badge variant="outline" className="glass border-white/20">
                                        {emp.position || "موظف"}
                                      </Badge>
                                      <Badge variant="outline" className="glass border-white/20">
                                        {emp.role === "admin" ? "مدير" : emp.role === "sub-admin" ? "مدير فرعي" : "موظف"}
                                      </Badge>
                                    </div>
                                    {emp.salary && (
                                      <p className="text-gray-400">
                                        <DollarSign className="w-4 h-4 inline ml-1" />
                                        {emp.salary}
                                      </p>
                                    )}
                                  </div>
                                </CardContent>
                              </Card>
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            {/* Leave Requests Tab */}
            <TabsContent value="leave" className="space-y-6">
              <Card className="glass-dark border-white/10 shadow-glow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-white">طلبات الإجازة</CardTitle>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => setIsLeaveDialogOpen(true)}
                        className="bg-gradient-primary hover:bg-gradient-primary/90 shadow-glow"
                      >
                        <Plus className="w-4 h-4 ml-2" />
                        طلب إجازة
                      </Button>
                      {isAdmin && (
                        <Button
                          onClick={handleExportLeaveRequests}
                          variant="outline"
                          className="glass border-white/10 hover:bg-white/10"
                        >
                          <Download className="w-4 h-4 ml-2" />
                          تصدير
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[600px]">
                    <div className="space-y-4">
                      <AnimatePresence>
                        {leaveRequests.map((req, index) => (
                          <motion.div
                            key={req.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            transition={{ delay: index * 0.05 }}
                          >
                            <Card className="glass border-white/10 hover:shadow-glow-hover transition-all">
                              <CardContent className="p-6">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-3">
                                      <Avatar className="w-10 h-10">
                                        <AvatarFallback className="bg-gradient-secondary text-white">
                                          {req.userName?.[0] || 'U'}
                                        </AvatarFallback>
                                      </Avatar>
                                      <div>
                                        <h4 className="font-semibold text-white">{req.userName}</h4>
                                        <p className="text-sm text-gray-400">
                                          {req.type === "annual" ? "إجازة سنوية" :
                                           req.type === "sick" ? "إجازة مرضية" : "إجازة طارئة"}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                      <div>
                                        <p className="text-gray-400">من تاريخ:</p>
                                        <p className="text-white">
                                          {format(new Date(req.startDate), "dd/MM/yyyy", { locale: ar })}
                                        </p>
                                      </div>
                                      <div>
                                        <p className="text-gray-400">إلى تاريخ:</p>
                                        <p className="text-white">
                                          {format(new Date(req.endDate), "dd/MM/yyyy", { locale: ar })}
                                        </p>
                                      </div>
                                      <div>
                                        <p className="text-gray-400">عدد الأيام:</p>
                                        <p className="text-white">{req.days} يوم</p>
                                      </div>
                                      <div>
                                        <p className="text-gray-400">السبب:</p>
                                        <p className="text-white truncate">{req.reason}</p>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="mr-4 flex flex-col items-end gap-2">
                                    <Badge variant="outline" className={getStatusBadge(req.status)}>
                                      {getStatusText(req.status)}
                                    </Badge>
                                    {isAdmin && req.status === "pending" && (
                                      <div className="flex gap-1">
                                        <Button
                                          size="sm"
                                          onClick={() => updateLeaveRequestMutation.mutate({ id: req.id, status: "approved" })}
                                          className="bg-green-500 hover:bg-green-600"
                                        >
                                          <CheckCircle className="w-4 h-4" />
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="destructive"
                                          onClick={() => updateLeaveRequestMutation.mutate({ id: req.id, status: "rejected" })}
                                        >
                                          <XCircle className="w-4 h-4" />
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Salary Advance Tab */}
            <TabsContent value="salary" className="space-y-6">
              <Card className="glass-dark border-white/10 shadow-glow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-white">طلبات السلف</CardTitle>
                    <Button
                      onClick={() => setIsSalaryAdvanceDialogOpen(true)}
                      className="bg-gradient-primary hover:bg-gradient-primary/90 shadow-glow"
                    >
                      <Plus className="w-4 h-4 ml-2" />
                      طلب سلفة
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[600px]">
                    <div className="space-y-4">
                      <AnimatePresence>
                        {salaryAdvanceRequests.map((req, index) => (
                          <motion.div
                            key={req.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            transition={{ delay: index * 0.05 }}
                          >
                            <Card className="glass border-white/10 hover:shadow-glow-hover transition-all">
                              <CardContent className="p-6">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-3">
                                      <Avatar className="w-10 h-10">
                                        <AvatarFallback className="bg-gradient-secondary text-white">
                                          {req.userName?.[0] || 'U'}
                                        </AvatarFallback>
                                      </Avatar>
                                      <div>
                                        <h4 className="font-semibold text-white">{req.userName}</h4>
                                        <p className="text-sm text-gray-400">طلب سلفة</p>
                                      </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                      <div>
                                        <p className="text-gray-400">المبلغ:</p>
                                        <p className="text-white font-bold">{req.amount} ريال</p>
                                      </div>
                                      <div>
                                        <p className="text-gray-400">تاريخ السداد:</p>
                                        <p className="text-white">
                                          {format(new Date(req.repaymentDate), "dd/MM/yyyy", { locale: ar })}
                                        </p>
                                      </div>
                                      <div className="col-span-2">
                                        <p className="text-gray-400">السبب:</p>
                                        <p className="text-white">{req.reason}</p>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="mr-4 flex flex-col items-end gap-2">
                                    <Badge variant="outline" className={getStatusBadge(req.status)}>
                                      {getStatusText(req.status)}
                                    </Badge>
                                    {isAdmin && req.status === "pending" && (
                                      <div className="flex gap-1">
                                        <Button
                                          size="sm"
                                          onClick={() => updateSalaryAdvanceMutation.mutate({ id: req.id, status: "approved" })}
                                          className="bg-green-500 hover:bg-green-600"
                                        >
                                          <CheckCircle className="w-4 h-4" />
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="destructive"
                                          onClick={() => updateSalaryAdvanceMutation.mutate({ id: req.id, status: "rejected" })}
                                        >
                                          <XCircle className="w-4 h-4" />
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>

      {/* Add Employee Dialog */}
      <Dialog open={isAddEmployeeOpen} onOpenChange={setIsAddEmployeeOpen}>
        <DialogContent className="glass-dark border-white/10 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">إضافة موظف جديد</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-white">الاسم الكامل</Label>
              <Input
                value={newEmployee.fullName}
                onChange={(e) => setNewEmployee({ ...newEmployee, fullName: e.target.value })}
                className="glass border-white/10 text-white mt-2"
              />
            </div>
            <div>
              <Label className="text-white">البريد الإلكتروني</Label>
              <Input
                value={newEmployee.email}
                onChange={(e) => setNewEmployee({ ...newEmployee, email: e.target.value })}
                type="email"
                className="glass border-white/10 text-white mt-2"
              />
            </div>
            <div>
              <Label className="text-white">كلمة المرور</Label>
              <Input
                value={newEmployee.password}
                onChange={(e) => setNewEmployee({ ...newEmployee, password: e.target.value })}
                type="password"
                className="glass border-white/10 text-white mt-2"
              />
            </div>
            <div>
              <Label className="text-white">القسم</Label>
              <Input
                value={newEmployee.department}
                onChange={(e) => setNewEmployee({ ...newEmployee, department: e.target.value })}
                className="glass border-white/10 text-white mt-2"
              />
            </div>
            <div>
              <Label className="text-white">المنصب</Label>
              <Input
                value={newEmployee.position}
                onChange={(e) => setNewEmployee({ ...newEmployee, position: e.target.value })}
                className="glass border-white/10 text-white mt-2"
              />
            </div>
            <div>
              <Label className="text-white">الراتب</Label>
              <Input
                value={newEmployee.salary}
                onChange={(e) => setNewEmployee({ ...newEmployee, salary: e.target.value })}
                className="glass border-white/10 text-white mt-2"
              />
            </div>
            <div>
              <Label className="text-white">الصلاحية</Label>
              <Select
                value={newEmployee.role}
                onValueChange={(value: any) => setNewEmployee({ ...newEmployee, role: value })}
              >
                <SelectTrigger className="glass border-white/10 text-white mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="glass-dark border-white/10">
                  <SelectItem value="employee">موظف</SelectItem>
                  <SelectItem value="sub-admin">مدير فرعي</SelectItem>
                  <SelectItem value="admin">مدير</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-white">تاريخ الانضمام</Label>
              <Input
                value={newEmployee.joinDate}
                onChange={(e) => setNewEmployee({ ...newEmployee, joinDate: e.target.value })}
                type="date"
                className="glass border-white/10 text-white mt-2"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => addEmployeeMutation.mutate(newEmployee)}
              className="bg-gradient-primary hover:bg-gradient-primary/90"
            >
              إضافة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Employee Dialog */}
      <Dialog open={isEditEmployeeOpen} onOpenChange={setIsEditEmployeeOpen}>
        <DialogContent className="glass-dark border-white/10 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">تعديل بيانات الموظف</DialogTitle>
          </DialogHeader>
          {selectedEmployee && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-white">الاسم الكامل</Label>
                <Input
                  value={selectedEmployee.fullName}
                  onChange={(e) => setSelectedEmployee({ ...selectedEmployee, fullName: e.target.value })}
                  className="glass border-white/10 text-white mt-2"
                />
              </div>
              <div>
                <Label className="text-white">القسم</Label>
                <Input
                  value={selectedEmployee.department}
                  onChange={(e) => setSelectedEmployee({ ...selectedEmployee, department: e.target.value })}
                  className="glass border-white/10 text-white mt-2"
                />
              </div>
              <div>
                <Label className="text-white">المنصب</Label>
                <Input
                  value={selectedEmployee.position || ""}
                  onChange={(e) => setSelectedEmployee({ ...selectedEmployee, position: e.target.value })}
                  className="glass border-white/10 text-white mt-2"
                />
              </div>
              <div>
                <Label className="text-white">الراتب</Label>
                <Input
                  value={selectedEmployee.salary || ""}
                  onChange={(e) => setSelectedEmployee({ ...selectedEmployee, salary: e.target.value })}
                  className="glass border-white/10 text-white mt-2"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              onClick={() => {
                if (selectedEmployee) {
                  editEmployeeMutation.mutate({
                    id: selectedEmployee.id,
                    data: {
                      fullName: selectedEmployee.fullName,
                      department: selectedEmployee.department,
                      position: selectedEmployee.position,
                      salary: selectedEmployee.salary,
                    },
                  });
                }
              }}
              className="bg-gradient-primary hover:bg-gradient-primary/90"
            >
              حفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Leave Request Dialog */}
      <Dialog open={isLeaveDialogOpen} onOpenChange={setIsLeaveDialogOpen}>
        <DialogContent className="glass-dark border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">طلب إجازة جديد</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-white">نوع الإجازة</Label>
              <Select
                value={newLeaveRequest.type}
                onValueChange={(value) => setNewLeaveRequest({ ...newLeaveRequest, type: value })}
              >
                <SelectTrigger className="glass border-white/10 text-white mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="glass-dark border-white/10">
                  <SelectItem value="annual">سنوية</SelectItem>
                  <SelectItem value="sick">مرضية</SelectItem>
                  <SelectItem value="emergency">طارئة</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-white">من تاريخ</Label>
                <Input
                  type="date"
                  value={newLeaveRequest.startDate}
                  onChange={(e) => setNewLeaveRequest({ ...newLeaveRequest, startDate: e.target.value })}
                  className="glass border-white/10 text-white mt-2"
                />
              </div>
              <div>
                <Label className="text-white">إلى تاريخ</Label>
                <Input
                  type="date"
                  value={newLeaveRequest.endDate}
                  onChange={(e) => setNewLeaveRequest({ ...newLeaveRequest, endDate: e.target.value })}
                  className="glass border-white/10 text-white mt-2"
                />
              </div>
            </div>
            <div>
              <Label className="text-white">عدد الأيام</Label>
              <Input
                type="number"
                value={newLeaveRequest.days}
                onChange={(e) => setNewLeaveRequest({ ...newLeaveRequest, days: parseInt(e.target.value) || 0 })}
                className="glass border-white/10 text-white mt-2"
              />
            </div>
            <div>
              <Label className="text-white">السبب</Label>
              <Textarea
                value={newLeaveRequest.reason}
                onChange={(e) => setNewLeaveRequest({ ...newLeaveRequest, reason: e.target.value })}
                className="glass border-white/10 text-white mt-2"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => addLeaveRequestMutation.mutate(newLeaveRequest)}
              className="bg-gradient-primary hover:bg-gradient-primary/90"
            >
              إرسال الطلب
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Salary Advance Dialog */}
      <Dialog open={isSalaryAdvanceDialogOpen} onOpenChange={setIsSalaryAdvanceDialogOpen}>
        <DialogContent className="glass-dark border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">طلب سلفة جديد</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-white">المبلغ</Label>
              <Input
                type="number"
                value={newSalaryAdvance.amount}
                onChange={(e) => setNewSalaryAdvance({ ...newSalaryAdvance, amount: e.target.value })}
                className="glass border-white/10 text-white mt-2"
              />
            </div>
            <div>
              <Label className="text-white">تاريخ السداد</Label>
              <Input
                type="date"
                value={newSalaryAdvance.repaymentDate}
                onChange={(e) => setNewSalaryAdvance({ ...newSalaryAdvance, repaymentDate: e.target.value })}
                className="glass border-white/10 text-white mt-2"
              />
            </div>
            <div>
              <Label className="text-white">السبب</Label>
              <Textarea
                value={newSalaryAdvance.reason}
                onChange={(e) => setNewSalaryAdvance({ ...newSalaryAdvance, reason: e.target.value })}
                className="glass border-white/10 text-white mt-2"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => addSalaryAdvanceMutation.mutate({ ...newSalaryAdvance, userId: user?.id })}
              className="bg-gradient-primary hover:bg-gradient-primary/90"
            >
              إرسال الطلب
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
