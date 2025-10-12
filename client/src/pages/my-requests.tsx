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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  Calendar, 
  DollarSign, 
  Plus,
  CheckCircle, 
  XCircle, 
  Clock,
  CalendarDays
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { LeaveRequest, SalaryAdvanceRequest } from "@shared/schema";

export default function MyRequests() {
  const { user } = useAuth();
  const { isCollapsed } = useSidebar();
  const { toast } = useToast();
  
  const [isLeaveDialogOpen, setIsLeaveDialogOpen] = useState(false);
  const [isSalaryAdvanceDialogOpen, setIsSalaryAdvanceDialogOpen] = useState(false);
  
  const [leaveForm, setLeaveForm] = useState({
    type: 'annual',
    startDate: '',
    endDate: '',
    reason: '',
  });
  
  const [salaryAdvanceForm, setSalaryAdvanceForm] = useState({
    amount: '',
    reason: '',
    repaymentDate: '',
  });

  const { data: myLeaveRequests = [] } = useQuery<(LeaveRequest & { user?: any; approver?: any })[]>({
    queryKey: ["/api/leaves/my"],
  });

  const { data: mySalaryAdvanceRequests = [] } = useQuery<(SalaryAdvanceRequest & { user?: any; approver?: any })[]>({
    queryKey: ["/api/salary-advances/user"],
  });

  const createLeaveRequestMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/leaves", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leaves/my"] });
      setIsLeaveDialogOpen(false);
      setLeaveForm({
        type: 'annual',
        startDate: '',
        endDate: '',
        reason: '',
      });
      toast({
        title: "تم إرسال الطلب",
        description: "تم إرسال طلب الإجازة بنجاح",
      });
    },
    onError: () => {
      toast({
        title: "خطأ",
        description: "حدث خطأ في إرسال الطلب",
        variant: "destructive",
      });
    },
  });

  const createSalaryAdvanceMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/salary-advances", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/salary-advances/user"] });
      setIsSalaryAdvanceDialogOpen(false);
      setSalaryAdvanceForm({
        amount: '',
        reason: '',
        repaymentDate: '',
      });
      toast({
        title: "تم إرسال الطلب",
        description: "تم إرسال طلب السلفة بنجاح",
      });
    },
    onError: () => {
      toast({
        title: "خطأ",
        description: "حدث خطأ في إرسال الطلب",
        variant: "destructive",
      });
    },
  });

  const handleSubmitLeave = () => {
    if (!leaveForm.startDate || !leaveForm.endDate) {
      toast({
        title: "خطأ",
        description: "يرجى تحديد تاريخ البداية والنهاية",
        variant: "destructive",
      });
      return;
    }

    const startDate = new Date(leaveForm.startDate);
    const endDate = new Date(leaveForm.endDate);
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    createLeaveRequestMutation.mutate({
      type: leaveForm.type,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      days,
      reason: leaveForm.reason || '',
    });
  };

  const handleSubmitSalaryAdvance = () => {
    if (!salaryAdvanceForm.amount || !salaryAdvanceForm.reason) {
      toast({
        title: "خطأ",
        description: "يرجى ملء جميع الحقول المطلوبة",
        variant: "destructive",
      });
      return;
    }

    createSalaryAdvanceMutation.mutate(salaryAdvanceForm);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 ml-1" />موافق عليه</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 ml-1" />مرفوض</Badge>;
      default:
        return <Badge variant="secondary"><Clock className="w-3 h-3 ml-1" />قيد المراجعة</Badge>;
    }
  };

  const leaveTypeLabels: Record<string, string> = {
    annual: 'إجازة سنوية',
    sick: 'إجازة مرضية',
    maternity: 'إجازة أمومة',
    emergency: 'إجازة طارئة',
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 mr-64 p-8">
          <div className="max-w-7xl mx-auto">
            <div className="mb-8">
              <h1 className="text-3xl font-bold mb-2">طلباتي</h1>
              <p className="text-muted-foreground">
                يمكنك هنا تقديم طلبات الإجازات والسلف المالية ومتابعة حالتها
              </p>
            </div>

            <Tabs defaultValue="leave" className="w-full">
              <TabsList className="grid w-full max-w-md grid-cols-2">
                <TabsTrigger value="leave" data-testid="tab-leave-requests">
                  <Calendar className="w-4 h-4 ml-2" />
                  طلبات الإجازات
                </TabsTrigger>
                <TabsTrigger value="salary" data-testid="tab-salary-advance">
                  <DollarSign className="w-4 h-4 ml-2" />
                  طلبات السلف
                </TabsTrigger>
              </TabsList>

              <TabsContent value="leave" className="space-y-4">
                <div className="flex justify-end">
                  <Dialog open={isLeaveDialogOpen} onOpenChange={setIsLeaveDialogOpen}>
                    <DialogTrigger asChild>
                      <Button data-testid="button-new-leave-request">
                        <Plus className="w-4 h-4 ml-2" />
                        طلب إجازة جديد
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>طلب إجازة جديد</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="leave-type">نوع الإجازة</Label>
                          <Select
                            value={leaveForm.type}
                            onValueChange={(value) =>
                              setLeaveForm({ ...leaveForm, type: value })
                            }
                          >
                            <SelectTrigger id="leave-type" data-testid="select-leave-type">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="annual">إجازة سنوية</SelectItem>
                              <SelectItem value="sick">إجازة مرضية</SelectItem>
                              <SelectItem value="maternity">إجازة أمومة</SelectItem>
                              <SelectItem value="emergency">إجازة طارئة</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="start-date">تاريخ البداية</Label>
                            <Input
                              id="start-date"
                              type="date"
                              value={leaveForm.startDate}
                              onChange={(e) =>
                                setLeaveForm({ ...leaveForm, startDate: e.target.value })
                              }
                              data-testid="input-leave-start-date"
                            />
                          </div>
                          <div>
                            <Label htmlFor="end-date">تاريخ النهاية</Label>
                            <Input
                              id="end-date"
                              type="date"
                              value={leaveForm.endDate}
                              onChange={(e) =>
                                setLeaveForm({ ...leaveForm, endDate: e.target.value })
                              }
                              data-testid="input-leave-end-date"
                            />
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="leave-reason">السبب (اختياري)</Label>
                          <Textarea
                            id="leave-reason"
                            value={leaveForm.reason}
                            onChange={(e) =>
                              setLeaveForm({ ...leaveForm, reason: e.target.value })
                            }
                            placeholder="اذكر سبب طلب الإجازة"
                            data-testid="textarea-leave-reason"
                          />
                        </div>

                        <Button
                          onClick={handleSubmitLeave}
                          className="w-full"
                          disabled={createLeaveRequestMutation.isPending}
                          data-testid="button-submit-leave-request"
                        >
                          {createLeaveRequestMutation.isPending ? "جاري الإرسال..." : "إرسال الطلب"}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

                <div className="grid gap-4">
                  {myLeaveRequests.length === 0 ? (
                    <Card>
                      <CardContent className="flex flex-col items-center justify-center py-12">
                        <CalendarDays className="w-12 h-12 text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">لا توجد طلبات إجازات</p>
                      </CardContent>
                    </Card>
                  ) : (
                    myLeaveRequests.map((request) => (
                      <Card key={request.id} data-testid={`leave-request-${request.id}`}>
                        <CardHeader>
                          <div className="flex justify-between items-start">
                            <div>
                              <CardTitle>{leaveTypeLabels[request.type]}</CardTitle>
                              <CardDescription>
                                {new Date(request.startDate).toLocaleDateString('ar-SA')} - {new Date(request.endDate).toLocaleDateString('ar-SA')}
                                {' '}({request.days} أيام)
                              </CardDescription>
                            </div>
                            {getStatusBadge(request.status)}
                          </div>
                        </CardHeader>
                        {request.reason && (
                          <CardContent>
                            <p className="text-sm text-muted-foreground">{request.reason}</p>
                            {request.status === 'rejected' && request.rejectionReason && (
                              <div className="mt-3 p-3 bg-destructive/10 rounded-md">
                                <p className="text-sm font-medium">سبب الرفض:</p>
                                <p className="text-sm">{request.rejectionReason}</p>
                              </div>
                            )}
                          </CardContent>
                        )}
                      </Card>
                    ))
                  )}
                </div>
              </TabsContent>

              <TabsContent value="salary" className="space-y-4">
                <div className="flex justify-end">
                  <Dialog open={isSalaryAdvanceDialogOpen} onOpenChange={setIsSalaryAdvanceDialogOpen}>
                    <DialogTrigger asChild>
                      <Button data-testid="button-new-salary-advance">
                        <Plus className="w-4 h-4 ml-2" />
                        طلب سلفة جديدة
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>طلب سلفة من الراتب</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="amount">المبلغ المطلوب</Label>
                          <Input
                            id="amount"
                            type="number"
                            value={salaryAdvanceForm.amount}
                            onChange={(e) =>
                              setSalaryAdvanceForm({ ...salaryAdvanceForm, amount: e.target.value })
                            }
                            placeholder="أدخل المبلغ"
                            data-testid="input-salary-amount"
                          />
                        </div>

                        <div>
                          <Label htmlFor="repayment-date">تاريخ السداد المتوقع</Label>
                          <Input
                            id="repayment-date"
                            type="date"
                            value={salaryAdvanceForm.repaymentDate}
                            onChange={(e) =>
                              setSalaryAdvanceForm({
                                ...salaryAdvanceForm,
                                repaymentDate: e.target.value,
                              })
                            }
                            data-testid="input-repayment-date"
                          />
                        </div>

                        <div>
                          <Label htmlFor="salary-reason">السبب</Label>
                          <Textarea
                            id="salary-reason"
                            value={salaryAdvanceForm.reason}
                            onChange={(e) =>
                              setSalaryAdvanceForm({ ...salaryAdvanceForm, reason: e.target.value })
                            }
                            placeholder="اذكر سبب طلب السلفة"
                            data-testid="textarea-salary-reason"
                          />
                        </div>

                        <Button
                          onClick={handleSubmitSalaryAdvance}
                          className="w-full"
                          disabled={createSalaryAdvanceMutation.isPending}
                          data-testid="button-submit-salary-advance"
                        >
                          {createSalaryAdvanceMutation.isPending ? "جاري الإرسال..." : "إرسال الطلب"}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

                <div className="grid gap-4">
                  {mySalaryAdvanceRequests.length === 0 ? (
                    <Card>
                      <CardContent className="flex flex-col items-center justify-center py-12">
                        <DollarSign className="w-12 h-12 text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">لا توجد طلبات سلف</p>
                      </CardContent>
                    </Card>
                  ) : (
                    mySalaryAdvanceRequests.map((request) => (
                      <Card key={request.id} data-testid={`salary-advance-${request.id}`}>
                        <CardHeader>
                          <div className="flex justify-between items-start">
                            <div>
                              <CardTitle>{parseFloat(request.amount).toFixed(2)} ريال</CardTitle>
                              <CardDescription>
                                {request.repaymentDate && `تاريخ السداد: ${new Date(request.repaymentDate).toLocaleDateString('ar-SA')}`}
                              </CardDescription>
                            </div>
                            {getStatusBadge(request.status)}
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground mb-2">
                            <strong>السبب:</strong> {request.reason}
                          </p>
                          {request.status === 'rejected' && request.rejectionReason && (
                            <div className="mt-3 p-3 bg-destructive/10 rounded-md">
                              <p className="text-sm font-medium">سبب الرفض:</p>
                              <p className="text-sm">{request.rejectionReason}</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  );
}
