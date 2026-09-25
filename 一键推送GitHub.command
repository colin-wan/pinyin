#!/bin/bash
cd "$(dirname "$0")"

clear
echo "=========================================================="
echo "🚀 汉语拼音大冒险 · 一键推送到 GitHub 并生成独立网址"
echo "=========================================================="
echo ""
echo "您的 GitHub 登录账号: wjhhhotmail@126.com"
echo ""

# 1. 提交本地全部文件
git config user.email "wjhhhotmail@126.com"
git config user.name "wjhh"
git add .
git commit -m "feat: complete pinyin learning web app for ipad" 2>/dev/null || true

echo "✅ 本地拼音学习系统全部文件已打包准备就绪！"
echo ""
echo "----------------------------------------------------------"
echo "【第 1 步】请在浏览器打开 GitHub 新建仓库页面："
echo "           👉 https://github.com/new"
echo ""
echo "【第 2 步】仓库名称（Repository name）填入：pinyin"
echo "           选项选择【Public】（公开），点击底部的【Create repository】"
echo ""
echo "【第 3 步】创建完成后，复制页面上的仓库 HTTPS 地址"
echo "           （格式类似于：https://github.com/你的用户名/pinyin.git）"
echo "----------------------------------------------------------"
echo ""
read -p "请在此粘贴您的 GitHub 仓库地址并按回车: " REPO_URL

if [ -n "$REPO_URL" ]; then
    git remote remove origin 2>/dev/null || true
    git remote add origin "$REPO_URL"
    git branch -M main
    echo ""
    echo "🔄 正在推送代码至 GitHub，请稍候..."
    git push -u origin main
    if [ $? -eq 0 ]; then
        echo ""
        echo "=========================================================="
        echo "🎉 代码推送成功！"
        echo ""
        echo "【生成 iPad 永久专属网址只需 30 秒】：进入仓库开启 GitHub Pages"
        echo " 1. 在浏览器打开刚才创建的仓库页面"
        echo " 2. 点击仓库右上角的【⚙️ Settings】"
        echo " 3. 在左侧菜单栏点击【Pages】"
        echo " 4. 在【Build and deployment】下方："
        echo "    - Branch（分支）选择【main】"
        echo "    - 文件夹保持【/ (root)】"
        echo "    - 点击右侧的【Save】保存按钮"
        echo ""
        echo " 5. 等待约 1 分钟后刷新该页面，顶部就会显示生成的永久专属网址："
        echo "    👉 格式如：https://你的用户名.github.io/pinyin/"
        echo ""
        echo "📱 之后在 iPad 上直接打开这个网址，并点击【添加到主屏幕】"
        echo "   Mac 电脑即使彻底关机，孩子也能随时随地在 iPad 上独立学习！"
        echo "=========================================================="
    else
        echo ""
        echo "⚠️ 推送遇到权限验证或网络问题。"
        echo "如果提示输入密码，请注意 GitHub 现需使用 Personal Access Token (令牌) 代替登录密码。"
        echo "您也可以访问 https://vercel.com 用该 GitHub 账号登录，直接一键导入该仓库自动生成网址！"
    fi
fi

echo ""
read -p "按回车键退出..."
