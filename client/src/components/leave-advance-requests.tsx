import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Plane, DollarSign } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function LeaveAdvanceRequests() {
  const { toast } = useToast();
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [advanceDialogOpen, setAdvanceDialogOpen] = useState(false);

  const [leaveType, setLeaveType] = useState("annual");
  const [leaveStartDate, setLeaveStartDate] = useState("");
  const [leaveEndDate, setLeaveEndDate] = useState("");
  const [leaveReason, setLeaveReason] = useState("");

  const [advanceAmount, setAdvanceAmount] = useState("");
  const [advanceReason, setAdvanceReason] = useState("");
  const [repaymentDate, setRepaymentDate] = useState("");

  const leaveRequestMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/leaves", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leaves"] });
      toast({
        title: "تم تقديم الطلب بنجاح",
        description: "سيتم مراجعة طلب الإجازة قريباً",
      });
      setLeaveDialogOpen(false);
      setLeaveType("annual");
      setLeaveStartDate("");
      setLeaveEndDate("");
      setLeaveReason("");
    },
    onError: () => {
      toast({
        title: "حدث خطأ",
        description: "فشل تقديم طلب الإجازة",
        variant: "destructive",
      });
    },
  });

  const advanceRequestMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/salary-advances", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/salary-advances"] });
      toast({
        title: "تم تقديم الطلب بنجاح",
        description: "سيتم مراجعة طلب السلفة قريباً",
      });
      setAdvanceDialogOpen(false);
      setAdvanceAmount("");
      setAdvanceReason("");
      setRepaymentDate("");
    },
    onError: () => {
      toast({
        title: "حدث خطأ",
        description: "فشل تقديم طلب السلفة",
        variant: "destructive",
      });
    },
  });

  const handleLeaveSubmit = () => {
    if (!leaveStartDate || !leaveEndDate) {
      toast({
        title: "خطأ",
        description: "يرجى ملء جميع الحقول المطلوبة",
        variant: "destructive",
      });
      return;
    }

    const start = new Date(leaveStartDate);
    const end = new Date(leaveEndDate);
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    leaveRequestMutation.mutate({
      type: leaveType,
      startDate: leaveStartDate,
      endDate: leaveEndDate,
      days,
      reason: leaveReason,
      status: "pending",
    });
  };

  const handleAdvanceSubmit = () => {
    if (!advanceAmount || !advanceReason) {
      toast({
        title: "خطأ",
        description: "يرجى ملء جميع الحقول المطلوبة",
        variant: "destructive",
      });
      return;
    }

    advanceRequestMutation.mutate({
      amount: parseFloat(advanceAmount),
      reason: advanceReason,
      repaymentDate: repaymentDate || null,
      status: "pending",
    });
  };

  return (
    <Card data-testid="card-requests">
      <CardHeader>
        <CardTitle>الطلبات</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Dialog open={leaveDialogOpen} onOpenChange={setLeaveDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full justify-start" variant="outline" data-testid="button-request-leave">
              <Plane className="w-4 h-4 ml-2" />
              طلب إجازة
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>طلب إجازة</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="leave-type">نوع الإجازة</Label>
                <Select value={leaveType} onValueChange={setLeaveType}>
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
              <div>
                <Label htmlFor="leave-start">تاريخ البداية</Label>
                <Input
                  id="leave-start"
                  type="date"
                  value={leaveStartDate}
                  onChange={(e) => setLeaveStartDate(e.target.value)}
                  data-testid="input-leave-start-date"
                />
              </div>
              <div>
                <Label htmlFor="leave-end">تاريخ النهاية</Label>
                <Input
                  id="leave-end"
                  type="date"
                  value={leaveEndDate}
                  onChange={(e) => setLeaveEndDate(e.target.value)}
                  data-testid="input-leave-end-date"
                />
              </div>
              <div>
                <Label htmlFor="leave-reason">السبب (اختياري)</Label>
                <Textarea
                  id="leave-reason"
                  value={leaveReason}
                  onChange={(e) => setLeaveReason(e.target.value)}
                  placeholder="اذكر سبب الإجازة..."
                  data-testid="textarea-leave-reason"
                />
              </div>
              <Button
                onClick={handleLeaveSubmit}
                disabled={leaveRequestMutation.isPending}
                className="w-full"
                data-testid="button-submit-leave"
              >
                {leaveRequestMutation.isPending ? "جاري التقديم..." : "تقديم الطلب"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={advanceDialogOpen} onOpenChange={setAdvanceDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full justify-start" variant="outline" data-testid="button-request-advance">
              <DollarSign className="w-4 h-4 ml-2" />
              طلب سلفة
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>طلب سلفة</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="advance-amount">المبلغ</Label>
                <Input
                  id="advance-amount"
                  type="number"
                  value={advanceAmount}
                  onChange={(e) => setAdvanceAmount(e.target.value)}
                  placeholder="0.00"
                  data-testid="input-advance-amount"
                />
              </div>
              <div>
                <Label htmlFor="advance-reason">السبب</Label>
                <Textarea
                  id="advance-reason"
                  value={advanceReason}
                  onChange={(e) => setAdvanceReason(e.target.value)}
                  placeholder="اذكر سبب طلب السلفة..."
                  data-testid="textarea-advance-reason"
                />
              </div>
              <div>
                <Label htmlFor="repayment-date">تاريخ السداد (اختياري)</Label>
                <Input
                  id="repayment-date"
                  type="date"
                  value={repaymentDate}
                  onChange={(e) => setRepaymentDate(e.target.value)}
                  data-testid="input-repayment-date"
                />
              </div>
              <Button
                onClick={handleAdvanceSubmit}
                disabled={advanceRequestMutation.isPending}
                className="w-full"
                data-testid="button-submit-advance"
              >
                {advanceRequestMutation.isPending ? "جاري التقديم..." : "تقديم الطلب"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
