#!/bin/bash
KUBECONFIG=$1
NAMESPACE=$2
DB_UPDATE=$3
RAPP_STAGING=$4
AUTOAPP_ADDITIONAL_PARAMETER=$5
APPMGR_USER=$6
APPMGR_PASS=$7

# delete k6 pod first if exists
k6Pod=$(kubectl get po --namespace ${NAMESPACE}  | grep app-mgr-k6-testsuite )
if [[ ${k6Pod[@]:+${k6Pod[@]}} ]]; then
    echo 'Deleting pp-mgr-k6-testsuite pod'
    kubectl --namespace ${NAMESPACE} --kubeconfig ${KUBECONFIG}  delete pod app-mgr-k6-testsuite
fi

kubectl --namespace ${NAMESPACE} --kubeconfig ${KUBECONFIG} apply -f deployment/charts/network-policy/eric-app-mgr-eai-k6-policy.yaml;
kubectl --namespace ${NAMESPACE} --kubeconfig ${KUBECONFIG} create secret generic k6-app-mgr-functional-secret -n ${NAMESPACE} --from-literal=app_mgr_user="${APPMGR_USER}" --from-literal=app_mgr_pass="${APPMGR_PASS}";
if ${RAPP_STAGING}; then
  kubectl --namespace ${NAMESPACE} --kubeconfig ${KUBECONFIG} create secret generic k6-app-mgr-secret -n ${NAMESPACE} --from-literal=additional_params="${AUTOAPP_ADDITIONAL_PARAMETER}"
  kubectl --namespace ${NAMESPACE} --kubeconfig ${KUBECONFIG} apply -f deployment/charts/app-mgr-k6Pod-getcsar.yaml;
else
  kubectl --namespace ${NAMESPACE} --kubeconfig ${KUBECONFIG} apply -f deployment/charts/app-mgr-k6Pod.yaml;
fi
#clean environment for tests
echo dbupate is ${DB_UPDATE}
if ${DB_UPDATE}; then
  master_node=$(kubectl --namespace ${NAMESPACE} get pod -o name -l cluster-name=eric-appmgr-data-document-db,role=master)

  #preload PG data clean/load
  kubectl --namespace ${NAMESPACE} --kubeconfig ${KUBECONFIG} exec -it ${master_node} -n ${NAMESPACE} -- bash -c "psql -U postgres onboarding -c 'delete from artifact_event;' -c 'delete from application_event;' -c 'delete from artifact;' -c 'delete from permission;' -c 'delete from application;' -c 'ALTER SEQUENCE application_id_seq RESTART;' -c 'ALTER SEQUENCE artifact_id_seq RESTART;' -c 'ALTER SEQUENCE permission_id_seq RESTART;'"
  kubectl --namespace ${NAMESPACE} --kubeconfig ${KUBECONFIG} exec -it ${master_node} -n ${NAMESPACE} -- bash -c "psql -U postgres app_lcm_db -c 'delete from app_lcm_schema.artifact_instance;' -c 'delete from app_lcm_schema.app_instance;' -c 'delete from app_lcm_schema.credential_event;' -c 'ALTER SEQUENCE app_lcm_schema.app_instance_id_seq RESTART;' -c 'ALTER SEQUENCE app_lcm_schema.artifact_instance_id_seq RESTART;' -c 'ALTER SEQUENCE app_lcm_schema.credential_event_id_seq RESTART;'"

  kubectl --namespace ${NAMESPACE} --kubeconfig ${KUBECONFIG} cp ./src/resources/sql ${master_node/pod\//""}:/temp/sql -c eric-appmgr-data-document-db;
  kubectl --namespace ${NAMESPACE} --kubeconfig ${KUBECONFIG} exec -it ${master_node} -n ${NAMESPACE} -- bash -c "psql -U postgres onboarding -f /temp/sql/AppOnbording.sql"
  sleep 10
  kubectl --namespace ${NAMESPACE} --kubeconfig ${KUBECONFIG} exec -it ${master_node} -n ${NAMESPACE} -- bash -c "psql -U postgres app_lcm_db -f /temp/sql/AppLCM.sql"
  kubectl --namespace ${NAMESPACE} --kubeconfig ${KUBECONFIG} exec -it ${master_node} -c eric-appmgr-data-document-db -n ${NAMESPACE} -- bash -c "rm -d -r /temp/sql"
fi


echo "##Get all netpol##"
All_NETPOL=`kubectl get netpol --namespace ${NAMESPACE}`
echo "$All_NETPOL"

echo "##Get all pods##"
All_PODS=`kubectl get pods --namespace ${NAMESPACE}`
echo "$All_PODS"

echo "##Get all Ingress##"
All_Ingress=`kubectl get ingress --namespace ${NAMESPACE}`
echo "$All_Ingress"

echo "##Get all services##"
All_SVC=`kubectl get svc --namespace ${NAMESPACE}`
echo "$All_SVC" 

# sleep 900

echo "##App-Mgr-K6-Testsuite-details##"
app_mgr_k6_pod=`kubectl describe pod app-mgr-k6-testsuite --namespace ${NAMESPACE}`
echo "$app_mgr_k6_pod"

