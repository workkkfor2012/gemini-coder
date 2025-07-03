# 重新编译和测试WebSocket通信的脚本
# 使用方法: .\rebuild-and-test.ps1

# 设置UTF-8编码
$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "🔧 开始重新编译VS Code插件和浏览器插件..." -ForegroundColor Green

# 编译VS Code插件
Write-Host "📦 编译VS Code插件..." -ForegroundColor Yellow
Set-Location "packages/vscode"
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ VS Code插件编译失败!" -ForegroundColor Red
    exit 1
}
Write-Host "✅ VS Code插件编译成功!" -ForegroundColor Green

# 编译浏览器插件
Write-Host "📦 编译浏览器插件..." -ForegroundColor Yellow
Set-Location "../browser"
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ 浏览器插件编译失败!" -ForegroundColor Red
    exit 1
}
Write-Host "✅ 浏览器插件编译成功!" -ForegroundColor Green

# 回到根目录
Set-Location "../.."

Write-Host "🎉 编译完成!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 接下来的测试步骤:" -ForegroundColor Cyan
Write-Host "1. 重新加载VS Code插件 (Ctrl+Shift+P -> 'Developer: Reload Window')" -ForegroundColor White
Write-Host "2. 在浏览器中重新加载插件 (chrome://extensions -> 重新加载按钮)" -ForegroundColor White
Write-Host "3. 在VS Code中打开输出面板 (View -> Output -> 选择 'Code Web Chat')" -ForegroundColor White
Write-Host "4. 在浏览器中打开开发者工具的Console (F12 -> Console)" -ForegroundColor White
Write-Host "5. 在VS Code中点击 'start new session' 按钮" -ForegroundColor White
Write-Host "6. 观察两边的日志输出" -ForegroundColor White
Write-Host ""
Write-Host "🔍 关键日志标识:" -ForegroundColor Cyan
Write-Host "VS Code端: [CWC] 开头的日志" -ForegroundColor White
Write-Host "浏览器端: [Browser Extension] 开头的日志" -ForegroundColor White
Write-Host "WebSocket服务器: [WebSocket Server] 开头的日志" -ForegroundColor White
