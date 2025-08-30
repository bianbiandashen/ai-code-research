#!/bin/bash

# 设置错误时退出
set -e

# 获取当前时间戳
TIMESTAMP=$(date +%Y%m%d%H%M%S)

# 安装依赖
echo "安装依赖..."
pnpm install 2>&1

# 第一阶段：按拓扑顺序构建所有包
echo "----------------------------------------"
echo "第一阶段：按拓扑顺序构建所有包..."
echo "----------------------------------------"

if ! pnpm -r --workspace-concurrency=1 build 2>&1; then
    echo "错误: 构建失败"
    exit 1
fi

echo "所有包构建完成"

# 获取所有子包目录用于发布
PACKAGES=$(find packages -maxdepth 1 -type d -not -path "packages")

# 第二阶段：发布所有包
echo "----------------------------------------"
echo "第二阶段：发布所有包..."
echo "----------------------------------------"

for package in $PACKAGES; do
    echo "----------------------------------------"
    echo "开始处理包: $package"
    cd $package
    
    # 备份原始package.json
    cp package.json package.json.backup
    
    # 替换workspace依赖为实际版本号
    echo "处理workspace依赖..."
    
    # 获取当前包信息
    CURRENT_VERSION=$(node -p "require('./package.json').version")
    PACKAGE_NAME=$(node -p "require('./package.json').name")
    
    # 使用pnpm的内置功能处理workspace依赖
    # pnpm pack会自动将workspace:*替换为实际版本号
    if ! pnpm pack --pack-destination ./temp_pack 2>&1; then
        echo "错误: 打包失败"
        # 恢复原始package.json
        mv package.json.backup package.json
        exit 1
    fi
    
    # 从打包文件中提取package.json来发布
    PACK_FILE=$(ls temp_pack/*.tgz | head -1)
    mkdir -p temp_extract
    tar -xzf "$PACK_FILE" -C temp_extract
    
    # 使用提取的package.json（已处理workspace依赖）
    cp temp_extract/package/package.json ./package.json
    
    # 清理临时文件
    rm -rf temp_pack temp_extract
    
    NPM_VERSION=$(npm view $PACKAGE_NAME version 2>/dev/null || echo "0.0.0")

    echo "包名: $PACKAGE_NAME"
    echo "当前版本: $CURRENT_VERSION"
    echo "NPM版本: $NPM_VERSION"

    if [ "$CURRENT_VERSION" = "$NPM_VERSION" ]; then
        echo "版本相同，准备发布开发版本..."
        if ! pnpm version "1.0.0-dev.$TIMESTAMP" 2>&1; then
            echo "错误: 更新版本号失败"
            # 恢复原始package.json
            mv package.json.backup package.json
            exit 1
        fi
        
        echo "发布开发版本..."
        if ! npm publish --tag dev 2>&1; then
            echo "错误: 发布失败"
            echo "请检查:"
            echo "1. 是否已登录 npm (npm login)"
            echo "2. 是否有发布权限"
            echo "3. 包名是否已被占用"
            # 恢复原始package.json
            mv package.json.backup package.json
            exit 1
        fi
    else
        echo "版本不同，准备发布当前版本..."
        if ! npm publish 2>&1; then
            echo "错误: 发布失败"
            echo "请检查:"
            echo "1. 是否已登录 npm (npm login)"
            echo "2. 是否有发布权限"
            echo "3. 包名是否已被占用"
            # 恢复原始package.json
            mv package.json.backup package.json
            exit 1
        fi
    fi
    
    echo "包 $package 发布成功！"
    
    # 恢复原始package.json（保持workspace依赖）
    mv package.json.backup package.json
    
    cd ../..
done

echo "----------------------------------------"
echo "所有包发布完成！" 