# 📋 VSCode插件日志功能使用指南

## 🎯 功能概述

VSCode端的Code Web Chat插件现在支持完整的日志记录功能，可以帮助开发者和用户调试连接问题、查看WebSocket通信详情。

## 🔧 如何查看日志

### 方法1：通过命令面板
1. 按 `Ctrl+Shift+P` (Windows/Linux) 或 `Cmd+Shift+P` (Mac) 打开命令面板
2. 输入 "Code Web Chat: Show Logs"
3. 选择该命令，将打开输出通道显示日志

### 方法2：通过输出面板
1. 打开VSCode的输出面板：`View` → `Output`
2. 在输出面板的下拉菜单中选择 "Code Web Chat"

## 📝 日志类型

### 🔵 INFO 日志
- 插件激活/初始化信息
- WebSocket服务器启动状态
- 连接建立成功信息

### 🟡 WARN 日志
- WebSocket连接断开警告
- 重连尝试信息

### 🔴 ERROR 日志
- WebSocket连接错误
- 服务器启动失败
- 消息处理错误

### 🟣 WEBSOCKET 日志
- 发送到浏览器的消息 (SEND)
- 从浏览器接收的消息 (RECEIVE)
- 包含完整的消息内容和时间戳

### 🔍 DEBUG 日志
- 详细的调试信息
- 内部状态变化

## 📊 日志格式

每条日志包含以下信息：
```
[2025-07-02T10:30:45.123Z] LEVEL [CWC][function_name] message | Data: {...}
```

- **时间戳**: ISO格式的精确时间
- **级别**: INFO/WARN/ERROR/WEBSOCKET/DEBUG
- **前缀**: [CWC] 标识Code Web Chat
- **函数名**: 产生日志的函数名
- **消息**: 描述性消息
- **数据**: 相关的JSON数据（如果有）

## 🧹 清空日志

### 通过命令面板
1. 按 `Ctrl+Shift+P` 打开命令面板
2. 输入 "Code Web Chat: Clear Logs"
3. 选择该命令清空所有日志

## 🔍 常见问题排查

### 连接问题
查看日志中的以下关键信息：
- `WebSocketManager.constructor`: 确认管理器初始化
- `Started WebSocket server process`: 确认服务器启动
- `Connected to WebSocket server`: 确认VSCode连接成功
- `WEBSOCKET RECEIVE: browser-connection-status`: 确认浏览器连接状态

### 消息传递问题
查看WEBSOCKET日志：
- `SEND` 消息：VSCode发送给浏览器的消息
- `RECEIVE` 消息：从浏览器接收的消息

### 服务器启动问题
查看ERROR日志：
- `Failed to start WebSocket server process`: 服务器启动失败
- `Error initializing WebSocket server`: 初始化错误

## 💡 调试技巧

1. **启用详细日志**: 重启VSCode后立即查看日志，观察完整的启动过程
2. **监控连接状态**: 关注`browser-connection-status`消息，了解浏览器连接状态
3. **检查消息流**: 通过WEBSOCKET日志跟踪消息的发送和接收
4. **时间戳分析**: 利用时间戳分析问题发生的时间顺序

## 🚀 示例日志输出

```
[2025-07-02T10:30:45.123Z] INFO [CWC][activate] Code Web Chat extension is activating...
[2025-07-02T10:30:45.125Z] INFO [CWC][WebSocketManager.constructor] Initializing WebSocket Manager | Data: {"version":"1.0.0","port":55155}
[2025-07-02T10:30:45.130Z] INFO [CWC][_start_server_process] Started WebSocket server process with PID: 12345
[2025-07-02T10:30:46.150Z] INFO [CWC][connect_to_server] Connected to WebSocket server
[2025-07-02T10:30:46.155Z] WEBSOCKET [CWC][WebSocket] RECEIVE: client-id-assignment | Data: {"action":"client-id-assignment","client_id":1}
[2025-07-02T10:30:50.200Z] WEBSOCKET [CWC][WebSocket] RECEIVE: browser-connection-status | Data: {"action":"browser-connection-status","has_connected_browsers":true}
[2025-07-02T10:31:00.300Z] WEBSOCKET [CWC][WebSocket] SEND: initialize-chat | Data: {"action":"initialize-chat","text":"Hello World","url":"https://chatgpt.com/"}
```

这样的日志输出可以帮助你：
- 确认插件正常启动
- 验证WebSocket服务器运行状态
- 监控浏览器连接状态
- 跟踪消息传递过程
