# 📦 Code Web Chat VSCode插件安装指南

## 🎯 插件信息

- **文件名**: `gemini-coder-1.130.3.vsix`
- **版本**: 1.130.3 (新增日志功能)
- **文件大小**: 448.52KB (459,285 字节)
- **编译时间**: 2025年7月2日 21:13:46

## ✨ 新功能亮点

### 🔍 **完整日志系统**
- ✅ **专用输出通道**: "Code Web Chat" 日志通道
- ✅ **多级别日志**: INFO、WARN、ERROR、DEBUG、WEBSOCKET
- ✅ **WebSocket通信日志**: 完整记录VSCode与浏览器间的消息传递
- ✅ **时间戳**: 精确到毫秒的时间记录
- ✅ **用户友好**: 通过命令面板轻松访问

### 📋 **新增命令**
- `Code Web Chat: Show Logs` - 显示日志
- `Code Web Chat: Clear Logs` - 清空日志

## 🔧 安装方法

### 方法1：通过VSCode界面安装
1. 打开VSCode
2. 按 `Ctrl+Shift+P` 打开命令面板
3. 输入 "Extensions: Install from VSIX..."
4. 选择 `gemini-coder-1.130.3.vsix` 文件
5. 重启VSCode

### 方法2：通过命令行安装
```bash
code --install-extension gemini-coder-1.130.3.vsix
```

### 方法3：拖拽安装
1. 打开VSCode
2. 将 `gemini-coder-1.130.3.vsix` 文件直接拖拽到VSCode窗口
3. 确认安装

## 🔄 覆盖安装说明

如果您已经安装了旧版本的Code Web Chat插件：

1. **无需卸载**: VSCode会自动覆盖旧版本
2. **版本检查**: 安装后可在扩展管理器中确认版本为 1.130.3
3. **重启建议**: 安装完成后重启VSCode以确保所有功能正常

## 🚀 使用新日志功能

### 查看日志
1. **方法1**: `Ctrl+Shift+P` → "Code Web Chat: Show Logs"
2. **方法2**: `View` → `Output` → 选择 "Code Web Chat"

### 清空日志
- `Ctrl+Shift+P` → "Code Web Chat: Clear Logs"

### 日志内容
- 插件启动和初始化过程
- WebSocket服务器状态
- 与浏览器插件的连接状态
- 消息发送和接收详情
- 错误和警告信息

## 🔍 验证安装

安装完成后，您应该能看到：

1. **侧边栏**: Code Web Chat图标
2. **命令面板**: 新的日志相关命令
3. **输出面板**: "Code Web Chat" 选项
4. **版本信息**: 扩展管理器中显示 v1.130.3

## 📊 日志示例

安装成功后，您将看到类似这样的日志：

```
[2025-07-02T21:13:46.123Z] INFO [CWC][activate] Code Web Chat extension is activating...
[2025-07-02T21:13:46.125Z] INFO [CWC][WebSocketManager.constructor] Initializing WebSocket Manager | Data: {"version":"1.130.3","port":55155}
[2025-07-02T21:13:46.130Z] INFO [CWC][_start_server_process] Started WebSocket server process with PID: 12345
[2025-07-02T21:13:47.150Z] INFO [CWC][connect_to_server] Connected to WebSocket server
```

## 🛠️ 故障排除

### 安装失败
- 确保VSCode版本 ≥ 1.92.0
- 检查文件是否完整下载
- 尝试重启VSCode后重新安装

### 功能异常
- 查看日志输出通道获取详细错误信息
- 重启VSCode
- 检查浏览器插件是否同时安装

### 版本冲突
- 卸载旧版本后重新安装
- 清除VSCode扩展缓存

## 📞 技术支持

如果遇到问题，请：
1. 查看日志输出获取错误详情
2. 访问项目GitHub页面报告问题
3. 提供日志信息以便快速定位问题

---

**享受新的日志功能，让调试变得更简单！** 🎉
