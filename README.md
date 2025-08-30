# 模块化代码分析Agent

<div align="center">
  <h1 align="center">@xhs/modular-code-analysis-agent</h1>
  <p align="center">🚀 强大的代码解析和智能分析工具集</p>
  <p align="center">从Vue、TS、TSX代码中提取实体，进行静态分析、LLM标注、智能检索和AI辅助开发</p>
</div>

---

## 📋 目录

- [🎯 主要功能](#-主要功能)
- [🏗️ 架构概览](#️-架构概览)
- [🚀 快速开始](#-快速开始)
- [📦 安装](#-安装)
- [🔧 核心功能模块](#-核心功能模块)
- [💻 命令行工具](#-命令行工具)
- [🔌 API 接口](#-api-接口)
- [📊 数据格式](#-数据格式)
- [🛠️ 开发指南](#️-开发指南)
- [🧪 测试](#-测试)
- [📈 性能优化](#-性能优化)
- [🤝 贡献指南](#-贡献指南)
- [📄 许可证](#-许可证)

---

## 🎯 主要功能

### 🔍 代码实体提取器
- **多语言支持**: 支持从Vue、TS、TSX文件中提取组件和函数
- **智能识别**: 识别script setup组件、默认导出组件和defineComponent调用
- **高性能**: 基于ts-morph的高效AST解析
- **类型安全**: 完整的TypeScript类型定义

### 🧠 智能丰富化处理 (Enrichment Agent)
- **静态分析**: 提取代码中的IMPORTS、CALLS、EMITS和TEMPLATE_COMPONENTS
- **跨文件分析**: 识别模块依赖关系和跨文件调用
- **LLM标签生成**: 使用Claude模型分析代码生成摘要和标签
- **工具支持**: 提供读取文件等工具供LLM使用
- **持久化**: 将丰富化后的实体保存为JSON文件

### 🔎 智能代码检索 (RAG Agent)
- **语义搜索**: 基于自然语言查询检索相关代码组件
- **关系分析**: 分析组件间的依赖和调用关系
- **相似度计算**: 智能计算代码组件的相似度
- **上下文感知**: 理解代码的业务上下文

### 🤖 AI提交信息生成器
- **智能分析**: 自动分析代码变更内容
- **规范生成**: 生成符合规范的Git提交信息
- **上下文感知**: 结合开发上下文生成更准确的描述
- **交互式编辑**: 支持生成后的编辑和优化

### 📝 AI README生成器
- **项目分析**: 自动分析项目结构和代码
- **智能生成**: 生成详细的项目文档
- **多语言支持**: 支持中英文README生成
- **模板定制**: 支持自定义生成模板

### 🔄 增量解析工具
- **Git集成**: 自动检测Git变更文件
- **增量处理**: 只处理变更的文件，提高效率
- **智能合并**: 智能合并新旧实体数据
- **并发处理**: 支持并发解析提高性能

---

## 🏗️ 架构概览

```
src/
├── 📁 extractors/           # 代码提取器
│   ├── VueExtractor.ts      # Vue文件提取器
│   ├── TSXExtractor.ts      # TSX文件提取器
│   ├── FunctionExtractor.ts # TS函数提取器
│   ├── TSProjectManager.ts  # TypeScript项目管理
│   ├── TypeUtils.ts         # 类型工具
│   ├── PerformanceConfig.ts # 性能配置
│   └── EntityIdGenerator.ts # 实体ID生成器
├── 📁 enrichment/           # 丰富化处理模块
│   ├── staticAnalyzer.ts    # 静态分析器
│   ├── llmLabeler.ts        # LLM标签生成
│   ├── orchestrator.ts      # 流程编排
│   ├── persistence.ts       # 数据持久化
│   ├── tools.ts             # 工具定义
│   ├── interfaces.ts        # 类型定义
│   └── cli.ts               # 命令行入口
├── 📁 commit-generator/     # AI提交信息生成器
│   ├── generators/          # 生成器实现
│   ├── analyzers/           # 代码分析器
│   ├── models/              # 数据模型
│   ├── hooks/               # 自定义钩子
│   ├── db/                  # 数据库操作
│   └── cli.ts               # 命令行工具
├── 📁 readme-generator/     # AI README生成器
│   ├── generators/          # 生成器实现
│   ├── analyzers/           # 项目分析器
│   ├── types.ts             # 类型定义
│   └── utils.ts             # 工具函数
├── 📁 patch-parse/          # 增量解析工具
│   ├── git-provider.ts      # Git集成
│   ├── patch-parse-manager.ts # 解析管理器
│   ├── task-queue-manager.ts # 任务队列管理
│   └── cli.ts               # 命令行工具
├── 📁 db/                   # 数据库模块
├── 📁 utils/                # 工具函数
├── fileWalker.ts            # 文件扫描器
├── rag-inline-tool.ts       # RAG检索工具
├── rag-cli.ts               # RAG命令行工具
├── cli.ts                   # 主命令行工具
└── index.ts                 # 主入口文件
```

---

## 🚀 快速开始

### 1. 安装依赖

```bash
# 在项目根目录执行
npm install
# 或者在packages/parser-agent目录执行
npm install
```

### 2. 构建项目

```bash
npm run build
```

### 3. 提取代码实体

```bash
# 提取指定目录下的代码实体
npm run extract -- --path=/path/to/project
```

### 4. 丰富化处理

```bash
# 对已提取的实体进行丰富化处理
npm run enrich -- --input=/path/to/entities.json --output=/path/to/output.json
```

---

## 📦 安装

### 全局安装

```bash
npm install -g @xhs/modular-code-analysis-agent
```

### 本地安装

```bash
npm install @xhs/modular-code-analysis-agent
```

### 开发版本安装

```bash
npm install @xhs/modular-code-analysis-agent@dev
```

---

## 🔧 核心功能模块

### 1. 代码实体提取器

#### 支持的文件类型
- **Vue文件** (.vue): 支持SFC、script setup、defineComponent
- **TypeScript文件** (.ts): 支持函数、类、接口、类型定义
- **TSX文件** (.tsx): 支持React组件、JSX语法

#### 提取的实体类型
- **VueComponent**: Vue组件
- **Function**: 函数定义
- **Class**: 类定义
- **Interface**: 接口定义
- **Type**: 类型定义
- **Variable**: 变量声明

#### 使用示例

```typescript
import { extractAllEntities } from '@xhs/modular-code-analysis-agent';

// 提取项目中的所有实体
const entities = await extractAllEntities('/path/to/project');

// 提取指定文件的实体
const entities = await extractAllEntities('/path/to/project', ['src/components/Button.vue']);
```

### 2. 智能丰富化处理

#### 静态分析功能
- **导入分析**: 识别import语句和模块依赖
- **调用分析**: 识别函数调用和方法调用
- **事件分析**: 识别Vue组件的事件发送
- **模板分析**: 识别Vue模板中使用的组件

#### LLM标签生成
- **代码摘要**: 生成代码功能摘要
- **业务标签**: 识别业务相关的标签
- **技术标签**: 识别技术栈和框架标签
- **复杂度分析**: 分析代码复杂度

#### 使用示例

```typescript
import { enrichEntities } from '@xhs/modular-code-analysis-agent';

// 丰富化处理
const enrichedEntities = await enrichEntities(entities, {
  enableStaticAnalysis: true,
  enableLLMLabeling: true,
  llmConfig: {
    model: 'claude-3-sonnet-20240229',
    apiKey: process.env.ANTHROPIC_API_KEY
  }
});
```

### 3. 智能代码检索 (RAG)

#### 搜索功能
- **语义搜索**: 基于自然语言查询
- **相似度计算**: 计算代码组件相似度
- **关系分析**: 分析组件间的关系
- **上下文检索**: 基于上下文的智能检索

#### 使用示例

```typescript
import { searchCodeEntities, getRelatedCodeEntities } from '@xhs/modular-code-analysis-agent';

// 语义搜索
const result = await searchCodeEntities(
  '用户登录相关的组件',
  '/path/to/entities.enriched.json',
  '/path/to/project',
  { topK: 5 }
);

// 关系分析
const related = await getRelatedCodeEntities(
  'UserLogin',
  '/path/to/entities.enriched.json',
  '/path/to/project'
);
```

### 4. AI提交信息生成器

#### 功能特性
- **自动分析**: 分析Git暂存区的变更
- **智能生成**: 生成规范的提交信息
- **上下文感知**: 结合开发上下文
- **交互式编辑**: 支持生成后编辑

#### 使用示例

```bash
# 生成提交信息
ai-commit

# 设置开发上下文
ai-commit context set

# 查看当前上下文
ai-commit context show
```

### 5. AI README生成器

#### 功能特性
- **项目分析**: 自动分析项目结构
- **智能生成**: 生成详细的README文档
- **多语言支持**: 支持中英文
- **模板定制**: 支持自定义模板

#### 使用示例

```typescript
import { generateReadmeToFile, generateReadme } from '@xhs/modular-code-analysis-agent';

// 生成README并保存到文件
await generateReadmeToFile('./my-project', './my-project/README.md');

// 只生成内容
const readmeContent = await generateReadme('./my-project');
console.log(readmeContent);
```

### 6. 增量解析工具

#### 功能特性
- **Git集成**: 自动检测变更文件
- **增量处理**: 只处理变更的文件
- **智能合并**: 合并新旧实体数据
- **并发处理**: 支持并发解析

#### 使用示例

```bash
# 解析Git变更
patch-parse

# 指定项目根目录
patch-parse --root /path/to/project

# 设置并发数
patch-parse --concurrency 10
```

---

## 💻 命令行工具

### 主命令行工具 (parser-agent)

```bash
# 提取代码实体
parser-agent extract --path /path/to/project

# 生成README
parser-agent readme --path /path/to/project --output README.md

# 查看帮助
parser-agent --help
```

### 丰富化处理工具 (enrichment-agent)

```bash
# 丰富化处理
enrichment-agent --input entities.json --output enriched.json

# 只进行静态分析
enrichment-agent --input entities.json --output enriched.json --static-only

# 只进行LLM标注
enrichment-agent --input entities.json --output enriched.json --llm-only
```

### RAG检索工具 (rag-agent)

```bash
# 语义搜索
rag-agent search "用户登录组件" --entities entities.enriched.json

# 关系分析
rag-agent related UserLogin --entities entities.enriched.json

# 查看帮助
rag-agent --help
```

### AI提交信息生成器 (ai-commit)

```bash
# 生成提交信息
ai-commit

# 设置上下文
ai-commit context set

# 查看上下文
ai-commit context show

# 清除上下文
ai-commit context clear
```

### 增量解析工具 (patch-parse)

```bash
# 解析Git变更
patch-parse

# 指定项目根目录
patch-parse --root /path/to/project

# 设置并发数
patch-parse --concurrency 10
```

---

## 🔌 API 接口

### 核心API

#### extractAllEntities
```typescript
function extractAllEntities(
  rootPath: string,
  files?: string[]
): Promise<BaseEntity[]>
```

#### enrichEntities
```typescript
function enrichEntities(
  entities: BaseEntity[],
  options: EnrichmentOptions
): Promise<EnrichedEntity[]>
```

#### searchCodeEntities
```typescript
function searchCodeEntities(
  query: string,
  entitiesPath: string,
  rootPath: string,
  options?: SearchOptions
): Promise<SearchResult>
```

#### generateReadme
```typescript
function generateReadme(
  projectPath: string,
  options?: ReadmeOptions
): Promise<string>
```

### 类型定义

#### BaseEntity
```typescript
interface BaseEntity {
  id: string;
  name: string;
  type: EntityType;
  file: string;
  startLine: number;
  endLine: number;
  rawName: string;
  summary?: string;
}
```

#### EnrichedEntity
```typescript
interface EnrichedEntity extends BaseEntity {
  staticAnalysis?: StaticAnalysisResult;
  llmLabels?: LLMResponse;
  tags?: string[];
  complexity?: number;
}
```

#### StaticAnalysisResult
```typescript
interface StaticAnalysisResult {
  imports: string[];
  calls: string[];
  emits: string[];
  templateComponents: string[];
}
```

---

## 📊 数据格式

### 实体JSON格式

```json
{
  "id": "unique-entity-id",
  "name": "UserLogin",
  "type": "VueComponent",
  "file": "src/components/UserLogin.vue",
  "startLine": 1,
  "endLine": 50,
  "rawName": "UserLogin",
  "summary": "用户登录组件",
  "staticAnalysis": {
    "imports": ["axios", "vue-router"],
    "calls": ["login", "validateForm"],
    "emits": ["login-success", "login-error"],
    "templateComponents": ["el-form", "el-button"]
  },
  "llmLabels": {
    "summary": "用户登录组件，包含表单验证和API调用",
    "tags": ["authentication", "form", "api"],
    "businessContext": "用户管理模块"
  },
  "tags": ["authentication", "form", "api"],
  "complexity": 3
}
```

### 配置格式

#### 丰富化配置
```json
{
  "enableStaticAnalysis": true,
  "enableLLMLabeling": true,
  "llmConfig": {
    "model": "claude-3-sonnet-20240229",
    "apiKey": "your-api-key",
    "maxTokens": 4000
  },
  "staticAnalysisConfig": {
    "includeImports": true,
    "includeCalls": true,
    "includeEmits": true,
    "includeTemplates": true
  }
}
```

---

## 🛠️ 开发指南

### 项目结构

```
packages/parser-agent/
├── src/
│   ├── extractors/           # 代码提取器
│   ├── enrichment/           # 丰富化处理
│   ├── commit-generator/     # AI提交生成器
│   ├── readme-generator/     # AI README生成器
│   ├── patch-parse/          # 增量解析
│   ├── db/                   # 数据库模块
│   ├── utils/                # 工具函数
│   └── index.ts              # 主入口
├── tests/                    # 测试文件
├── dist/                     # 构建输出
├── package.json              # 包配置
└── tsconfig.json            # TypeScript配置
```

### 开发环境设置

```bash
# 克隆项目
git clone <repository-url>
cd modular-code-analysis-util

# 安装依赖
pnpm install

# 构建项目
pnpm build

# 运行测试
pnpm test
```

### 添加新的提取器

1. 在 `src/extractors/` 目录下创建新的提取器
2. 实现 `BaseExtractor` 接口
3. 在 `fileWalker.ts` 中注册新的提取器
4. 添加相应的测试

### 添加新的分析器

1. 在 `src/enrichment/` 目录下创建新的分析器
2. 实现相应的分析逻辑
3. 在 `orchestrator.ts` 中集成新的分析器
4. 添加相应的测试

---

## 🧪 测试

### 运行测试

```bash
# 运行所有测试
npm test

# 运行特定测试文件
npm run test src/index.test.ts

# 运行特定测试用例
npm run test -- -t "StaticAnalyzer"

# 使用详细输出运行测试
npm run test -- --silent=false

# 监听模式
npm run test:watch
```

### 测试覆盖率

```bash
# 生成覆盖率报告
npm run test -- --coverage

# 查看覆盖率报告
open coverage/lcov-report/index.html
```

### 调试测试

```bash
# 使用Node调试器运行
node --inspect-brk node_modules/.bin/vitest run src/index.test.ts
```

---

## 📈 性能优化

### 并发处理

- **文件解析**: 支持并发解析多个文件
- **LLM调用**: 支持并发调用LLM API
- **数据库操作**: 支持并发数据库查询

### 缓存机制

- **文件缓存**: 缓存已解析的文件AST
- **LLM缓存**: 缓存LLM响应结果
- **关系缓存**: 缓存组件关系数据

### 内存优化

- **流式处理**: 大文件使用流式处理
- **垃圾回收**: 及时释放不需要的内存
- **分块处理**: 大量数据分块处理

### 性能监控

```typescript
import { PerformanceConfig } from './extractors/PerformanceConfig';

// 启用性能监控
PerformanceConfig.enableProfiling = true;

// 设置性能阈值
PerformanceConfig.maxProcessingTime = 5000; // 5秒
```

---

## 🤝 贡献指南

### 开发流程

1. **Fork项目**: Fork到你的GitHub账户
2. **创建分支**: 创建功能分支 `git checkout -b feature/new-feature`
3. **开发功能**: 实现新功能或修复bug
4. **编写测试**: 为新功能编写测试用例
5. **提交代码**: 提交代码并推送到分支
6. **创建PR**: 创建Pull Request

### 代码规范

- **TypeScript**: 使用TypeScript编写代码
- **ESLint**: 遵循ESLint规则
- **Prettier**: 使用Prettier格式化代码
- **注释**: 为复杂逻辑添加注释

### 提交规范

使用AI提交信息生成器生成规范的提交信息：

```bash
ai-commit
```

### 测试要求

- **单元测试**: 新功能需要单元测试
- **集成测试**: 重要功能需要集成测试
- **覆盖率**: 测试覆盖率不低于80%

---

## 📄 许可证

MIT License

---

## 🆘 支持

### 问题反馈

如果你遇到问题或有建议，请：

1. 查看 [Issues](https://github.com/your-repo/issues)
2. 创建新的Issue描述问题
3. 提供详细的错误信息和复现步骤

### 文档

- [API文档](./docs/api.md)
- [配置指南](./docs/configuration.md)
- [最佳实践](./docs/best-practices.md)
- [常见问题](./docs/faq.md)

### 社区

- [GitHub Discussions](https://github.com/your-repo/discussions)
- [Discord社区](https://discord.gg/your-community)

---

<div align="center">
  <p>Made with ❤️ by the Modular Code Analysis Team</p>
  <p>如果这个项目对你有帮助，请给我们一个 ⭐️</p>
</div>



