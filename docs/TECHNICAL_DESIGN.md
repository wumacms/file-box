# 📦 FileBox 技术实现方案

| 版本 | 日期       | 描述                   | 作者        |
| :--- | :--------- | :--------------------- | :---------- |
| v1.0 | 2026-04-28 | 详细技术架构与实现路径 | Antigravity |

---

## 1. 技术栈选型

- **前端框架**：Vue 3 (Composition API)
- **构建工具**：Vite
- **包管理器**：pnpm
- **UI 组件库**：Element Plus (用于树形控件、弹窗、进度条)
- **样式处理**：Tailwind CSS (响应式布局与微调)
- **后端服务**：Supabase (提供 Auth, Database, RLS)
- **对象存储**：Aliyun OSS (通过 `ali-oss` SDK)
- **状态管理**：Pinia (管理用户信息、全局加载状态、当前路径)

---

## 2. 系统架构设计

### 2.1 存储抽象层 (Storage Provider)

为了支持多后端切换，设计 `IStorageProvider` 抽象接口。

```typescript
// src/providers/type.ts
export interface IImageItem {
  id: string;
  name: string;
  url: string;
  path: string;
  size: number;
  type: string;
  updatedAt: string;
}

export interface IFolderItem {
  name: string;
  path: string; // 绝对路径，如 "userId/images/work/"
}

export interface IStorageProvider {
  // 获取目录下的文件和文件夹
  list(path: string): Promise<{ images: IImageItem[]; folders: IFolderItem[] }>;

  // 上传文件
  upload(
    file: File,
    path: string,
    onProgress?: (p: number) => void,
  ): Promise<IImageItem>;

  // 删除文件/文件夹
  delete(paths: string[]): Promise<void>;

  // 移动文件/文件夹 (支持批量)
  move(sourcePaths: string[], targetPath: string): Promise<void>;

  // 重命名文件/文件夹
  rename(oldPath: string, newName: string): Promise<void>;

  // 复制文件/文件夹 (支持批量)
  copy(sourcePaths: string[], targetPath: string): Promise<void>;

  // 更新图片元数据 (如标签、描述)
  updateMetadata(path: string, metadata: Partial<IImageItem>): Promise<void>;

  // 创建文件夹
  createFolder(path: string): Promise<void>;

  // 删除文件夹及其内容
  deleteFolder(path: string): Promise<void>;

  // 搜索图片 (跨目录)
  search(query: string): Promise<IImageItem[]>;

  // 获取处理后的图片 URL (如缩略图)
  getProcessUrl(
    path: string,
    options: { width?: number; height?: number },
  ): string;

  // 获取存储统计信息
  getStats(): Promise<{ totalSize: number; count: number }>;
}
```

### 2.2 具体实现类

- **OSSProvider**: 调用 Aliyun SDK。由于 OSS
  是扁平存储，重命名文件夹实质上是遍历所有以该路径为前缀的对象，执行 `copy` +
  `delete` 操作。
- **SupabaseProvider**: 调用 `@supabase/storage-js`。

---

## 3. 核心模块实现

### 3.1 目录导航与多存储桶逻辑

采用“存储桶 + 路径驱动”模式。Pinia store 中维护 `activeBucket` 和 `currentPath`（默认为该桶的根目录）。

- **面包屑**：显示当前“存储桶名称 / 目录 / 子目录”的层级结构。
- **侧边栏树**：侧边栏顶层渲染**存储桶列表**。点击不同的存储桶节点时，系统根据该桶配置实例化对应的 `Provider`，并懒加载该桶下的目录树与文件。

### 3.2 批量上传流程

1. 用户选择文件。
2. 前端生成唯一文件名（建议：`timestamp-uuid.ext`）。
3. 循环调用 `provider.upload`，并发数控制在 3-5 个。
4. 利用 `onProgress` 钩子实时更新 Element Plus 的 `el-progress`。

### 3.3 图片预览与大图模式

- **缩略图**：在渲染 `ImageGrid` 时，根据 `url` 自动拼接 OSS 缩略图规则（如
  `?x-oss-process=image/resize,m_fill,w_200,h_200`）。
- **Viewer**：使用 `v-viewer` 或 Element Plus 的 `el-image`
  预览功能，支持快捷键监听。

### 3.4 缓存与预加载

- **Pinia 缓存**：Store 中维护
  `Map<path, ListResponse>`。切换目录时优先命中缓存。
- **失效机制**：任何写操作（上传/删除/移动）成功后，强制清除受影响路径的缓存键。

### 3.5 双写一致性 (Consistency)

- **补偿逻辑**：执行 `upload` 流程时：
  1. 上传文件至 OSS。
  2. 写入 Supabase `images` 表。
  3. 若步骤 2 失败，立即触发 `OSS.delete` 以清理孤儿文件。
- **命名冲突**：上传前检测同名文件，自动采用 `filename_(n).ext`
  策略，兼顾唯一性与 SEO。

### 3.6 独立系统设置页与多存储桶管理

- **独立路由架构**：新增 `/settings` 路由页面替代原全局设置弹窗，以适应多表单及复杂配置需求。
- **配置持久化**：用户填写的多个存储桶配置保存在 Supabase 的 `oss_configs` 数据表中。
- **动态实例化机制**：当用户在侧边栏切换存储桶时，`activeBucket` 状态变更，系统从数据库/Store中读取相应的 AccessKey、SecretKey 等，动态创建全新的 `OSSProvider` 实例。当前所有的上传、读取操作均由该实例接管，实现多桶隔离。

---

## 4. 数据库与权限设计 (Supabase)

### 4.1 数据表

虽然 OSS 本身是 KV 存储，但为了搜索和标签功能，建议在 Supabase 中建立镜像表。

**Table: `images`**

- `id` (uuid, PK)
- `user_id` (uuid, FK)
- `name` (text)
- `path` (text, 索引)
- `url` (text)
- `metadata` (jsonb: size, type, width, height)

**Table: `oss_configs` (存储桶配置表)**

为实现多存储桶管理，新增存储桶配置表：

- `id` (uuid, PK)
- `user_id` (uuid, FK)
- `name` (text, 用户自定义的存储桶展示名称)
- `bucket` (text, OSS 真实的 Bucket 名称)
- `region` (text, 区域节点)
- `access_key` (text)
- `secret_key` (text, 建议结合 Supabase Vault 进行加密存储以保证安全)
- `endpoint` (text, 自定义域名或访问端点)
- `is_default` (boolean, 是否作为默认加载的存储桶)

### 4.2 RLS 策略 (Row Level Security)

```sql
-- 仅允许用户访问自己的图片数据
ALTER TABLE images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User can view own images" ON images
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "User can insert own images" ON images
  FOR INSERT WITH CHECK (auth.uid() = user_id);
```

---

## 5. 安全实现细节

### 5.1 OSS STS 鉴权

1. 前端向 Edge Function 发起请求。
2. Edge Function 验证 Supabase JWT 令牌。
3. 验证通过后，调用阿里云 RAM 接口获取临时访问令牌（AccessKeyId,
   AccessKeySecret, SecurityToken）。
4. 前端实例化 `OSS` 客户端并进行操作。
5. 令牌有效期设为 15-60 分钟，到期自动重刷。

---### 5.2 异常处理标准化

- 定义 `ProviderError` 类，封装错误码（如 `STORAGE_FULL`, `TOKEN_EXPIRED`,
  `CONFLICT`）。
- 全局拦截器捕获 STS 令牌失效（403），自动触发重新获取流程。

## 6. 性能优化方案

- **分片上传**：针对大于 5MB 的文件，自动切换至
  `multipartUpload`，支持断点续传。
- **虚拟列表**：当单目录下图片超过 500 张时，使用 `vue-virtual-scroller`
  渲染网格。
- **CDN 加速**：OSS 绑定自定义域名并开启 CDN，减少图片首屏加载耗时。

---

## 7. 开发路线图

1. **Phase 1**: 环境搭建，配置 Supabase Auth 与基础布局。
2. **Phase 2**: 实现 `OSSProvider` 核心功能（上传、列表、删除）。
3. **Phase 3**: 开发左侧目录树与面包屑联动。
4. **Phase 4**: 实现图片移动与搜索功能。
5. **Phase 5**: 整体 UI 润色与动效添加。
