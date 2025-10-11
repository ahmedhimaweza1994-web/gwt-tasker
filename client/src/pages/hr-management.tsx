import { useState } from "react";
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
  Building
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Redirect, Link } from "wouter";

export default function HRManagement() {
  const { user } = useAuth();
  const { toast } = useToast();

  // Check if user has admin/sub-admin role
  if (!user || (user.role !== 'admin' && user.role !== 'sub-admin')) {
    return <Redirect to="/" />;
  }

  const [isLeaveDialogOpen, setIsLeaveDialogOpen] = useState(false);
  const [isAddEmployeeDialogOpen, setIsAddEmployeeDialogOpen] = useState(false);
  const [isEditEmployeeDialogOpen, setIsEditEmployeeDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  
  const [newLeaveRequest, setNewLeaveRequest] = useState({
    userId: "",
    type: "annual",
    startDate: "",
    endDate: "",
    days: 0,
    reason: "",
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

  // Fetch pending leave requests
  const { data: pendingLeaveRequests = [] } = useQuery({
    queryKey: ["/api/leaves/pending"],
  });

  // Fetch all users for HR purposes
  const { data: allUsers = [] } = useQuery({
    queryKey: ["/api/users"],
  });

  // Fetch HR stats
  const { data: hrStats } = useQuery({
    queryKey: ["/api/hr/stats"],
  });

  // Fetch payroll data
  const { data: payrollData = [] } = useQuery({
    queryKey: ["/api/hr/payroll"],
  });

  // Fetch HR reports
  const { data: hrReports } = useQuery({
    queryKey: ["/api/hr/reports"],
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

  const handleApproveLeave = (id: string) => {
    updateLeaveMutation.mutate({ id, status: "approved" });
  };

  const handleRejectLeave = (id: string, reason: string) => {
    updateLeaveMutation.mutate({ id, status: "rejected", rejectionReason: reason });
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
      case "approved": return "success";
      case "rejected": return "destructive";
      case "pending": return "secondary";
      default: return "outline";
    }
  };

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
                      placeholder="email@example.com"
                      data-testid="input-employee-email"
                    />
                  </div>
                  <div>
                    <Label>كلمة المرور</Label>
                    <Input
                      type="password"
                      value={newEmployee.password}
                      onChange={(e) => setNewEmployee({...newEmployee, password: e.target.value})}
                      placeholder="Employee@123"
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
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="leave-requests">طلبات الإجازات</TabsTrigger>
              <TabsTrigger value="payroll">الرواتب</TabsTrigger>
              <TabsTrigger value="employees">الموظفين</TabsTrigger>
              <TabsTrigger value="reports">تقارير HR</TabsTrigger>
            </TabsList>

            {/* Leave Requests Tab */}
            <TabsContent value="leave-requests">
              <Card data-testid="card-leave-requests">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>طلبات الإجازات</CardTitle>
                      <CardDescription>
                        مراجعة والموافقة على طلبات الإجازات
                      </CardDescription>
                    </div>
                    <Dialog open={isLeaveDialogOpen} onOpenChange={setIsLeaveDialogOpen}>
                      <DialogTrigger asChild>
                        <Button data-testid="button-create-leave-request">
                          <Plus className="w-4 h-4 ml-2" />
                          طلب إجازة
                        </Button>
                      </DialogTrigger>
                      <DialogContent data-testid="dialog-create-leave-request">
                        <DialogHeader>
                          <DialogTitle>طلب إجازة جديد</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 mt-4">
                          <div>
                            <Label>الموظف</Label>
                            <Select value={newLeaveRequest.userId} onValueChange={(value) => setNewLeaveRequest({...newLeaveRequest, userId: value})}>
                              <SelectTrigger data-testid="select-leave-employee">
                                <SelectValue placeholder="اختر الموظف" />
                              </SelectTrigger>
                              <SelectContent>
                                {allUsers.map((emp: any) => (
                                  <SelectItem key={emp.id} value={emp.id}>{emp.fullName}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>نوع الإجازة</Label>
                            <Select value={newLeaveRequest.type} onValueChange={(value) => setNewLeaveRequest({...newLeaveRequest, type: value})}>
                              <SelectTrigger data-testid="select-leave-type">
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
                                data-testid="input-leave-start-date"
                              />
                            </div>
                            <div>
                              <Label>تاريخ النهاية</Label>
                              <Input
                                type="date"
                                value={newLeaveRequest.endDate}
                                onChange={(e) => setNewLeaveRequest({...newLeaveRequest, endDate: e.target.value})}
                                data-testid="input-leave-end-date"
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
                              data-testid="input-leave-days"
                            />
                          </div>
                          <div>
                            <Label>السبب</Label>
                            <Textarea
                              value={newLeaveRequest.reason}
                              onChange={(e) => setNewLeaveRequest({...newLeaveRequest, reason: e.target.value})}
                              placeholder="أدخل سبب الإجازة"
                              data-testid="input-leave-reason"
                            />
                          </div>
                        </div>
                        <div className="flex justify-end gap-2 mt-4">
                          <Button variant="outline" onClick={() => setIsLeaveDialogOpen(false)} data-testid="button-cancel-leave">
                            إلغاء
                          </Button>
                          <Button 
                            onClick={() => {
                              apiRequest("POST", "/api/leaves", newLeaveRequest).then(() => {
                                queryClient.invalidateQueries({ queryKey: ["/api/leaves/pending"] });
                                setIsLeaveDialogOpen(false);
                                setNewLeaveRequest({
                                  userId: "",
                                  type: "annual",
                                  startDate: "",
                                  endDate: "",
                                  days: 0,
                                  reason: "",
                                });
                                toast({
                                  title: "تم إنشاء الطلب",
                                  description: "تم إنشاء طلب الإجازة بنجاح",
                                });
                              });
                            }}
                            disabled={!newLeaveRequest.userId || !newLeaveRequest.startDate || !newLeaveRequest.endDate}
                            data-testid="button-submit-leave"
                          >
                            إنشاء الطلب
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {pendingLeaveRequests.map((request: any) => (
                      <div key={request.id} className="flex items-center justify-between p-4 rounded-lg border" data-testid={`leave-request-${request.id}`}>
                        <div className="flex items-center gap-4">
                          <Avatar>
                            <AvatarImage src={request.user.profilePicture} />
                            <AvatarFallback>
                              {request.user.fullName.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <h4 className="font-semibold text-foreground">{request.user.fullName}</h4>
                            <p className="text-sm text-muted-foreground">{request.user.department}</p>
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
