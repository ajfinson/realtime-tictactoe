# PowerShell script to launch all game components in separate windows

Write-Host "Starting Real-Time Tic-Tac-Toe..."
Write-Host "This will open 5 separate terminal windows."
Write-Host ""

$currentPath = Get-Location

# Start Redis
Write-Host "Starting Redis..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "docker run --rm --name ttt-redis -p 6379:6379 redis"

# Wait for Redis to start
Write-Host "Waiting for Redis to start..."
Start-Sleep -Seconds 3

# Start Server A
Write-Host "Starting Server A..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$currentPath'; npm run serverA"

# Start Server B
Write-Host "Starting Server B..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$currentPath'; npm run serverB"

# Wait for servers to start
Write-Host "Waiting for servers to start..."
Start-Sleep -Seconds 3

# Start Client X
Write-Host "Starting Player X..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$currentPath'; npm run client:X"

# Start Client O
Write-Host "Starting Player O..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$currentPath'; npm run client:O"

Write-Host ""
Write-Host "All components started!"
Write-Host "- Player X and Player O windows are ready for your moves"
Write-Host "- Type moves as 'row,col' (e.g., 0,0 for top-left)"
Write-Host "- Close any window to stop that component"
Write-Host ""
Write-Host "To stop everything:"
Write-Host "1. Close all PowerShell windows"
Write-Host "2. Or run: docker stop ttt-redis"
