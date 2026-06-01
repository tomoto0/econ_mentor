# EconoMentor — AI と学ぶ経済学プラットフォーム

![EconoMentor OGP](https://d2xsxph8kpxj0f.cloudfront.net/310419663027084947/ifoLsjorB2BhDn8HQZfsVo/econ_mentor_ogp-NXYThTauDfTaLEPi2FUtpS.png)

**公開URL: [https://econ-ai-mentor.manus.space](https://econ-ai-mentor.manus.space)**

EconoMentor は、AI メンターとの対話を通じて経済学を学ぶためのフルスタック学習プラットフォームです。学習者は学びたいトピック（例: 需要と供給、インフレーション、ゲーム理論、IS-LM 分析など）を入力するだけで、専用の学習スタジオに入り、Chat・Graph・News・Quiz・Notes の **5 つのタブ** を行き来しながら、対話・モデル可視化・現実のニュース接続・適応型クイズ・自分専用のノートを通じて理解を深められます。Manus Platform 上で動作し、AI 推論・データベース・通知・ファイルストレージなど主要なバックエンド機能は Manus のネイティブ統合を用いて構築されています。

> 元の `econ_mentor` リポジトリの教育的なプロンプト設計と学習フローを保ちつつ、外部 AI 依存を Manus サーバーサイドの `invokeLLM` ヘルパーに置き換え、学習データは Manus Database に永続化し、新規セッション開始時はオーナー通知が飛ぶよう再設計しています。

---

## 主な機能

| 領域 | 実装内容 |
| --- | --- |
| **AI メンターとの対話** | トピックに紐づいたマルチターンの経済学チューターリング。Markdown は Streamdown で描画し、過去履歴は DB から復元。セッション開始時には選択トピックを踏まえたオープニングメッセージが自動生成・保存されます。 |
| **動的グラフ** | 需要と供給、フィリップス曲線、無差別曲線、コスト曲線、インフレーション、労働市場、GDP 推移など、主要な経済モデルを Chart.js でインライン描画。決定論的なトピック検出に外れた場合は LLM フォールバックで JSON グラフを合成します。「更新」ボタンや Enter、サジェスチョン選択時のみグラフが再生成される明示的な UX に整えています。 |
| **経済ニュース連動** | 現在のトピックに基づき、LLM がリアルな経済ニュース例を生成し、理論との接続分析（背景・短期/長期の含意・学習者への問いかけ）を提示します。 |
| **適応型クイズ** | 4 択クイズを LLM 生成。回答の正誤・累計正答率・難易度別パフォーマンスから次回難易度を推奨し、`session_performance` テーブルで継続的に追跡します。選択肢の単一選択 UI も `extractOptionKey` で正規化済みです。 |
| **演習問題** | 段階的ヒント、解答の表示／非表示、完了マーキングが可能なステップ式の演習問題。サーバー側で構造化 JSON として生成・保存され、空状態／エラー状態にも対応しています。 |
| **学習ノート** | セッション内で作成・編集・削除・カテゴリ付けができるノート。気付きをその場で整理し、後から見返せます。 |
| **オーナー通知** | 新規セッション開始時に Manus の `notifyOwner` 経由で「選ばれたトピック・セッション ID・補足説明」がオーナーに届きます。学習需要をリアルタイムにモニタリングできます。 |
| **包括的な SNS 共有メタタグ** | 専用 OGP 画像（1200×630）、`og:locale=ja_JP`、`twitter:card=summary_large_image`、`og:image:secure_url` などを `client/index.html` に設定済み。X／LINE／Facebook／Slack／Discord いずれの環境でもきれいにプレビューされます。 |

---

## アーキテクチャ

React フロントエンド、Express ＋ tRPC バックエンド、Drizzle ORM、Manus Platform 統合で構成された 1 つの Node.js プロセスとして動作します。フロントエンドはアドホックな REST クライアントではなく、型付きの tRPC プロシージャを `trpc.*.useQuery / useMutation` 経由で直接呼び出します。LLM へのアクセスや認証情報の保護はサーバー側に集約されています。

| レイヤ | 主要ファイル | 役割 |
| --- | --- | --- |
| フロントエンド・ダッシュボード | `client/src/pages/Learning.tsx` | 5 タブ構成の学習スタジオと UI 状態管理 |
| ルーティング | `client/src/App.tsx` | 公開トップページと `/learning` 学習スタジオ |
| グラフ描画 | `client/src/components/EconomicGraph.tsx` | 生成された経済学グラフデータの Chart.js 描画 |
| API ルーター | `server/routers.ts` | セッション、チャット、グラフ、ニュース、クイズ、演習問題、ノート、パフォーマンス系の tRPC エンドポイント |
| LLM サービス | `server/llmService.ts`, `server/newsService.ts`, `server/graphGenerator.ts` | プロンプトロジックを保ちつつ Manus `invokeLLM` を実行層に |
| 永続化 | `server/db.ts`, `drizzle/schema.ts` | DB ヘルパーと全学習エンティティの型付きスキーマ |

---

## Manus Platform 統合

**Manus LLM API**: すべての AI 処理はサーバー側 `invokeLLM` ヘルパーから呼び出されます。経済学メンターのプロンプト、クイズ生成、演習問題生成、ニュース生成、シナリオ分析、グラフ生成のロジックはオリジナルから引き継ぎ、認証情報はブラウザに一切露出しません。

**Manus Database**: 学習セッション、チャットログ、クイズ、演習問題、ノート、セッションパフォーマンスを永続化します。スキーマは冪等な Drizzle マイグレーションで適用済みで、既存データを破壊することなく拡張できます。

**Owner Notifications**: 新規セッション開始時に `notifyOwner` がオーナーへ通知を送信し、選ばれたトピックと補足情報をリアルタイムで把握できます。

**Manus File Storage**: 専用 OGP 画像は Manus の CDN 配下にホストされ、ローカルディレクトリへの大容量アセット混入によるデプロイ遅延を防いでいます。

---

## データベーススキーマ

| テーブル | 用途 |
| --- | --- |
| `learning_sessions` | トピック単位の学習セッションと補足説明を保持 |
| `chat_logs` | ユーザー／アシスタントのメッセージと、グラフ等の補助メタデータを永続化 |
| `quizzes` | 生成された 4 択クイズの問題、正解、解説、難易度を保存 |
| `practice_problems` | 段階的ヒント、解答、完了状態を含む演習問題を保存 |
| `learning_notes` | セッション内で作成された学習ノートとカテゴリを保存 |
| `session_performance` | クイズ・演習の集計、正答率、推奨難易度を追跡 |

---

## SNS 共有メタタグと OGP 画像

専用 OGP 画像を生成し、`client/index.html` に以下のような包括的なメタタグを設定しています。

| 項目 | 値 |
| --- | --- |
| `og:type` | `website` |
| `og:locale` | `ja_JP`（`en_US` も alternate で併記） |
| `og:site_name` | `EconoMentor` |
| `og:url` | `https://econ-ai-mentor.manus.space` |
| `og:image` | [OGP 画像](https://d2xsxph8kpxj0f.cloudfront.net/310419663027084947/ifoLsjorB2BhDn8HQZfsVo/econ_mentor_ogp-NXYThTauDfTaLEPi2FUtpS.png)（1200×630, PNG） |
| `twitter:card` | `summary_large_image` |
| `twitter:image` | 同上の OGP 画像 |
| `theme-color` | ダーク UI に合わせたブランドカラー |

これにより X（旧 Twitter）、LINE、Facebook、Slack、Discord のいずれにおいても、ブランドカラーとアプリ説明が乗ったリッチプレビューが表示されます。

---

## デザインの方向性

ダーク基調のアカデミック／プロフェッショナルなビジュアルを採用しています。深いネイビーとスレートのサーフェスに、控えめなゴールドと青のアクセントを差し色として配置し、コントラストの高いタイポグラフィ、丸みのあるカード、控えめなトランジションでまとめています。学習スタジオの 5 タブは **Chat / Graph / News / Quiz / Notes** に固定され、ナビゲーションの一貫性を保ちながら、左サイドの DashboardLayout と組み合わせて使うことを前提としています。

---

## 開発コマンド

| コマンド | 用途 |
| --- | --- |
| `pnpm dev` | 開発サーバーを起動 |
| `pnpm test` | Vitest による単体テスト（学習ロジック、ルーター挙動、クイズ選択肢パースなど） |
| `pnpm check` | TypeScript の型チェック (`tsc --noEmit`) |
| `pnpm build` | フロントエンドとサーバーのプロダクションビルド |

現時点で **19 件のテストすべてが通過**し、`tsc` クリーン、本番ビルドも成功している状態です。

---

## デプロイメント

本プロジェクトは Manus Platform 上でホストされます。公開 URL は **[https://econ-ai-mentor.manus.space](https://econ-ai-mentor.manus.space)** で、別名として `econmentor-ifolsjor.manus.space` も割り当てられています。デプロイは Manus の管理 UI 内の **Publish** ボタンから行います（チェックポイントを保存した直後のバージョンが配信されます）。OGP 画像など静的アセットは `/home/ubuntu/webdev-static-assets/` に置き、`manus-upload-file --webdev` 経由でアップロードした CDN URL を参照することで、デプロイのタイムアウトを回避しています。

---

## 使い方

1. 公開 URL [https://econ-ai-mentor.manus.space](https://econ-ai-mentor.manus.space) にアクセスし、Manus アカウントでログインします。
2. トップページの「学習を開始する」フォームに、学びたいトピック（例: `需要と供給`, `インフレーション`, `IS-LM 分析`, `ゲーム理論`）を入力します。
3. 学習スタジオが開き、Chat タブでは選択トピックを踏まえた AI メンターのオープニングメッセージが既に表示されています。続けて自由に質問してください。
4. Graph タブでは初期状態でトピック連動のグラフが描画されます。リクエスト文を編集して **更新** ボタンを押すと、別の経済モデルを描画できます。
5. News タブで実在ニュース風サマリーと理論接続分析を確認し、Quiz タブでクイズ・演習問題を生成して理解度を確認、Notes タブで学んだことを自分の言葉でまとめましょう。

---

## ライセンス

本プロジェクトは Manus Platform 上で運用される独自プロジェクトです。元となった `econ_mentor` のオリジナル教育ロジックを尊重しつつ、Manus 統合・UI 改良・SNS 対応などを追加しています。
