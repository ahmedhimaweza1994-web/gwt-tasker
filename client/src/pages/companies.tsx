import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Building, Plus, Edit, Trash2, Users as UsersIcon, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Company } from "@shared/schema";
import Navigation from "@/components/navigation";
import Sidebar from "@/components/sidebar";

export default function Companies() {
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isTeamDialogOpen, setIsTeamDialogOpen] = useState(false);
  const [isFilesDialogOpen, setIsFilesDialogOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [newCompany, setNewCompany] = useState({
    name: "",
    description: "",
    industry: "",
    contactEmail: "",
    contactPhone: "",
    address: "",
    website: "",
  });

  const { data: companies = [], isLoading } = useQuery<Company[]>({
    queryKey: ["/api/companies"],
  });

  const createCompanyMutation = useMutation({
    mutationFn: async (data: typeof newCompany) => {
      const res = await apiRequest("POST", "/api/companies", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/companies"] });
      setIsCreateDialogOpen(false);
      setNewCompany({
        name: "",
        description: "",
        industry: "",
        contactEmail: "",
        contactPhone: "",
        address: "",
        website: "",
      });
      toast({
        title: "تم إنشاء الشركة",
        description: "تم إضافة الشركة بنجاح",
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

  const deleteCompanyMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/companies/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/companies"] });
      toast({
        title: "تم الحذف",
        description: "تم حذف الشركة بنجاح",
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

  const handleCreateCompany = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompany.name.trim()) {
      toast({
        title: "خطأ",
        description: "الرجاء إدخال اسم الشركة",
        variant: "destructive",
      });
      return;
    }
    createCompanyMutation.mutate(newCompany);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <Sidebar />
      <main className="mr-64 mt-16 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-4xl font-bold text-foreground mb-2">الشركات</h1>
              <p className="text-muted-foreground">إدارة معلومات الشركات والعملاء</p>
            </div>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="ml-2 h-4 w-4" />
                  إضافة شركة
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px]" dir="rtl">
                <DialogHeader>
                  <DialogTitle>إضافة شركة جديدة</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateCompany} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">اسم الشركة *</Label>
                      <Input
                        id="name"
                        value={newCompany.name}
                        onChange={(e) => setNewCompany({ ...newCompany, name: e.target.value })}
                        placeholder="اسم الشركة"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="industry">المجال</Label>
                      <Input
                        id="industry"
                        value={newCompany.industry}
                        onChange={(e) => setNewCompany({ ...newCompany, industry: e.target.value })}
                        placeholder="مثال: تقنية المعلومات"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">الوصف</Label>
                    <Textarea
                      id="description"
                      value={newCompany.description}
                      onChange={(e) => setNewCompany({ ...newCompany, description: e.target.value })}
                      placeholder="وصف الشركة..."
                      rows={3}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="contactEmail">البريد الإلكتروني</Label>
                      <Input
                        id="contactEmail"
                        type="email"
                        value={newCompany.contactEmail}
                        onChange={(e) => setNewCompany({ ...newCompany, contactEmail: e.target.value })}
                        placeholder="info@company.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contactPhone">رقم الهاتف</Label>
                      <Input
                        id="contactPhone"
                        value={newCompany.contactPhone}
                        onChange={(e) => setNewCompany({ ...newCompany, contactPhone: e.target.value })}
                        placeholder="+966 XX XXX XXXX"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address">العنوان</Label>
                    <Input
                      id="address"
                      value={newCompany.address}
                      onChange={(e) => setNewCompany({ ...newCompany, address: e.target.value })}
                      placeholder="العنوان الكامل"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="website">الموقع الإلكتروني</Label>
                    <Input
                      id="website"
                      type="url"
                      value={newCompany.website}
                      onChange={(e) => setNewCompany({ ...newCompany, website: e.target.value })}
                      placeholder="https://www.example.com"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                      إلغاء
                    </Button>
                    <Button type="submit" disabled={createCompanyMutation.isPending}>
                      {createCompanyMutation.isPending ? "جاري الإضافة..." : "إضافة"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">جاري التحميل...</p>
            </div>
          ) : companies.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Building className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">لا توجد شركات</h3>
                <p className="text-muted-foreground mb-4">ابدأ بإضافة أول شركة</p>
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="ml-2 h-4 w-4" />
                  إضافة شركة
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {companies.map((company) => (
                <Card key={company.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-xl mb-1">{company.name}</CardTitle>
                        {company.industry && (
                          <CardDescription>{company.industry}</CardDescription>
                        )}
                      </div>
                      <Building className="h-8 w-8 text-primary flex-shrink-0" />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {company.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {company.description}
                      </p>
                    )}
                    <div className="space-y-2 text-sm">
                      {company.contactEmail && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <span>📧</span>
                          <span className="truncate">{company.contactEmail}</span>
                        </div>
                      )}
                      {company.contactPhone && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <span>📱</span>
                          <span>{company.contactPhone}</span>
                        </div>
                      )}
                      {company.address && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <span>📍</span>
                          <span className="truncate">{company.address}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 pt-4 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => {
                          setSelectedCompany(company);
                          setIsTeamDialogOpen(true);
                        }}
                      >
                        <UsersIcon className="ml-2 h-4 w-4" />
                        الفريق
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => {
                          setSelectedCompany(company);
                          setIsFilesDialogOpen(true);
                        }}
                      >
                        <FileText className="ml-2 h-4 w-4" />
                        الملفات
                      </Button>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex-1"
                        onClick={() => {
                          setSelectedCompany(company);
                          setIsEditDialogOpen(true);
                        }}
                      >
                        <Edit className="ml-2 h-4 w-4" />
                        تعديل
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex-1 text-destructive hover:text-destructive"
                        onClick={() => {
                          if (confirm(`هل أنت متأكد من حذف شركة "${company.name}"؟`)) {
                            deleteCompanyMutation.mutate(company.id);
                          }
                        }}
                      >
                        <Trash2 className="ml-2 h-4 w-4" />
                        حذف
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Edit Company Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px]" dir="rtl">
          <DialogHeader>
            <DialogTitle>تعديل بيانات الشركة</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              تحديث معلومات الشركة: {selectedCompany?.name}
            </p>
            <div className="text-center py-4">
              <p className="text-muted-foreground">ستتوفر هذه الميزة قريباً</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Team Dialog */}
      <Dialog open={isTeamDialogOpen} onOpenChange={setIsTeamDialogOpen}>
        <DialogContent className="sm:max-w-[600px]" dir="rtl">
          <DialogHeader>
            <DialogTitle>فريق الشركة</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              إدارة أعضاء فريق: {selectedCompany?.name}
            </p>
            <div className="text-center py-4">
              <p className="text-muted-foreground">ستتوفر هذه الميزة قريباً</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Files Dialog */}
      <Dialog open={isFilesDialogOpen} onOpenChange={setIsFilesDialogOpen}>
        <DialogContent className="sm:max-w-[600px]" dir="rtl">
          <DialogHeader>
            <DialogTitle>ملفات الشركة</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              إدارة ملفات: {selectedCompany?.name}
            </p>
            <div className="text-center py-4">
              <p className="text-muted-foreground">ستتوفر هذه الميزة قريباً</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
