import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Brain, Settings, Zap, MessageSquare, CheckCircle, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import Navigation from "@/components/navigation";
import Sidebar from "@/components/sidebar";

interface AIModel {
  id: string;
  name: string;
  provider: string;
  description: string;
  icon: string;
}

// Popular OpenRouter models
const OPENROUTER_MODELS: AIModel[] = [
  {
    id: "anthropic/claude-3.5-sonnet",
    name: "Claude 3.5 Sonnet",
    provider: "Anthropic",
    description: "Most intelligent model, best for complex tasks",
    icon: "🤖"
  },
  {
    id: "openai/gpt-4-turbo",
    name: "GPT-4 Turbo",
    provider: "OpenAI",
    description: "Advanced reasoning and analysis",
    icon: "✨"
  },
  {
    id: "google/gemini-pro",
    name: "Gemini Pro",
    provider: "Google",
    description: "Multimodal AI model",
    icon: "💎"
  },
  {
    id: "meta-llama/llama-3-70b",
    name: "Llama 3 70B",
    provider: "Meta",
    description: "Open source, powerful model",
    icon: "🦙"
  },
];

export default function AIModels() {
  const { toast } = useToast();
  const [selectedModel, setSelectedModel] = useState<AIModel | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [apiKey, setApiKey] = useState(localStorage.getItem('openrouter_api_key') || '');
  const [testingConnection, setTestingConnection] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{ role: string; content: string }>>([]);
  const [messageInput, setMessageInput] = useState('');
  const [modelSettings, setModelSettings] = useState({
    temperature: 0.7,
    maxTokens: 1000,
    systemPrompt: 'أنت مساعد ذكي مفيد. الرجاء الإجابة باللغة العربية.',
  });

  const testConnection = async () => {
    if (!apiKey.trim()) {
      toast({
        title: "خطأ",
        description: "الرجاء إدخال مفتاح API",
        variant: "destructive",
      });
      return;
    }

    setTestingConnection(true);
    try {
      const response = await fetch('https://openrouter.ai/api/v1/models', {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      });

      if (response.ok) {
        localStorage.setItem('openrouter_api_key', apiKey);
        setIsConnected(true);
        toast({
          title: "تم الاتصال بنجاح",
          description: "تم التحقق من مفتاح API",
        });
      } else {
        throw new Error('Invalid API key');
      }
    } catch (error) {
      setIsConnected(false);
      toast({
        title: "فشل الاتصال",
        description: "مفتاح API غير صالح",
        variant: "destructive",
      });
    } finally {
      setTestingConnection(false);
    }
  };

  const sendMessage = async () => {
    if (!messageInput.trim() || !selectedModel || !isConnected) return;

    const userMessage = { role: 'user', content: messageInput };
    setChatMessages(prev => [...prev, userMessage]);
    setMessageInput('');

    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': window.location.origin,
        },
        body: JSON.stringify({
          model: selectedModel.id,
          messages: [
            { role: 'system', content: modelSettings.systemPrompt },
            ...chatMessages,
            userMessage,
          ],
          temperature: modelSettings.temperature,
          max_tokens: modelSettings.maxTokens,
        }),
      });

      const data = await response.json();

      if (data.choices && data.choices[0]) {
        const assistantMessage = {
          role: 'assistant',
          content: data.choices[0].message.content,
        };
        setChatMessages(prev => [...prev, assistantMessage]);
      }
    } catch (error) {
      toast({
        title: "خطأ",
        description: "فشل إرسال الرسالة",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <Sidebar />
      <main className="mr-64 mt-16 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-4xl font-bold text-foreground mb-2">نماذج الذكاء الاصطناعي</h1>
              <p className="text-muted-foreground">اتصل بنماذج AI المتقدمة عبر OpenRouter</p>
            </div>
            <div className="flex items-center gap-2">
              {isConnected ? (
                <Badge className="bg-success text-white">
                  <CheckCircle className="w-3 h-3 ml-1" />
                  متصل
                </Badge>
              ) : (
                <Badge variant="destructive">
                  <XCircle className="w-3 h-3 ml-1" />
                  غير متصل
                </Badge>
              )}
            </div>
          </div>

          {/* API Key Setup */}
          {!isConnected && (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>إعداد الاتصال</CardTitle>
                <CardDescription>أدخل مفتاح OpenRouter API للبدء</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="api-key">مفتاح API</Label>
                  <div className="flex gap-2">
                    <Input
                      id="api-key"
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="sk-or-v1-..."
                      className="flex-1"
                    />
                    <Button onClick={testConnection} disabled={testingConnection}>
                      {testingConnection ? "جاري الاختبار..." : "اتصال"}
                    </Button>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  احصل على مفتاح API من{" "}
                  <a
                    href="https://openrouter.ai/keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    OpenRouter.ai
                  </a>
                </p>
              </CardContent>
            </Card>
          )}

          {/* Models Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {OPENROUTER_MODELS.map((model) => (
              <Card
                key={model.id}
                className={`hover:shadow-lg transition-all cursor-pointer ${
                  selectedModel?.id === model.id ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => setSelectedModel(model)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-1">{model.name}</CardTitle>
                      <CardDescription>{model.provider}</CardDescription>
                    </div>
                    <span className="text-3xl">{model.icon}</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">{model.description}</p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedModel(model);
                        setSettingsOpen(true);
                      }}
                      disabled={!isConnected}
                    >
                      <Settings className="w-4 h-4 ml-1" />
                      إعدادات
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedModel(model);
                        setChatOpen(true);
                        setChatMessages([]);
                      }}
                      disabled={!isConnected}
                    >
                      <MessageSquare className="w-4 h-4 ml-1" />
                      دردشة
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>

      {/* Settings Dialog */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>إعدادات {selectedModel?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>درجة الحرارة ({modelSettings.temperature})</Label>
              <Input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={modelSettings.temperature}
                onChange={(e) => setModelSettings({ ...modelSettings, temperature: parseFloat(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label>الحد الأقصى للرموز</Label>
              <Input
                type="number"
                value={modelSettings.maxTokens}
                onChange={(e) => setModelSettings({ ...modelSettings, maxTokens: parseInt(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label>رسالة النظام</Label>
              <Textarea
                value={modelSettings.systemPrompt}
                onChange={(e) => setModelSettings({ ...modelSettings, systemPrompt: e.target.value })}
                rows={4}
              />
            </div>
            <Button className="w-full" onClick={() => setSettingsOpen(false)}>
              حفظ
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Chat Dialog */}
      <Dialog open={chatOpen} onOpenChange={setChatOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh]" dir="rtl">
          <DialogHeader>
            <DialogTitle>دردشة مع {selectedModel?.name}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col h-[500px]">
            <div className="flex-1 overflow-y-auto space-y-4 mb-4">
              {chatMessages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}
                >
                  <div
                    className={`max-w-[80%] p-3 rounded-lg ${
                      msg.role === 'user'
                        ? 'bg-primary text-white'
                        : 'bg-muted'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="اكتب رسالتك..."
                className="flex-1"
              />
              <Button onClick={sendMessage}>
                إرسال
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
