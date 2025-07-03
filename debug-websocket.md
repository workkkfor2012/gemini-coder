# 🔍 WebSocket通信问题调试指南

✅ **编译完成状态**：
- VS Code插件：`gemini-coder-1.130.9.vsix` (453.03KB)
- 浏览器插件：版本1.4.7，Chrome和Firefox版本已生成

## 📋 增强的日志系统

我们已经为整个WebSocket通信链路添加了"坚不可摧"的日志记录系统，现在你可以精确地定位问题所在。

## 🚀 关键增强功能

### 无条件日志记录
- **第一时间捕获**：所有消息到达的瞬间都会被记录，无论后续处理是否成功
- **详细错误追踪**：每个函数入口、异常处理都有完整的堆栈信息
- **Chrome API错误检查**：正确处理webextension-polyfill的Promise模式

## 🎯 日志查看位置

### VS Code端
1. 打开VS Code输出面板：`View` → `Output`
2. 在下拉菜单中选择 `Code Web Chat`
3. 查找以下关键日志：
   - `[CWC][startNewSession]` - 会话启动过程
   - `[CWC][WebSocket]` - WebSocket消息收发

### 浏览器端
1. 打开浏览器插件管理页面：`chrome://extensions`
2. 找到你的插件，点击 `Service Worker` 或 `背景页`
3. 在Console中查找以下关键日志：
   - `[Browser Extension]` - 浏览器插件日志
   - `[WebSocket Server]` - WebSocket服务器日志

## 🔍 问题诊断流程

### 步骤1：检查VS Code端发送
在VS Code输出面板中查找：
```
[CWC][startNewSession] Starting new session request
[CWC][startNewSession] Generated session ID
[CWC][startNewSession] Prepared start-session message
[CWC][WebSocket] SEND: start-session
[CWC][startNewSession] Successfully sent start-session message
```

**如果看不到这些日志**：
- 问题在VS Code插件内部，检查按钮点击事件是否正确触发

### 步骤2：检查WebSocket服务器接收
在浏览器Console中查找：
```
📥 [WebSocket Server] Received message from VS Code
✨ [WebSocket Server] Parsed message data
🎯 [WebSocket Server] Message action: start-session
```

**如果VS Code有发送日志，但服务器没有接收日志**：
- WebSocket连接可能断开
- 检查VS Code日志中的连接状态

### 步骤3：检查服务器转发
在浏览器Console中查找：
```
🚀 [WebSocket Server] Processing start-session message
📤 [WebSocket Server] Forwarding start-session message to browser
✅ [WebSocket Server] start-session message forwarded successfully
```

**如果服务器接收到但没有转发**：
- 浏览器客户端可能未连接到服务器
- 查看浏览器连接状态日志

### 步骤4：检查浏览器接收
在浏览器Console中查找：
```
📥 [Browser Extension] Received raw message
✨ [Browser Extension] Parsed message data
🎯 [Browser Extension] Message action: start-session
🎬 [Browser Extension] Handling message with action: start-session
🚀 [Browser Extension] Routing to handle_start_session_message
```

**如果服务器转发了但浏览器没有接收**：
- 浏览器WebSocket连接可能有问题
- 检查浏览器WebSocket连接日志

### 步骤5：检查标签页创建
在浏览器Console中查找：
```
🎯 [Browser Extension] Processing start-session message
🌐 [Browser Extension] Creating tab with URL
📑 [Browser Extension] Tab created successfully
🗂️ [Browser Extension] Session mapping stored
```

**如果消息处理了但标签页创建失败**：
- 可能是浏览器权限问题
- 检查URL格式是否正确

## 🚨 常见问题模式

### 模式1：VS Code发送成功，但服务器无接收
**症状**：VS Code有发送日志，浏览器Console完全没有日志
**原因**：WebSocket连接断开
**解决**：重启VS Code插件或检查端口占用

### 模式2：服务器接收但不转发
**症状**：有服务器接收日志，但没有转发日志
**原因**：浏览器客户端未连接
**解决**：重新加载浏览器插件

### 模式3：浏览器接收但处理失败
**症状**：有接收日志，但没有处理日志
**原因**：消息格式错误或代码异常
**解决**：检查错误日志和消息格式

### 模式4：标签页创建失败
**症状**：有处理日志，但没有标签页创建日志
**原因**：浏览器权限或URL问题
**解决**：检查浏览器权限设置

## 🛠️ 快速修复步骤

1. **重新编译**：运行 `.\rebuild-and-test.ps1`
2. **重新加载VS Code**：`Ctrl+Shift+P` → `Developer: Reload Window`
3. **重新加载浏览器插件**：`chrome://extensions` → 重新加载
4. **清空日志**：VS Code命令面板 → `Code Web Chat: Clear Logs`
5. **重新测试**：点击 `start new session` 按钮

## 📊 日志示例

### 正常工作的完整日志链路：

**VS Code端：**
```
[2025-07-03T10:30:45.123Z] INFO [CWC][startNewSession] Starting new session request
[2025-07-03T10:30:45.125Z] WEBSOCKET [CWC][WebSocket] SEND: start-session
[2025-07-03T10:30:45.127Z] INFO [CWC][startNewSession] Successfully sent start-session message
```

**浏览器端：**
```
📥 [WebSocket Server] Received message from VS Code: {"action":"start-session",...}
🚀 [WebSocket Server] Processing start-session message
📤 [WebSocket Server] Forwarding start-session message to browser
📥 [Browser Extension] Received raw message: {"action":"start-session",...}
🎯 [Browser Extension] Processing start-session message
🌐 [Browser Extension] Creating tab with URL: https://chatgpt.com/#cwc-session-...
📑 [Browser Extension] Tab created successfully
```

这样的日志表明整个链路工作正常。
