import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Lightbulb, Plus, Edit, Trash2, CheckCircle, XCircle, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import Background3D from "@/components/3d-background";
import ModernNavigation from "@/components/modern-navigation";
import ModernSidebar from "@/components/modern-sidebar";
import type { Suggestion } from "@shared/schema";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

export default function ModernSuggestions() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState<Suggestion | null>(null);
  const [newSuggestion, setNewSuggestion] = useState({
    title: "",
    description: "",
    category: "",
  });

  const isAdmin = user?.role === 'admin' || user?.role === 'sub-admin';

  const { data: suggestions = [], isLoading } = useQuery<Suggestion[]>({
    queryKey: isAdmin ? ["/api/suggestions"] : ["/api/suggestions/my"],
  });

  const createSuggestionMutation = useMutation({
    mutationFn: async (data: typeof newSuggestion) => {
      const res = await apiRequest("POST", "/api/suggestions", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/suggestions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/suggestions/my"] });
      setIsCreateDialogOpen(false);
      setNewSuggestion({ title: "", description: "", category: "" });
      toast({ title: "تم إرسال المقترح", description: "سيتم مراجعة مقترحك من قبل الإدارة" });
    },
  });

  const updateSuggestionMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Suggestion> }) => {
      const res = await apiRequest("PATCH", `/api/suggestions/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/suggestions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/suggestions/my"] });
      setIsEditDialogOpen(false);
      toast({ title: "تم التحديث" });
    },
  });

  const deleteSuggestionMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/suggestions/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/suggestions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/suggestions/my"] });
      toast({ title: "تم الحذف" });
    },
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
                <Lightbulb className="w-8 h-8" />
                المقترحات
              </h1>
              <p className="text-gray-400 mt-1">شارك أفكارك ومقترحاتك لتحسين العمل</p>
            </div>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-primary hover:bg-gradient-primary/90 shadow-glow">
                  <Plus className="w-5 h-5 ml-2" />
                  إضافة مقترح
                </Button>
              </DialogTrigger>
              <DialogContent className="glass-dark border-white/10">
                <DialogHeader>
                  <DialogTitle className="text-white">مقترح جديد</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label className="text-white">العنوان</Label>
                    <Input
                      value={newSuggestion.title}
                      onChange={(e) => setNewSuggestion({ ...newSuggestion, title: e.target.value })}
                      className="glass border-white/10 text-white mt-2"
                    />
                  </div>
                  <div>
                    <Label className="text-white">التصنيف</Label>
                    <Select
                      value={newSuggestion.category}
                      onValueChange={(value) => setNewSuggestion({ ...newSuggestion, category: value })}
                    >
                      <SelectTrigger className="glass border-white/10 text-white mt-2">
                        <SelectValue placeholder="اختر التصنيف" />
                      </SelectTrigger>
                      <SelectContent className="glass-dark border-white/10">
                        <SelectItem value="process">تحسين العمليات</SelectItem>
                        <SelectItem value="technology">تقنية</SelectItem>
                        <SelectItem value="workplace">بيئة العمل</SelectItem>
                        <SelectItem value="other">أخرى</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-white">الوصف</Label>
                    <Textarea
                      value={newSuggestion.description}
                      onChange={(e) => setNewSuggestion({ ...newSuggestion, description: e.target.value })}
                      className="glass border-white/10 text-white mt-2 min-h-[120px]"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    onClick={() => createSuggestionMutation.mutate(newSuggestion)}
                    className="bg-gradient-primary hover:bg-gradient-primary/90"
                  >
                    إرسال
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </motion.div>

        {/* Suggestions Grid */}
        {isLoading ? (
          <div className="text-center py-20">
            <div className="inline-block w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {suggestions.map((suggestion, index) => {
                const StatusIcon = getStatusIcon(suggestion.status);
                return (
                  <motion.div
                    key={suggestion.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ delay: index * 0.05 }}
                    whileHover={{ scale: 1.02, y: -5 }}
                    className="card-3d"
                  >
                    <Card className="glass-dark border-white/10 shadow-glow hover:shadow-glow-hover transition-all h-full group">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="p-3 rounded-xl bg-gradient-primary shadow-lg">
                            <Lightbulb className="w-6 h-6 text-white" />
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className={getStatusBadge(suggestion.status)}>
                              <StatusIcon className="w-3 h-3 ml-1" />
                              {suggestion.status === "pending" ? "قيد المراجعة" :
                               suggestion.status === "approved" ? "موافق عليه" : "مرفوض"}
                            </Badge>
                            {(isAdmin || suggestion.userId === user?.id) && (
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                {isAdmin && (
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => {
                                      setSelectedSuggestion(suggestion);
                                      setIsEditDialogOpen(true);
                                    }}
                                    className="h-8 w-8 glass hover:bg-white/10"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                )}
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => {
                                    if (confirm("هل تريد حذف هذا المقترح؟")) {
                                      deleteSuggestionMutation.mutate(suggestion.id);
                                    }
                                  }}
                                  className="h-8 w-8 glass hover:bg-white/10 hover:text-red-400"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>

                        <h3 className="text-xl font-bold text-white mb-2">{suggestion.title}</h3>

                        {suggestion.category && (
                          <Badge variant="outline" className="glass border-white/20 mb-3">
                            {suggestion.category === "process" ? "تحسين العمليات" :
                             suggestion.category === "technology" ? "تقنية" :
                             suggestion.category === "workplace" ? "بيئة العمل" : "أخرى"}
                          </Badge>
                        )}

                        <p className="text-gray-400 text-sm mb-4 line-clamp-3">{suggestion.description}</p>

                        <div className="pt-4 border-t border-white/10 text-xs text-gray-500">
                          <p>بواسطة: {suggestion.userName || "مجهول"}</p>
                          {suggestion.createdAt && (
                            <p>التاريخ: {format(new Date(suggestion.createdAt), "dd/MM/yyyy", { locale: ar })}</p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Edit Dialog (Admin only) */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="glass-dark border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">تحديث حالة المقترح</DialogTitle>
          </DialogHeader>
          {selectedSuggestion && (
            <div className="space-y-4">
              <div>
                <Label className="text-white">الحالة</Label>
                <Select
                  value={selectedSuggestion.status}
                  onValueChange={(value) => setSelectedSuggestion({ ...selectedSuggestion, status: value })}
                >
                  <SelectTrigger className="glass border-white/10 text-white mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="glass-dark border-white/10">
                    <SelectItem value="pending">قيد المراجعة</SelectItem>
                    <SelectItem value="approved">موافق عليه</SelectItem>
                    <SelectItem value="rejected">مرفوض</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              onClick={() => {
                if (selectedSuggestion) {
                  updateSuggestionMutation.mutate({
                    id: selectedSuggestion.id,
                    data: { status: selectedSuggestion.status },
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
    </div>
  );
}
