#!/bin/bash
# Bash script to launch all game components in separate terminal windows

echo "Starting Real-Time Tic-Tac-Toe..."
echo "This will open 5 separate terminal windows."
echo ""

# Detect OS and terminal emulator
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    echo "Starting Redis..."
    osascript -e 'tell app "Terminal" to do script "cd \"'"$(pwd)"'\" && docker run --rm --name ttt-redis -p 6379:6379 redis"'
    
    sleep 3
    
    echo "Starting Server A..."
    osascript -e 'tell app "Terminal" to do script "cd \"'"$(pwd)"'\" && npm run serverA"'
    
    echo "Starting Server B..."
    osascript -e 'tell app "Terminal" to do script "cd \"'"$(pwd)"'\" && npm run serverB"'
    
    sleep 3
    
    echo "Starting Player X..."
    osascript -e 'tell app "Terminal" to do script "cd \"'"$(pwd)"'\" && npm run client:X"'
    
    echo "Starting Player O..."
    osascript -e 'tell app "Terminal" to do script "cd \"'"$(pwd)"'\" && npm run client:O"'
    
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    if command -v gnome-terminal &> /dev/null; then
        TERM_CMD="gnome-terminal --"
    elif command -v xterm &> /dev/null; then
        TERM_CMD="xterm -hold -e"
    elif command -v konsole &> /dev/null; then
        TERM_CMD="konsole --hold -e"
    else
        echo "No supported terminal emulator found (gnome-terminal, xterm, or konsole)"
        exit 1
    fi
    
    echo "Starting Redis..."
    $TERM_CMD bash -c "docker run --rm --name ttt-redis -p 6379:6379 redis" &
    
    sleep 3
    
    echo "Starting Server A..."
    $TERM_CMD bash -c "cd '$(pwd)' && npm run serverA" &
    
    echo "Starting Server B..."
    $TERM_CMD bash -c "cd '$(pwd)' && npm run serverB" &
    
    sleep 3
    
    echo "Starting Player X..."
    $TERM_CMD bash -c "cd '$(pwd)' && npm run client:X" &
    
    echo "Starting Player O..."
    $TERM_CMD bash -c "cd '$(pwd)' && npm run client:O" &
fi

echo ""
echo "All components started!"
echo "- Player X and Player O windows are ready for your moves"
echo "- Type moves as 'row,col' (e.g., 0,0 for top-left)"
echo "- Close any window to stop that component"
echo ""
echo "To stop everything, run: docker stop ttt-redis"
