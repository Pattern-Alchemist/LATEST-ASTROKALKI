#!/bin/bash
# ASTROKALKI Dev Server Keepalive
# The dev server needs periodic requests to stay alive in this environment
# Run this in a separate terminal after starting the dev server

while true; do
  curl -s --max-time 5 http://localhost:3000/ -o /dev/null 2>/dev/null
  sleep 3
done
