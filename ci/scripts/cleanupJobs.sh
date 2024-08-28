#!/bin/bash
KUBECONFIG=$1
NAMESPACE=$2

# delete jobs and pods
kubectl --namespace ${NAMESPACE} --kubeconfig ${KUBECONFIG} delete all -l=jobTag=onboarding-jobs --timeout=60s
