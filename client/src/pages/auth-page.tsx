import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocation } from "wouter";
import { CheckCircle, Users, Clock, BarChart3, Shield } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function AuthPage() {
  const { user, loginMutation, registerMutation } = useAuth();
  const [, setLocation] = useLocation();

  const [loginForm, setLoginForm] = useState({
    email: "",
    password: "",
  });

  const [registerForm, setRegisterForm] = useState({
    email: "",
    password: "",
    fullName: "",
    department: "",
    jobTitle: "",
  });

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      setLocation("/");
    }
  }, [user, setLocation]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate(loginForm, {
      onSuccess: () => {
        setLocation("/");
      }
    });
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    registerMutation.mutate(registerForm, {
      onSuccess: () => {
        setLocation("/");
      }
    });
  };

  const departments = [
    "التطوير",
    "التصميم",
    "التسويق",
    "المبيعات",
    "الموارد البشرية",
    "المحاسبة",
    "خدمة العملاء",
    "الإدارة العامة"
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { x: -20, opacity: 0 },
    visible: {
      x: 0,
      opacity: 1,
      transition: { duration: 0.5 }
    }
  };

  const features = [
    {
      icon: Users,
      title: "إدارة الفرق",
      description: "تتبع نشاط الموظفين وإدارة المهام بكفاءة عالية"
    },
    {
      icon: Clock,
      title: "تتبع الوقت الفعلي",
      description: "مراقبة أوقات العمل والاستراحة بدقة عالية"
    },
    {
      icon: BarChart3,
      title: "تقارير وتحليلات",
      description: "رؤى شاملة عن الأداء والإنتاجية"
    },
    {
      icon: Shield,
      title: "أمان وموثوقية",
      description: "حماية بيانات موظفيك مع أعلى معايير الأمان"
    }
  ];

  return (
    <div className="min-h-screen flex bg-background">
      {/* Hero Section */}
      <motion.div 
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary via-secondary to-accent p-12 text-primary-foreground relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yLjIxIDEuNzktNCA0LTRzNCAxLjc5IDQgNC0xLjc5IDQtNCA0LTQtMS43OS00LTR6bTAgNGMwLTIuMjEgMS43OS00IDQtNHM0IDEuNzkgNCA0LTEuNzkgNC00IDQtNC0xLjc5LTQtNHptLTIwIDRjMC0yLjIxIDEuNzktNCA0LTRzNCAxLjc5IDQgNC0xLjc5IDQtNCA0LTQtMS43OS00LTR6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-20"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent"></div>
        
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="relative z-10 flex flex-col justify-center"
        >
          <motion.div variants={itemVariants} className="mb-12">
            <motion.div 
              whileHover={{ scale: 1.05, rotate: 5 }}
              className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-3xl flex items-center justify-center mb-6 shadow-2xl"
            >
              <CheckCircle className="w-12 h-12" />
            </motion.div>
            <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-white to-white/80 bg-clip-text">
              GWT إدارة المهام
            </h1>
            <p className="text-xl opacity-90 leading-relaxed">
              نظام شامل لإدارة المهام والموظفين مع تتبع الوقت الفعلي
            </p>
          </motion.div>

          <div className="space-y-6">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                variants={itemVariants}
                whileHover={{ x: 10, scale: 1.02 }}
                className="flex items-start gap-4 p-4 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-all"
              >
                <motion.div 
                  whileHover={{ rotate: 360 }}
                  transition={{ duration: 0.6 }}
                  className="w-12 h-12 bg-white/10 backdrop-blur-sm rounded-lg flex items-center justify-center flex-shrink-0"
                >
                  <feature.icon className="w-6 h-6" />
                </motion.div>
                <div>
                  <h3 className="font-semibold mb-2 text-lg">{feature.title}</h3>
                  <p className="text-sm opacity-75 leading-relaxed">{feature.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </motion.div>

      {/* Auth Form Section */}
      <motion.div 
        initial={{ x: 100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-background"
      >
        <div className="w-full max-w-md">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-center mb-8 lg:hidden"
          >
            <motion.div 
              whileHover={{ scale: 1.1, rotate: 5 }}
              className="w-16 h-16 bg-gradient-to-br from-primary to-accent rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg"
            >
              <CheckCircle className="w-10 h-10 text-primary-foreground" />
            </motion.div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              GWT إدارة المهام
            </h2>
          </motion.div>

          <Tabs defaultValue="login" className="w-full">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login">تسجيل الدخول</TabsTrigger>
                <TabsTrigger value="register">حساب جديد</TabsTrigger>
              </TabsList>
            </motion.div>

            <TabsContent value="login">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="border-2 hover:border-primary/50 transition-all duration-300 shadow-xl">
                  <CardHeader>
                    <CardTitle className="text-2xl">تسجيل الدخول</CardTitle>
                    <CardDescription>
                      أدخل بريدك الإلكتروني وكلمة المرور للوصول إلى حسابك
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-email">البريد الإلكتروني</Label>
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="البريد الإلكتروني"
                        value={loginForm.email}
                        onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                        required
                        data-testid="login-email-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="login-password">كلمة المرور</Label>
                      <Input
                        id="login-password"
                        type="password"
                        placeholder="••••••••"
                        value={loginForm.password}
                        onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                        required
                        data-testid="login-password-input"
                      />
                    </div>
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Button 
                        type="submit" 
                        className="w-full shadow-lg hover:shadow-xl transition-all" 
                        disabled={loginMutation.isPending}
                        data-testid="login-submit-button"
                      >
                        {loginMutation.isPending ? "جاري تسجيل الدخول..." : "تسجيل الدخول"}
                      </Button>
                    </motion.div>
                  </form>
                </CardContent>
              </Card>
              </motion.div>
            </TabsContent>

            <TabsContent value="register">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="border-2 hover:border-accent/50 transition-all duration-300 shadow-xl">
                  <CardHeader>
                    <CardTitle className="text-2xl">إنشاء حساب جديد</CardTitle>
                    <CardDescription>
                      أدخل بياناتك لإنشاء حساب جديد في النظام
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleRegister} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="register-name">الاسم الكامل</Label>
                      <Input
                        id="register-name"
                        type="text"
                        placeholder="أحمد محمد علي"
                        value={registerForm.fullName}
                        onChange={(e) => setRegisterForm({ ...registerForm, fullName: e.target.value })}
                        required
                        data-testid="register-name-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="register-email">البريد الإلكتروني</Label>
                      <Input
                        id="register-email"
                        type="email"
                        placeholder="البريد الإلكتروني"
                        value={registerForm.email}
                        onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                        required
                        data-testid="register-email-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="register-password">كلمة المرور</Label>
                      <Input
                        id="register-password"
                        type="password"
                        placeholder="••••••••"
                        value={registerForm.password}
                        onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                        required
                        data-testid="register-password-input"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="register-department">القسم</Label>
                        <Select
                          value={registerForm.department}
                          onValueChange={(value) => setRegisterForm({ ...registerForm, department: value })}
                          required
                        >
                          <SelectTrigger data-testid="register-department-select">
                            <SelectValue placeholder="اختر القسم" />
                          </SelectTrigger>
                          <SelectContent>
                            {departments.map((dept) => (
                              <SelectItem key={dept} value={dept}>
                                {dept}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="register-job">المسمى الوظيفي</Label>
                        <Input
                          id="register-job"
                          type="text"
                          placeholder="مطور ويب"
                          value={registerForm.jobTitle}
                          onChange={(e) => setRegisterForm({ ...registerForm, jobTitle: e.target.value })}
                          data-testid="register-job-input"
                        />
                      </div>
                    </div>
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Button 
                        type="submit" 
                        className="w-full shadow-lg hover:shadow-xl transition-all" 
                        disabled={registerMutation.isPending}
                        data-testid="register-submit-button"
                      >
                        {registerMutation.isPending ? "جاري إنشاء الحساب..." : "إنشاء الحساب"}
                      </Button>
                    </motion.div>
                  </form>
                </CardContent>
              </Card>
              </motion.div>
            </TabsContent>
          </Tabs>
        </div>
      </motion.div>
    </div>
  );
}
