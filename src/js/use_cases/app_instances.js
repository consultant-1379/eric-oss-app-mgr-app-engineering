import { check, group } from 'k6';
import http from 'k6/http';
import * as appMgrConstants from "../modules/app_constants.js";
import { consoleDebug, consoleInfo, pause } from "../modules/common_functions.js";
import * as customMetrics from "../modules/custom_metrics.js";
import * as appCommons from "../modules/common_functions.js";

export function CreateAppInstance(accessToken, appId, calculateMetric) {
    let expectedStatus, appInstanceId, ro;
    let processStartTime = Date.now();
    consoleInfo(`Starting Instantiate for App Id : ${appId}`);

    ro = new appCommons.RequestObject();

    ro.url = appMgrConstants.LEGACY_URL + appMgrConstants.APP_LCM_PATH_ACMR_INSTANCES;

    ro.header.add(accessToken);
    ro.header.add('application/json');

    ro.payload.add({
        "appId": appId
    });

    ro.post();
    appInstanceId = JSON.parse(ro.response.body).id;

    expectedStatus = 201;

    check(ro.response, {
        [`Create App Instance Response status equals ${ro.response.status}`]: (r) => r.status === expectedStatus
    });
    group(`Monitor Create App Instance in AppMgr`, () => {
        checkAppInstanceState(accessToken, 'Create App Instance', appInstanceId, calculateMetric, processStartTime, 'UNDEPLOYED', false);
    });
    if (calculateMetric) {
        customMetrics.createAppInstanceDurationTrend.add(Date.now() - processStartTime, { tag1: `Create App Instance Finished` })
    }
    return appInstanceId;
}

export function DeleteAppInstance(accessToken, appInstanceId, calculateMetric) {
    let processStartTime = Date.now();
    let expectedStatus, ro;

    // makeHttpRequest(jSessionId,appInstanceId,`/${appInstanceId}`, 'Delete App Instance',null, 202, calculateMetric, null,"");

    // jSessionId,Id,urlPath, action, requestBody, expectedStatus, calculateMetric, processStartTime, finalState,randomStringNamespace="default"
    // action = Delete App Instance
    group(`Deleting App Instance for App instance Id : ${appInstanceId}`, () => {
        consoleInfo(`Starting Deleting for App instance Id : ${appInstanceId}`);
        ro = new appCommons.RequestObject();

        ro.url = appMgrConstants.LEGACY_URL + appMgrConstants.APP_LCM_PATH_ACMR_INSTANCES + `/${appInstanceId}`;

        ro.header.add(accessToken);
        ro.header.add('application/json');

        ro.delete();

        expectedStatus = 202;
        check(ro.response, {
            [`Delete App Instance Response status equals ${expectedStatus}`]: (r) => r.status === expectedStatus
        });
    });
    group(`Monitor Delete App Instance in AppMgr`, () => {
        while(true){
            ro.get();
            if (ro.response.status === 404){
                break;
            }
            pause(appMgrConstants.pollAppStateIntervalSecs);
        }
    });
    if (calculateMetric) {
        customMetrics.deleteAppInstanceTrend.add(Date.now() - processStartTime, { tag1: `Delete App Instance Finished` })
    }
}

export function DeployAppInstance(accessToken, appInstanceId, calculateMetric) {
    let processStartTime = Date.now();
    let expectedStatus, ro;

    group(`Deploying App Instance for App instance Id : ${appInstanceId}`, () => {
        consoleInfo(`Starting Deploying for App instance Id : ${appInstanceId}`);

        ro = new appCommons.RequestObject();

        ro.url = appMgrConstants.LEGACY_URL + appMgrConstants.APP_LCM_PATH_ACMR_INSTANCES + `/${appInstanceId}/deployment-actions`;

        ro.header.add(accessToken);
        ro.header.add('application/json');

        ro.payload.add({
            "type": "DEPLOY"
        });

        ro.post();

        expectedStatus = 201;
        check(ro.response, {
            [`Deploy App Instance Response status equals ${expectedStatus}`]: (r) => r.status === expectedStatus
        });
    });
    group(`Monitor Deploy App Instance in AppMgr`, () => {
        checkAppInstanceState(accessToken, 'Deploy App Instance', appInstanceId, calculateMetric, processStartTime, 'DEPLOYED', false);
    });

    if (calculateMetric) {
        customMetrics.deployAppInstanceTrend.add(Date.now() - processStartTime, { tag1: `Deploy App Instance Finished` })
    }
}

export function UpgradeAppInstance(jSessionId, appInstanceId, calculateMetric,greaterVersionAppLcmId) {
    let processStartTime = Date.now();
    group(`Upgrade App Instance scenario`, () => {
        consoleInfo(`Starting Upgrade for App instance Id : ${appInstanceId}`);
        makeHttpRequest(jSessionId, appInstanceId, `/${appInstanceId}/deployment-actions`, 'Upgrade App Instance', '{"type": "UPGRADE","targetAppId" :"'+greaterVersionAppLcmId+'"}', 201, calculateMetric, null, "DEPLOYED");
    });
    if (calculateMetric) {
        customMetrics.upgradeAppInstanceTrend.add(Date.now() - processStartTime, { tag1: `Upgrade App Instance Finished` })
     }
}

export function UpdateAppInstance(jSessionId, appInstanceId, calculateMetric) {
    let processStartTime = Date.now();
    group(`Update App Instance scenario`, () => {
        consoleInfo(`Starting Update for App instance Id : ${appInstanceId}`);
        makeHttpRequest(jSessionId, appInstanceId, `/${appInstanceId}/component-instances`, 'Update App Instance', '  {"componentInstances": [{"name": "eric-oss-5gcnr","type": "MICROSERVICE","properties": {"timeout": 10}}]}', 202, calculateMetric, null, "DEPLOYED");
    });
    if (calculateMetric) {
        customMetrics.updateAppInstanceTrend.add(Date.now() - processStartTime, { tag1: `Update App Instance Finished` })
     }
}

export function UndeployAppInstance(accessToken, appInstanceId, calculateMetric) {
    let expectedStatus, ro;
    let processStartTime = Date.now();

    group(`Undeploying App Instance for App instance Id : ${appInstanceId}`, () => {
        consoleInfo(`Starting Undeploying for App instance Id : ${appInstanceId}`);

        ro = new appCommons.RequestObject();

        ro.url = appMgrConstants.LEGACY_URL + appMgrConstants.APP_LCM_PATH_ACMR_INSTANCES + `/${appInstanceId}/deployment-actions`;

        ro.header.add(accessToken);
        ro.header.add('application/json');

        ro.payload.add({
            "type": "UNDEPLOY"
        });

        ro.post();

        expectedStatus = 201;
        check(ro.response, {
            [`Undeploy App Instance Response status equals ${expectedStatus}`]: (r) => r.status === expectedStatus
        });
    });
    checkAppInstanceState(accessToken, 'Undeploy App Instance', appInstanceId, calculateMetric, processStartTime, "UNDEPLOYED", false);

    if (calculateMetric) {
        customMetrics.undeployAppInstanceTrend.add(Date.now() - processStartTime, { tag1: `Undeploy App Instance Finished` })
    }
}

export function DeployAppInstanceInOtherNamespace(accessToken, appInstanceId, calculateMetric, randomStringNamespace) {
    let processStartTime = Date.now();
    let expectedStatus, instanceName, ro;
    group(`Deploying App Instance In Other Namespace scenario`, () => {
        consoleInfo(`Starting Deploying for App instance Id in other namespace : ${appInstanceId}`);
        instanceName = getAppInstanceName(accessToken, appInstanceId);

        ro = new appCommons.RequestObject();

        ro.url = appMgrConstants.LEGACY_URL + appMgrConstants.APP_LCM_PATH_ACMR_INSTANCES + `/${appInstanceId}/deployment-actions`;

        ro.header.add(accessToken);
        ro.header.add('application/json');

        ro.payload.add({
            "type":"DEPLOY",
            "additionalData":{
                "componentInstances":[{
                    "name": instanceName.toString(),
                    "properties":{
                        "namespace": randomStringNamespace.toString()
                    }
                }]
            }
        });

        ro.post();

        expectedStatus = 201;
        check(ro.response, {
            [`Deploy App Instance In Other Namespace Response status equals ${expectedStatus}`]: (r) => r.status === expectedStatus
        });
    });
    group(`Monitor Deploy App Instance In Other Namespace in AppMgr`, () => {
        checkAppInstanceState(accessToken, 'Deploy App Instance In Other Namespace', appInstanceId, calculateMetric, processStartTime, "DEPLOYED", true, randomStringNamespace);
    });

    if (calculateMetric) {
        customMetrics.deployAppInstanceTrend.add(Date.now() - processStartTime, { tag1: `Deploy App Instance Finished In Other Namespace` })
    }
}


export function makeHttpRequest(jSessionId,Id,urlPath, action, requestBody, expectedStatus, calculateMetric, processStartTime, finalState,randomStringNamespace="default") {
    let requestUrl = appMgrConstants.LEGACY_URL + appMgrConstants.APP_LCM_PATH_ACMR_INSTANCES +urlPath;
    consoleInfo(requestUrl)
    const REQUEST_PARAMS = {
        headers: {
            'cookie': jSessionId,
            'Content-Type': 'application/json'
        }
    };

    const jsonBody = JSON.parse(requestBody);
    let apiResponse;

    if(action === 'Create App Instance')
    {
        apiResponse = http.post(requestUrl, JSON.stringify(jsonBody), REQUEST_PARAMS);
        Id = JSON.parse(apiResponse.body).id;
    }
    else if(action === 'Delete App Instance')
    {
        apiResponse = http.del(requestUrl, null, REQUEST_PARAMS);
    }
    else if(action === 'Deploy App Instance In Other Namespace' || action === 'Deploy App Instance'|| action === 'Undeploy App Instance' || action === 'Upgrade App Instance'  )
    {
        apiResponse = http.post(requestUrl, JSON.stringify(jsonBody), REQUEST_PARAMS);
    }else if(action === 'Update App Instance')
    {
        apiResponse = http.put(requestUrl, JSON.stringify(jsonBody), REQUEST_PARAMS);
    }
    // how does this work with deploy app? it's not ready yet
    check(apiResponse, {
        [`${action} Response status equals ${expectedStatus}`]: (r) => r.status === expectedStatus
    });

    if(action != 'Delete App Instance'){

        if (action === 'Deploy App Instance In Other Namespace' || action === 'Deploy App Instance' )
        {
            group(`Monitor ${action} in AppMgr`, () => {
                checkAppInstanceState(jSessionId, action, Id, calculateMetric, processStartTime, finalState, true, randomStringNamespace);
            });

        }
        else{

            group(`Monitor ${action} in AppMgr`, () => {
                checkAppInstanceState(jSessionId, action, Id, calculateMetric, processStartTime, finalState, false);
            });
        }
            if(action === 'Create App Instance')
            {
                return Id;
            }
        }
    }

export function checkAppInstanceState(accessToken, operation, appInstanceId, calculateMetric, processStartTime, finalState, checkNameSpace, randomStringNamespace="default") {
    let ro;
    let appStatusOrMode = 'PENDING';
    let retryNumber = 1;
    group(`Monitor the ${operation} of ${appInstanceId}`, () => {
        ro = new appCommons.RequestObject();

        ro.url = appMgrConstants.LEGACY_URL + appMgrConstants.APP_LCM_PATH_ACMR_INSTANCES + '/' + appInstanceId
        ro.header.add(accessToken);

        consoleInfo(`Monitoring ${operation} process for state: ${finalState} by appInstanceId: ${appInstanceId}`);
        consoleInfo(`check state url is ${ro.url}`);

        while (!(finalState === appStatusOrMode)) {
            consoleDebug(`requestUrl ${ro.url} `);

            ro.get()
            appStatusOrMode = ro.response.json().status;
            consoleInfo(`Checking for status: ${finalState} - Current status is: ${appStatusOrMode}`);
            if (finalState === appStatusOrMode) {
                if (finalState === 'DEPLOYED') {
                    while (true) {
                        ro.get();
                        if (ro.response.json().componentInstances && ro.response.json().componentInstances[0].deployState === 'DEPLOYED'){
                            break
                        }
                    }
                }
                break;
            }
            else if(appStatusOrMode.includes("ERROR"))
            {
                break;
            }
            pause(appMgrConstants.pollAppStateIntervalSecs);
            retryNumber += 1;
        }
        if(checkNameSpace)
        {
            let nameSpace = JSON.parse(ro.response.body).componentInstances[0].properties.namespace;

            if(operation === "Deploy App Instance In Other Namespace")
            {
                check(nameSpace, {
                    'Custom NameSpace': (r) => nameSpace === randomStringNamespace,
                });
            }
            else{
                check(nameSpace, {
                    'default NameSpace': (r) => nameSpace !== randomStringNamespace,
                });
            }
        }
        consoleInfo(`Final Status: ${appStatusOrMode}`);
        check(appStatusOrMode, {
            [`Response status is ${finalState}`] : (r) => r === finalState
        });
    });
}


export function getAppInstanceName(accessToken, appInstanceId) {
    let ro;

    ro = new appCommons.RequestObject();

    ro.url = appMgrConstants.LEGACY_URL + appMgrConstants.APP_LCM_PATH_ACMR_INSTANCES + '/' + appInstanceId;
    consoleInfo(`requestUrl ${ro.url}`);

    ro.header.add(accessToken)

    ro.get();

    return JSON.parse(ro.response.body).componentInstances[0].name
}

