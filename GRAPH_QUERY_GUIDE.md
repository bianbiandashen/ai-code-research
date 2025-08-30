# 图数据查询指南

本文档提供了在 Nebula Studio 中查询和探索代码知识图谱的常用 nGQL (Nebula Graph Query Language) 语句。

## 准备工作

1.  打开您的 Nebula Studio。
2.  从顶部的下拉菜单中，选择并进入名为 `code_graph` 的图空间。
3.  将以下查询语句粘贴到查询框中并执行。

---

## 1. 基础统计查询

了解图谱的整体规模。

### 查看节点和边的总数

此命令会启动一个后台统计任务。
```sql
SUBMIT JOB STATS;
```
等待片刻（通常几秒钟到一分钟，取决于图的大小），然后执行以下命令查看结果。
```sql
SHOW STATS;
```
您将看到 `space` 中 `vertices` 和 `edges` 的总数。

---

## 2. 创建和检查索引 (重要！)

为了能够高效地按属性（如文件路径）查询节点，必须为该属性创建索引。

### 为文件路径创建索引
```sql
CREATE TAG INDEX IF NOT EXISTS codefile_path_index ON CodeFile(path(256));
```

### 检查索引状态
创建索引后，需要等待其变为 `ONLINE` 状态才能使用。
```sql
SHOW TAG INDEX STATUS;
```
当 `codefile_path_index` 的 `Index Status` 变为 `ONLINE` 后，即可继续执行下面的查询。

---

## 3. 节点数据查询

查看图中的代码实体和文件。

### 随机查看10个代码实体

`CodeEntity` 标签代表了代码中的具体实体，如组件、函数、钩子等。
```sql
MATCH (n:CodeEntity) RETURN n LIMIT 10;
```

### 随机查看10个代码文件

`CodeFile` 标签代表了代码库中的源文件。
```sql
MATCH (n:CodeFile) RETURN n LIMIT 10;
```

---

## 4. 关系查询

探索代码实体之间的依赖和调用关系，这是图谱最有价值的部分。

### 查看特定文件包含的所有代码实体

这个例子展示了如何查找 `AfterSaleDashboard.vue` 文件中定义的所有组件和函数。
```sql
MATCH (f:CodeFile{path:"src/pages/AfterSaleDashboard.vue"})-[:CONTAINS]->(e:CodeEntity)
RETURN f.name AS FileName, e.raw_name AS EntityName, e.entity_type AS EntityType;
```

### 查看特定代码实体调用了哪些其他实体
这个例子展示了 `AfterSaleDashboard` 组件调用了哪些函数或组件。
```sql
MATCH (c:CodeEntity)-[:CALLS]->(called)
WHERE id(c) == "Component:AfterSaleDashboard"
RETURN c.raw_name AS Caller, id(called) AS CalledEntity;
```

### 查看哪些实体导入了某个特定的实体
这个例子展示了哪些代码实体导入了 `useAfterSaleMetrics` 这个钩子（Hook）。
```sql
MATCH (hook:CodeEntity)<-[:IMPORTS]-(importer:CodeEntity)
WHERE id(hook) == "FunctionDeclaration:useAfterSaleMetrics"
RETURN id(importer) AS ImporterID, importer.raw_name AS ImporterName;
```

---

## 5. 可视化探索

Nebula Studio 的一个强大功能是能够将查询结果可视化。

### 可视化某个组件的依赖关系
这个例子会以图的形式，展示 `AfterSaleDashboard` 组件直接和间接（最多2层）调用或导入了哪些其他代码实体。
```sql
MATCH p = (c:CodeEntity)-[:IMPORTS|CALLS*1..2]->(dependency)
WHERE id(c) == "Component:AfterSaleDashboard"
RETURN p;
```

---

*注意：上述查询语句中的文件路径和实体ID可以替换为您自己数据中的任何有效值。* 