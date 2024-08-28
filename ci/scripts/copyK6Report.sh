#!/bin/bash
KUBECONFIG=$1
NAMESPACE=$2
REPORT_PATH=$3

echo 'Copy Report Process Started...'
kubectl --namespace ${NAMESPACE} --kubeconfig ${KUBECONFIG} cp app-mgr-k6-testsuite:/reports/K6_Test_Report.html ${REPORT_PATH}/K6_Test_Report.html > /dev/null
kubectl --namespace ${NAMESPACE} --kubeconfig ${KUBECONFIG} cp app-mgr-k6-testsuite:/reports/summary.json ${REPORT_PATH}/summary.json > /dev/null
kubectl logs app-mgr-k6-testsuite  --all-containers=true --namespace ${NAMESPACE} > ${REPORT_PATH}/app-mgr-k6-testsuite.log
# delete secrets and network policy
kubectl --namespace ${NAMESPACE} delete networkpolicy/eric-app-mgr-eai-k6-policy
kubectl --namespace ${NAMESPACE} delete secret k6-app-mgr-functional-secret
kubectl --namespace ${NAMESPACE} delete secret k6-app-mgr-secret
echo 'Copy Report Process Completed!'
