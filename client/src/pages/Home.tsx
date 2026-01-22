import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2, BookOpen, MessageSquare, TrendingUp } from "lucide-react";
import { APP_LOGO, APP_TITLE, getLoginUrl } from "@/const";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";

export default function Home() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [topic, setTopic] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // SEO: Set document title and meta tags
  useEffect(() => {
    document.title = "EconoMentor - AIで学ぶ経済学 | 無料オンライン学習プラットフォーム";
    
    // Set meta description
    let metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription) {
      metaDescription = document.createElement('meta');
      metaDescription.setAttribute('name', 'description');
      document.head.appendChild(metaDescription);
    }
    metaDescription.setAttribute('content', 'EconoMentorは、AIメンターとの対話を通じて経済学を学べる無料オンラインプラットフォームです。需要供給曲線、インフレーション、ゲーム理論など、複雑な経済理論をグラフや実例で分かりやすく解説します。');
    
    // Set meta keywords
    let metaKeywords = document.querySelector('meta[name="keywords"]');
    if (!metaKeywords) {
      metaKeywords = document.createElement('meta');
      metaKeywords.setAttribute('name', 'keywords');
      document.head.appendChild(metaKeywords);
    }
    metaKeywords.setAttribute('content', '経済学, AI学習, オンライン教育, 需要と供給, インフレーション, ゲーム理論, GDP, 金融政策, マクロ経済学, ミクロ経済学, 無料学習, EconoMentor');
    
    // Set Open Graph meta tags
    const ogTags = [
      { property: 'og:title', content: 'EconoMentor - AIで学ぶ経済学' },
      { property: 'og:description', content: 'AIメンターとの対話を通じて経済学を学べる無料オンラインプラットフォーム。グラフ、シナリオ分析、最新ニュースで実践的な知識を習得。' },
      { property: 'og:image', content: `${window.location.origin}/og-image.png` },
      { property: 'og:url', content: window.location.href },
      { property: 'og:type', content: 'website' },
      { property: 'og:site_name', content: 'EconoMentor' },
    ];
    
    ogTags.forEach(({ property, content }) => {
      let meta = document.querySelector(`meta[property="${property}"]`);
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('property', property);
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    });
    
    // Set Twitter Card meta tags
    const twitterTags = [
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: 'EconoMentor - AIで学ぶ経済学' },
      { name: 'twitter:description', content: 'AIメンターとの対話を通じて経済学を学べる無料オンラインプラットフォーム' },
      { name: 'twitter:image', content: `${window.location.origin}/og-image.png` },
    ];
    
    twitterTags.forEach(({ name, content }) => {
      let meta = document.querySelector(`meta[name="${name}"]`);
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('name', name);
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    });
  }, []);

  const startSessionMutation = trpc.learning.startSession.useMutation({
    onSuccess: (data) => {
      // Store session ID in localStorage
      localStorage.setItem("economentor_sessionId", data.sessionId);
      // Navigate to learning page
      navigate("/learning");
    },
    onError: (error) => {
      console.error("Failed to start session:", error);
      alert("セッション開始に失敗しました");
    },
  });

  const handleStartLearning = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) {
      alert("学習トピックを入力してください");
      return;
    }

    setIsSubmitting(true);
    try {
      await startSessionMutation.mutateAsync({
        topic: topic.trim(),
        description: `Learning about ${topic}`,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="border-b border-slate-700 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {APP_LOGO && <img src={APP_LOGO} alt="Logo" className="h-8 w-8" />}
            <h1 className="text-xl font-bold text-white">{APP_TITLE}</h1>
          </div>
          <div>
            {isAuthenticated ? (
              <div className="flex items-center gap-4">
                <span className="text-sm text-slate-300">{user?.name || "User"}</span>
              </div>
            ) : (
              <Button asChild variant="default" size="sm">
                <a href={getLoginUrl()}>ログイン</a>
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            AI経済学メンターと学ぶ
          </h2>
          <p className="text-lg text-slate-300 mb-8">
            複雑な経済学の理論を、AIとの対話を通じて直感的に理解できます。
            グラフ、シナリオ分析、最新ニュースとの関連付けで、実践的な知識を習得しましょう。
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          <Card className="bg-slate-800/50 border-slate-700 hover:border-slate-600 transition-colors">
            <CardHeader>
              <BookOpen className="h-8 w-8 text-blue-400 mb-2" />
              <CardTitle className="text-white">専門的な解説</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-300">
                経済学の理論を分かりやすく、かつ正確に解説します。
              </p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700 hover:border-slate-600 transition-colors">
            <CardHeader>
              <TrendingUp className="h-8 w-8 text-green-400 mb-2" />
              <CardTitle className="text-white">動的グラフ</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-300">
                需要供給曲線やその他の経済モデルを視覚化します。
              </p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700 hover:border-slate-600 transition-colors">
            <CardHeader>
              <MessageSquare className="h-8 w-8 text-purple-400 mb-2" />
              <CardTitle className="text-white">リアルタイム対話</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-300">
                質問に即座に応答し、深い理解をサポートします。
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Learning Start Section */}
        <div className="max-w-2xl mx-auto">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">学習を開始する</CardTitle>
              <CardDescription>
                学びたい経済学のトピックを入力してください
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleStartLearning} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">
                    学習トピック
                  </label>
                  <Input
                    placeholder="例：需要と供給曲線、インフレーション、ゲーム理論..."
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    disabled={isSubmitting}
                    className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSubmitting || !topic.trim()}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      セッション開始中...
                    </>
                  ) : (
                    "学習を開始"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Example Topics */}
          <div className="mt-8">
            <p className="text-sm text-slate-400 mb-3">人気のトピック：</p>
            <div className="flex flex-wrap gap-2">
              {[
                "需要と供給",
                "インフレーション",
                "ゲーム理論",
                "限界効用",
                "GDP",
                "金融政策",
              ].map((exampleTopic) => (
                <Button
                  key={exampleTopic}
                  variant="outline"
                  size="sm"
                  onClick={() => setTopic(exampleTopic)}
                  className="border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  {exampleTopic}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-700 bg-slate-900/50 mt-16 py-8">
        <div className="container mx-auto px-4 text-center text-slate-400 text-sm">
          <p>© 2025 EconoMentor. Powered by Manus AI</p>
        </div>
      </footer>
    </div>
  );
}
