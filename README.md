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
| Nulls From Selected Shape Paths | 選択したシェイプパスから Null を作成 | `scripts/nulls-from-selected-shape-paths/Nulls_From_Selected_Shape_Paths.jsx` |
| Swap Fill / Stroke Colors | シェイプ／テキストレイヤーの塗りと線の色を交換 | `scripts/swap-fill-stroke-colors/Swap_Fill_Stroke_Colors.jsx` |

## Panels

| 名前 | 概要 | エントリーポイント |
| --- | --- | --- |
| Alpha To Mask | オートトレースしたマスクをレイヤーへ分割 | `panels/alpha-to-mask/AlphaToMask.jsx` |
| Swap Fill / Stroke Colors | 塗りと線の色を交換するドッキングパネル | `panels/swap-fill-stroke-colors/Swap_Fill_Stroke_Colors_Panel.jsx` |

## インストール

- `scripts/` 配下の JSX は After Effects の `Scripts` フォルダへコピーします。
- `panels/` 配下の JSX は After Effects の `Scripts/ScriptUI Panels` フォルダへコピーし、After Effects を再起動します。
