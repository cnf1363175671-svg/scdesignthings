# HEMO 三宠 2026 设计管理证明网站

这是一个用于向老板展示设计管理能力、创意执行力与业务理解的互动网页项目。

## 必须保留的关键内容

请不要删除 `public/assets` 目录。页面的视频素材和关键互动都依赖这些文件：

- `hero-cinematic-bg.mp4`：开屏 Hero 背景视频
- `cat-demand-eye-track.mp4`：第二板块猫咪互动视频
- `demand-hero-left.mp4`、`demand-hero-right.mp4`：第二板块 123 云盘 Hero 视频的本地 fallback
- `demand-gallery-1.mp4` 到 `demand-gallery-5.mp4`：第二板块 123 云盘画廊视频的本地 fallback
- `future-product-scroll-bg.mp4`：第三板块滚动控制视频
- `capability-top-left.mp4`、`capability-top-right.mp4`、`capability-bottom-left.mp4`、`capability-bottom-right.mp4`：第四板块鼠标分区互动视频
- `future-product-pov-cat.mp4`：备用/保留的新产品视频素材

页面目前没有依赖本地图片素材；视觉内容主要由视频、CSS 和交互动画组成。

第二板块的 archive 视频会优先加载 123 云盘直链；如果外链报错、loadedmetadata 超时，或长时间无法进入可播放状态，会自动切换到 `public/assets` 下的本地 fallback 文件。

## 关键互动

- 开屏 Hero：点击进入下一屏，带视频背景和标题排版。
- 第二板块：鼠标移动与猫咪视觉互动。
- 第三板块：滚动进度控制视频播放，并带视差文本入场。
- 第四板块：鼠标进入不同区域时切换视频和对应能力说明。

## 本地预览

```bash
pnpm install
pnpm dev
```

## 部署

```bash
pnpm build
```

部署输出目录为 `dist`。
