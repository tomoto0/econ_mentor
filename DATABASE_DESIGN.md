# EconoMentor - データベース設計ドキュメント

## 概要

EconoMentorのデータベーススキーマは、ユーザー登録なしで利用可能な経済学学習プラットフォームを実現するために設計されています。セッションベースのアーキテクチャにより、複数の独立した学習セッションを管理し、各セッションのチャット履歴を永続化します。

## テーブル設計

### 1. users テーブル

**目的**: Manus OAuth認証を通じたユーザー管理

| カラム | 型 | 説明 |
|--------|-----|------|
| id | INT | 主キー（自動採番） |
| openId | VARCHAR(64) | Manus OAuth識別子（ユニーク） |
| name | TEXT | ユーザー名 |
| email | VARCHAR(320) | メールアドレス |
| loginMethod | VARCHAR(64) | ログイン方法 |
| role | ENUM('user', 'admin') | ユーザーロール |
| createdAt | TIMESTAMP | 作成日時 |
| updatedAt | TIMESTAMP | 更新日時 |
| lastSignedIn | TIMESTAMP | 最終ログイン日時 |

**特徴**:
- Manus OAuth統合により、ユーザー登録フローを簡素化
- ロールベースアクセス制御（RBAC）に対応

### 2. learning_sessions テーブル

**目的**: 学習セッションの管理と追跡

| カラム | 型 | 説明 |
|--------|-----|------|
| id | INT | 主キー（自動採番） |
| sessionId | VARCHAR(64) | フロントエンドで生成されたユニークセッションID |
| topic | TEXT | 学習対象の経済学トピック（例：「需要と供給」） |
| description | TEXT | セッションの説明またはコンテキスト |
| createdAt | TIMESTAMP | セッション作成日時 |
| updatedAt | TIMESTAMP | セッション更新日時 |

**特徴**:
- `sessionId`はフロントエンドで生成され、localStorageに保存される
- セッションIDにより、ユーザー登録なしでセッション追跡が可能
- 複数の独立した学習セッションを管理可能

### 3. chat_logs テーブル

**目的**: AI との対話履歴の記録と復元

| カラム | 型 | 説明 |
|--------|-----|------|
| id | INT | 主キー（自動採番） |
| sessionId | VARCHAR(64) | 関連する学習セッションのID |
| role | ENUM('user', 'assistant') | メッセージ送信者（ユーザーまたはAI） |
| content | TEXT | メッセージの内容 |
| contentType | VARCHAR(64) | コンテンツタイプ（'text', 'graph_data', 'scenario'など） |
| metadata | TEXT | 構造化データ（JSON形式、グラフ座標やシナリオ分析など） |
| createdAt | TIMESTAMP | メッセージ作成日時 |

**特徴**:
- `sessionId`により、学習セッションとの関連付けが可能
- `contentType`と`metadata`により、テキスト以外の複雑なデータ（グラフ、シナリオ分析）を保存可能
- タイムスタンプにより、会話の時系列を保持

## ER図

```
┌─────────────────────┐
│      users          │
├─────────────────────┤
│ id (PK)             │
│ openId (UNIQUE)     │
│ name                │
│ email               │
│ loginMethod         │
│ role                │
│ createdAt           │
│ updatedAt           │
│ lastSignedIn        │
└─────────────────────┘

┌──────────────────────────┐
│  learning_sessions       │
├──────────────────────────┤
│ id (PK)                  │
│ sessionId (UNIQUE)       │
│ topic                    │
│ description              │
│ createdAt                │
│ updatedAt                │
└──────────────────────────┘
         ▲
         │ 1:N
         │
┌──────────────────────────┐
│     chat_logs            │
├──────────────────────────┤
│ id (PK)                  │
│ sessionId (FK)           │
│ role                     │
│ content                  │
│ contentType              │
│ metadata                 │
│ createdAt                │
└──────────────────────────┘
```

## リレーションシップ

- **learning_sessions ↔ chat_logs**: 1対多（1つのセッションは複数のチャットログを持つ）
- **users**: 独立テーブル（将来的に認証ユーザーの学習履歴追跡に使用可能）

## データフロー

### セッション開始フロー

1. フロントエンドで一意のセッションID（UUID）を生成
2. localStorageにセッションIDを保存
3. ユーザーがトピックを入力
4. バックエンドの`POST /api/trpc/learning.startSession`エンドポイントに送信
5. `learning_sessions`テーブルにレコード作成
6. セッションIDをレスポンスで返却

### チャット送受信フロー

1. ユーザーがメッセージを入力
2. localStorageからセッションIDを取得
3. バックエンドの`POST /api/trpc/learning.chat`エンドポイントに送信
4. `chat_logs`テーブルにユーザーメッセージを記録（role: 'user'）
5. LLM APIを呼び出してAI応答を生成
6. `chat_logs`テーブルにAI応答を記録（role: 'assistant'）
7. AI応答をフロントエンドに返却

### セッション復元フロー

1. ページ再訪問時、localStorageからセッションIDを取得
2. バックエンドの`GET /api/trpc/learning.getSession`エンドポイントに送信
3. `chat_logs`テーブルから該当セッションの全チャット履歴を取得
4. 会話履歴をフロントエンドで復元

## 設計上の特徴

### ユーザー登録なしでの利用

- セッションIDはフロントエンドで生成され、localStorageに保存
- ユーザーテーブルとの関連付けは不要
- 複数のセッションを独立して管理可能

### スケーラビリティ

- `sessionId`にインデックスを設定することで、セッション検索を高速化可能
- `metadata`フィールドにより、将来的に新しいコンテンツタイプを追加可能
- テーブル構造は正規化され、冗長性を最小化

### 拡張性

- `contentType`フィールドにより、テキスト以外のコンテンツ（グラフデータ、シナリオ分析）を柔軟に保存
- `metadata`フィールドにより、構造化データをJSON形式で保存
- 将来的に、ユーザー認証を統合する際も容易に対応可能

## インデックス戦略（推奨）

```sql
-- セッション検索の高速化
CREATE INDEX idx_learning_sessions_sessionId ON learning_sessions(sessionId);

-- チャットログ検索の高速化
CREATE INDEX idx_chat_logs_sessionId ON chat_logs(sessionId);
CREATE INDEX idx_chat_logs_createdAt ON chat_logs(createdAt);
```

## 今後の拡張予定

1. **ユーザー学習履歴**: `learning_sessions`テーブルに`userId`カラムを追加し、ユーザーごとの学習履歴を追跡
2. **セッション共有**: セッションを共有可能にするため、`sharing_tokens`テーブルを追加
3. **学習進度**: `learning_progress`テーブルを追加し、各トピックの学習進度を追跡
4. **ユーザー評価**: `session_ratings`テーブルを追加し、セッションの品質評価を記録
