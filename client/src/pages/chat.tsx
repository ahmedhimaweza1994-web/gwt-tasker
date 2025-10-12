import { useState, useEffect, useRef } from "react";
import { useSidebar } from "@/contexts/sidebar-context";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import Navigation from "@/components/navigation";
import Sidebar from "@/components/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  Send, MessageSquare, Users, Smile, Paperclip, Mic, 
  X, Reply, Image as ImageIcon, File, Download, AtSign,
  Phone, PhoneOff 
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useWebSocket } from "@/lib/websocket";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

interface User {
  id: string;
  fullName: string;
  email: string;
}

interface ChatRoom {
  id: string;
  name?: string;
  type: 'private' | 'group';
  members: User[];
  lastMessage?: any;
}

interface ChatMessage {
  id: string;
  content?: string;
  messageType: string;
  senderId: string;
  sender: User;
  reactions: any[];
  createdAt: string;
  attachments?: any[];
  replyTo?: string;
}

export default function Chat() {
  const { user } = useAuth();
  const { isCollapsed } = useSidebar();
  const { toast } = useToast();
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const [messageText, setMessageText] = useState("");
  const [createRoomOpen, setCreateRoomOpen] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudio, setRecordedAudio] = useState<Blob | null>(null);
  const [mentionSearch, setMentionSearch] = useState("");
  const [showMentions, setShowMentions] = useState(false);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [openReactionPopover, setOpenReactionPopover] = useState<string | null>(null);
  const [ringtone, setRingtone] = useState<HTMLAudioElement | null>(null);
  const [isInCall, setIsInCall] = useState(false);
  const [incomingCall, setIncomingCall] = useState<{ from: User; roomId: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const activeCallRoomIdRef = useRef<string | null>(null);
  const { isConnected, lastMessage, sendMessage } = useWebSocket();

  const { data: rooms = [] } = useQuery<ChatRoom[]>({
    queryKey: ["/api/chat/rooms"],
    refetchInterval: 3000,
  });

  const { data: messages = [] } = useQuery<ChatMessage[]>({
    queryKey: ["/api/chat/messages", selectedRoom?.id],
    enabled: !!selectedRoom,
    refetchInterval: 2000,
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/chat/messages", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/messages", selectedRoom?.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/chat/rooms"] });
      setMessageText("");
      setReplyingTo(null);
      setAttachments([]);
      setRecordedAudio(null);
    },
  });

  const createRoomMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/chat/rooms", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/rooms"] });
      setCreateRoomOpen(false);
      setNewRoomName("");
      setSelectedMembers([]);
      toast({
        title: "تم إنشاء الغرفة",
        description: "تم إنشاء غرفة الدردشة بنجاح",
      });
    },
  });

  const startPrivateChatMutation = useMutation({
    mutationFn: async (otherUserId: string) => {
      const res = await apiRequest("POST", "/api/chat/private", { otherUserId });
      return res.json();
    },
    onSuccess: (room) => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/rooms"] });
      setSelectedRoom(room);
    },
  });

  const addReactionMutation = useMutation({
    mutationFn: async ({ messageId, emoji }: { messageId: string; emoji: string }) => {
      const res = await apiRequest("POST", "/api/chat/reactions", { messageId, emoji });
      return res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/messages", selectedRoom?.id] });
      setOpenReactionPopover(null);
    },
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newAttachments = await Promise.all(
      Array.from(files).map(async (file) => {
        const reader = new FileReader();
        return new Promise<any>((resolve) => {
          reader.onloadend = () => {
            resolve({
              name: file.name,
              type: file.type.startsWith("image/") ? "image" : "file",
              url: reader.result as string,
              size: file.size,
            });
          };
          reader.readAsDataURL(file);
        });
      })
    );

    setAttachments([...attachments, ...newAttachments]);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      const chunks: Blob[] = [];

      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: "audio/webm" });
        setRecordedAudio(blob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      toast({
        title: "خطأ",
        description: "لا يمكن الوصول إلى الميكروفون",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleSendMessage = async () => {
    if (!selectedRoom) return;
    
    let content = messageText.trim();
    let messageType = "text";
    let messageAttachments = attachments;

    if (recordedAudio) {
      const reader = new FileReader();
      const audioDataUrl = await new Promise<string>((resolve) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(recordedAudio);
      });

      messageAttachments = [{
        name: "تسجيل صوتي",
        type: "audio",
        url: audioDataUrl,
      }];
      messageType = "file";
      content = "🎤 تسجيل صوتي";
    }

    if (!content && messageAttachments.length === 0) return;

    sendMessageMutation.mutate({
      roomId: selectedRoom.id,
      content: content || (messageAttachments.length > 0 ? "📎 مرفق" : ""),
      messageType: messageAttachments.length > 0 ? "file" : messageType,
      attachments: messageAttachments,
      replyTo: replyingTo?.id,
    });
  };

  const startCall = async () => {
    if (!selectedRoom || selectedRoom.type !== 'private') return;
    
    try {
      activeCallRoomIdRef.current = selectedRoom.id;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;
      
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });
      peerConnectionRef.current = pc;

      stream.getTracks().forEach(track => pc.addTrack(track, stream));
      
      pc.onicecandidate = (event) => {
        if (event.candidate && activeCallRoomIdRef.current) {
          sendMessage({ 
            type: 'ice_candidate', 
            roomId: activeCallRoomIdRef.current, 
            candidate: event.candidate 
          });
        }
      };

      pc.ontrack = (event) => {
        if (!remoteAudioRef.current) {
          remoteAudioRef.current = new Audio();
        }
        remoteAudioRef.current.srcObject = event.streams[0];
        remoteAudioRef.current.play();
        if (ringtone) {
          ringtone.pause();
          ringtone.currentTime = 0;
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      sendMessage({ 
        type: 'call_offer', 
        roomId: activeCallRoomIdRef.current, 
        offer 
      });
      
      if (ringtone) {
        ringtone.loop = true;
        ringtone.play().catch(console.error);
      }
      
      setIsInCall(true);
      toast({ title: "جاري الاتصال...", description: "انتظر إجابة المستخدم الآخر" });
    } catch (error) {
      toast({ title: "خطأ", description: "لا يمكن بدء المكالمة", variant: "destructive" });
    }
  };

  const endCall = (sendEndSignal = true) => {
    const callRoomId = activeCallRoomIdRef.current;
    
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (remoteAudioRef.current) {
      remoteAudioRef.current.pause();
      remoteAudioRef.current.srcObject = null;
    }
    if (ringtone) {
      ringtone.pause();
      ringtone.currentTime = 0;
    }
    setIsInCall(false);
    activeCallRoomIdRef.current = null;
    
    if (sendEndSignal && callRoomId) {
      sendMessage({ type: 'call_end', roomId: callRoomId });
    }
  };

  const handleCreateRoom = () => {
    if (!newRoomName.trim() || selectedMembers.length === 0) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال اسم الغرفة واختيار الأعضاء",
        variant: "destructive",
      });
      return;
    }

    createRoomMutation.mutate({
      name: newRoomName,
      type: "group",
      memberIds: selectedMembers,
    });
  };

  const insertMention = (userName: string) => {
    const newText = messageText + `@${userName} `;
    setMessageText(newText);
    setShowMentions(false);
    setMentionSearch("");
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const lastWord = messageText.split(" ").pop() || "";
    if (lastWord.startsWith("@") && lastWord.length > 1) {
      setMentionSearch(lastWord.slice(1));
      setShowMentions(true);
    } else {
      setShowMentions(false);
    }
  }, [messageText]);

  useEffect(() => {
    const ringtoneAudio = new Audio();
    ringtoneAudio.src = 'data:audio/mpeg;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAADhAC7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7v////////////////////////////////////////////////////////////////AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAAAAAAAAAAAA4SPI67WAAAAAAAAAAAAAAAAAAAAAAAA//tQZAAP8AAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAETEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//sUZJ4P8AAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAEVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVQ==';
    ringtoneAudio.volume = 0.5;
    setRingtone(ringtoneAudio);
    
    return () => {
      if (ringtoneAudio) {
        ringtoneAudio.pause();
        ringtoneAudio.src = '';
      }
    };
  }, []);

  useEffect(() => {
    if (!lastMessage) return;

    const handleCallMessage = async () => {
      const pc = peerConnectionRef.current;
      const activeRoomId = activeCallRoomIdRef.current;

      if (lastMessage.type === 'call_offer') {
        if (!activeRoomId) {
          activeCallRoomIdRef.current = lastMessage.roomId;
          const newPc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
          peerConnectionRef.current = newPc;
          
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          localStreamRef.current = stream;
          stream.getTracks().forEach(track => newPc.addTrack(track, stream));

          newPc.onicecandidate = (event) => {
            if (event.candidate && activeCallRoomIdRef.current) {
              sendMessage({ type: 'ice_candidate', roomId: activeCallRoomIdRef.current, candidate: event.candidate });
            }
          };

          newPc.ontrack = (event) => {
            if (!remoteAudioRef.current) {
              remoteAudioRef.current = new Audio();
            }
            remoteAudioRef.current.srcObject = event.streams[0];
            remoteAudioRef.current.play();
          };

          await newPc.setRemoteDescription(new RTCSessionDescription(lastMessage.offer));
          const answer = await newPc.createAnswer();
          await newPc.setLocalDescription(answer);
          sendMessage({ type: 'call_answer', roomId: lastMessage.roomId, answer });
          setIsInCall(true);
        }
      } else if (lastMessage.type === 'call_answer' && pc && lastMessage.roomId === activeRoomId) {
        await pc.setRemoteDescription(new RTCSessionDescription(lastMessage.answer));
      } else if (lastMessage.type === 'ice_candidate' && pc && lastMessage.roomId === activeRoomId) {
        await pc.addIceCandidate(new RTCIceCandidate(lastMessage.candidate));
      } else if (lastMessage.type === 'call_end' && lastMessage.roomId === activeRoomId) {
        endCall(false);
      }
    };

    handleCallMessage().catch(console.error);
  }, [lastMessage]);

  const getRoomName = (room: ChatRoom) => {
    if (room.type === 'group') return room.name || 'غرفة جماعية';
    const otherMember = room.members.find(m => m.id !== user?.id);
    return otherMember?.fullName || 'دردشة خاصة';
  };

  const getReplyMessage = (replyId?: string) => {
    return messages.find(m => m.id === replyId);
  };

  const reactions = ['👍', '❤️', '😂', '😮', '😢', '🎉', '🔥', '✨'];

  const sortedRooms = [...rooms].sort((a, b) => {
    if (a.name === 'الغرفة العامة') return -1;
    if (b.name === 'الغرفة العامة') return 1;
    return 0;
  });

  const filteredUsers = users
    .filter((u) => 
      u.id !== user?.id && 
      u.fullName.toLowerCase().includes(mentionSearch.toLowerCase())
    );

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 mr-64 h-screen flex">
          <div className="w-80 border-l border-border bg-card">
            <div className="p-4 border-b border-border">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">الدردشات</h2>
                <Dialog open={createRoomOpen} onOpenChange={setCreateRoomOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" data-testid="button-create-room">
                      <Users className="w-4 h-4 ml-2" />
                      غرفة جديدة
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>إنشاء غرفة دردشة</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="room-name">اسم الغرفة</Label>
                        <Input
                          id="room-name"
                          value={newRoomName}
                          onChange={(e) => setNewRoomName(e.target.value)}
                          placeholder="أدخل اسم الغرفة"
                          data-testid="input-room-name"
                        />
                      </div>
                      <div>
                        <Label>الأعضاء</Label>
                        <ScrollArea className="h-48 border rounded-md p-2">
                          {users
                            .filter((u) => u.id !== user?.id)
                            .map((u) => (
                              <div key={u.id} className="flex items-center gap-2 py-2">
                                <Checkbox
                                  id={`member-${u.id}`}
                                  checked={selectedMembers.includes(u.id)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setSelectedMembers([...selectedMembers, u.id]);
                                    } else {
                                      setSelectedMembers(selectedMembers.filter((id) => id !== u.id));
                                    }
                                  }}
                                  data-testid={`checkbox-member-${u.id}`}
                                />
                                <Label htmlFor={`member-${u.id}`} className="cursor-pointer">
                                  {u.fullName}
                                </Label>
                              </div>
                            ))}
                        </ScrollArea>
                      </div>
                      <Button onClick={handleCreateRoom} className="w-full" data-testid="button-submit-room">
                        إنشاء الغرفة
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              <Input placeholder="بحث..." data-testid="input-search-chat" />
            </div>
            <ScrollArea className="h-[calc(100vh-200px)]">
              {sortedRooms.map((room) => (
                <div
                  key={room.id}
                  onClick={() => setSelectedRoom(room)}
                  className={`p-4 cursor-pointer hover:bg-muted transition ${
                    selectedRoom?.id === room.id ? 'bg-muted' : ''
                  }`}
                  data-testid={`room-item-${room.id}`}
                >
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback>
                        {room.type === 'group' ? <Users className="w-4 h-4" /> : getRoomName(room)[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{getRoomName(room)}</p>
                        {room.name === 'الغرفة العامة' && (
                          <Badge variant="secondary" className="text-xs">عامة</Badge>
                        )}
                      </div>
                      {room.lastMessage && (
                        <p className="text-sm text-muted-foreground truncate">
                          {room.lastMessage.content}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </ScrollArea>
            <div className="p-4 border-t border-border">
              <p className="text-sm text-muted-foreground mb-2">بدء دردشة خاصة</p>
              <ScrollArea className="max-h-32">
                {users
                  .filter((u) => u.id !== user?.id)
                  .map((u) => (
                    <Button
                      key={u.id}
                      variant="ghost"
                      className="w-full justify-start mb-1"
                      onClick={() => startPrivateChatMutation.mutate(u.id)}
                      data-testid={`button-private-chat-${u.id}`}
                    >
                      <MessageSquare className="w-4 h-4 ml-2" />
                      {u.fullName}
                    </Button>
                  ))}
              </ScrollArea>
            </div>
          </div>

          <div className="flex-1 flex flex-col">
            {selectedRoom ? (
              <>
                <div className="p-4 border-b border-border bg-card flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-lg">{getRoomName(selectedRoom)}</h3>
                    <p className="text-sm text-muted-foreground">
                      {selectedRoom.members.length} أعضاء
                    </p>
                  </div>
                  {selectedRoom.type === 'private' && (
                    <Button
                      variant={isInCall ? "destructive" : "outline"}
                      size="sm"
                      className="gap-2"
                      onClick={isInCall ? endCall : startCall}
                      data-testid="button-call"
                    >
                      {isInCall ? (
                        <>
                          <PhoneOff className="w-4 h-4" />
                          <span>إنهاء المكالمة</span>
                        </>
                      ) : (
                        <>
                          <Phone className="w-4 h-4" />
                          <span>مكالمة صوتية</span>
                        </>
                      )}
                    </Button>
                  )}
                </div>

                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-4">
                    {messages.map((msg) => {
                      const replyMsg = getReplyMessage(msg.replyTo);
                      return (
                        <div
                          key={msg.id}
                          className={`flex ${msg.senderId === user?.id ? 'justify-end' : 'justify-start'}`}
                          data-testid={`message-${msg.id}`}
                        >
                          <div className={`max-w-[70%] ${msg.senderId === user?.id ? 'items-end' : 'items-start'} flex flex-col`}>
                            {msg.senderId !== user?.id && (
                              <p className="text-xs text-muted-foreground mb-1">
                                {msg.sender.fullName}
                              </p>
                            )}
                            <div
                              className={`rounded-lg p-3 ${
                                msg.senderId === user?.id
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-muted'
                              }`}
                            >
                              {replyMsg && (
                                <div className="bg-black/10 dark:bg-white/10 rounded p-2 mb-2 text-xs">
                                  <div className="flex items-center gap-1 mb-1">
                                    <Reply className="w-3 h-3" />
                                    <span className="font-medium">{replyMsg.sender.fullName}</span>
                                  </div>
                                  <p className="truncate opacity-75">{replyMsg.content}</p>
                                </div>
                              )}
                              
                              {msg.attachments && msg.attachments.length > 0 ? (
                                <div className="space-y-2">
                                  {msg.attachments.map((att, idx) => (
                                    <div key={idx}>
                                      {att.type === 'image' ? (
                                        <img src={att.url} alt={att.name} className="max-w-full rounded" />
                                      ) : att.type === 'audio' ? (
                                        <audio controls src={att.url} className="max-w-full" />
                                      ) : (
                                        <div className="flex items-center gap-2 p-2 bg-black/10 dark:bg-white/10 rounded">
                                          <File className="w-4 h-4" />
                                          <span className="text-sm flex-1">{att.name}</span>
                                          <a 
                                            href={att.url} 
                                            download={att.name}
                                            className="inline-flex"
                                          >
                                            <Button size="sm" variant="ghost">
                                              <Download className="w-4 h-4" />
                                            </Button>
                                          </a>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                  {msg.content && msg.content !== "📎 مرفق" && msg.content !== "🎤 تسجيل صوتي" && (
                                    <p className="mt-2">{msg.content}</p>
                                  )}
                                </div>
                              ) : (
                                <p>{msg.content}</p>
                              )}
                            </div>
                            <div className="flex gap-1 mt-1 items-center">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setReplyingTo(msg)}
                                className="h-6 px-2"
                                data-testid={`reply-${msg.id}`}
                              >
                                <Reply className="w-3 h-3" />
                              </Button>
                              <Popover open={openReactionPopover === msg.id} onOpenChange={(open) => setOpenReactionPopover(open ? msg.id : null)}>
                                <PopoverTrigger asChild>
                                  <Button size="sm" variant="ghost" className="h-6 px-2">
                                    <Smile className="w-3 h-3" />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-2">
                                  <div className="flex gap-1">
                                    {reactions.map((emoji) => (
                                      <button
                                        key={emoji}
                                        onClick={() => addReactionMutation.mutate({ messageId: msg.id, emoji })}
                                        className="text-lg hover:bg-muted p-1 rounded transition-all hover:scale-125 active:scale-95"
                                        data-testid={`reaction-${emoji}-${msg.id}`}
                                      >
                                        {emoji}
                                      </button>
                                    ))}
                                  </div>
                                </PopoverContent>
                              </Popover>
                            </div>
                            {msg.reactions.length > 0 && (
                              <div className="flex gap-1 mt-1 flex-wrap">
                                {Object.entries(
                                  msg.reactions.reduce((acc: any, r: any) => {
                                    if (!acc[r.emoji]) acc[r.emoji] = [];
                                    acc[r.emoji].push(r);
                                    return acc;
                                  }, {})
                                ).map(([emoji, reactionList]: [string, any]) => {
                                  const count = reactionList.length;
                                  const hasUserReacted = reactionList.some((r: any) => r.userId === user?.id);
                                  return (
                                    <Dialog key={emoji}>
                                      <DialogTrigger asChild>
                                        <button
                                          className={`text-xs px-2 py-1 rounded transition-colors flex items-center gap-1 ${
                                            hasUserReacted 
                                              ? 'bg-primary/20 border border-primary' 
                                              : 'bg-muted hover:bg-muted/80'
                                          }`}
                                          data-testid={`reaction-count-${emoji}-${msg.id}`}
                                        >
                                          <span>{emoji}</span>
                                          <span className="font-medium">{count}</span>
                                        </button>
                                      </DialogTrigger>
                                      <DialogContent className="sm:max-w-md">
                                        <DialogHeader>
                                          <DialogTitle className="flex items-center gap-2">
                                            <span className="text-2xl">{emoji}</span>
                                            <span>التفاعلات</span>
                                          </DialogTitle>
                                        </DialogHeader>
                                        <div className="space-y-2">
                                          {reactionList.map((r: any) => {
                                            const reactor = selectedRoom?.members.find(m => m.id === r.userId);
                                            return (
                                              <div key={r.id} className="flex items-center gap-2 p-2 rounded hover:bg-muted">
                                                <Avatar>
                                                  <AvatarFallback>{reactor?.fullName?.[0] || '?'}</AvatarFallback>
                                                </Avatar>
                                                <span className="font-medium">{reactor?.fullName || 'مستخدم'}</span>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </DialogContent>
                                    </Dialog>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                <div className="p-4 border-t border-border bg-card">
                  {replyingTo && (
                    <div className="bg-muted rounded p-2 mb-2 flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-1 mb-1">
                          <Reply className="w-3 h-3" />
                          <span className="text-xs font-medium">{replyingTo.sender.fullName}</span>
                        </div>
                        <p className="text-sm truncate">{replyingTo.content}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setReplyingTo(null)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  )}

                  {attachments.length > 0 && (
                    <div className="flex gap-2 mb-2 flex-wrap">
                      {attachments.map((att, idx) => (
                        <div key={idx} className="relative">
                          {att.type === 'image' ? (
                            <img src={att.url} alt={att.name} className="h-20 rounded" />
                          ) : (
                            <div className="flex items-center gap-2 bg-muted p-2 rounded">
                              <File className="w-4 h-4" />
                              <span className="text-xs">{att.name}</span>
                            </div>
                          )}
                          <Button
                            size="sm"
                            variant="destructive"
                            className="absolute -top-2 -left-2 h-5 w-5 p-0 rounded-full"
                            onClick={() => setAttachments(attachments.filter((_, i) => i !== idx))}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  {recordedAudio && (
                    <div className="bg-muted rounded p-2 mb-2 flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Mic className="w-4 h-4" />
                        <span className="text-sm">🎤 تسجيل صوتي جاهز للإرسال</span>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setRecordedAudio(null)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  )}

                  {showMentions && filteredUsers.length > 0 && (
                    <div className="bg-card border rounded-lg shadow-lg mb-2 max-h-40 overflow-auto">
                      <div className="p-2 border-b bg-muted/50">
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <AtSign className="w-3 h-3" />
                          <span>اختر شخص للإشارة إليه</span>
                        </p>
                      </div>
                      {filteredUsers.map((u, index) => (
                        <button
                          key={u.id}
                          onClick={() => insertMention(u.fullName)}
                          className="w-full text-right p-3 hover:bg-primary/10 flex items-center gap-3 transition-colors border-b last:border-b-0"
                        >
                          <Avatar className="w-8 h-8">
                            <AvatarFallback className="text-xs">{u.fullName[0]}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 text-right">
                            <p className="text-sm font-medium">{u.fullName}</p>
                            <p className="text-xs text-muted-foreground">{u.email}</p>
                          </div>
                          <AtSign className="w-4 h-4 text-primary" />
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept="image/*,application/*"
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      data-testid="button-attach-file"
                    >
                      <Paperclip className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={isRecording ? stopRecording : startRecording}
                      className={isRecording ? "bg-red-500 text-white" : ""}
                      data-testid="button-record-audio"
                    >
                      <Mic className="w-4 h-4" />
                    </Button>
                    <Input
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                      placeholder="اكتب رسالة... (@للإشارة)"
                      data-testid="input-message"
                      className="flex-1"
                    />
                    <Button 
                      onClick={handleSendMessage} 
                      disabled={!messageText.trim() && !recordedAudio && attachments.length === 0} 
                      data-testid="button-send-message"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>اختر دردشة للبدء</p>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
