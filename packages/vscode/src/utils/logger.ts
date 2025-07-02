import * as vscode from 'vscode'

export namespace Logger {
  const LOG_PREFIX = '[CWC]'
  let outputChannel: vscode.OutputChannel | null = null

  // 初始化输出通道
  export function initialize(): void {
    if (!outputChannel) {
      outputChannel = vscode.window.createOutputChannel('Code Web Chat')
    }
  }

  // 获取输出通道实例
  export function getOutputChannel(): vscode.OutputChannel | null {
    return outputChannel
  }

  // 显示输出通道
  export function show(): void {
    if (outputChannel) {
      outputChannel.show()
    }
  }

  // 清空日志
  export function clear(): void {
    if (outputChannel) {
      outputChannel.clear()
    }
  }

  // 格式化日志消息
  function formatMessage(level: string, params: {
    function_name?: string
    message: string
    data?: any
  }): string {
    const timestamp = new Date().toISOString()
    const function_name = params.function_name ? `[${params.function_name}] ` : ''
    const dataStr = params.data ? ` | Data: ${JSON.stringify(params.data)}` : ''
    return `[${timestamp}] ${level} ${LOG_PREFIX}${function_name}${params.message}${dataStr}`
  }

  export function log(params: {
    function_name?: string
    message: string
    data?: any
  }): void {
    const function_name = params.function_name
      ? `[${params.function_name}] `
      : ''

    // 控制台输出（保持原有行为）
    console.log(
      `${LOG_PREFIX}${function_name}${params.message}`,
      params.data ? params.data : undefined
    )

    // 输出通道日志
    if (outputChannel) {
      const message = formatMessage('INFO', params)
      outputChannel.appendLine(message)
    }
  }

  export function warn(params: {
    function_name?: string
    message: string
    data?: any
  }): void {
    const prefix = params.function_name ? `[${params.function_name}] ` : ''

    // 控制台输出（保持原有行为）
    console.warn(`${LOG_PREFIX}${prefix}${params.message}`, params.data)

    // 输出通道日志
    if (outputChannel) {
      const message = formatMessage('WARN', params)
      outputChannel.appendLine(message)
    }
  }

  export function error(params: {
    function_name?: string
    message: string
    data?: any
  }): void {
    const prefix = params.function_name ? `[${params.function_name}] ` : ''

    // 控制台输出（保持原有行为）
    console.error(`${LOG_PREFIX}${prefix}${params.message}`, params.data)

    // 输出通道日志
    if (outputChannel) {
      const message = formatMessage('ERROR', params)
      outputChannel.appendLine(message)
    }
  }

  // 新增：调试级别日志
  export function debug(params: {
    function_name?: string
    message: string
    data?: any
  }): void {
    const prefix = params.function_name ? `[${params.function_name}] ` : ''

    // 控制台输出
    console.debug(`${LOG_PREFIX}${prefix}${params.message}`, params.data)

    // 输出通道日志
    if (outputChannel) {
      const message = formatMessage('DEBUG', params)
      outputChannel.appendLine(message)
    }
  }

  // 新增：WebSocket消息日志
  export function websocket(direction: 'SEND' | 'RECEIVE', message: any): void {
    const params = {
      function_name: 'WebSocket',
      message: `${direction}: ${message.action || 'unknown'}`,
      data: message
    }

    if (outputChannel) {
      const formattedMessage = formatMessage('WEBSOCKET', params)
      outputChannel.appendLine(formattedMessage)
    }
  }
}
