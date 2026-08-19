# AE Scripts

Adobe After Effects 用の ExtendScript（JSX）をまとめるモノレポです。

## リポジトリ構成

- `scripts/` — `ファイル > スクリプト` から実行する単発スクリプト
- `panels/` — `ScriptUI Panels` に配置するドッキング可能なパネル
- `tools/` — 共通のビルド、検証、配布ツール
- `templates/` — 新しいスクリプト／パネル用の再利用可能なテンプレート

各スクリプトとパネルは、それぞれ独立したディレクトリに配置します。各ディレクトリの `icon.svg` は KBAR などのランチャー用アイコンです。実験中のものは、継続して管理する段階になってからこのリポジトリへ追加します。

## Scripts

| 名前 | 概要 | エントリーポイント |
| --- | --- | --- |
| Add Marker | 選択したレイヤーへマーカーを追加 | `scripts/add-marker/addmarker.jsx` |
| Change Mask Mode | 選択レイヤーのマスクモードを一括変更 | `scripts/change-mask-mode/ChangeMaskMode.jsx` |
| Export Markers | コンポジション／レイヤーマーカーを書き出し | `scripts/export-markers/ExportMarkers.jsx` |
| Match Nested Comp Duration | ネストコンポジションの尺を親または選択レイヤーへ合わせる | `scripts/match-nested-comp-duration/MatchNestedCompDuration.jsx` |
| Nulls From Selected Shape Paths | 選択したシェイプパスから Null を作成 | `scripts/nulls-from-selected-shape-paths/Nulls_From_Selected_Shape_Paths.jsx` |
| Swap Fill / Stroke Colors | シェイプ／テキストレイヤーの塗りと線の色を交換 | `scripts/swap-fill-stroke-colors/Swap_Fill_Stroke_Colors.jsx` |

## Panels

| 名前 | 概要 | エントリーポイント |
| --- | --- | --- |
| Alpha To Mask | オートトレースしたマスクをレイヤーへ分割 | `panels/alpha-to-mask/AlphaToMask.jsx` |
| Change Footage Framerate | フッテージとコンポジションのフレームレートを変更 | `panels/change-footage-framerate/changefootageframerate.jsx` |
| Comp Bookmarks | コンポジションをブックマーク管理 | `panels/comp-bookmarks/CompBookmarks.jsx` |
| Dependency Graph | プロジェクトの依存関係をHTMLグラフとして表示 | `panels/dependency-graph/DependencyGraph.jsx` |
| Flip Tools | レイヤーの反転とスケール連携を操作 | `panels/flip-tools/FlipTools.jsx` |
| Marker Editor | 選択レイヤーのマーカー色とコメントを編集 | `panels/marker-editor/MarkerEditor.jsx` |
| Scale KF Paste |相対的な動きを保ってスケールキーフレームをコピー＆ペースト | `panels/scale-kf-paste/ScaleKF_Paste.jsx` |
| Shape Fill Stroke | Illustrator風UIでシェイプの塗りと線を操作 | `panels/shape-fill-stroke/ShapeFillStroke.jsx` |
| Swap Fill / Stroke Colors | 塗りと線の色を交換するドッキングパネル | `panels/swap-fill-stroke-colors/Swap_Fill_Stroke_Colors_Panel.jsx` |

## インストール

- `scripts/` 配下の JSX は After Effects の `Scripts` フォルダへコピーします。
- `panels/` 配下の JSX は After Effects の `Scripts/ScriptUI Panels` フォルダへコピーし、After Effects を再起動します。
