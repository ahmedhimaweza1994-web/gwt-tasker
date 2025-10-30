import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Lightbulb, Plus, Edit, Trash2, CheckCircle, XCircle, Clock, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import Navigation from "@/components/navigation";
import Sidebar from "@/components/sidebar";
import type { Suggestion } from "@shared/schema";

export default function Suggestions() {
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
      toast({
        title: "تم إرسال المقترح",
        description: "سيتم مراجعة مقترحك من قبل الإدارة",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateSuggestionMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await apiRequest("PUT", `/api/suggestions/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/suggestions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/suggestions/my"] });
      setIsEditDialogOpen(false);
      setSelectedSuggestion(null);
      toast({
        title: "تم التحديث",
        description: "تم تحديث المقترح بنجاح",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive",
      });
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
      toast({
        title: "تم الحذف",
        description: "تم حذف المقترح بنجاح",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCreateSuggestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSuggestion.title.trim() || !newSuggestion.description.trim()) {
      toast({
        title: "خطأ",
        description: "الرجاء إدخال العنوان والوصف",
        variant: "destructive",
      });
      return;
    }
    createSuggestionMutation.mutate(newSuggestion);
  };

  const handleEditSuggestion = () => {
    if (!selectedSuggestion) return;

    const updates = isAdmin
      ? {
          status: selectedSuggestion.status,
          adminResponse: selectedSuggestion.adminResponse,
        }
      : {
          title: selectedSuggestion.title,
          description: selectedSuggestion.description,
          category: selectedSuggestion.category,
        };

    updateSuggestionMutation.mutate({ id: selectedSuggestion.id, data: updates });
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      pending: { label: "قيد المراجعة", variant: "default" as const, icon: Clock },
      under_review: { label: "تحت المراجعة", variant: "secondary" as const, icon: MessageSquare },
      accepted: { label: "مقبول", variant: "default" as const, icon: CheckCircle, className: "bg-success text-white" },
      rejected: { label: "مرفوض", variant: "destructive" as const, icon: XCircle },
    };

    const config = statusMap[status as keyof typeof statusMap] || statusMap.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className={config.className}>
        <Icon className="w-3 h-3 ml-1" />
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <Sidebar />
      <main className="mr-64 mt-16 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-4xl font-bold text-foreground mb-2">المقترحات</h1>
              <p className="text-muted-foreground">
                {isAdmin ? "إدارة مقترحات الموظفين" : "شارك أفكارك وملاحظاتك"}
              </p>
            </div>
            {!isAdmin && (
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="ml-2 h-4 w-4" />
                    مقترح جديد
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px]" dir="rtl">
                  <DialogHeader>
                    <DialogTitle>مقترح جديد</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleCreateSuggestion} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">عنوان المقترح *</Label>
                      <Input
                        id="title"
                        value={newSuggestion.title}
                        onChange={(e) => setNewSuggestion({ ...newSuggestion, title: e.target.value })}
                        placeholder="عنوان مختصر للمقترح"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="category">الفئة</Label>
                      <Input
                        id="category"
                        value={newSuggestion.category}
                        onChange={(e) => setNewSuggestion({ ...newSuggestion, category: e.target.value })}
                        placeholder="مثال: تقنية، عمليات، إدارة"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">التفاصيل *</Label>
                      <Textarea
                        id="description"
                        value={newSuggestion.description}
                        onChange={(e) => setNewSuggestion({ ...newSuggestion, description: e.target.value })}
                        placeholder="اشرح مقترحك بالتفصيل..."
                        rows={5}
                        required
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                        إلغاء
                      </Button>
                      <Button type="submit" disabled={createSuggestionMutation.isPending}>
                        {createSuggestionMutation.isPending ? "جاري الإرسال..." : "إرسال"}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>

          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">جاري التحميل...</p>
            </div>
          ) : suggestions.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Lightbulb className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">لا توجد مقترحات</h3>
                <p className="text-muted-foreground mb-4">
                  {isAdmin ? "لم يتم تقديم أي مقترحات بعد" : "ابدأ بإضافة مقترحك الأول"}
                </p>
                {!isAdmin && (
                  <Button onClick={() => setIsCreateDialogOpen(true)}>
                    <Plus className="ml-2 h-4 w-4" />
                    مقترح جديد
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {suggestions.map((suggestion) => (
                <Card key={suggestion.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <CardTitle className="text-xl">{suggestion.title}</CardTitle>
                          {getStatusBadge(suggestion.status)}
                        </div>
                        {suggestion.category && (
                          <CardDescription>{suggestion.category}</CardDescription>
                        )}
                      </div>
                      <Lightbulb className="h-8 w-8 text-primary flex-shrink-0" />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-muted-foreground">{suggestion.description}</p>

                    {suggestion.adminResponse && (
                      <div className="p-4 bg-muted rounded-lg">
                        <p className="text-sm font-semibold mb-1">رد الإدارة:</p>
                        <p className="text-sm">{suggestion.adminResponse}</p>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>{new Date(suggestion.createdAt).toLocaleDateString('ar-EG')}</span>
                      <div className="flex gap-2">
                        {(suggestion.userId === user?.id || isAdmin) && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedSuggestion(suggestion);
                                setIsEditDialogOpen(true);
                              }}
                            >
                              <Edit className="ml-2 h-4 w-4" />
                              {isAdmin ? "رد" : "تعديل"}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => {
                                if (confirm(`هل أنت متأكد من حذف "${suggestion.title}"؟`)) {
                                  deleteSuggestionMutation.mutate(suggestion.id);
                                }
                              }}
                            >
                              <Trash2 className="ml-2 h-4 w-4" />
                              حذف
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px]" dir="rtl">
          <DialogHeader>
            <DialogTitle>
              {isAdmin ? "الرد على المقترح" : "تعديل المقترح"}
            </DialogTitle>
          </DialogHeader>
          {selectedSuggestion && (
            <div className="space-y-4">
              {isAdmin ? (
                <>
                  <div className="space-y-2">
                    <Label>الحالة</Label>
                    <Select
                      value={selectedSuggestion.status}
                      onValueChange={(value) =>
                        setSelectedSuggestion({ ...selectedSuggestion, status: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">قيد المراجعة</SelectItem>
                        <SelectItem value="under_review">تحت المراجعة</SelectItem>
                        <SelectItem value="accepted">مقبول</SelectItem>
                        <SelectItem value="rejected">مرفوض</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>رد الإدارة</Label>
                    <Textarea
                      value={selectedSuggestion.adminResponse || ""}
                      onChange={(e) =>
                        setSelectedSuggestion({
                          ...selectedSuggestion,
                          adminResponse: e.target.value,
                        })
                      }
                      placeholder="اكتب رداً على المقترح..."
                      rows={5}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label>عنوان المقترح</Label>
                    <Input
                      value={selectedSuggestion.title}
                      onChange={(e) =>
                        setSelectedSuggestion({ ...selectedSuggestion, title: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>الفئة</Label>
                    <Input
                      value={selectedSuggestion.category || ""}
                      onChange={(e) =>
                        setSelectedSuggestion({
                          ...selectedSuggestion,
                          category: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>التفاصيل</Label>
                    <Textarea
                      value={selectedSuggestion.description}
                      onChange={(e) =>
                        setSelectedSuggestion({
                          ...selectedSuggestion,
                          description: e.target.value,
                        })
                      }
                      rows={5}
                    />
                  </div>
                </>
              )}
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsEditDialogOpen(false);
                    setSelectedSuggestion(null);
                  }}
                >
                  إلغاء
                </Button>
                <Button
                  onClick={handleEditSuggestion}
                  disabled={updateSuggestionMutation.isPending}
                >
                  {updateSuggestionMutation.isPending ? "جاري الحفظ..." : "حفظ"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
