#!/bin/sh
# This is the script that the Container will run upon startup
k6 run --summary-export summary.json main.js --http-debug
#k6 run --summary-export summary.json main.js --out influxdb=http://seroius06634.sero.gic.ericsson.se:8086/k6_report_tool --http-debug
# This never-ending loop will ensure the pod never gets into a useless 'completed' state and remains running for copying the results file out when ready
# Once this issue is resolved, we can enact a way to copy files from a completed Pod. Until then... https://github.com/kubernetes/kubectl/issues/454
while true ; do sleep 1000s ; done > /dev/null

