import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Send, ArrowLeft, AlertCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Streamdown } from "streamdown";
import { EconomicGraph, GraphData } from "@/components/EconomicGraph";

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
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const storedSessionId = localStorage.getItem("economentor_sessionId");
    if (!storedSessionId) {
      navigate("/");
      return;
    }
    setSessionId(storedSessionId);
  }, [navigate]);

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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
      setError(null);
    },
    onError: (error) => {
      console.error("Chat error:", error);
      const errorMessage = error?.message || "メッセージ送信に失敗しました";
      setError(errorMessage);
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
    setError(null);

    try {
      await chatMutation.mutateAsync({
        sessionId,
        message: inputValue,
      });
    } catch (err) {
      console.error("Failed to send message:", err);
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

      <div className="flex-1 overflow-y-auto">
        <div className="container mx-auto px-4 py-8 max-w-3xl">
          {error && (
            <div className="mb-4 p-4 bg-red-900/20 border border-red-700/50 rounded-lg flex gap-3">
              <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-red-400 text-sm font-medium">エラーが発生しました</p>
                <p className="text-red-300/70 text-xs mt-1">{error}</p>
              </div>
            </div>
          )}

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
                <div key={index}>
                  {message.role === "user" && (
                    <div className="flex justify-end">
                      <Card className="max-w-xs md:max-w-md lg:max-w-lg bg-blue-600 border-blue-500">
                        <CardContent className="p-4">
                          <div className="text-sm text-white">
                            <Streamdown>{message.content}</Streamdown>
                          </div>
                          {message.createdAt && (
                            <p className="text-xs text-blue-200 mt-2">
                              {new Date(message.createdAt).toLocaleTimeString("ja-JP")}
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  )}

                  {message.role === "assistant" && (
                    <div className="flex justify-start">
                      <div className="max-w-xs md:max-w-md lg:max-w-lg">
                        {message.contentType === "text" && (
                          <Card className="bg-slate-700 border-slate-600">
                            <CardContent className="p-4">
                              <div className="text-sm text-slate-100">
                                <Streamdown>{message.content}</Streamdown>
                              </div>
                              {message.createdAt && (
                                <p className="text-xs text-slate-400 mt-2">
                                  {new Date(message.createdAt).toLocaleTimeString("ja-JP")}
                                </p>
                              )}
                            </CardContent>
                          </Card>
                        )}

                        {message.contentType === "graph_data" && message.metadata && (
                          <div className="w-full">
                            <EconomicGraph data={message.metadata as GraphData} />
                            {message.createdAt && (
                              <p className="text-xs text-slate-400 mt-2">
                                {new Date(message.createdAt).toLocaleTimeString("ja-JP")}
                              </p>
                            )}
                          </div>
                        )}

                        {message.contentType === "scenario" && (
                          <Card className="bg-slate-700 border-slate-600">
                            <CardHeader>
                              <CardTitle className="text-sm text-slate-100">
                                シナリオ分析
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4">
                              <div className="text-sm text-slate-100">
                                <Streamdown>{message.content}</Streamdown>
                              </div>
                              {message.createdAt && (
                                <p className="text-xs text-slate-400 mt-2">
                                  {new Date(message.createdAt).toLocaleTimeString("ja-JP")}
                                </p>
                              )}
                            </CardContent>
                          </Card>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>
      </div>

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
