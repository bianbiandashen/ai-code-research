# 项目开发指南

## 数据库开发指南

### Sequelize ORM 最佳实践

#### 模型定义

```typescript
// ✅ 正确写法: 只声明类型，不初始化属性值
@Default(0)
@Column({
  type: DataType.BIGINT,
  field: "total_files",
})
totalFiles: number;

// ❌ 错误写法: 同时使用装饰器默认值和属性初始化
@Default(0)
@Column({
  type: DataType.BIGINT,
  field: "total_files",
})
totalFiles: number = 0;
```

> **关键原则**: 模型属性不要使用初始化赋值，这会干扰 Sequelize 的脏检查机制并覆盖数据库中的值。

#### 保持模型与表结构一致

- 确保 `field` 属性与数据库表列名匹配
- 选择与数据库表列类型匹配的 `DataType`
- `@AllowNull` 装饰器应与表列的 NULL/NOT NULL 约束一致
- `@Default` 装饰器应与表列的 DEFAULT 约束一致

#### 安全的数据类型处理

```typescript
// 简洁高效的工具函数
const ensureNumeric = (val: any) => typeof val === 'number' ? val : 0;

// 批量处理多个统计字段
const stats = ['totalFiles', 'aiCodeFiles'].reduce((obj, key) => {
  obj[key] = ensureNumeric(inputData[key]);
  return obj;
}, {});
```

> **技巧**: `typeof val === 'number'` 能正确处理 `0` 值，而 `val || 0` 会错误地将 `0` 视为假值

#### Upsert 操作最佳实践

当遇到数据丢失问题时，使用 findByPk + update/create 替代 upsert:

```typescript
// 简洁的 findOrCreate 模式
const [record, created] = await Model.findOrCreate({
  where: { id },
  defaults: safeData,
  transaction
});

if (!created) {
  // 更新字段 (只当无需创建时)
  await record.update(safeData, { transaction });
}
```

### 数据库问题排查流程

1. **检查模型与表结构一致性**
   - 列名、数据类型、约束和默认值

2. **启用详细SQL日志**
   ```typescript
   logging: sql => console.log(`SQL: ${sql}`)
   ```

3. **检查数据类型处理**
   - 特别关注 `undefined`、`null` 和 `0` 等特殊值

4. **考虑使用原生SQL**
   - 复杂操作可能需要更精确的控制

### 数据库操作安全指南

1. **始终使用事务**
   ```typescript
   const transaction = await sequelize.transaction();
   try {
     // 操作...
     await transaction.commit();
   } catch (error) {
     await transaction.rollback();
     throw error;
   }
   ```

2. **使用参数化查询**
   ```typescript
   // ✅ 安全: 使用参数绑定
   await sequelize.query(
     "SELECT * FROM users WHERE id = ?",
     { replacements: [id] }
   );
   ```

3. **设置合理的超时和重试策略**
   ```typescript
   {
     retry: {
       max: 3,
       match: [/Deadlock/i, /Lock wait timeout/i]
     }
   }
   ```

## 代码质量保障

### 自动化测试

- 为数据库操作编写单元测试和集成测试
- 测试边界条件和错误场景

### 代码审查重点

- 数据库操作逻辑
- 事务范围和错误处理
- 模型定义正确性
- 类型安全和空值处理

## 已知问题与解决方案

### Sequelize 数据丢失问题

**问题**: 使用 upsert 时，某些字段值丢失或被重置为默认值。

**解决方案**: 
1. 移除模型属性的默认值赋值
2. 使用 findOrCreate 模式替代 upsert
3. 使用简洁工具函数处理数字字段

```typescript
// ✗ 问题代码
totalFiles: number = 0; 

// ✓ 正确方式
totalFiles: number;
```

---

> 本文档总结了项目开发中的经验教训和最佳实践，将持续更新。