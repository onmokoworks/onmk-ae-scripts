# AE Scripts

Adobe After Effects 用の ExtendScript（JSX）をまとめるモノレポです。

## リポジトリ構成

- `scripts/` — `ファイル > スクリプト` から実行する単発スクリプト
- `panels/` — `ScriptUI Panels` に配置するドッキング可能なパネル
- `presets/` — Animation Preset と、その生成用スクリプト
- `tools/` — 共通のビルド、検証、配布ツール
- `templates/` — 新しいスクリプト／パネル用の再利用可能なテンプレート

各ツールは用途別ディレクトリへ配置します。対応するSVGはKBarなどのランチャー用アイコンです。実験中のものは、継続して管理する段階になってからこのリポジトリへ追加します。

`scripts/` 配下は用途別に分類します。

- `shape/` — シェイプの生成、選択、パス、塗りと線
- `transform/` — 反転、スケール、位置などの変形
- `markers/` — マーカーの追加と書き出し
- `masks/` — マスク操作
- `composition/` — コンポジション構造と尺の操作
- `timeline/` — イン点、アウト点などタイムライン編集
- `system/` — キャッシュなどAfter Effects全体の操作

KBar用SVGがある場合は、対応するJSXと同じベース名にします（例: `Tool.jsx` / `Tool.svg`）。

## Scripts

| 名前 | 概要 | エントリーポイント |
| --- | --- | --- |
| Add Marker | 選択レイヤー、未選択時はコンポへマーカーを追加 | `scripts/markers/add-marker/Add_Marker.jsx` |
| Delete Marker At Playhead | 再生位置のレイヤー／コンポマーカーを削除 | `scripts/markers/delete-marker-at-playhead/Delete_Marker_At_Playhead.jsx` |
| Change Mask Mode | 選択レイヤーのマスクモードを一括変更 | `scripts/masks/change-mask-mode/ChangeMaskMode.jsx` |
| Export Markers | コンポジション／レイヤーマーカーを書き出し | `scripts/markers/export-markers/ExportMarkers.jsx` |
| Match Nested Comp Duration | ネストコンポジションの尺を親または選択レイヤーへ合わせる | `scripts/composition/match-nested-comp-duration/MatchNestedCompDuration.jsx` |
| Nulls From Selected Shape Paths | 選択したシェイプパスから Null を作成 | `scripts/shape/nulls-from-selected-shape-paths/Nulls_From_Selected_Shape_Paths.jsx` |
| Swap Fill / Stroke Colors | シェイプ／テキストの塗りと線を表示状態ごと交換 | `scripts/shape/swap-fill-stroke-colors/Swap_Fill_Stroke_Colors.jsx` |
| Select Shape Layers | 現在の選択からシェイプレイヤーだけを選択 | `scripts/shape/select-shape-layers/Select_Shape_Layers.jsx` |
| Create Shape Style Controller | 選択したシェイプレイヤーの塗りと線を一括操作する Null を作成 | `scripts/shape/create-shape-style-controller/Create_Shape_Style_Controller.jsx` |
| Toggle Fill | 選択したシェイプ／テキストの塗りを切り替え | `scripts/shape/add-fill-stroke/Toggle_Fill.jsx` |
| Toggle Stroke | 選択したシェイプ／テキストの線を切り替え | `scripts/shape/add-fill-stroke/Toggle_Stroke.jsx` |
| Flip Horizontal | 選択レイヤーを左右反転 | `scripts/transform/flip-tools/Flip_Horizontal.jsx` |
| Flip Vertical | 選択レイヤーを上下反転 | `scripts/transform/flip-tools/Flip_Vertical.jsx` |
| Unlink Scale Dimensions | Scale X／Y／Zスライダーを追加して独立制御 | `scripts/transform/flip-tools/Unlink_Scale_Dimensions.jsx` |
| Link Scale Dimensions | スライダーの結果をScaleへベイクしてコントロールを削除 | `scripts/transform/flip-tools/Link_Scale_Dimensions.jsx` |
| Set In Point | 選択レイヤーのイン点を再生位置へ設定 | `scripts/timeline/trim-layer/Set_In_Point.jsx` |
| Set Out Point | 選択レイヤーのアウト点を再生位置へ設定 | `scripts/timeline/trim-layer/Set_Out_Point.jsx` |
| Purge All Caches | RAM・ディスク・Undo・Snapshotキャッシュを一括削除 | `scripts/system/purge-all-caches/Purge_All_Caches.jsx` |

## Panels

| 名前 | 概要 | エントリーポイント |
| --- | --- | --- |
| Align Layers | 2D／3Dレイヤーを選択範囲またはコンポ基準で整列・均等配置 | `panels/align-layers/AlignLayers.jsx` |
| Alpha To Mask | オートトレースしたマスクをレイヤーへ分割 | `panels/alpha-to-mask/AlphaToMask.jsx` |
| Change Footage Framerate | フッテージとコンポジションのフレームレートを変更 | `panels/change-footage-framerate/changefootageframerate.jsx` |
| Comp Bookmarks | コンポジションをブックマーク管理 | `panels/comp-bookmarks/CompBookmarks.jsx` |
| Dependency Graph | プロジェクトの依存関係をHTMLグラフとして表示 | `panels/dependency-graph/DependencyGraph.jsx` |
| Flip Tools | レイヤーの反転とスケール連携を操作 | `panels/flip-tools/FlipTools.jsx` |
| Marker Editor | 選択レイヤーのマーカー色とコメントを編集 | `panels/marker-editor/MarkerEditor.jsx` |
| Purge All Caches | キャッシュを一括または種類別に削除 | `panels/purge-all-caches/PurgeAllCaches.jsx` |
| Scale KF Paste |相対的な動きを保ってスケールキーフレームをコピー＆ペースト | `panels/scale-kf-paste/ScaleKF_Paste.jsx` |
| Shape Fill Stroke | Illustrator風UIでシェイプの塗りと線を操作 | `panels/shape-fill-stroke/ShapeFillStroke.jsx` |

## Presets

| 名前 | 概要 | ファイル |
| --- | --- | --- |
| Circle Repeater | 中央固定または左上起点で、円を四角いグリッド状に反復 | `presets/circle-repeater/Build_Circle_Repeater.jsx` |
| Trimmed Circle | Start／End／Offsetでパスのトリミングを操作する正円を生成 | `presets/trimmed-circle/Create_Trimmed_Circle.jsx` |
| Simple Text | 中央へシンプルなテキストレイヤーを生成 | `presets/simple-text/Create_Simple_Text.jsx` |
| Simple Rectangle | Width／Height／Roundness付きの四角形を生成 | `presets/simple-rectangle/Create_Simple_Rectangle.jsx` |

## インストール

- `scripts/` 配下の JSX は After Effects の `Scripts` フォルダへコピーします。
- `panels/` 配下の JSX は After Effects の `Scripts/ScriptUI Panels` フォルダへコピーし、After Effects を再起動します。
