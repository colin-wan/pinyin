#!/bin/bash
cd "$(dirname "$0")"

# 自动获取本机当前 Wi-Fi IP
IP=$(ipconfig getifaddr en0 2>/dev/null)
if [ -z "$IP" ]; then
  IP=$(ipconfig getifaddr en1 2>/dev/null)
fi
if [ -z "$IP" ]; then
  IP="192.168.1.18"
fi

PORT=8080

clear
echo "=========================================================="
echo "🎉 汉语拼音大冒险 · iPad 本地无线访问服务"
echo "=========================================================="
echo ""
echo "📶 1. 请确认 iPad 和这台 Mac 已连接在【同一个 Wi-Fi 网络】"
echo ""
echo "📱 2. 拿出 iPad，打开自带的 Safari 浏览器"
echo ""
echo "👉 3. 在地址栏直接输入以下网址并打开："
echo ""
echo "       http://$IP:$PORT"
echo ""
echo "⭐ 4. 强烈推荐（变成全屏独立 App）："
echo "       在 iPad Safari 点击右上角【分享 ⎋】➔【添加到主屏幕】"
echo "       之后在 iPad 桌面上直接点击图标即可全屏学习！"
echo "=========================================================="
echo "提示：保持此窗口开启即可持续在 iPad 上学习。按 Ctrl+C 可关闭服务。"
echo ""

python3 -m http.server $PORT
