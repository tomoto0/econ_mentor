import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Send, ArrowLeft } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Streamdown } from "streamdown";

interface ChatMessage {
  id?: number;
  role: "user" | "assistant";
  content: string;
  contentType: string;
  metadata?: any;
  createdAt?: Date;
}

export default function Learning() {
  const [, navigate] = useLocation();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [topic, setTopic] = useState<string>("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load session from localStorage
  useEffect(() => {
    const storedSessionId = localStorage.getItem("economentor_sessionId");
    if (!storedSessionId) {
      navigate("/");
      return;
    }
    setSessionId(storedSessionId);
  }, [navigate]);

  // Fetch session and chat history
  const { data: sessionData, isLoading: isLoadingSession } = trpc.learning.getSession.useQuery(
    { sessionId: sessionId || "" },
    { enabled: !!sessionId }
  );

  useEffect(() => {
    if (sessionData) {
      setTopic(sessionData.session.topic);
      setMessages(sessionData.chatLogs);
      setIsLoading(false);
    }
  }, [sessionData]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Chat mutation
  const chatMutation = trpc.learning.chat.useMutation({
    onSuccess: (response) => {
      setMessages((prev) => [
        ...prev,
        {
          id: response.id,
          role: "assistant",
          content: response.content,
          contentType: response.contentType,
          metadata: response.metadata,
          createdAt: response.createdAt,
        },
      ]);
      setIsSending(false);
    },
    onError: (error) => {
      console.error("Chat error:", error);
      alert("メッセージ送信に失敗しました");
      setIsSending(false);
    },
  });

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || !sessionId || isSending) return;

    const userMessage: ChatMessage = {
      role: "user",
      content: inputValue,
      contentType: "text",
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsSending(true);

    try {
      await chatMutation.mutateAsync({
        sessionId,
        message: inputValue,
      });
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  const handleBackToHome = () => {
    localStorage.removeItem("economentor_sessionId");
    navigate("/");
  };

  if (isLoading || isLoadingSession) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-400 mx-auto mb-4" />
          <p className="text-slate-300">セッションを読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-700 bg-slate-900/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBackToHome}
              className="text-slate-300 hover:text-white"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-white">EconoMentor</h1>
              <p className="text-sm text-slate-400">{topic}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Chat Container */}
      <div className="flex-1 overflow-y-auto">
        <div className="container mx-auto px-4 py-8 max-w-3xl">
          <div className="space-y-4">
            {messages.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-slate-400 mb-4">
                  「{topic}」について学習を開始しましょう
                </p>
                <p className="text-sm text-slate-500">
                  質問を入力して、AIメンターと対話してください
                </p>
              </div>
            ) : (
              messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <Card
                    className={`max-w-xs md:max-w-md lg:max-w-lg ${
                      message.role === "user"
                        ? "bg-blue-600 border-blue-500"
                        : "bg-slate-700 border-slate-600"
                    }`}
                  >
                    <CardContent className="p-4">
                      {message.contentType === "text" ? (
                        <div
                          className={`text-sm ${
                            message.role === "user"
                              ? "text-white"
                              : "text-slate-100"
                          }`}
                        >
                          <Streamdown>{message.content}</Streamdown>
                        </div>
                      ) : (
                        <div className="text-sm text-slate-300">
                          {message.content}
                        </div>
                      )}
                      {message.createdAt && (
                        <p className="text-xs text-slate-400 mt-2">
                          {new Date(message.createdAt).toLocaleTimeString("ja-JP")}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>
      </div>

      {/* Input Area */}
      <div className="border-t border-slate-700 bg-slate-900/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 max-w-3xl">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <Input
              placeholder="質問を入力してください..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              disabled={isSending}
              className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500"
            />
            <Button
              type="submit"
              disabled={isSending || !inputValue.trim()}
              className="px-6"
            >
              {isSending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
