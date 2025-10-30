import { useState } from "react";
import { useSidebar } from "@/contexts/sidebar-context";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import Navigation from "@/components/navigation";
import Sidebar from "@/components/sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  Users, 
  Calendar, 
  DollarSign, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Plus,
  FileText,
  UserPlus,
  Building,
  History
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Redirect, Link } from "wouter";
import { exportToExcel, exportToPDF } from "@/lib/export-utils";
import type { User, LeaveRequest, SalaryAdvanceRequest } from "@shared/schema";

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

interface PayrollEntry {
  userId: string;
  fullName: string;
  department: string;
  salary: string;
  bonuses?: number;
  deductions?: number;
  netSalary?: number;
}

interface HRReports {
  attendanceRate: number;
  avgWorkHoursPerDay: number;
  usedLeaveDays: number;
  departmentDistribution: Array<{ dept: string; count: number; percentage: number }>;
}

export default function HRManagement() {
  const { user } = useAuth();
  const { isCollapsed } = useSidebar();
  const { toast } = useToast();

  if (!user) {
    return <Redirect to="/" />;
  }

  const isAdmin = user.role === 'admin' || user.role === 'sub-admin';
  
  const [isLeaveDialogOpen, setIsLeaveDialogOpen] = useState(false);
  const [isSalaryAdvanceDialogOpen, setIsSalaryAdvanceDialogOpen] = useState(false);
  const [isAddEmployeeDialogOpen, setIsAddEmployeeDialogOpen] = useState(false);
  const [isEditEmployeeDialogOpen, setIsEditEmployeeDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  
  const [newLeaveRequest, setNewLeaveRequest] = useState({
    userId: user.id,
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

  const [newEmployee, setNewEmployee] = useState({
    email: "",
    password: "",
    fullName: "",
    department: "",
    jobTitle: "",
    role: "employee",
    phoneNumber: "",
    address: "",
    salary: 0,
  });

  // Fetch pending leave requests (admin only)
  const { data: pendingLeaveRequests = [] } = useQuery<LeaveRequest[]>({
    queryKey: ["/api/leaves/pending"],
    enabled: isAdmin,
  });

  // Fetch pending salary advance requests (admin only)
  const { data: pendingSalaryAdvances = [] } = useQuery<SalaryAdvanceRequest[]>({
    queryKey: ["/api/salary-advances/pending"],
    enabled: isAdmin,
  });

  // Fetch user's own leave requests (employee)
  const { data: userLeaveRequests = [] } = useQuery<LeaveRequest[]>({
    queryKey: ["/api/leaves"],
    enabled: !isAdmin,
  });

  // Fetch user's own salary advance requests (employee)
  const { data: userSalaryAdvances = [] } = useQuery<SalaryAdvanceRequest[]>({
    queryKey: ["/api/salary-advances/user"],
    enabled: !isAdmin,
  });

  // Fetch all users for HR purposes (admin only)
  const { data: allUsers = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
    enabled: isAdmin,
  });

  // Fetch HR stats (admin only)
  const { data: hrStats } = useQuery<HRStats>({
    queryKey: ["/api/hr/stats"],
    enabled: isAdmin,
  });

  // Fetch payroll data (admin only)
  const { data: payrollData = [] } = useQuery<PayrollEntry[]>({
    queryKey: ["/api/hr/payroll"],
    enabled: isAdmin,
  });

  // Fetch HR reports (admin only)
  const { data: hrReports } = useQuery<HRReports>({
    queryKey: ["/api/hr/reports"],
    enabled: isAdmin,
  });

  // Employee leave request mutation
  const createLeaveRequestMutation = useMutation({
    mutationFn: async (data: typeof newLeaveRequest) => {
      const res = await apiRequest("POST", "/api/leaves", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leaves"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leaves/pending"] });
      setIsLeaveDialogOpen(false);
      setNewLeaveRequest({
        userId: user.id,
        type: "annual",
        startDate: "",
        endDate: "",
        days: 0,
        reason: "",
      });
      toast({
        title: "تم إرسال الطلب",
        description: "تم إرسال طلب الإجازة بنجاح وسيتم مراجعته قريباً",
      });
    },
  });

  // Employee salary advance request mutation
  const createSalaryAdvanceMutation = useMutation({
    mutationFn: async (data: typeof newSalaryAdvance) => {
      const res = await apiRequest("POST", "/api/salary-advances", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/salary-advances/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/salary-advances/pending"] });
      setIsSalaryAdvanceDialogOpen(false);
      setNewSalaryAdvance({
        amount: "",
        reason: "",
        repaymentDate: "",
      });
      toast({
        title: "تم إرسال الطلب",
        description: "تم إرسال طلب السلفة بنجاح وسيتم مراجعته قريباً",
      });
    },
  });

  // Approve/Reject leave mutation
  const updateLeaveMutation = useMutation({
    mutationFn: async (data: { id: string; status: string; rejectionReason?: string }) => {
      const res = await apiRequest("PUT", `/api/leaves/${data.id}`, {
        status: data.status,
        rejectionReason: data.rejectionReason,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leaves/pending"] });
      toast({
        title: "تم تحديث طلب الإجازة",
        description: "تم تحديث حالة طلب الإجازة بنجاح",
      });
    },
  });

  // Approve/Reject salary advance mutation
  const updateSalaryAdvanceMutation = useMutation({
    mutationFn: async (data: { id: string; status: string; rejectionReason?: string }) => {
      const res = await apiRequest("PUT", `/api/salary-advances/${data.id}`, {
        status: data.status,
        rejectionReason: data.rejectionReason,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/salary-advances/pending"] });
      toast({
        title: "تم تحديث طلب السلفة",
        description: "تم تحديث حالة طلب السلفة بنجاح",
      });
    },
  });

  // Add employee mutation
  const addEmployeeMutation = useMutation({
    mutationFn: async (data: typeof newEmployee) => {
      const res = await apiRequest("POST", "/api/admin/employees", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/hr/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/hr/payroll"] });
      setIsAddEmployeeDialogOpen(false);
      setNewEmployee({
        email: "",
        password: "",
        fullName: "",
        department: "",
        jobTitle: "",
        role: "employee",
        phoneNumber: "",
        address: "",
        salary: 0,
      });
      toast({
        title: "تم إضافة الموظف",
        description: "تم إضافة الموظف الجديد بنجاح",
      });
    },
  });

  // Update employee mutation
  const updateEmployeeMutation = useMutation({
    mutationFn: async (data: { id: string; updates: any }) => {
      const res = await apiRequest("PUT", `/api/admin/employees/${data.id}`, data.updates);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/hr/payroll"] });
      setIsEditEmployeeDialogOpen(false);
      setSelectedEmployee(null);
      toast({
        title: "تم تحديث البيانات",
        description: "تم تحديث بيانات الموظف بنجاح",
      });
    },
  });

  // Delete employee mutation
  const deleteEmployeeMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/admin/employees/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/hr/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/hr/payroll"] });
      toast({
        title: "تم حذف الموظف",
        description: "تم حذف الموظف من النظام",
      });
    },
    onError: (error: any) => {
      toast({
        title: "خطأ",
        description: error.message || "فشل حذف الموظف",
        variant: "destructive",
      });
    },
  });

  const handleApproveLeave = (id: string) => {
    updateLeaveMutation.mutate({ id, status: "approved" });
  };

  const handleRejectLeave = (id: string, reason: string) => {
    updateLeaveMutation.mutate({ id, status: "rejected", rejectionReason: reason });
  };

  const handleApproveSalaryAdvance = (id: string) => {
    updateSalaryAdvanceMutation.mutate({ id, status: "approved" });
  };

  const handleRejectSalaryAdvance = (id: string, reason: string) => {
    updateSalaryAdvanceMutation.mutate({ id, status: "rejected", rejectionReason: reason });
  };

  const handleExportExcel = () => {
    if (!hrReports || !hrStats) {
      toast({
        title: "لا توجد بيانات",
        description: "لا توجد بيانات للتصدير",
        variant: "destructive",
      });
      return;
    }

    const exportData = {
      stats: {
        avgProductivity: hrReports.attendanceRate,
        totalWorkHours: hrReports.avgWorkHoursPerDay * 30,
        completedTasksCount: 0,
        activeEmployees: hrStats.presentToday,
        totalEmployees: hrStats.totalEmployees,
      },
      departmentStats: hrReports.departmentDistribution?.map(dept => ({
        department: dept.dept,
        employeeCount: dept.count,
        completedTasks: 0,
        averageProductivity: dept.percentage,
      })),
    };

    exportToExcel(exportData, "hr-report");
    toast({
      title: "تم التصدير",
      description: "تم تصدير التقرير إلى Excel بنجاح",
    });
  };

  const handleExportPDF = () => {
    if (!hrReports || !hrStats) {
      toast({
        title: "لا توجد بيانات",
        description: "لا توجد بيانات للتصدير",
        variant: "destructive",
      });
      return;
    }

    const exportData = {
      stats: {
        avgProductivity: hrReports.attendanceRate,
        totalWorkHours: hrReports.avgWorkHoursPerDay * 30,
        completedTasksCount: 0,
        activeEmployees: hrStats.presentToday,
        totalEmployees: hrStats.totalEmployees,
      },
      departmentStats: hrReports.departmentDistribution?.map(dept => ({
        department: dept.dept,
        employeeCount: dept.count,
        completedTasks: 0,
        averageProductivity: dept.percentage,
      })),
    };

    exportToPDF(exportData, "hr-report", "تقرير الموارد البشرية");
    toast({
      title: "تم التصدير",
      description: "تم تصدير التقرير إلى PDF بنجاح",
    });
  };

  const getLeaveTypeLabel = (type: string) => {
    switch (type) {
      case "annual": return "سنوية";
      case "sick": return "مرضية";
      case "maternity": return "أمومة";
      case "emergency": return "طارئة";
      default: return type;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved": return "default";
      case "rejected": return "destructive";
      case "pending": return "secondary";
      default: return "outline";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "approved": return "موافق عليه";
      case "rejected": return "مرفوض";
      case "pending": return "قيد المراجعة";
      default: return status;
    }
  };

  // Employee View
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        
        <div className="flex">
          <Sidebar />
          
          <main className={cn("flex-1 p-6 transition-all duration-300", isCollapsed ? "mr-16" : "mr-64")}>
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-foreground mb-2">
                طلباتي
              </h1>
              <p className="text-muted-foreground">
                إدارة طلبات الإجازات والسلف
              </p>
            </div>

            <Tabs defaultValue="request-leave" className="space-y-6">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="request-leave" data-testid="tab-request-leave">طلب إجازة</TabsTrigger>
                <TabsTrigger value="request-advance" data-testid="tab-request-advance">طلب سلفة</TabsTrigger>
                <TabsTrigger value="leave-history" data-testid="tab-leave-history">سجل الإجازات</TabsTrigger>
                <TabsTrigger value="advance-history" data-testid="tab-advance-history">سجل السلف</TabsTrigger>
              </TabsList>

              {/* Request Leave Tab */}
              <TabsContent value="request-leave">
                <Card data-testid="card-request-leave">
                  <CardHeader>
                    <CardTitle>طلب إجازة جديد</CardTitle>
                    <CardDescription>
                      قم بتعبئة النموذج أدناه لطلب إجازة
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4 max-w-2xl">
                      <div>
                        <Label>نوع الإجازة</Label>
                        <Select value={newLeaveRequest.type} onValueChange={(value) => setNewLeaveRequest({...newLeaveRequest, type: value})}>
                          <SelectTrigger data-testid="select-leave-type-employee">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="annual">سنوية</SelectItem>
                            <SelectItem value="sick">مرضية</SelectItem>
                            <SelectItem value="maternity">أمومة</SelectItem>
                            <SelectItem value="emergency">طارئة</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>تاريخ البداية</Label>
                          <Input
                            type="date"
                            value={newLeaveRequest.startDate}
                            onChange={(e) => setNewLeaveRequest({...newLeaveRequest, startDate: e.target.value})}
                            data-testid="input-leave-start-date-employee"
                          />
                        </div>
                        <div>
                          <Label>تاريخ النهاية</Label>
                          <Input
                            type="date"
                            value={newLeaveRequest.endDate}
                            onChange={(e) => setNewLeaveRequest({...newLeaveRequest, endDate: e.target.value})}
                            data-testid="input-leave-end-date-employee"
                          />
                        </div>
                      </div>
                      <div>
                        <Label>عدد الأيام</Label>
                        <Input
                          type="number"
                          value={newLeaveRequest.days}
                          onChange={(e) => setNewLeaveRequest({...newLeaveRequest, days: Number(e.target.value)})}
                          placeholder="0"
                          data-testid="input-leave-days-employee"
                        />
                      </div>
                      <div>
                        <Label>السبب</Label>
                        <Textarea
                          value={newLeaveRequest.reason}
                          onChange={(e) => setNewLeaveRequest({...newLeaveRequest, reason: e.target.value})}
                          placeholder="أدخل سبب الإجازة"
                          data-testid="input-leave-reason-employee"
                        />
                      </div>
                      <Button 
                        onClick={() => createLeaveRequestMutation.mutate(newLeaveRequest)}
                        disabled={createLeaveRequestMutation.isPending || !newLeaveRequest.startDate || !newLeaveRequest.endDate || newLeaveRequest.days <= 0}
                        className="w-full"
                        data-testid="button-submit-leave-employee"
                      >
                        {createLeaveRequestMutation.isPending ? "جاري الإرسال..." : "إرسال الطلب"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Request Salary Advance Tab */}
              <TabsContent value="request-advance">
                <Card data-testid="card-request-advance">
                  <CardHeader>
                    <CardTitle>طلب سلفة جديد</CardTitle>
                    <CardDescription>
                      قم بتعبئة النموذج أدناه لطلب سلفة من الراتب
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4 max-w-2xl">
                      <div>
                        <Label>المبلغ (ر.س)</Label>
                        <Input
                          type="number"
                          value={newSalaryAdvance.amount}
                          onChange={(e) => setNewSalaryAdvance({...newSalaryAdvance, amount: e.target.value})}
                          placeholder="0"
                          data-testid="input-advance-amount"
                        />
                      </div>
                      <div>
                        <Label>تاريخ السداد المتوقع</Label>
                        <Input
                          type="date"
                          value={newSalaryAdvance.repaymentDate}
                          onChange={(e) => setNewSalaryAdvance({...newSalaryAdvance, repaymentDate: e.target.value})}
                          data-testid="input-advance-repayment-date"
                        />
                      </div>
                      <div>
                        <Label>السبب</Label>
                        <Textarea
                          value={newSalaryAdvance.reason}
                          onChange={(e) => setNewSalaryAdvance({...newSalaryAdvance, reason: e.target.value})}
                          placeholder="أدخل سبب طلب السلفة"
                          data-testid="input-advance-reason"
                        />
                      </div>
                      <Button 
                        onClick={() => createSalaryAdvanceMutation.mutate(newSalaryAdvance)}
                        disabled={createSalaryAdvanceMutation.isPending || !newSalaryAdvance.amount || !newSalaryAdvance.reason}
                        className="w-full"
                        data-testid="button-submit-advance"
                      >
                        {createSalaryAdvanceMutation.isPending ? "جاري الإرسال..." : "إرسال الطلب"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Leave History Tab */}
              <TabsContent value="leave-history">
                <Card data-testid="card-leave-history">
                  <CardHeader>
                    <CardTitle>سجل طلبات الإجازات</CardTitle>
                    <CardDescription>
                      عرض جميع طلبات الإجازات السابقة والحالية
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {userLeaveRequests.map((request: any) => (
                        <div key={request.id} className="p-4 rounded-lg border" data-testid={`user-leave-${request.id}`}>
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge variant="outline">{getLeaveTypeLabel(request.type)}</Badge>
                                <Badge variant={getStatusColor(request.status) as any}>{getStatusLabel(request.status)}</Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {new Date(request.startDate).toLocaleDateString('ar-EG')} - {new Date(request.endDate).toLocaleDateString('ar-EG')} ({request.days} أيام)
                              </p>
                              {request.reason && (
                                <p className="text-sm mt-2">{request.reason}</p>
                              )}
                              {request.rejectionReason && (
                                <p className="text-sm text-destructive mt-2">سبب الرفض: {request.rejectionReason}</p>
                              )}
                            </div>
                            <Calendar className="w-8 h-8 text-muted-foreground" />
                          </div>
                        </div>
                      ))}
                      
                      {userLeaveRequests.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground">
                          لا توجد طلبات إجازات
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Salary Advance History Tab */}
              <TabsContent value="advance-history">
                <Card data-testid="card-advance-history">
                  <CardHeader>
                    <CardTitle>سجل طلبات السلف</CardTitle>
                    <CardDescription>
                      عرض جميع طلبات السلف السابقة والحالية
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {userSalaryAdvances.map((request: any) => (
                        <div key={request.id} className="p-4 rounded-lg border" data-testid={`user-advance-${request.id}`}>
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-lg font-bold">{Number(request.amount).toLocaleString()} ر.س</span>
                                <Badge variant={getStatusColor(request.status) as any}>{getStatusLabel(request.status)}</Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                تاريخ الطلب: {new Date(request.createdAt).toLocaleDateString('ar-EG')}
                              </p>
                              {request.repaymentDate && (
                                <p className="text-sm text-muted-foreground">
                                  تاريخ السداد: {new Date(request.repaymentDate).toLocaleDateString('ar-EG')}
                                </p>
                              )}
                              {request.reason && (
                                <p className="text-sm mt-2">{request.reason}</p>
                              )}
                              {request.rejectionReason && (
                                <p className="text-sm text-destructive mt-2">سبب الرفض: {request.rejectionReason}</p>
                              )}
                            </div>
                            <DollarSign className="w-8 h-8 text-muted-foreground" />
                          </div>
                        </div>
                      ))}
                      
                      {userSalaryAdvances.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground">
                          لا توجد طلبات سلف
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </main>
        </div>
      </div>
    );
  }

  // Admin View
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
                إدارة الموارد البشرية
              </h1>
              <p className="text-muted-foreground">
                نظام شامل لإدارة الموظفين، الإجازات، والرواتب
              </p>
            </div>
            
            <Dialog open={isAddEmployeeDialogOpen} onOpenChange={setIsAddEmployeeDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-employee">
                  <UserPlus className="w-4 h-4 ml-2" />
                  إضافة موظف
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl" data-testid="dialog-add-employee">
                <DialogHeader>
                  <DialogTitle>إضافة موظف جديد</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <Label>الاسم الكامل</Label>
                    <Input
                      value={newEmployee.fullName}
                      onChange={(e) => setNewEmployee({...newEmployee, fullName: e.target.value})}
                      placeholder="أدخل الاسم الكامل"
                      data-testid="input-employee-fullname"
                    />
                  </div>
                  <div>
                    <Label>البريد الإلكتروني</Label>
                    <Input
                      type="email"
                      value={newEmployee.email}
                      onChange={(e) => setNewEmployee({...newEmployee, email: e.target.value})}
                      placeholder="البريد الإلكتروني"
                      data-testid="input-employee-email"
                    />
                  </div>
                  <div>
                    <Label>كلمة المرور</Label>
                    <Input
                      type="password"
                      value={newEmployee.password}
                      onChange={(e) => setNewEmployee({...newEmployee, password: e.target.value})}
                      placeholder="كلمة المرور"
                      data-testid="input-employee-password"
                    />
                  </div>
                  <div>
                    <Label>القسم</Label>
                    <Input
                      value={newEmployee.department}
                      onChange={(e) => setNewEmployee({...newEmployee, department: e.target.value})}
                      placeholder="التطوير، التسويق، إلخ"
                      data-testid="input-employee-department"
                    />
                  </div>
                  <div>
                    <Label>المسمى الوظيفي</Label>
                    <Input
                      value={newEmployee.jobTitle}
                      onChange={(e) => setNewEmployee({...newEmployee, jobTitle: e.target.value})}
                      placeholder="مطور، مدير، إلخ"
                      data-testid="input-employee-jobtitle"
                    />
                  </div>
                  <div>
                    <Label>الدور</Label>
                    <Select value={newEmployee.role} onValueChange={(value) => setNewEmployee({...newEmployee, role: value})}>
                      <SelectTrigger data-testid="select-employee-role">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="employee">موظف</SelectItem>
                        <SelectItem value="sub-admin">مدير فرعي</SelectItem>
                        <SelectItem value="admin">مدير</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>رقم الهاتف</Label>
                    <Input
                      value={newEmployee.phoneNumber}
                      onChange={(e) => setNewEmployee({...newEmployee, phoneNumber: e.target.value})}
                      placeholder="+966 XX XXX XXXX"
                      data-testid="input-employee-phone"
                    />
                  </div>
                  <div>
                    <Label>الراتب (ر.س)</Label>
                    <Input
                      type="number"
                      value={newEmployee.salary}
                      onChange={(e) => setNewEmployee({...newEmployee, salary: Number(e.target.value)})}
                      placeholder="0"
                      data-testid="input-employee-salary"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>العنوان</Label>
                    <Textarea
                      value={newEmployee.address}
                      onChange={(e) => setNewEmployee({...newEmployee, address: e.target.value})}
                      placeholder="أدخل العنوان"
                      data-testid="input-employee-address"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <Button variant="outline" onClick={() => setIsAddEmployeeDialogOpen(false)} data-testid="button-cancel-add-employee">
                    إلغاء
                  </Button>
                  <Button 
                    onClick={() => addEmployeeMutation.mutate(newEmployee)}
                    disabled={addEmployeeMutation.isPending || !newEmployee.email || !newEmployee.fullName}
                    data-testid="button-submit-add-employee"
                  >
                    {addEmployeeMutation.isPending ? "جاري الإضافة..." : "إضافة"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* HR Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card data-testid="card-total-employees-hr">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">إجمالي الموظفين</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-total-employees">{hrStats?.totalEmployees || 0}</div>
                <p className="text-xs text-muted-foreground">موظف نشط</p>
              </CardContent>
            </Card>

            <Card data-testid="card-present-today">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">حاضر اليوم</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-success" data-testid="text-present-today">{hrStats?.presentToday || 0}</div>
                <p className="text-xs text-muted-foreground">موظف حاضر</p>
              </CardContent>
            </Card>

            <Card data-testid="card-on-leave">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">في إجازة</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-warning" data-testid="text-on-leave">{hrStats?.onLeave || 0}</div>
                <p className="text-xs text-muted-foreground">موظفين</p>
              </CardContent>
            </Card>

            <Card data-testid="card-pending-requests-hr">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">طلبات معلقة</CardTitle>
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive" data-testid="text-pending-requests">{hrStats?.pendingRequests || 0}</div>
                <p className="text-xs text-muted-foreground">تحتاج مراجعة</p>
              </CardContent>
            </Card>
          </div>

          {/* HR Tabs */}
          <Tabs defaultValue="leave-requests" className="space-y-6">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="leave-requests">طلبات الإجازات</TabsTrigger>
              <TabsTrigger value="salary-advances">طلبات السلف</TabsTrigger>
              <TabsTrigger value="payroll">الرواتب</TabsTrigger>
              <TabsTrigger value="employees">الموظفين</TabsTrigger>
              <TabsTrigger value="reports">تقارير HR</TabsTrigger>
            </TabsList>

            {/* Leave Requests Tab */}
            <TabsContent value="leave-requests">
              <Card data-testid="card-leave-requests">
                <CardHeader>
                  <CardTitle>طلبات الإجازات المعلقة</CardTitle>
                  <CardDescription>
                    مراجعة والموافقة على طلبات الإجازات
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {pendingLeaveRequests.map((request: any) => (
                      <div key={request.id} className="flex items-center justify-between p-4 rounded-lg border" data-testid={`leave-request-${request.id}`}>
                        <div className="flex items-center gap-4">
                          <Avatar>
                            <AvatarImage src={request.user?.profilePicture} />
                            <AvatarFallback>
                              {request.user?.fullName?.split(' ').map((n: string) => n[0]).join('').slice(0, 2) || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <h4 className="font-semibold text-foreground">{request.user?.fullName}</h4>
                            <p className="text-sm text-muted-foreground">{request.user?.department}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline">{getLeaveTypeLabel(request.type)}</Badge>
                              <span className="text-xs text-muted-foreground">
                                {request.days} أيام • {new Date(request.startDate).toLocaleDateString('ar-EG')}
                              </span>
                            </div>
                            {request.reason && (
                              <p className="text-sm text-muted-foreground mt-1">{request.reason}</p>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleApproveLeave(request.id)}
                            disabled={updateLeaveMutation.isPending}
                            data-testid={`button-approve-leave-${request.id}`}
                          >
                            <CheckCircle className="w-4 h-4 ml-1" />
                            موافقة
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleRejectLeave(request.id, "تم الرفض من قبل الإدارة")}
                            disabled={updateLeaveMutation.isPending}
                            data-testid={`button-reject-leave-${request.id}`}
                          >
                            <XCircle className="w-4 h-4 ml-1" />
                            رفض
                          </Button>
                        </div>
                      </div>
                    ))}
                    
                    {pendingLeaveRequests.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        لا توجد طلبات إجازات معلقة
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Salary Advances Tab */}
            <TabsContent value="salary-advances">
              <Card data-testid="card-salary-advances">
                <CardHeader>
                  <CardTitle>طلبات السلف المعلقة</CardTitle>
                  <CardDescription>
                    مراجعة والموافقة على طلبات السلف
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {pendingSalaryAdvances.map((request: any) => (
                      <div key={request.id} className="flex items-center justify-between p-4 rounded-lg border" data-testid={`salary-advance-${request.id}`}>
                        <div className="flex items-center gap-4">
                          <Avatar>
                            <AvatarImage src={request.user?.profilePicture} />
                            <AvatarFallback>
                              {request.user?.fullName?.split(' ').map((n: string) => n[0]).join('').slice(0, 2) || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <h4 className="font-semibold text-foreground">{request.user?.fullName}</h4>
                            <p className="text-sm text-muted-foreground">{request.user?.department}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-lg font-bold">{Number(request.amount).toLocaleString()} ر.س</span>
                              {request.repaymentDate && (
                                <span className="text-xs text-muted-foreground">
                                  • السداد: {new Date(request.repaymentDate).toLocaleDateString('ar-EG')}
                                </span>
                              )}
                            </div>
                            {request.reason && (
                              <p className="text-sm text-muted-foreground mt-1">{request.reason}</p>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleApproveSalaryAdvance(request.id)}
                            disabled={updateSalaryAdvanceMutation.isPending}
                            data-testid={`button-approve-advance-${request.id}`}
                          >
                            <CheckCircle className="w-4 h-4 ml-1" />
                            موافقة
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleRejectSalaryAdvance(request.id, "تم الرفض من قبل الإدارة")}
                            disabled={updateSalaryAdvanceMutation.isPending}
                            data-testid={`button-reject-advance-${request.id}`}
                          >
                            <XCircle className="w-4 h-4 ml-1" />
                            رفض
                          </Button>
                        </div>
                      </div>
                    ))}
                    
                    {pendingSalaryAdvances.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        لا توجد طلبات سلف معلقة
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Payroll Tab */}
            <TabsContent value="payroll">
              <Card data-testid="card-payroll">
                <CardHeader>
                  <CardTitle>إدارة الرواتب</CardTitle>
                  <CardDescription>
                    حساب وإصدار كشوف الرواتب الشهرية
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-right py-3 px-4 text-sm font-semibold">الموظف</th>
                          <th className="text-right py-3 px-4 text-sm font-semibold">القسم</th>
                          <th className="text-right py-3 px-4 text-sm font-semibold">الراتب الأساسي</th>
                          <th className="text-right py-3 px-4 text-sm font-semibold">ساعات إضافية</th>
                          <th className="text-right py-3 px-4 text-sm font-semibold">الخصومات</th>
                          <th className="text-right py-3 px-4 text-sm font-semibold">صافي الراتب</th>
                          <th className="text-right py-3 px-4 text-sm font-semibold">الإجراءات</th>
                        </tr>
                      </thead>
                      <tbody>
                        {payrollData.length > 0 ? payrollData.map((payroll: any) => (
                          <tr key={payroll.id} className="border-b hover:bg-muted/50 transition-colors" data-testid={`payroll-row-${payroll.id}`}>
                            <td className="py-3 px-4">
                              <div className="font-medium" data-testid={`text-employee-${payroll.id}`}>{payroll.employee}</div>
                            </td>
                            <td className="py-3 px-4">
                              <Badge variant="outline" data-testid={`badge-department-${payroll.id}`}>{payroll.department}</Badge>
                            </td>
                            <td className="py-3 px-4">
                              <span className="font-medium" data-testid={`text-base-salary-${payroll.id}`}>{payroll.baseSalary.toLocaleString()} ر.س</span>
                            </td>
                            <td className="py-3 px-4">
                              <span className="text-success">+{payroll.overtime.toLocaleString()} ر.س</span>
                            </td>
                            <td className="py-3 px-4">
                              <span className="text-destructive">-{payroll.deductions.toLocaleString()} ر.س</span>
                            </td>
                            <td className="py-3 px-4">
                              <span className="font-bold text-lg" data-testid={`text-net-salary-${payroll.id}`}>{payroll.netSalary.toLocaleString()} ر.س</span>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex gap-2">
                                <Button size="sm" variant="outline" data-testid={`button-view-payroll-${payroll.id}`}>
                                  <FileText className="w-4 h-4" />
                                </Button>
                                <Button size="sm" data-testid={`button-generate-payslip-${payroll.id}`}>
                                  كشف الراتب
                                </Button>
                              </div>
                            </td>
                          </tr>
                        )) : (
                          <tr>
                            <td colSpan={7} className="py-8 text-center text-muted-foreground">
                              لا توجد بيانات رواتب متاحة
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Employees Tab */}
            <TabsContent value="employees">
              <Card data-testid="card-hr-employees">
                <CardHeader>
                  <CardTitle>إدارة الموظفين</CardTitle>
                  <CardDescription>
                    عرض وإدارة معلومات الموظفين وملفاتهم الشخصية
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {allUsers.map((employee: any) => (
                      <Card key={employee.id} className="hover:shadow-md transition-shadow" data-testid={`employee-card-${employee.id}`}>
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3 mb-3">
                            <Avatar>
                              <AvatarImage src={employee.profilePicture} />
                              <AvatarFallback>
                                {employee.fullName.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <h4 className="font-semibold text-foreground">{employee.fullName}</h4>
                              <p className="text-sm text-muted-foreground">{employee.jobTitle}</p>
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm">
                              <Building className="w-4 h-4 text-muted-foreground" />
                              <span>{employee.department}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <Badge variant={employee.isActive ? "default" : "secondary"}>
                                {employee.isActive ? "نشط" : "غير نشط"}
                              </Badge>
                            </div>
                          </div>
                          
                          <div className="flex gap-2 mt-4">
                            <Link href={`/user-profile/${employee.id}`} className="flex-1">
                              <Button
                                size="sm"
                                variant="outline"
                                className="w-full"
                                data-testid={`button-view-employee-${employee.id}`}
                              >
                                عرض الملف
                              </Button>
                            </Link>
                            <Button
                              size="sm"
                              className="flex-1"
                              onClick={() => {
                                setSelectedEmployee(employee);
                                setIsEditEmployeeDialogOpen(true);
                              }}
                              data-testid={`button-edit-employee-${employee.id}`}
                            >
                              تعديل
                            </Button>
                            {user?.role === 'admin' && employee.id !== user?.id && (
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => {
                                  if (confirm(`هل أنت متأكد من حذف الموظف "${employee.fullName}"؟`)) {
                                    deleteEmployeeMutation.mutate(employee.id);
                                  }
                                }}
                                data-testid={`button-delete-employee-${employee.id}`}
                              >
                                حذف
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* HR Reports Tab */}
            <TabsContent value="reports">
              <div className="flex justify-end gap-2 mb-4">
                <Button variant="outline" onClick={handleExportExcel}>
                  <FileText className="ml-2 h-4 w-4" />
                  تصدير Excel
                </Button>
                <Button variant="outline" onClick={handleExportPDF}>
                  <FileText className="ml-2 h-4 w-4" />
                  تصدير PDF
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card data-testid="card-attendance-summary">
                  <CardHeader>
                    <CardTitle>ملخص الحضور</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span>معدل الحضور الشهري</span>
                        <span className="font-bold text-success" data-testid="text-attendance-rate">{hrReports?.attendanceRate || 0}%</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>متوسط ساعات العمل اليومية</span>
                        <span className="font-bold" data-testid="text-avg-work-hours">{hrReports?.avgWorkHoursPerDay || 0} ساعة</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>أيام الإجازات المستخدمة</span>
                        <span className="font-bold" data-testid="text-used-leave-days">{hrReports?.usedLeaveDays || 0} يوم</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card data-testid="card-department-summary">
                  <CardHeader>
                    <CardTitle>توزيع الموظفين</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {hrReports?.departmentDistribution && hrReports.departmentDistribution.length > 0 ? hrReports.departmentDistribution.map((item: any) => (
                        <div key={item.dept} className="space-y-2" data-testid={`dept-dist-${item.dept}`}>
                          <div className="flex justify-between items-center">
                            <span>{item.dept}</span>
                            <span className="font-bold">{item.count} موظف</span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-2">
                            <div 
                              className="bg-primary h-2 rounded-full transition-all duration-500" 
                              style={{ width: `${item.percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      )) : (
                        <p className="text-center text-muted-foreground py-4">لا توجد بيانات توزيع متاحة</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </main>
      </div>

      {/* Edit Employee Dialog */}
      <Dialog open={isEditEmployeeDialogOpen} onOpenChange={setIsEditEmployeeDialogOpen}>
        <DialogContent className="max-w-2xl" data-testid="dialog-edit-employee">
          <DialogHeader>
            <DialogTitle>تعديل بيانات الموظف</DialogTitle>
          </DialogHeader>
          {selectedEmployee && (
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <Label>الاسم الكامل</Label>
                <Input
                  value={selectedEmployee.fullName || ""}
                  onChange={(e) => setSelectedEmployee({...selectedEmployee, fullName: e.target.value})}
                  data-testid="input-edit-fullname"
                />
              </div>
              <div>
                <Label>القسم</Label>
                <Input
                  value={selectedEmployee.department || ""}
                  onChange={(e) => setSelectedEmployee({...selectedEmployee, department: e.target.value})}
                  data-testid="input-edit-department"
                />
              </div>
              <div>
                <Label>المسمى الوظيفي</Label>
                <Input
                  value={selectedEmployee.jobTitle || ""}
                  onChange={(e) => setSelectedEmployee({...selectedEmployee, jobTitle: e.target.value})}
                  data-testid="input-edit-jobtitle"
                />
              </div>
              <div>
                <Label>رقم الهاتف</Label>
                <Input
                  value={selectedEmployee.phoneNumber || ""}
                  onChange={(e) => setSelectedEmployee({...selectedEmployee, phoneNumber: e.target.value})}
                  data-testid="input-edit-phone"
                />
              </div>
              <div>
                <Label>الراتب (ر.س)</Label>
                <Input
                  type="number"
                  value={selectedEmployee.salary || 0}
                  onChange={(e) => setSelectedEmployee({...selectedEmployee, salary: Number(e.target.value)})}
                  data-testid="input-edit-salary"
                />
              </div>
              <div>
                <Label>الحالة</Label>
                <Select 
                  value={selectedEmployee.isActive ? "active" : "inactive"} 
                  onValueChange={(value) => setSelectedEmployee({...selectedEmployee, isActive: value === "active"})}
                >
                  <SelectTrigger data-testid="select-edit-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">نشط</SelectItem>
                    <SelectItem value="inactive">غير نشط</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label>العنوان</Label>
                <Textarea
                  value={selectedEmployee.address || ""}
                  onChange={(e) => setSelectedEmployee({...selectedEmployee, address: e.target.value})}
                  data-testid="input-edit-address"
                />
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setIsEditEmployeeDialogOpen(false)} data-testid="button-cancel-edit">
              إلغاء
            </Button>
            <Button 
              onClick={() => {
                if (selectedEmployee) {
                  updateEmployeeMutation.mutate({
                    id: selectedEmployee.id,
                    updates: {
                      fullName: selectedEmployee.fullName,
                      department: selectedEmployee.department,
                      jobTitle: selectedEmployee.jobTitle,
                      phoneNumber: selectedEmployee.phoneNumber,
                      address: selectedEmployee.address,
                      salary: selectedEmployee.salary,
                      isActive: selectedEmployee.isActive,
                    }
                  });
                }
              }}
              disabled={updateEmployeeMutation.isPending}
              data-testid="button-submit-edit"
            >
              {updateEmployeeMutation.isPending ? "جاري الحفظ..." : "حفظ التعديلات"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
