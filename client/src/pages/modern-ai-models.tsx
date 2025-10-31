import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Send, Zap, Brain, Cpu } from "lucide-react";
import Background3D from "@/components/3d-background";
import ModernNavigation from "@/components/modern-navigation";
import ModernSidebar from "@/components/modern-sidebar";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export default function ModernAIModels() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState("gpt-4");

  const models = [
    {
      id: "gpt-4",
      name: "GPT-4",
      description: "النموذج الأكثر تقدماً للمهام المعقدة",
      icon: Brain,
      gradient: "from-purple-500 to-pink-500",
    },
    {
      id: "gpt-3.5",
      name: "GPT-3.5",
      description: "نموذج سريع للمهام العامة",
      icon: Zap,
      gradient: "from-blue-500 to-cyan-500",
    },
    {
      id: "claude",
      name: "Claude",
      description: "مساعد ذكي للمحادثات الطويلة",
      icon: Cpu,
      gradient: "from-orange-500 to-red-500",
    },
  ];

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
    };

    setMessages([...messages, userMessage]);
    setInput("");
    setIsLoading(true);

    // Simulate API call
    setTimeout(() => {
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `هذه استجابة تجريبية من ${models.find(m => m.id === selectedModel)?.name}. في التطبيق الفعلي، سيتم الاتصال بالـ API الخاص بالنموذج.`,
      };
      setMessages(prev => [...prev, aiMessage]);
      setIsLoading(false);
    }, 1000);
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
            <div className="p-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 shadow-lg">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">مساعد الذكاء الاصطناعي</h1>
              <p className="text-gray-400 mt-1">اختر نموذج AI وابدأ المحادثة</p>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Models Sidebar */}
          <div className="lg:col-span-1">
            <Card className="glass-dark border-white/10 shadow-glow">
              <CardContent className="p-6">
                <h2 className="text-lg font-bold text-white mb-4">النماذج المتاحة</h2>
                <div className="space-y-3">
                  {models.map((model, index) => (
                    <motion.div
                      key={model.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <button
                        onClick={() => setSelectedModel(model.id)}
                        className={cn(
                          "w-full p-4 rounded-xl transition-all text-right",
                          selectedModel === model.id
                            ? "glass-dark shadow-glow"
                            : "glass hover:bg-white/5"
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <div className={cn(
                            "p-2 rounded-lg bg-gradient-to-r",
                            model.gradient
                          )}>
                            <model.icon className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-white mb-1">{model.name}</h3>
                            <p className="text-xs text-gray-400">{model.description}</p>
                          </div>
                        </div>
                        {selectedModel === model.id && (
                          <motion.div
                            layoutId="selectedModel"
                            className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-white/0 via-white to-white/0 rounded-full"
                            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                          />
                        )}
                      </button>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Chat Area */}
          <div className="lg:col-span-3">
            <Card className="glass-dark border-white/10 shadow-glow h-[calc(100vh-20rem)] flex flex-col">
              <CardContent className="p-6 flex-1 flex flex-col">
                {/* Messages */}
                <div className="flex-1 overflow-y-auto mb-4 space-y-4">
                  <AnimatePresence>
                    {messages.length === 0 ? (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex items-center justify-center h-full"
                      >
                        <div className="text-center">
                          <Sparkles className="w-20 h-20 text-gray-500 mx-auto mb-4 opacity-50" />
                          <p className="text-xl text-gray-400">ابدأ محادثة مع مساعد الذكاء الاصطناعي</p>
                        </div>
                      </motion.div>
                    ) : (
                      messages.map((message, index) => (
                        <motion.div
                          key={message.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className={cn(
                            "flex gap-3",
                            message.role === "user" ? "flex-row-reverse" : "flex-row"
                          )}
                        >
                          <div className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                            message.role === "user"
                              ? "bg-gradient-primary"
                              : "bg-gradient-secondary"
                          )}>
                            {message.role === "user" ? (
                              <span className="text-white font-bold">أ</span>
                            ) : (
                              <Sparkles className="w-5 h-5 text-white" />
                            )}
                          </div>
                          <div className={cn(
                            "flex-1 max-w-[80%] p-4 rounded-2xl",
                            message.role === "user"
                              ? "glass-dark bg-gradient-primary/10"
                              : "glass"
                          )}>
                            <p className="text-white whitespace-pre-wrap">{message.content}</p>
                          </div>
                        </motion.div>
                      ))
                    )}
                  </AnimatePresence>
                  {isLoading && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex gap-3"
                    >
                      <div className="w-10 h-10 rounded-full bg-gradient-secondary flex items-center justify-center">
                        <Sparkles className="w-5 h-5 text-white" />
                      </div>
                      <div className="glass p-4 rounded-2xl">
                        <div className="flex gap-2">
                          <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                          <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                          <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* Input */}
                <div className="flex items-end gap-2">
                  <Textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder="اكتب رسالتك..."
                    className="glass border-white/10 text-white resize-none min-h-[60px] max-h-[120px]"
                  />
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button
                      onClick={handleSendMessage}
                      disabled={!input.trim() || isLoading}
                      className="bg-gradient-primary hover:bg-gradient-primary/90 shadow-glow h-[60px] px-6"
                    >
                      <Send className="w-5 h-5" />
                    </Button>
                  </motion.div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
