#!/bin/bash
APPMGRURL=$1
RAPP_STAGING=$2
KEYCLOAK_URL=$3
BUILD_URL=$4

sed -i "s#%hostname_url%#${APPMGRURL}#g" deployment/charts/app-mgr-k6Pod.yaml
sed -i "s#%csar_path%#${CSAR_PATH}#g" deployment/charts/app-mgr-k6Pod.yaml
sed -i "s#%rapp_staging%#${RAPP_STAGING}#g" deployment/charts/app-mgr-k6Pod.yaml
sed -i "s#%keycloak_url%#${KEYCLOAK_URL}#g" deployment/charts/app-mgr-k6Pod.yaml
sed -i "s#%BUILD_URL%#${BUILD_URL}#g" deployment/charts/app-mgr-k6Pod.yaml
