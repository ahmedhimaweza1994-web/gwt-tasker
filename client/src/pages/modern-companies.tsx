import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Building, Plus, Edit, Trash2, Users as UsersIcon, FileText, X, Download, Mail, Phone, Globe, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Company, User, CompanyFile } from "@shared/schema";
import Background3D from "@/components/3d-background";
import ModernNavigation from "@/components/modern-navigation";
import ModernSidebar from "@/components/modern-sidebar";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export default function ModernCompanies() {
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isTeamDialogOpen, setIsTeamDialogOpen] = useState(false);
  const [isFilesDialogOpen, setIsFilesDialogOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [teamMemberRole, setTeamMemberRole] = useState("member");
  const [newFile, setNewFile] = useState({ name: "", fileUrl: "" });
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

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const { data: teamMembers = [] } = useQuery<User[]>({
    queryKey: [`/api/companies/${selectedCompany?.id}/team`],
    enabled: !!selectedCompany && isTeamDialogOpen,
  });

  const { data: companyFiles = [] } = useQuery<CompanyFile[]>({
    queryKey: [`/api/companies/${selectedCompany?.id}/files`],
    enabled: !!selectedCompany && isFilesDialogOpen,
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
      toast({ title: "تم إنشاء الشركة", description: "تم إضافة الشركة بنجاح" });
    },
  });

  const updateCompanyMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Company> }) => {
      const res = await apiRequest("PATCH", `/api/companies/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/companies"] });
      setIsEditDialogOpen(false);
      toast({ title: "تم التحديث", description: "تم تحديث بيانات الشركة" });
    },
  });

  const deleteCompanyMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/companies/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/companies"] });
      toast({ title: "تم الحذف", description: "تم حذف الشركة" });
    },
  });

  const addTeamMemberMutation = useMutation({
    mutationFn: async ({ companyId, userId, role }: { companyId: string; userId: string; role: string }) => {
      const res = await apiRequest("POST", `/api/companies/${companyId}/team`, { userId, role });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/companies/${selectedCompany?.id}/team`] });
      setSelectedUserId("");
      toast({ title: "تم إضافة العضو" });
    },
  });

  const removeTeamMemberMutation = useMutation({
    mutationFn: async ({ companyId, userId }: { companyId: string; userId: string }) => {
      const res = await apiRequest("DELETE", `/api/companies/${companyId}/team/${userId}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/companies/${selectedCompany?.id}/team`] });
      toast({ title: "تم إزالة العضو" });
    },
  });

  const addFileMutation = useMutation({
    mutationFn: async ({ companyId, name, fileUrl }: { companyId: string; name: string; fileUrl: string }) => {
      const res = await apiRequest("POST", `/api/companies/${companyId}/files`, { name, fileUrl });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/companies/${selectedCompany?.id}/files`] });
      setNewFile({ name: "", fileUrl: "" });
      toast({ title: "تم إضافة الملف" });
    },
  });

  const deleteFileMutation = useMutation({
    mutationFn: async ({ companyId, fileId }: { companyId: string; fileId: string }) => {
      const res = await apiRequest("DELETE", `/api/companies/${companyId}/files/${fileId}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/companies/${selectedCompany?.id}/files`] });
      toast({ title: "تم حذف الملف" });
    },
  });

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
                <Building className="w-8 h-8" />
                الشركات
              </h1>
              <p className="text-gray-400 mt-1">إدارة معلومات الشركات والفرق والملفات</p>
            </div>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-primary hover:bg-gradient-primary/90 shadow-glow">
                  <Plus className="w-5 h-5 ml-2" />
                  إضافة شركة
                </Button>
              </DialogTrigger>
              <DialogContent className="glass-dark border-white/10 max-w-2xl">
                <DialogHeader>
                  <DialogTitle className="text-white">إضافة شركة جديدة</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label className="text-white">اسم الشركة</Label>
                    <Input
                      value={newCompany.name}
                      onChange={(e) => setNewCompany({ ...newCompany, name: e.target.value })}
                      className="glass border-white/10 text-white mt-2"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-white">الوصف</Label>
                    <Textarea
                      value={newCompany.description}
                      onChange={(e) => setNewCompany({ ...newCompany, description: e.target.value })}
                      className="glass border-white/10 text-white mt-2"
                    />
                  </div>
                  <div>
                    <Label className="text-white">المجال</Label>
                    <Input
                      value={newCompany.industry}
                      onChange={(e) => setNewCompany({ ...newCompany, industry: e.target.value })}
                      className="glass border-white/10 text-white mt-2"
                    />
                  </div>
                  <div>
                    <Label className="text-white">البريد الإلكتروني</Label>
                    <Input
                      value={newCompany.contactEmail}
                      onChange={(e) => setNewCompany({ ...newCompany, contactEmail: e.target.value })}
                      type="email"
                      className="glass border-white/10 text-white mt-2"
                    />
                  </div>
                  <div>
                    <Label className="text-white">رقم الهاتف</Label>
                    <Input
                      value={newCompany.contactPhone}
                      onChange={(e) => setNewCompany({ ...newCompany, contactPhone: e.target.value })}
                      className="glass border-white/10 text-white mt-2"
                    />
                  </div>
                  <div>
                    <Label className="text-white">الموقع الإلكتروني</Label>
                    <Input
                      value={newCompany.website}
                      onChange={(e) => setNewCompany({ ...newCompany, website: e.target.value })}
                      className="glass border-white/10 text-white mt-2"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-white">العنوان</Label>
                    <Textarea
                      value={newCompany.address}
                      onChange={(e) => setNewCompany({ ...newCompany, address: e.target.value })}
                      className="glass border-white/10 text-white mt-2"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    onClick={() => createCompanyMutation.mutate(newCompany)}
                    className="bg-gradient-primary hover:bg-gradient-primary/90"
                  >
                    إضافة
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </motion.div>

        {/* Companies Grid */}
        {isLoading ? (
          <div className="text-center py-20">
            <div className="inline-block w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {companies.map((company, index) => (
                <motion.div
                  key={company.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ scale: 1.02, y: -5 }}
                  className="card-3d"
                >
                  <Card className="glass-dark border-white/10 shadow-glow hover:shadow-glow-hover transition-all h-full group">
                    <CardHeader className="relative">
                      <div className="absolute top-4 left-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            setSelectedCompany(company);
                            setIsEditDialogOpen(true);
                          }}
                          className="h-8 w-8 glass hover:bg-white/10"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            if (confirm(`هل تريد حذف ${company.name}؟`)) {
                              deleteCompanyMutation.mutate(company.id);
                            }
                          }}
                          className="h-8 w-8 glass hover:bg-white/10 hover:text-red-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="flex items-start gap-4">
                        <div className="p-4 rounded-xl bg-gradient-primary shadow-lg">
                          <Building className="w-8 h-8 text-white" />
                        </div>
                        <div className="flex-1">
                          <CardTitle className="text-white mb-1">{company.name}</CardTitle>
                          {company.industry && (
                            <Badge variant="outline" className="glass border-white/20">
                              {company.industry}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {company.description && (
                        <p className="text-sm text-gray-400 line-clamp-2">{company.description}</p>
                      )}

                      <div className="space-y-2 text-sm">
                        {company.contactEmail && (
                          <div className="flex items-center gap-2 text-gray-400">
                            <Mail className="w-4 h-4" />
                            <span className="truncate">{company.contactEmail}</span>
                          </div>
                        )}
                        {company.contactPhone && (
                          <div className="flex items-center gap-2 text-gray-400">
                            <Phone className="w-4 h-4" />
                            <span>{company.contactPhone}</span>
                          </div>
                        )}
                        {company.website && (
                          <div className="flex items-center gap-2 text-gray-400">
                            <Globe className="w-4 h-4" />
                            <a
                              href={company.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:text-primary transition-colors truncate"
                            >
                              {company.website}
                            </a>
                          </div>
                        )}
                        {company.address && (
                          <div className="flex items-center gap-2 text-gray-400">
                            <MapPin className="w-4 h-4" />
                            <span className="truncate">{company.address}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2 pt-4 border-t border-white/10">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedCompany(company);
                            setIsTeamDialogOpen(true);
                          }}
                          className="flex-1 glass border-white/10 hover:bg-white/10"
                        >
                          <UsersIcon className="w-4 h-4 ml-2" />
                          الفريق
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedCompany(company);
                            setIsFilesDialogOpen(true);
                          }}
                          className="flex-1 glass border-white/10 hover:bg-white/10"
                        >
                          <FileText className="w-4 h-4 ml-2" />
                          الملفات
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Edit Company Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="glass-dark border-white/10 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">تعديل بيانات الشركة</DialogTitle>
          </DialogHeader>
          {selectedCompany && (
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label className="text-white">اسم الشركة</Label>
                <Input
                  value={selectedCompany.name}
                  onChange={(e) => setSelectedCompany({ ...selectedCompany, name: e.target.value })}
                  className="glass border-white/10 text-white mt-2"
                />
              </div>
              <div className="col-span-2">
                <Label className="text-white">الوصف</Label>
                <Textarea
                  value={selectedCompany.description || ""}
                  onChange={(e) => setSelectedCompany({ ...selectedCompany, description: e.target.value })}
                  className="glass border-white/10 text-white mt-2"
                />
              </div>
              <div>
                <Label className="text-white">المجال</Label>
                <Input
                  value={selectedCompany.industry || ""}
                  onChange={(e) => setSelectedCompany({ ...selectedCompany, industry: e.target.value })}
                  className="glass border-white/10 text-white mt-2"
                />
              </div>
              <div>
                <Label className="text-white">البريد الإلكتروني</Label>
                <Input
                  value={selectedCompany.contactEmail || ""}
                  onChange={(e) => setSelectedCompany({ ...selectedCompany, contactEmail: e.target.value })}
                  className="glass border-white/10 text-white mt-2"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              onClick={() => {
                if (selectedCompany) {
                  updateCompanyMutation.mutate({
                    id: selectedCompany.id,
                    data: selectedCompany,
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

      {/* Team Dialog */}
      <Dialog open={isTeamDialogOpen} onOpenChange={setIsTeamDialogOpen}>
        <DialogContent className="glass-dark border-white/10 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">
              فريق {selectedCompany?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Add Team Member */}
            <div className="flex gap-2">
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger className="glass border-white/10 text-white flex-1">
                  <SelectValue placeholder="اختر موظف" />
                </SelectTrigger>
                <SelectContent className="glass-dark border-white/10">
                  {users
                    .filter(u => !teamMembers.find(tm => tm.id === u.id))
                    .map(u => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.fullName}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <Select value={teamMemberRole} onValueChange={setTeamMemberRole}>
                <SelectTrigger className="glass border-white/10 text-white w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="glass-dark border-white/10">
                  <SelectItem value="member">عضو</SelectItem>
                  <SelectItem value="lead">قائد</SelectItem>
                  <SelectItem value="manager">مدير</SelectItem>
                </SelectContent>
              </Select>
              <Button
                onClick={() => {
                  if (selectedCompany && selectedUserId) {
                    addTeamMemberMutation.mutate({
                      companyId: selectedCompany.id,
                      userId: selectedUserId,
                      role: teamMemberRole,
                    });
                  }
                }}
                disabled={!selectedUserId}
                className="bg-gradient-primary hover:bg-gradient-primary/90"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            {/* Team Members List */}
            <ScrollArea className="h-96">
              <div className="space-y-2">
                {teamMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center gap-3 p-3 glass rounded-xl hover:bg-white/10 transition-all"
                  >
                    <Avatar>
                      <AvatarFallback className="bg-gradient-secondary text-white">
                        {member.fullName[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-semibold text-white">{member.fullName}</p>
                      <p className="text-sm text-gray-400">{member.email}</p>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        if (selectedCompany) {
                          removeTeamMemberMutation.mutate({
                            companyId: selectedCompany.id,
                            userId: member.id,
                          });
                        }
                      }}
                      className="glass hover:bg-white/10 hover:text-red-400"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      {/* Files Dialog */}
      <Dialog open={isFilesDialogOpen} onOpenChange={setIsFilesDialogOpen}>
        <DialogContent className="glass-dark border-white/10 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">
              ملفات {selectedCompany?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Add File */}
            <div className="flex gap-2">
              <Input
                placeholder="اسم الملف"
                value={newFile.name}
                onChange={(e) => setNewFile({ ...newFile, name: e.target.value })}
                className="glass border-white/10 text-white"
              />
              <Input
                placeholder="رابط الملف"
                value={newFile.fileUrl}
                onChange={(e) => setNewFile({ ...newFile, fileUrl: e.target.value })}
                className="glass border-white/10 text-white"
              />
              <Button
                onClick={() => {
                  if (selectedCompany && newFile.name && newFile.fileUrl) {
                    addFileMutation.mutate({
                      companyId: selectedCompany.id,
                      name: newFile.name,
                      fileUrl: newFile.fileUrl,
                    });
                  }
                }}
                disabled={!newFile.name || !newFile.fileUrl}
                className="bg-gradient-primary hover:bg-gradient-primary/90"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            {/* Files List */}
            <ScrollArea className="h-96">
              <div className="space-y-2">
                {companyFiles.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center gap-3 p-3 glass rounded-xl hover:bg-white/10 transition-all"
                  >
                    <FileText className="w-5 h-5 text-primary" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white truncate">{file.name}</p>
                      <a
                        href={file.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-gray-400 hover:text-primary transition-colors truncate block"
                      >
                        {file.fileUrl}
                      </a>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => window.open(file.fileUrl, '_blank')}
                        className="glass hover:bg-white/10"
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          if (selectedCompany) {
                            deleteFileMutation.mutate({
                              companyId: selectedCompany.id,
                              fileId: file.id,
                            });
                          }
                        }}
                        className="glass hover:bg-white/10 hover:text-red-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
