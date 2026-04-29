# 📦 FileBox (原 Image Box)

[![Vue](https://img.shields.io/badge/Vue-3.x-4fc08d?logo=vue.js)](https://vuejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6?logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.x-646cff?logo=vite)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-4.x-06b6d4?logo=tailwindcss)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Auth%20%26%20DB-3ecf8e?logo=supabase)](https://supabase.com/)

「FileBox」是一个面向可视化建站平台的通用、高性能、多格式文件与媒体资源管理系统。它提供了类似云盘的用户体验，支持多存储后端切换，并集成了多级目录管理、批量操作、多格式大文件预览（图片、视频、PDF、Markdown、CSV、HTML
等）等核心功能。

## ✨ 核心特性

- **🔐 完备的认证系统**：基于 Supabase Auth 实现用户注册、登录及资源隔离。
- **🗄️ 多存储桶管理**：支持动态配置和无缝切换多个阿里云 OSS 存储桶。
- **📂 层级目录系统**：支持无限层级文件夹创建、重命名、移动及递归删除。
- **⚡ 极致的操作体验**：
  - **批量上传**：支持多文件并发上传，实时进度显示。
  - **多选管理**：支持框选/勾选，实现批量移动、删除操作。
  - **即时重命名**：支持对文件和文件夹进行平滑的重命名。
- **🖼️ 智能预览系统**：
  - **全格式预览**：沉浸式大屏模式，支持多媒体（图像、视频）与文档（PDF、Markdown、CSV、文本等）原生渲染和代码高亮。
  - **缩略图优化**：对于图片，自动利用 OSS
    实时处理能力生成缩略图，极速加载并节省流量。
- **🎨 现代感 UI/UX**：基于 TailwindCSS 4.0 和 Element Plus
  打造的响应式布局，支持暗色模式与侧边栏缩放。

## 🛠️ 技术栈

- **核心**: Vue 3 (Composition API + `<script setup>`)
- **构建**: Vite + TypeScript
- **样式**: Tailwind CSS 4.0 + Element Plus
- **存储/后端**: Supabase (Auth / Database / RLS) + Aliyun OSS (ali-oss SDK)
- **状态管理**: Pinia
- **图标**: Lucide Vue Next + Element Plus Icons

## 🚀 快速开始

### 1. 环境准备

在项目根目录创建 `.env` 文件，并填写你的配置：

```bash
# Supabase 配置
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# OSS 配置
# 基础配置，多桶管理建议通过设置页持久化至 DB
```

### 2. 部署与自定义域名 (GitHub Pages)

本项目支持通过 GitHub Actions 自动部署。如果需要使用自定义域名（如
`box.net10010.cn`），请按以下步骤配置：

#### 2.1 配置 GitHub Secrets

在仓库的 **Settings -> Secrets and variables -> Actions** 中添加以下 Secrets：

- `VITE_SUPABASE_URL`: 你的 Supabase 项目 URL。
- `VITE_SUPABASE_ANON_KEY`: 你的 Supabase Anon Key。
- `CUSTOM_DOMAIN`: (可选) 你的自定义域名。

#### 2.2 DNS 解析配置

如果你使用了 `CUSTOM_DOMAIN`，请在 DNS 服务商处添加：

- **记录类型**: `CNAME`
- **主机记录**: `box` (根据你的子域名决定)
- **记录值**: `你的用户名.github.io`

### 3. 数据库初始化

在 Supabase SQL Editor 中执行
[docs/supabase_schema_backup.sql](docs/supabase_schema_backup.sql)
脚本以初始化必要的数据表和安全策略。

### 4. 安装与运行

```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev

# 构建生产版本
pnpm build
```

## 📂 项目结构

```text
src/
├── components/     # 通用组件 (Sidebar, ImageGrid, Upload, etc.)
├── composables/    # 组合式函数 (useResizable, useOSS, etc.)
├── providers/      # 存储驱动实现 (IStorageProvider 抽象及 OSS 实现)
├── stores/         # Pinia 状态管理 (User, Bucket, Path)
├── views/          # 页面布局 (MainLayout, Settings, Login)
├── router/         # 路由配置
└── App.vue         # 根组件
```

## 🛡️ 安全实践

- **资源隔离**：所有 OSS 存储路径强制以 `userId/` 作为前缀。
- **安全鉴权**：通过 Supabase RLS 保护数据库记录。
- **凭证管理**：OSS 建议配合 Supabase Edge Functions 实现 STS 临时凭证获取，避免
  AccessKey 长期暴露于前端。

## 📅 路线图

- [x] 多存储桶动态切换
- [x] 文件夹系统 (创建/重命名/删除)
- [x] 批量上传与全格式多媒体预览
- [x] 跨目录文件移动
- [x] 全局文件名搜索
- [ ] 拖拽上传与移动
- [ ] 媒体文件基础编辑（图片裁剪、压缩等）

## 📄 开源协议

本项目基于 [MIT License](LICENSE) 协议。
