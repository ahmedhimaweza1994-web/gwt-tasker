import { useState } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useSidebar } from "@/contexts/sidebar-context";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import Navigation from "@/components/navigation";
import Sidebar from "@/components/sidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Mail,
  Calendar,
  Briefcase,
  CheckCircle,
  Users,
  Code,
  Edit,
  Save,
  X,
  Phone,
  MapPin,
  Trophy,
  Star,
  Target,
  TrendingUp,
  Clock,
  Award,
  Activity
} from "lucide-react";

export default function UserProfile() {
  const { id } = useParams();
  const { user: currentUser } = useAuth();
  const { isCollapsed } = useSidebar();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<any>({});
  const [profileImagePreview, setProfileImagePreview] = useState<string | null>(null);
  const [coverImagePreview, setCoverImagePreview] = useState<string | null>(null);

  const userId = id || currentUser?.id;
  const isOwnProfile = !id || id === currentUser?.id;

  const { data: profile, isLoading: profileLoading } = useQuery<any>({
    queryKey: ["/api/profile", userId],
    queryFn: async () => {
      const res = await fetch(`/api/profile/${userId}`);
      if (!res.ok) throw new Error("Failed to fetch profile");
      return res.json();
    },
    enabled: !!userId,
  });

  const { data: tasks } = useQuery<any[]>({
    queryKey: ["/api/tasks/my"],
    enabled: isOwnProfile,
  });

  const { data: auxSessions } = useQuery<any[]>({
    queryKey: ["/api/aux/sessions"],
    enabled: isOwnProfile,
  });

  const updateProfileMutation = useMutation({
    mutationFn: (data: any) => apiRequest("PUT", "/api/profile", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile", userId] });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      setIsEditing(false);
      toast({
        title: "تم التحديث بنجاح",
        description: "تم تحديث الملف الشخصي بنجاح",
      });
    },
    onError: () => {
      toast({
        title: "خطأ",
        description: "حدث خطأ في تحديث الملف الشخصي",
        variant: "destructive",
      });
    },
  });

  const handleEditClick = () => {
    setEditData({
      fullName: profile?.fullName || "",
      department: profile?.department || "",
      jobTitle: profile?.jobTitle || "",
      bio: profile?.bio || "",
      phoneNumber: profile?.phoneNumber || "",
      address: profile?.address || "",
    });
    setProfileImagePreview(null);
    setCoverImagePreview(null);
    setIsEditing(true);
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>, type: 'profile' | 'cover') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: "خطأ",
        description: "يرجى اختيار صورة فقط",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "خطأ",
        description: "حجم الصورة يجب أن يكون أقل من 5 ميجابايت",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      if (type === 'profile') {
        setProfileImagePreview(base64String);
        setEditData({ ...editData, profilePicture: base64String });
      } else {
        setCoverImagePreview(base64String);
        setEditData({ ...editData, coverImage: base64String });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    updateProfileMutation.mutate(editData);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditData({});
    setProfileImagePreview(null);
    setCoverImagePreview(null);
  };

  if (profileLoading || !profile) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="flex">
          <Sidebar />
          <main className={cn("flex-1 p-8 flex items-center justify-center transition-all duration-300", isCollapsed ? "mr-16" : "mr-64")}>
            <p className="text-muted-foreground">جاري التحميل...</p>
          </main>
        </div>
      </div>
    );
  }

  const completedTasks = tasks?.filter((t: any) => t.status === "completed").length || 0;
  const totalTasks = tasks?.length || 0;
  const productivity = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const pendingTasks = tasks?.filter((t: any) => t.status === "pending").length || 0;
  const inProgressTasks = tasks?.filter((t: any) => t.status === "in-progress").length || 0;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="flex">
        <Sidebar />
        <main className={cn("flex-1 transition-all duration-300", isCollapsed ? "mr-16" : "mr-64")}>
          {/* Modern Cover Section */}
          <div className="relative h-48 md:h-64 overflow-hidden group">
            {coverImagePreview || profile.coverImage ? (
              <img 
                src={coverImagePreview || profile.coverImage} 
                alt="Cover" 
                className="w-full h-full object-cover"
              />
            ) : (
              <>
                <div className="absolute inset-0 bg-gradient-to-br from-purple-600 via-blue-600 to-teal-500"></div>
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yLjIxIDEuNzktNCA0LTRzNCAxLjc5IDQgNC0xLjc5IDQtNCA0LTQtMS43OS00LTR6bTAgNGMwLTIuMjEgMS43OS00IDQtNHM0IDEuNzkgNCA0LTEuNzkgNC00IDQtNC0xLjc5LTQtNHptLTIwIDRjMC0yLjIxIDEuNzktNCA0LTRzNCAxLjc5IDQgNC0xLjc5IDQtNCA0LTQtMS43OS00LTR6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-30"></div>
              </>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
            
            {isOwnProfile && isEditing && (
              <div className="absolute top-4 right-4">
                <label htmlFor="cover-upload" className="cursor-pointer">
                  <Button 
                    type="button" 
                    size="sm" 
                    className="gap-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm"
                    onClick={() => document.getElementById('cover-upload')?.click()}
                  >
                    <Edit className="w-4 h-4" />
                    تغيير الغلاف
                  </Button>
                </label>
                <input
                  id="cover-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleImageChange(e, 'cover')}
                />
              </div>
            )}
          </div>

          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-0 max-w-7xl">
            {/* Profile Header */}
            <div className="relative -mt-16 sm:-mt-20 mb-8">
              <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-start">
                {/* Avatar */}
                <div className="relative group">
                  <Avatar className="w-28 h-28 sm:w-32 sm:h-32 md:w-36 md:h-36 border-4 border-background shadow-2xl ring-4 ring-primary/20">
                    <AvatarImage src={profileImagePreview || profile.profilePicture} alt={profile.fullName} />
                    <AvatarFallback className="text-3xl font-bold bg-gradient-to-br from-primary to-secondary text-white">
                      {profile.fullName?.split(" ")[0]?.charAt(0) || "م"}
                    </AvatarFallback>
                  </Avatar>
                  
                  {isOwnProfile && isEditing && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                      <label htmlFor="profile-upload" className="cursor-pointer">
                        <Button 
                          type="button" 
                          size="sm" 
                          className="rounded-full gap-2"
                          onClick={() => document.getElementById('profile-upload')?.click()}
                        >
                          <Edit className="w-4 h-4" />
                          تغيير
                        </Button>
                      </label>
                      <input
                        id="profile-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleImageChange(e, 'profile')}
                      />
                    </div>
                  )}
                </div>

                {/* User Info & Actions */}
                <div className="flex-1 bg-card rounded-xl p-4 sm:p-6 shadow-lg border border-border">
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-start gap-3 mb-2">
                        <h1 className="text-2xl sm:text-3xl font-bold text-foreground" data-testid="text-user-fullname">
                          {profile.fullName}
                        </h1>
                        {profile.role === 'admin' && (
                          <Badge className="bg-purple-600 hover:bg-purple-700">
                            <Award className="w-3 h-3 mr-1" />
                            Admin
                          </Badge>
                        )}
                      </div>
                      
                      <p className="text-lg text-muted-foreground mb-4 flex items-center gap-2" data-testid="text-user-jobtitle">
                        <Briefcase className="w-4 h-4" />
                        {profile.jobTitle || "لا يوجد مسمى وظيفي"}
                      </p>

                      <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-sm">
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-lg">
                          <Users className="w-4 h-4 text-primary" />
                          <span className="font-medium" data-testid="text-user-department">{profile.department}</span>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-lg">
                          <Mail className="w-4 h-4 text-primary" />
                          <span data-testid="text-user-email">{profile.email}</span>
                        </div>
                        {profile.phoneNumber && (
                          <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-lg">
                            <Phone className="w-4 h-4 text-primary" />
                            <span data-testid="text-user-phone">{profile.phoneNumber}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-lg">
                          <Calendar className="w-4 h-4 text-primary" />
                          <span>انضم {new Date(profile.hireDate).toLocaleDateString("ar-SA", { year: "numeric", month: "long" })}</span>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    {isOwnProfile && (
                      <div className="flex gap-2">
                        {!isEditing ? (
                          <Button onClick={handleEditClick} data-testid="button-edit-profile" className="shadow-lg">
                            <Edit className="w-4 h-4 ml-2" />
                            تعديل الملف
                          </Button>
                        ) : (
                          <>
                            <Button
                              onClick={handleSave}
                              disabled={updateProfileMutation.isPending}
                              data-testid="button-save-profile"
                              className="shadow-lg"
                            >
                              <Save className="w-4 h-4 ml-2" />
                              حفظ
                            </Button>
                            <Button variant="outline" onClick={handleCancel} data-testid="button-cancel-edit">
                              <X className="w-4 h-4 ml-2" />
                              إلغاء
                            </Button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            {isOwnProfile && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <Card className="border-l-4 border-l-blue-500 hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">إجمالي المهام</p>
                        <p className="text-3xl font-bold text-foreground" data-testid="text-total-tasks">{totalTasks}</p>
                      </div>
                      <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                        <Target className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-green-500 hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">مهام مكتملة</p>
                        <p className="text-3xl font-bold text-foreground" data-testid="text-completed-tasks">{completedTasks}</p>
                      </div>
                      <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                        <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-purple-500 hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">نسبة الإنجاز</p>
                        <p className="text-3xl font-bold text-foreground" data-testid="text-productivity-percentage">{productivity}%</p>
                      </div>
                      <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
                        <TrendingUp className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-yellow-500 hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">نقاط المكافأة</p>
                        <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-500" data-testid="text-total-points">{profile.totalPoints || 0}</p>
                      </div>
                      <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg flex items-center justify-center">
                        <Trophy className="w-6 h-6 text-yellow-600 dark:text-yellow-500 animate-pulse" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Tabbed Content */}
            <Tabs defaultValue="overview" className="pb-12">
              <TabsList className="grid w-full max-w-md grid-cols-3 mb-6">
                <TabsTrigger value="overview" className="gap-2">
                  <Activity className="w-4 h-4" />
                  نظرة عامة
                </TabsTrigger>
                <TabsTrigger value="tasks" className="gap-2">
                  <Target className="w-4 h-4" />
                  المهام
                </TabsTrigger>
                <TabsTrigger value="about" className="gap-2">
                  <Users className="w-4 h-4" />
                  عن المستخدم
                </TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Task Breakdown */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Target className="w-5 h-5 text-primary" />
                        توزيع المهام
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/40 rounded-lg flex items-center justify-center">
                            <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                          </div>
                          <span className="font-medium">مهام معلقة</span>
                        </div>
                        <span className="text-xl font-bold text-blue-600 dark:text-blue-400">{pendingTasks}</span>
                      </div>
                      
                      <div className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/40 rounded-lg flex items-center justify-center">
                            <Code className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                          </div>
                          <span className="font-medium">مهام جارية</span>
                        </div>
                        <span className="text-xl font-bold text-orange-600 dark:text-orange-400">{inProgressTasks}</span>
                      </div>

                      <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-green-100 dark:bg-green-900/40 rounded-lg flex items-center justify-center">
                            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                          </div>
                          <span className="font-medium">مهام مكتملة</span>
                        </div>
                        <span className="text-xl font-bold text-green-600 dark:text-green-400">{completedTasks}</span>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Performance Stats */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-primary" />
                        الأداء والإحصائيات
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">معدل الإنجاز</span>
                          <span className="text-sm font-bold text-primary">{productivity}%</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-500"
                            style={{ width: `${productivity}%` }}
                          ></div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 pt-4">
                        <div className="text-center p-4 bg-muted/50 rounded-lg">
                          <Star className="w-6 h-6 text-yellow-500 mx-auto mb-2" />
                          <p className="text-2xl font-bold text-foreground">{profile.totalPoints || 0}</p>
                          <p className="text-xs text-muted-foreground">نقاط الأداء</p>
                        </div>
                        <div className="text-center p-4 bg-muted/50 rounded-lg">
                          <Award className="w-6 h-6 text-purple-500 mx-auto mb-2" />
                          <p className="text-2xl font-bold text-foreground">A+</p>
                          <p className="text-xs text-muted-foreground">التقييم</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Tasks Tab */}
              <TabsContent value="tasks" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>المهام الأخيرة</CardTitle>
                    <CardDescription>آخر المهام التي تم العمل عليها</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {tasks && tasks.length > 0 ? (
                      <div className="space-y-3">
                        {tasks.slice(0, 5).map((task: any) => (
                          <div key={task.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                            <div className="flex items-center gap-3">
                              {task.status === "completed" ? (
                                <CheckCircle className="w-5 h-5 text-green-500" />
                              ) : task.status === "in-progress" ? (
                                <Code className="w-5 h-5 text-orange-500" />
                              ) : (
                                <Clock className="w-5 h-5 text-blue-500" />
                              )}
                              <div>
                                <p className="font-medium">{task.title}</p>
                                <p className="text-sm text-muted-foreground">{task.description}</p>
                              </div>
                            </div>
                            <Badge variant={task.status === "completed" ? "default" : "secondary"}>
                              {task.status === "completed" ? "مكتملة" : task.status === "in-progress" ? "جارية" : "معلقة"}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <Target className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">لا توجد مهام حالياً</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* About Tab */}
              <TabsContent value="about" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>المعلومات الشخصية</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {isEditing ? (
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="fullName">الاسم الكامل</Label>
                          <Input
                            id="fullName"
                            value={editData.fullName || ""}
                            onChange={(e) => setEditData({ ...editData, fullName: e.target.value })}
                            data-testid="input-edit-fullname"
                          />
                        </div>
                        <div>
                          <Label htmlFor="department">القسم</Label>
                          <Input
                            id="department"
                            value={editData.department || ""}
                            onChange={(e) => setEditData({ ...editData, department: e.target.value })}
                            data-testid="input-edit-department"
                          />
                        </div>
                        <div>
                          <Label htmlFor="jobTitle">المسمى الوظيفي</Label>
                          <Input
                            id="jobTitle"
                            value={editData.jobTitle || ""}
                            onChange={(e) => setEditData({ ...editData, jobTitle: e.target.value })}
                            data-testid="input-edit-jobtitle"
                          />
                        </div>
                        <div>
                          <Label htmlFor="phoneNumber">رقم الهاتف</Label>
                          <Input
                            id="phoneNumber"
                            value={editData.phoneNumber || ""}
                            onChange={(e) => setEditData({ ...editData, phoneNumber: e.target.value })}
                            data-testid="input-edit-phone"
                          />
                        </div>
                        <div>
                          <Label htmlFor="address">العنوان</Label>
                          <Input
                            id="address"
                            value={editData.address || ""}
                            onChange={(e) => setEditData({ ...editData, address: e.target.value })}
                            data-testid="input-edit-address"
                          />
                        </div>
                        <div>
                          <Label htmlFor="bio">نبذة عني</Label>
                          <Textarea
                            id="bio"
                            rows={4}
                            value={editData.bio || ""}
                            onChange={(e) => setEditData({ ...editData, bio: e.target.value })}
                            placeholder="اكتب نبذة مختصرة عنك..."
                            data-testid="input-edit-bio"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                            <Briefcase className="w-5 h-5 text-primary mt-0.5" />
                            <div>
                              <p className="text-sm text-muted-foreground">المسمى الوظيفي</p>
                              <p className="font-medium">{profile.jobTitle || "غير محدد"}</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                            <Users className="w-5 h-5 text-primary mt-0.5" />
                            <div>
                              <p className="text-sm text-muted-foreground">القسم</p>
                              <p className="font-medium">{profile.department}</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                            <Phone className="w-5 h-5 text-primary mt-0.5" />
                            <div>
                              <p className="text-sm text-muted-foreground">رقم الهاتف</p>
                              <p className="font-medium">{profile.phoneNumber || "غير محدد"}</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                            <MapPin className="w-5 h-5 text-primary mt-0.5" />
                            <div>
                              <p className="text-sm text-muted-foreground">العنوان</p>
                              <p className="font-medium">{profile.address || "غير محدد"}</p>
                            </div>
                          </div>
                        </div>

                        {profile.bio && (
                          <div className="p-4 bg-muted/50 rounded-lg">
                            <p className="text-sm text-muted-foreground mb-2">نبذة عني</p>
                            <p className="text-foreground leading-relaxed">{profile.bio}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  );
}
