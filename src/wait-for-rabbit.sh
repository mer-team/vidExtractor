#!/bin/sh

set -e

cmd="$@"
  
until curl -i -s -f -o /dev/null -u ${USER}:${PASS} http://${HOST}:${MNG_PORT}/api/whoami; do
  >&2 echo "RabbitMQ is not ready - waiting ${TIME}s"
  sleep ${TIME}
done
  
>&2 echo "RabbitMQ is ready - executing command"
exec $cmd