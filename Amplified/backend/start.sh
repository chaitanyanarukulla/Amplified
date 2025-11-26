#!/bin/bash

# Define the port
PORT=8000

# Check if the port is in use
PID=$(lsof -ti:$PORT)

if [ -n "$PID" ]; then
  echo "⚠️  Port $PORT is in use by process $PID. Killing it..."
  kill -9 $PID
  echo "✅  Process killed."
else
  echo "✅  Port $PORT is free."
fi

# Activate virtual environment
if [ -d "venv" ]; then
    echo "🚀 Activating virtual environment..."
    source venv/bin/activate
else
    echo "⚠️  No virtual environment found. Using system Python."
fi

# Start the server
echo "Starting Uvicorn server..."
uvicorn main:app --reload
