import asyncio
import websockets
import json
import logging
import sys
import asyncio
from concurrent.futures import ThreadPoolExecutor

# 配置日志
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# 全局变量，用于存储当前连接的插件客户端
connected_plugin = None

async def send_to_plugin(text_message: str):
    """向已连接的插件发送文本消息"""
    global connected_plugin
    if connected_plugin:
        try:
            # 确保发送的是符合协议的 JSON 格式
            # 发送带有 action 的消息
            message_payload = json.dumps({"action": "inject_text", "text": text_message})
            await connected_plugin.send(message_payload)
            logging.info(f"Sent to plugin: {text_message}")
        except websockets.exceptions.ConnectionClosedOK:
            logging.warning("Plugin connection closed while trying to send.")
            connected_plugin = None
        except Exception as e:
            logging.error(f"Error sending message to plugin: {e}")
            # 考虑在此处处理连接断开
            connected_plugin = None
    else:
        logging.warning("No plugin connected, cannot send message.")

async def handle_message(websocket, message_json: str):
    """处理从插件接收到的消息"""
    global connected_plugin
    try:
        message_data = json.loads(message_json)
        # 检查消息是否符合协议格式
        # Check for specific actions first
        action = message_data.get("action")
        if action == "ping":
            # Client is sending a keep-alive ping, just log it or ignore
            logging.debug(f"Received ping from plugin.") # Use debug level to avoid cluttering logs
            pass # Or handle pong if needed, but usually not necessary for keep-alive
        elif action == "model_response_copied" and "text" in message_data:
            received_text = message_data["text"]
            logging.info(f"Received copied model response from plugin: {received_text}")
            # --- 在这里添加处理复制内容的逻辑 ---
            # 例如，可以将其保存到文件或数据库，或进行进一步处理
            # ---------------------------------------
        elif "text" in message_data: # Handle generic text messages if needed
            received_text = message_data["text"]
            logging.info(f"Received generic text from plugin: {received_text}")
            # --- 处理其他文本消息 ---

        else:
            # 如果消息格式不符合预期，记录警告
            logging.warning(f"Received invalid message format from plugin: {message_json}")

    except json.JSONDecodeError:
        logging.error(f"Failed to decode JSON message from plugin: {message_json}")
    except Exception as e:
        logging.error(f"Error handling message from plugin: {e}")

# 修改函数签名，只接收 websocket 参数，忽略 path
async def connection_handler(websocket):
    """处理新的 WebSocket 连接"""
    global connected_plugin

    # 检查是否已有连接 (根据单一连接假设)
    if connected_plugin:
        logging.warning("New connection attempt while already connected. Closing new connection.")
        await websocket.close(code=1008, reason="Server already has an active connection.")
        return

    # --- Add detailed logging for connection variable ---
    if connected_plugin is not None:
        # This case should ideally not happen with our single connection logic, but log if it does
        logging.warning(f"Overwriting existing connection {connected_plugin.remote_address} with new one from {websocket.remote_address}")
    connected_plugin = websocket
    logging.info(f"Connection established from {websocket.remote_address}. Setting connected_plugin.")
    # --- End detailed logging ---

    try:
        # 持续监听来自此唯一插件的消息
        async for message in websocket:
            await handle_message(websocket, message)
    except websockets.exceptions.ConnectionClosedOK:
        logging.info("Plugin connection closed normally.")
    except websockets.exceptions.ConnectionClosedError as e:
        logging.warning(f"Plugin connection closed with error: {e}")
    except Exception as e:
        logging.error(f"Unexpected error in connection handler: {e}")
    finally:
        # --- Add detailed logging for connection variable cleanup ---
        logging.info(f"Connection handler for {websocket.remote_address} exiting.")
        # 清理连接状态
        if connected_plugin == websocket:
            logging.info(f"Cleaning up connection state for {websocket.remote_address}. Setting connected_plugin to None.")
            connected_plugin = None
            # logging.info("Cleaned up plugin connection state.") # Redundant log removed

def blocking_input(prompt):
    """在单独线程中运行的阻塞输入函数"""
    return input(prompt)

async def input_loop(loop, executor):
    """循环读取命令行输入并发送给插件"""
    while True:
        try:
            # 在线程池中运行阻塞的 input() 函数
            message = await loop.run_in_executor(
                executor, blocking_input, "Enter message to send to plugin (or type 'exit' to quit): "
            )
            if message.strip().lower() == 'exit':
                logging.info("Exit command received. Stopping input loop.")
                # Optionally, you might want to stop the server here too
                # loop.stop() # This might be too abrupt, consider cleaner shutdown
                break
            if connected_plugin:
                # 调用异步函数发送消息
                await send_to_plugin(message)
            else:
                logging.warning("No plugin connected to send the message.")
        except EOFError:
            # Handle Ctrl+D or end of input stream
            logging.info("Input stream closed (EOF). Stopping input loop.")
            break
        except Exception as e:
            logging.error(f"Error reading or sending input: {e}")
            # Avoid breaking the loop on unexpected errors if possible
            await asyncio.sleep(1) # Prevent fast spinning on continuous errors


async def main():
    """启动 WebSocket 服务器并运行输入循环"""
    host = "localhost"
    port = 55155
    logging.info(f"Starting WebSocket server on ws://{host}:{port}")

    loop = asyncio.get_running_loop()
    executor = ThreadPoolExecutor(max_workers=1) # Only need 1 thread for input

    # 启动输入循环任务
    input_task = loop.create_task(input_loop(loop, executor))

    # 启动 WebSocket 服务器
    # Disable automatic ping/pong to keep connection alive indefinitely from the server side
    # Note: Connection might still drop due to network issues or client-side closure.
    server = await websockets.serve(connection_handler, host, port,
                                    ping_interval=None, ping_timeout=None)
    logging.info("Server started. Waiting for plugin connection and terminal input...")

    # 等待服务器和输入任务完成
    # Wrap server.wait_closed() coroutine in a task
    server_task = asyncio.create_task(server.wait_closed())
    done, pending = await asyncio.wait(
        [input_task, server_task], # Pass tasks to asyncio.wait
        return_when=asyncio.FIRST_COMPLETED,
    )

    # Clean up pending tasks if any
    for task in pending:
        task.cancel()

    executor.shutdown(wait=False) # Shutdown the executor
    logging.info("Server and input loop stopped.")

if __name__ == "__main__":
    # asyncio.run(main()) should handle KeyboardInterrupt gracefully
    asyncio.run(main())
    # except KeyboardInterrupt: # asyncio.run handles this
    # Removed the mis-indented log line, asyncio handles shutdown logging.