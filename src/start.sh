#!/bin/bash

while true
do
  node index.js
  echo "Bot crashed with exit code $?. Restarting in 5 seconds..."
  sleep 5
done