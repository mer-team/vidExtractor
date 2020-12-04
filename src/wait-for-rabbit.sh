#!/bin/sh

set -e

cmd="$@"
  
until curl -i -s -f -o /dev/null -u merUser:passwordMER http://rabbit:15672/api/whoami; do
  >&2 echo "RabbitMQ is not ready - waiting 15s"
  sleep 15
done
  
>&2 echo "RabbitMQ is ready - executing command"
exec $cmd