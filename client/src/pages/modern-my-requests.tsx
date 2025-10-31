import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, DollarSign, Clock, CheckCircle, XCircle, FileText } from "lucide-react";
import Background3D from "@/components/3d-background";
import ModernNavigation from "@/components/modern-navigation";
import ModernSidebar from "@/components/modern-sidebar";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import type { LeaveRequest, SalaryAdvanceRequest } from "@shared/schema";

export default function ModernMyRequests() {
  const [selectedTab, setSelectedTab] = useState("leave");

  const { data: leaveRequests = [] } = useQuery<LeaveRequest[]>({
    queryKey: ["/api/hr/leave-requests/my"],
  });

  const { data: salaryAdvanceRequests = [] } = useQuery<SalaryAdvanceRequest[]>({
    queryKey: ["/api/hr/salary-advances/my"],
  });

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
      approved: "bg-green-500/10 text-green-400 border-green-500/20",
      rejected: "bg-red-500/10 text-red-400 border-red-500/20",
    };
    return styles[status as keyof typeof styles] || styles.pending;
  };

  const getStatusIcon = (status: string) => {
    if (status === "approved") return CheckCircle;
    if (status === "rejected") return XCircle;
    return Clock;
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
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-gradient-primary shadow-lg">
              <FileText className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">طلباتي</h1>
              <p className="text-gray-400 mt-1">تتبع حالة طلبات الإجازة والسلف الخاصة بك</p>
            </div>
          </div>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              title: "إجمالي الطلبات",
              value: leaveRequests.length + salaryAdvanceRequests.length,
              icon: FileText,
              gradient: "from-blue-500 to-cyan-500"
            },
            {
              title: "قيد المراجعة",
              value: [...leaveRequests, ...salaryAdvanceRequests].filter(r => r.status === "pending").length,
              icon: Clock,
              gradient: "from-yellow-500 to-amber-500"
            },
            {
              title: "موافق عليها",
              value: [...leaveRequests, ...salaryAdvanceRequests].filter(r => r.status === "approved").length,
              icon: CheckCircle,
              gradient: "from-green-500 to-emerald-500"
            },
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

        {/* Requests Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList className="glass-dark border border-white/10 p-1 h-auto">
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
                طلبات السلف
              </TabsTrigger>
            </TabsList>

            {/* Leave Requests */}
            <TabsContent value="leave" className="mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <AnimatePresence>
                  {leaveRequests.map((request, index) => {
                    const StatusIcon = getStatusIcon(request.status);
                    return (
                      <motion.div
                        key={request.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ delay: index * 0.05 }}
                        whileHover={{ scale: 1.02, y: -5 }}
                        className="card-3d"
                      >
                        <Card className="glass-dark border-white/10 shadow-glow hover:shadow-glow-hover transition-all">
                          <CardContent className="p-6">
                            <div className="flex items-start justify-between mb-4">
                              <div className="p-3 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 shadow-lg">
                                <Calendar className="w-6 h-6 text-white" />
                              </div>
                              <Badge variant="outline" className={getStatusBadge(request.status)}>
                                <StatusIcon className="w-3 h-3 ml-1" />
                                {getStatusText(request.status)}
                              </Badge>
                            </div>

                            <h3 className="text-lg font-bold text-white mb-3">
                              {request.type === "annual" ? "إجازة سنوية" :
                               request.type === "sick" ? "إجازة مرضية" : "إجازة طارئة"}
                            </h3>

                            <div className="space-y-2 text-sm">
                              <div className="flex items-center justify-between">
                                <span className="text-gray-400">من تاريخ:</span>
                                <span className="text-white">
                                  {format(new Date(request.startDate), "dd/MM/yyyy", { locale: ar })}
                                </span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-gray-400">إلى تاريخ:</span>
                                <span className="text-white">
                                  {format(new Date(request.endDate), "dd/MM/yyyy", { locale: ar })}
                                </span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-gray-400">عدد الأيام:</span>
                                <span className="text-white font-bold">{request.days} يوم</span>
                              </div>
                              {request.reason && (
                                <div className="pt-2 border-t border-white/10">
                                  <span className="text-gray-400 block mb-1">السبب:</span>
                                  <span className="text-white text-sm">{request.reason}</span>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
              {leaveRequests.length === 0 && (
                <div className="text-center py-20">
                  <Calendar className="w-20 h-20 text-gray-500 mx-auto mb-4 opacity-50" />
                  <p className="text-xl text-gray-400">لا توجد طلبات إجازة</p>
                </div>
              )}
            </TabsContent>

            {/* Salary Advance Requests */}
            <TabsContent value="salary" className="mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <AnimatePresence>
                  {salaryAdvanceRequests.map((request, index) => {
                    const StatusIcon = getStatusIcon(request.status);
                    return (
                      <motion.div
                        key={request.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ delay: index * 0.05 }}
                        whileHover={{ scale: 1.02, y: -5 }}
                        className="card-3d"
                      >
                        <Card className="glass-dark border-white/10 shadow-glow hover:shadow-glow-hover transition-all">
                          <CardContent className="p-6">
                            <div className="flex items-start justify-between mb-4">
                              <div className="p-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 shadow-lg">
                                <DollarSign className="w-6 h-6 text-white" />
                              </div>
                              <Badge variant="outline" className={getStatusBadge(request.status)}>
                                <StatusIcon className="w-3 h-3 ml-1" />
                                {getStatusText(request.status)}
                              </Badge>
                            </div>

                            <h3 className="text-lg font-bold text-white mb-3">طلب سلفة</h3>

                            <div className="space-y-2 text-sm">
                              <div className="flex items-center justify-between">
                                <span className="text-gray-400">المبلغ:</span>
                                <span className="text-white font-bold text-lg">{request.amount} ريال</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-gray-400">تاريخ السداد:</span>
                                <span className="text-white">
                                  {format(new Date(request.repaymentDate), "dd/MM/yyyy", { locale: ar })}
                                </span>
                              </div>
                              {request.reason && (
                                <div className="pt-2 border-t border-white/10">
                                  <span className="text-gray-400 block mb-1">السبب:</span>
                                  <span className="text-white text-sm">{request.reason}</span>
                                </div>
                              )}
                              {request.createdAt && (
                                <div className="pt-2 border-t border-white/10">
                                  <span className="text-gray-400 block mb-1">تاريخ الطلب:</span>
                                  <span className="text-white text-sm">
                                    {format(new Date(request.createdAt), "dd/MM/yyyy HH:mm", { locale: ar })}
                                  </span>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
              {salaryAdvanceRequests.length === 0 && (
                <div className="text-center py-20">
                  <DollarSign className="w-20 h-20 text-gray-500 mx-auto mb-4 opacity-50" />
                  <p className="text-xl text-gray-400">لا توجد طلبات سلف</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
}
