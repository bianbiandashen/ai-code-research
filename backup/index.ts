import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  RagInlineTool,
  EnrichedEntity,
} from "@xhs/modular-code-analysis-agent";
import path from "path";
import { TOOL_PARAMS, TOOL_NAMES, TOOL_DESCRIPTIONS } from "./tools/params";
import { conversationService } from "./services/conversation-service";
import { Entity } from "./types";

// 扩展 RagInlineTool 类型以包含智能关联方法
interface ExtendedRagInlineTool extends RagInlineTool {
  getSmartRelatedEntities?(
    entityId: string,
    userRequirement: string,
    maxEntities?: number
  ): Promise<{
    sourceEntity: EnrichedEntity;
    smartSelection: EnrichedEntity[];
    reasoning: string;
    allCandidates: {
      imports: EnrichedEntity[];
      calls: EnrichedEntity[];
      templates: EnrichedEntity[];
      similar: EnrichedEntity[];
    };
  } | null>;
}

// 类型转换工具函数：将 EnrichedEntity 转换为 Entity
function enrichedToEntity(enriched: EnrichedEntity): Entity {
  return {
    id: enriched.id,
    rawName: enriched.rawName,
    type: enriched.type,
    file: enriched.file,
    summary: enriched.summary,
    tags: enriched.tags,
  };
}

export const server = new McpServer({
  name: process.env.APP_NAME || "code-research-server",
  version: process.env.APP_VERSION || "0.1.0",
  // 添加工具触发条件
  toolTriggers: {
    [TOOL_NAMES.START_ANALYSIS]: {
      // 设置高优先级，确保在需求讨论时优先触发
      priority: 1.0,
      // 默认触发，让工具在需求讨论时始终可用
      default: true,
      // 添加一些常见的需求讨论模式
      patterns: [
        // 需求讨论模式
        /.*(需求|功能|特性|bug|问题|优化|重构).*/,
        // 代码改动模式
        /.*(修改|增加|添加|删除|调整|优化|重构).*/,
        // 业务场景模式
        /.*(页面|组件|按钮|事件|流程|逻辑).*/,
      ],
    },
  },
});

// 检查entities.enriched.json文件是否存在
const entitiesFilePath = path.join(
  process.env.CURSOR_WORKSPACE_PATH || process.cwd(),
  "data",
  "entities.enriched.json"
);
const ragTool = new RagInlineTool(entitiesFilePath) as ExtendedRagInlineTool;

const hasEntitiesFile = require("fs").existsSync(entitiesFilePath);

if (!hasEntitiesFile) {
  console.error(`⚠️  警告: 未找到实体文件 ${entitiesFilePath}`);
  console.error(
    "   请确保在项目根目录运行，或先执行 parser-agent 生成实体文件"
  );
}

// 开始实体分析对话 - Step 1: 分析需求，返回5个核心组件
server.tool(
  TOOL_NAMES.START_ANALYSIS,
  TOOL_DESCRIPTIONS[TOOL_NAMES.START_ANALYSIS],
  TOOL_PARAMS.startAnalysis,
  async ({ input, sessionId }) => {
    try {
      // 检查实体文件是否存在
      if (!hasEntitiesFile) {
        return {
          content: [
            {
              type: "text",
              text: `❌ 错误: 未找到实体文件 ${entitiesFilePath}

请执行以下步骤：
1. 确保在项目根目录运行 MCP 服务器
2. 或先执行 parser-agent 生成实体文件：
   \`\`\`
   pnpm run parser-agent extract
   \`\`\`
3. 然后执行 enrichment-agent 丰富实体信息：
   \`\`\`
   pnpm run enrichment-agent
   \`\`\``,
            },
          ],
        };
      }

      const currentSessionId = sessionId || Date.now().toString();
      const startTime = Date.now();

      // 1. 使用 RAG 工具搜索相关实体，限制为5个核心组件
      const searchResult = await ragTool.search(input, 5);

      // 2. 保存会话状态 - 只保存核心组件信息
      conversationService.setConversation(currentSessionId, {
        sessionId: currentSessionId,
        step: "select-core",
        userInput: input,
        coreComponents: searchResult.entities,
        relevanceScores: searchResult.relevanceScores,
        selectedCoreIndex: 0, // 默认选择第一个
      });

      const duration = (Date.now() - startTime) / 1000;

      // 3. 返回核心组件列表供用户选择
      const result = `# 🎯 需求分析完成

## 📝 需求描述
**您的需求**: ${input}
**分析耗时**: ${duration.toFixed(2)}秒
**会话ID**: ${currentSessionId}

---

## 🏆 推荐的5个核心组件

${searchResult.entities
  .map((entity, index) => {
    const score = searchResult.relevanceScores[entity.id] || 0;
    const isDefault = index === 0;
    return `### ${index + 1}. ${entity.id} ${isDefault ? "👑 *默认推荐*" : ""}
- 📁 **文件**: ${entity.file}
- 🏷️ **类型**: ${entity.type}
- 📊 **相关度**: ${score.toFixed(2)}
- 📄 **摘要**: ${entity.summary || "无摘要"}`;
  })
  .join("\n\n")}

---

## 🎯 请选择您的操作方式

### ⚡ 方式1: 快速生成（使用最优组件）
直接使用最相关的组件 **${searchResult.entities[0]?.id}** 生成代码提示词：
\`\`\`
select-core-component
sessionId: "${currentSessionId}"
autoGenerate: true
\`\`\`

### 🎯 方式2: 选择特定组件
选择其他组件，请复制以下模板并修改 componentId：

**选择第2个组件**: ${searchResult.entities[1]?.id || "无"}
\`\`\`
select-core-component
sessionId: "${currentSessionId}"
componentId: "${searchResult.entities[1]?.id || ""}"
autoGenerate: true
\`\`\`

**选择第3个组件**: ${searchResult.entities[2]?.id || "无"}
\`\`\`
select-core-component
sessionId: "${currentSessionId}"
componentId: "${searchResult.entities[2]?.id || ""}"
autoGenerate: true
\`\`\`

**选择第4个组件**: ${searchResult.entities[3]?.id || "无"}
\`\`\`
select-core-component
sessionId: "${currentSessionId}"
componentId: "${searchResult.entities[3]?.id || ""}"
autoGenerate: true
\`\`\`

**选择第5个组件**: ${searchResult.entities[4]?.id || "无"}
\`\`\`
select-core-component
sessionId: "${currentSessionId}"
componentId: "${searchResult.entities[4]?.id || ""}"
autoGenerate: true
\`\`\`

### 🔍 方式3: 详细查看后选择
如需查看相关实体再决定，去掉 autoGenerate 参数：
\`\`\`
select-core-component
sessionId: "${currentSessionId}"
componentId: "组件ID"
\`\`\`

### ⚡ 方式4: 一键分析（完全重新开始）
如需使用不同的组件索引：
\`\`\`
quick-analysis
input: "${input}"
componentIndex: 1
includeRelated: true
\`\`\`

💡 **使用说明**: 
1. 复制上面任意一个代码块
2. 在 Cursor 中输入或粘贴
3. 根据需要修改参数值
4. 回车执行

🎯 **推荐**: 大多数情况下使用方式1即可获得最佳结果！`;

      return {
        content: [{ type: "text", text: result }],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `分析过程出错: ${
              error instanceof Error ? error.message : String(error)
            }`,
          },
        ],
      };
    }
  }
);

// 提取公共的选择和生成逻辑
async function selectAndGenerate(
  sessionId: string,
  componentId?: string,
  autoGenerate: boolean = false
): Promise<any> {
  try {
    const conversation = conversationService.getConversation(sessionId);
    if (
      !conversation ||
      conversation.step !== "select-core" ||
      !conversation.coreComponents
    ) {
      return {
        content: [{ type: "text", text: `❌ 会话状态错误，请重新开始分析` }],
      };
    }

    let selectedIndex = 0;
    let selectedComponent = conversation.coreComponents[0];

    // 如果提供了 componentId，查找对应的组件
    if (componentId) {
      const index = conversation.coreComponents.findIndex(
        (comp) => comp.id === componentId
      );
      if (index === -1) {
        return {
          content: [
            {
              type: "text",
              text: `❌ 无效的组件ID: ${componentId}\n\n可用的组件ID：\n${conversation.coreComponents
                .map((comp, i) => `${i + 1}. ${comp.id}`)
                .join("\n")}`,
            },
          ],
        };
      }
      selectedIndex = index;
      selectedComponent = conversation.coreComponents[index];
    }

    const startTime = Date.now();

    // 使用智能关联方法获取相关实体
    let allRelatedEntities: Entity[] = [];
    let limitedRelatedEntities;
    let aiReasoning = "";

    if (autoGenerate) {
      // 自动生成模式：使用AI智能选择1-3个最相关的实体
      if (ragTool.getSmartRelatedEntities) {
        const smartResult = await ragTool.getSmartRelatedEntities(
          selectedComponent.id,
          conversation.userInput,
          3
        );

        if (smartResult) {
          allRelatedEntities = smartResult.smartSelection.map(enrichedToEntity);
          aiReasoning = smartResult.reasoning;

          // 为了保持兼容性，构造 limitedRelatedEntities 结构
          limitedRelatedEntities = {
            imports: smartResult.allCandidates.imports
              .slice(0, 3)
              .map(enrichedToEntity),
            calls: smartResult.allCandidates.calls
              .slice(0, 3)
              .map(enrichedToEntity),
            templates: smartResult.allCandidates.templates
              .slice(0, 3)
              .map(enrichedToEntity),
            similar: smartResult.allCandidates.similar
              .slice(0, 3)
              .map(enrichedToEntity),
          };
        } else {
          allRelatedEntities = [];
          limitedRelatedEntities = {
            imports: [],
            calls: [],
            templates: [],
            similar: [],
          };
        }
      } else {
        // 回退到原有的简单筛选逻辑
        const relatedResult = await ragTool.getRelatedEntities(
          selectedComponent.id
        );
        if (relatedResult) {
          const allPossibleEntities = [
            ...relatedResult.relatedEntities.imports
              .slice(0, 2)
              .map(enrichedToEntity),
            ...relatedResult.relatedEntities.calls
              .slice(0, 2)
              .map(enrichedToEntity),
            ...relatedResult.relatedEntities.templates
              .slice(0, 2)
              .map(enrichedToEntity),
            ...relatedResult.relatedEntities.similar
              .slice(0, 1)
              .map(enrichedToEntity),
          ];

          allRelatedEntities = allPossibleEntities.slice(0, 3);
          aiReasoning = "使用基础筛选逻辑，选择前3个相关实体";

          limitedRelatedEntities = {
            imports: relatedResult.relatedEntities.imports
              .slice(0, 3)
              .map(enrichedToEntity),
            calls: relatedResult.relatedEntities.calls
              .slice(0, 3)
              .map(enrichedToEntity),
            templates: relatedResult.relatedEntities.templates
              .slice(0, 3)
              .map(enrichedToEntity),
            similar: relatedResult.relatedEntities.similar
              .slice(0, 3)
              .map(enrichedToEntity),
          };
        } else {
          allRelatedEntities = [];
          limitedRelatedEntities = {
            imports: [],
            calls: [],
            templates: [],
            similar: [],
          };
        }
      }
    } else {
      // 非自动模式，保持原有逻辑
      const relatedResult = await ragTool.getRelatedEntities(
        selectedComponent.id
      );
      if (!relatedResult) {
        return {
          content: [
            {
              type: "text",
              text: `❌ 未找到 ${selectedComponent.id} 的相关实体`,
            },
          ],
        };
      }

      limitedRelatedEntities = {
        imports: relatedResult.relatedEntities.imports
          .slice(0, 3)
          .map(enrichedToEntity),
        calls: relatedResult.relatedEntities.calls
          .slice(0, 3)
          .map(enrichedToEntity),
        templates: relatedResult.relatedEntities.templates
          .slice(0, 3)
          .map(enrichedToEntity),
        similar: relatedResult.relatedEntities.similar
          .slice(0, 3)
          .map(enrichedToEntity),
      };

      allRelatedEntities = [
        ...limitedRelatedEntities.imports,
        ...limitedRelatedEntities.calls,
        ...limitedRelatedEntities.templates,
        ...limitedRelatedEntities.similar,
      ];
    }

    // 默认选择：核心组件 + 相关实体
    const defaultSelection = [selectedComponent, ...allRelatedEntities];

    // 更新会话状态
    conversationService.updateConversation(sessionId, {
      selectedCoreIndex: selectedIndex,
      relatedEntities: limitedRelatedEntities,
      allRelatedEntities,
      defaultSelection,
      aiReasoning, // 保存AI推理过程
      step: "confirm-selection",
    });

    const duration = (Date.now() - startTime) / 1000;
    const relevanceScore =
      conversation.relevanceScores?.[selectedComponent.id] || 0;

    // 如果设置了自动生成，直接生成提示词
    if (autoGenerate) {
      const codePrompt = generateCodePrompt(
        conversation.userInput,
        defaultSelection
      );

      // 更新会话状态为完成
      conversationService.updateConversation(sessionId, {
        step: "completed",
        finalSelection: defaultSelection,
        generatedPrompt: codePrompt,
      });

      return {
        content: [
          {
            type: "text",
            text: `# 🚀 智能分析完成

## 🎯 选中的核心组件
**${selectedComponent.id}** (相关度: ${relevanceScore.toFixed(2)})

## 🤖 AI智能选择的实体
- 核心组件: 1个
- 相关实体: ${allRelatedEntities.length}个 (AI智能筛选)
- 总计: ${defaultSelection.length}个

${
  allRelatedEntities.length > 0
    ? `### 🔗 AI选择的相关实体:
${allRelatedEntities
  .map((entity, i) => `${i + 1}. \`${entity.id}\` - ${entity.file}`)
  .join("\n")}

### 🧠 AI选择理由:
${aiReasoning}
`
    : ""
}

## 🎯 生成的代码提示词

\`\`\`
${codePrompt}
\`\`\`

---

## 🚀 选择下一步

### ⚡ 立即开始编码
直接使用上面的提示词开始编码：
\`\`\`
请帮我实现以下需求：

${codePrompt}
\`\`\`

### ✏️ 修改提示词后编码
如需修改提示词内容，请：
1. 复制上面的代码提示词
2. 根据需要进行修改
3. 然后输入："请帮我实现以下需求：[修改后的提示词]"

### 🔧 调整实体选择
需要调整？使用以下工具：
\`\`\`
modify-entity-selection
sessionId: "${sessionId}"
action: "remove"
entityIds: "不需要的实体ID"
autoGenerate: true
\`\`\`

💡 **提示**: AI已智能筛选最相关实体，推荐直接使用"立即开始编码"！`,
          },
        ],
      };
    }

    // 否则返回选择结果，等待用户决定下一步
    const result = `# ✅ 核心组件已选择

## 🎯 选中的核心组件
**${selectedComponent.id}**
- 📁 文件: ${selectedComponent.file}
- 🏷️ 类型: ${selectedComponent.type}
- 📊 相关度: ${relevanceScore.toFixed(2)}
- 📄 摘要: ${selectedComponent.summary || "无摘要"}

## 🔗 相关实体 (每类最多3个)

${
  limitedRelatedEntities.imports.length > 0
    ? `### 📥 导入关系 (${limitedRelatedEntities.imports.length}个)
${limitedRelatedEntities.imports
  .map(
    (entity: Entity, i: number) => `${i + 1}. \`${entity.id}\` - ${entity.file}`
  )
  .join("\n")}
`
    : ""
}
${
  limitedRelatedEntities.calls.length > 0
    ? `### 🔗 调用关系 (${limitedRelatedEntities.calls.length}个)
${limitedRelatedEntities.calls
  .map(
    (entity: Entity, i: number) => `${i + 1}. \`${entity.id}\` - ${entity.file}`
  )
  .join("\n")}
`
    : ""
}
${
  limitedRelatedEntities.templates.length > 0
    ? `### 🎨 模板关系 (${limitedRelatedEntities.templates.length}个)
${limitedRelatedEntities.templates
  .map(
    (entity: Entity, i: number) => `${i + 1}. \`${entity.id}\` - ${entity.file}`
  )
  .join("\n")}
`
    : ""
}
${
  limitedRelatedEntities.similar.length > 0
    ? `### 🏷️ 相似标签 (${limitedRelatedEntities.similar.length}个)
${limitedRelatedEntities.similar
  .map(
    (entity: Entity, i: number) => `${i + 1}. \`${entity.id}\` - ${entity.file}`
  )
  .join("\n")}
`
    : ""
}

**📊 统计**: 核心组件1个 + 相关实体${allRelatedEntities.length}个 = 总计${
      defaultSelection.length
    }个实体
**⏱️ 加载耗时**: ${duration.toFixed(2)}秒

---

## 🎯 请选择您的下一步操作

### ⚡ 选择1: 立即生成代码提示词
使用当前所有实体生成：
\`\`\`
generate-code-prompt
sessionId: "${sessionId}"
\`\`\`

### ✏️ 选择2: 移除不需要的实体
例如移除某些导入关系实体：
\`\`\`
modify-entity-selection
sessionId: "${sessionId}"
action: "remove"
entityIds: "要移除的实体ID,用逗号分隔"
autoGenerate: true
\`\`\`

### ➕ 选择3: 添加其他实体
如需添加其他实体：
\`\`\`
modify-entity-selection
sessionId: "${sessionId}"
action: "add"
entityIds: "要添加的实体ID,用逗号分隔"
autoGenerate: true
\`\`\`

### 🔄 选择4: 只保留核心组件
清除所有相关实体，只保留核心组件：
\`\`\`
modify-entity-selection
sessionId: "${sessionId}"
action: "clear"
autoGenerate: true
\`\`\`

### 🎯 选择5: 选择其他核心组件
回到组件选择（需要提供完整的组件ID）：
\`\`\`
select-core-component
sessionId: "${sessionId}"
componentId: "完整的组件ID"
autoGenerate: true
\`\`\`

💡 **操作提示**: 
- 复制上面的代码块，根据需要修改参数
- entityIds 用英文逗号分隔，例如: "Component:A,API:B,Hook:C"
- 设置 autoGenerate: true 可直接生成最终提示词
- 大部分情况推荐选择1直接生成`;

    return {
      content: [{ type: "text", text: result }],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `选择失败: ${
            error instanceof Error ? error.message : String(error)
          }`,
        },
      ],
    };
  }
}

// Step 2: 选择核心组件
server.tool(
  TOOL_NAMES.SELECT_CORE_COMPONENT,
  TOOL_DESCRIPTIONS[TOOL_NAMES.SELECT_CORE_COMPONENT],
  TOOL_PARAMS.selectCoreComponent,
  async ({ sessionId, componentId, autoGenerate = false }) => {
    return await selectAndGenerate(sessionId, componentId, autoGenerate);
  }
);

// Step 3: 修改实体选择
server.tool(
  TOOL_NAMES.MODIFY_ENTITY_SELECTION,
  TOOL_DESCRIPTIONS[TOOL_NAMES.MODIFY_ENTITY_SELECTION],
  TOOL_PARAMS.modifyEntitySelection,
  async ({ sessionId, action, entityIds, autoGenerate = false }) => {
    try {
      const conversation = conversationService.getConversation(sessionId);
      if (
        !conversation ||
        conversation.step !== "confirm-selection" ||
        !conversation.coreComponents ||
        typeof conversation.selectedCoreIndex !== "number" ||
        !conversation.allRelatedEntities
      ) {
        return {
          content: [
            { type: "text", text: `❌ 会话状态错误，请先选择核心组件` },
          ],
        };
      }

      const coreComponent =
        conversation.coreComponents[conversation.selectedCoreIndex];
      if (!coreComponent) {
        return {
          content: [{ type: "text", text: `❌ 核心组件不存在` }],
        };
      }

      const availableEntities = [
        coreComponent,
        ...conversation.allRelatedEntities,
      ];
      const currentSelection =
        conversation.customSelection || conversation.defaultSelection || [];

      let newSelection: Entity[] = [];

      switch (action) {
        case "clear":
          newSelection = [coreComponent]; // 保留核心组件
          break;

        case "replace":
          if (!entityIds) {
            return {
              content: [
                {
                  type: "text",
                  text: `❌ replace 操作需要提供 entityIds 参数`,
                },
              ],
            };
          }
          const replaceIds = entityIds
            .split(",")
            .map((id) => id.trim())
            .filter(Boolean);
          newSelection = availableEntities.filter((e) =>
            replaceIds.includes(e.id)
          );
          // 确保核心组件总是包含在内
          if (!newSelection.find((e) => e.id === coreComponent.id)) {
            newSelection.unshift(coreComponent);
          }
          break;

        case "add":
          if (!entityIds) {
            return {
              content: [
                { type: "text", text: `❌ add 操作需要提供 entityIds 参数` },
              ],
            };
          }
          const addIds = entityIds
            .split(",")
            .map((id) => id.trim())
            .filter(Boolean);
          const currentIds = new Set(currentSelection.map((e) => e.id));
          const toAdd = availableEntities.filter(
            (e) => addIds.includes(e.id) && !currentIds.has(e.id)
          );
          newSelection = [...currentSelection, ...toAdd];
          break;

        case "remove":
          if (!entityIds) {
            return {
              content: [
                { type: "text", text: `❌ remove 操作需要提供 entityIds 参数` },
              ],
            };
          }
          const removeIds = entityIds
            .split(",")
            .map((id) => id.trim())
            .filter(Boolean);
          newSelection = currentSelection.filter((e) => {
            // 核心组件不能被移除
            if (e.id === coreComponent.id) return true;
            return !removeIds.includes(e.id);
          });
          break;

        default:
          return {
            content: [{ type: "text", text: `❌ 无效的操作类型: ${action}` }],
          };
      }

      // 更新会话状态
      conversationService.updateConversation(sessionId, {
        customSelection: newSelection,
        step: "ready-generate",
      });

      // 如果设置了自动生成，直接生成提示词
      if (autoGenerate) {
        const codePrompt = generateCodePrompt(
          conversation.userInput,
          newSelection
        );

        // 更新会话状态为完成
        conversationService.updateConversation(sessionId, {
          step: "completed",
          finalSelection: newSelection,
          generatedPrompt: codePrompt,
        });

        return {
          content: [
            {
              type: "text",
              text: `# 🚀 实体调整完成并生成提示词

## 📋 操作结果
- **操作类型**: ${action}
- **最终选中**: ${newSelection.length} 个实体

## 🎯 生成的代码提示词

\`\`\`
${codePrompt}
\`\`\`

---

## ✅ 完成！
您可以直接复制上面的提示词给AI助手进行代码生成。`,
            },
          ],
        };
      }

      const result = `# ✏️ 实体选择已更新

## 📋 操作结果
- **操作类型**: ${action}
- **当前选中**: ${newSelection.length} 个实体

## 📋 最终选中的实体

${newSelection
  .map(
    (entity: Entity, index: number) =>
      `${index + 1}. **${entity.id}** ${
        entity.id === coreComponent.id ? "👑" : ""
      }
   - 📁 文件: ${entity.file}
   - 🏷️ 类型: ${entity.type}
   - 📄 摘要: ${entity.summary || "无摘要"}`
  )
  .join("\n\n")}

---

## 🚀 选择下一步

### ⚡ 立即生成
\`\`\`
generate-code-prompt
sessionId: "${sessionId}"
\`\`\`

### ✏️ 继续调整
\`\`\`
modify-entity-selection
sessionId: "${sessionId}"
action: "add/remove"
entityIds: "实体ID列表"
autoGenerate: true
\`\`\``;

      return {
        content: [{ type: "text", text: result }],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `修改失败: ${
              error instanceof Error ? error.message : String(error)
            }`,
          },
        ],
      };
    }
  }
);

// 新增：一键分析工具
server.tool(
  TOOL_NAMES.QUICK_ANALYSIS,
  TOOL_DESCRIPTIONS[TOOL_NAMES.QUICK_ANALYSIS],
  TOOL_PARAMS.quickAnalysis,
  async ({
    input,
    componentIndex = 0,
    includeRelated = true,
    additionalContext,
  }) => {
    try {
      // 检查实体文件是否存在
      if (!hasEntitiesFile) {
        return {
          content: [
            {
              type: "text",
              text: `❌ 错误: 未找到实体文件 ${entitiesFilePath}

请执行以下步骤：
1. 确保在项目根目录运行 MCP 服务器
2. 或先执行 parser-agent 生成实体文件：
   \`\`\`
   pnpm run parser-agent extract
   \`\`\`
3. 然后执行 enrichment-agent 丰富实体信息：
   \`\`\`
   pnpm run enrichment-agent
   \`\`\``,
            },
          ],
        };
      }

      const startTime = Date.now();

      // 1. 搜索相关实体
      const searchResult = await ragTool.search(input, 5);

      if (!searchResult.entities || searchResult.entities.length === 0) {
        return {
          content: [{ type: "text", text: `❌ 未找到相关的代码实体` }],
        };
      }

      // 2. 选择指定索引的组件（默认第一个）
      const selectedIndex = Math.min(
        Math.max(componentIndex, 0),
        searchResult.entities.length - 1
      );
      const selectedEnrichedComponent = searchResult.entities[selectedIndex];
      const selectedComponent = enrichedToEntity(selectedEnrichedComponent);

      let finalSelection = [selectedComponent];

      // 3. 如果需要包含相关实体，使用智能关联方法
      if (includeRelated) {
        if (ragTool.getSmartRelatedEntities) {
          // 使用AI智能选择相关实体
          const smartResult = await ragTool.getSmartRelatedEntities(
            selectedEnrichedComponent.id,
            input,
            3
          );

          if (smartResult) {
            finalSelection = [
              selectedComponent,
              ...smartResult.smartSelection.map(enrichedToEntity),
            ];
          }
        } else {
          // 回退到原有的简单筛选逻辑
          const relatedResult = await ragTool.getRelatedEntities(
            selectedEnrichedComponent.id
          );
          if (relatedResult) {
            const allPossibleEntities = [
              ...relatedResult.relatedEntities.imports
                .slice(0, 2)
                .map(enrichedToEntity),
              ...relatedResult.relatedEntities.calls
                .slice(0, 2)
                .map(enrichedToEntity),
              ...relatedResult.relatedEntities.templates
                .slice(0, 2)
                .map(enrichedToEntity),
              ...relatedResult.relatedEntities.similar
                .slice(0, 1)
                .map(enrichedToEntity),
            ];

            finalSelection = [
              selectedComponent,
              ...allPossibleEntities.slice(0, 3),
            ];
          }
        }
      }

      // 4. 生成代码提示词
      const codePrompt = generateCodePrompt(
        input,
        finalSelection,
        additionalContext
      );

      const duration = (Date.now() - startTime) / 1000;

      const result = `# ⚡ 一键分析完成

## 📝 分析详情
- **用户需求**: ${input}
- **选中组件**: ${selectedComponent.id} (索引: ${selectedIndex})
- **包含相关实体**: ${includeRelated ? "是" : "否"}
- **总实体数**: ${finalSelection.length}个
- **分析耗时**: ${duration.toFixed(2)}秒

## 🎯 选中的核心组件
**${selectedComponent.id}**
- 📁 文件: ${selectedComponent.file}
- 🏷️ 类型: ${selectedComponent.type}
- 📊 相关度: ${(
        searchResult.relevanceScores[selectedComponent.id] || 0
      ).toFixed(2)}

${
  includeRelated && finalSelection.length > 1
    ? `## 🔗 包含的相关实体 (${finalSelection.length - 1}个)
${finalSelection
  .slice(1)
  .map(
    (entity: Entity, i: number) => `${i + 1}. \`${entity.id}\` - ${entity.file}`
  )
  .join("\n")}
`
    : ""
}

## 🎯 生成的代码提示词

\`\`\`
${codePrompt}
\`\`\`

---

## 🚀 选择下一步

### ⚡ 立即开始编码
直接使用上面的提示词开始编码：
\`\`\`
请帮我实现以下需求：

${codePrompt}
\`\`\`

### ✏️ 修改提示词后编码
如需修改提示词内容，请：
1. 复制上面的代码提示词
2. 根据需要进行修改
3. 然后输入："请帮我实现以下需求：[修改后的提示词]"

💡 **提示**: 推荐直接使用"立即开始编码"获得最佳体验！`;

      return {
        content: [{ type: "text", text: result }],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `一键分析失败: ${
              error instanceof Error ? error.message : String(error)
            }`,
          },
        ],
      };
    }
  }
);

// Step 4: 生成代码提示词
server.tool(
  TOOL_NAMES.GENERATE_CODE_PROMPT,
  TOOL_DESCRIPTIONS[TOOL_NAMES.GENERATE_CODE_PROMPT],
  TOOL_PARAMS.generateCodePrompt,
  async ({ sessionId, additionalContext }) => {
    try {
      const conversation = conversationService.getConversation(sessionId);
      if (!conversation) {
        return {
          content: [{ type: "text", text: `❌ 未找到会话 ${sessionId}` }],
        };
      }

      // 获取最终选择的实体列表
      const finalSelection =
        conversation.customSelection || conversation.defaultSelection;
      if (!finalSelection || finalSelection.length === 0) {
        return {
          content: [{ type: "text", text: `❌ 没有选中任何实体` }],
        };
      }

      // 生成代码提示词
      const codePrompt = generateCodePrompt(
        conversation.userInput,
        finalSelection,
        additionalContext
      );

      // 获取核心组件名称
      let coreComponentName = "未知组件";
      if (
        conversation.coreComponents &&
        typeof conversation.selectedCoreIndex === "number"
      ) {
        const coreComponent =
          conversation.coreComponents[conversation.selectedCoreIndex];
        if (coreComponent) {
          coreComponentName = coreComponent.id;
        }
      }

      // 更新会话状态为完成
      conversationService.updateConversation(sessionId, {
        step: "completed",
        finalSelection,
        generatedPrompt: codePrompt,
      });

      const result = `# 🚀 代码提示词生成完成

## 📊 分析总结
- **用户需求**: ${conversation.userInput}
- **选中实体**: ${finalSelection.length} 个
- **核心组件**: ${coreComponentName}
- **会话ID**: ${sessionId}

## 📋 涉及的代码文件
${[...new Set(finalSelection.map((e: Entity) => e.file))]
  .map((file: string) => `- ${file}`)
  .join("\n")}

---

## 🎯 生成的代码提示词

\`\`\`
${codePrompt}
\`\`\`

---

## 🚀 选择下一步

### ⚡ 立即开始编码
直接使用上面的提示词开始编码：
\`\`\`
请帮我实现以下需求：

${codePrompt}
\`\`\`

### ✏️ 修改提示词后编码
如需修改提示词内容，请：
1. 复制上面的代码提示词
2. 根据需要进行修改
3. 然后输入："请帮我实现以下需求：[修改后的提示词]"

### 🔄 重新分析
如需重新分析，请使用：
\`\`\`
start-analysis
input: "修改后的需求描述"
\`\`\`

💡 **提示**: 推荐直接使用"立即开始编码"获得最佳开发体验！`;

      return {
        content: [{ type: "text", text: result }],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `生成失败: ${
              error instanceof Error ? error.message : String(error)
            }`,
          },
        ],
      };
    }
  }
);

// 生成代码提示词的辅助函数
function generateCodePrompt(
  userInput: string,
  entities: Entity[],
  additionalContext?: string
): string {
  const coreComponent = entities[0];
  const relatedEntities = entities.slice(1);

  let prompt = `# 代码实现需求

## 用户需求
${userInput}

${
  additionalContext
    ? `## 额外上下文
${additionalContext}

`
    : ""
}## 核心组件
**${coreComponent.id}** (${coreComponent.type})
- 文件: ${coreComponent.file}
- 摘要: ${coreComponent.summary || "无摘要"}
- 标签: ${coreComponent.tags?.join(", ") || "无标签"}

${
  relatedEntities.length > 0
    ? `## 相关代码实体

### 涉及的文件
${[...new Set(relatedEntities.map((e: Entity) => e.file))]
  .map((file: string) => `- ${file}`)
  .join("\n")}

### 实体详情
${relatedEntities
  .map(
    (entity: Entity, index: number) =>
      `${index + 1}. **${entity.id}** (${entity.type})
   - 文件: ${entity.file}
   - 摘要: ${entity.summary || "无摘要"}
   - 标签: ${entity.tags?.join(", ") || "无标签"}`
  )
  .join("\n\n")}`
    : ""
}

## 实现要求

请基于以上核心组件${
    relatedEntities.length > 0 ? "和相关代码实体" : ""
  }，实现用户需求。

要求：
1. 充分理解现有代码结构和业务逻辑
2. 确保新代码与现有代码风格保持一致
3. 考虑代码的可维护性和扩展性
4. 提供清晰的实现思路和关键代码
5. 如需修改现有文件，请明确指出修改点

请开始实现...`;

  return prompt;
}

export async function run() {
  console.error("正在启动 Code Research MCP 服务器...");

  console.error("已注册的工具:");
  console.error(
    "🎯 start-analysis: 智能需求分析，推荐5个核心组件（需要手动选择）"
  );
  console.error("🎯 select-core-component: 选择最核心的组件进行深入分析");
  console.error("✏️ modify-entity-selection: 调整最终实体选择");
  console.error("🚀 generate-code-prompt: 生成完整的代码实现提示词");
  console.error("⚡ quick-analysis4567: 跳过交互的一键分析工具");

  const transport = new StdioServerTransport();

  console.error("连接到传输层...");
  await server.connect(transport);

  console.error("MCP 服务器已启动并等待连接");
}
