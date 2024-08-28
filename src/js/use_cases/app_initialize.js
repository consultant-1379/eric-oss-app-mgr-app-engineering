import { check, group, fail } from 'k6';
import { consoleDebug, consoleInfo, pause } from "../modules/common_functions.js";
import http from 'k6/http';
import * as appMgrConstants from "../modules/app_constants.js";
import * as customMetrics from "../modules/custom_metrics.js";
import * as appCommons from "../modules/common_functions.js";

function makeHttpRequest(accessKey, appId, urlPath, action, requestBody, expectedStatus, calculateMetric, processStartTime, finalState, IS_SEF_AVAILABLE) {
    const requestUrl = appMgrConstants.LEGACY_URL + appMgrConstants.APP_LCM_PATH_ACMR + urlPath;
    const REQUEST_PARAMS = {
        headers: {
            'cookie': accessKey,
            'Content-Type': 'application/json'
        }
    };
    const jsonBody = JSON.parse(requestBody);
    let apiResponse;
    if(action === "Enable" || action === "Disable")
    {
    apiResponse = http.put(requestUrl, JSON.stringify(jsonBody), REQUEST_PARAMS);
    }
    else{
        apiResponse = http.post(requestUrl, JSON.stringify(jsonBody), REQUEST_PARAMS);
    }
    check(apiResponse, {
        [`${action} Response status equals ${expectedStatus}`]: (r) => r.status === expectedStatus
    });
    group(`Monitor ${action} in AppMgr`, () => {
        checkInitializeState(accessKey, action.toLowerCase(), appId, calculateMetric, processStartTime, finalState);
    });
}
export function initializeApp(accessKey, appId, calculateMetric) {
    let expectedStatus, ro;
    let processStartTime = Date.now();
    group(`Initializing App for App Id : ${appId}`, () => {
        consoleInfo(`Starting initialize for App Id : ${appId}`);
        ro = new appCommons.RequestObject();

        ro.url = appMgrConstants.LEGACY_URL + appMgrConstants.APP_LCM_PATH_ACMR + `apps/${appId}/initialization-actions`;

        ro.header.add(accessKey);
        ro.header.add('application/json');

        ro.payload.add({
            "action": "INITIALIZE"
        });

        ro.post();

        expectedStatus = 202;
        check(ro.response, {
            [`Initialize Response status equals ${expectedStatus}`]: (r) => r.status === expectedStatus
        });
        checkInitializeState(accessKey, 'initialize', appId, calculateMetric, processStartTime, 'INITIALIZED');
    });
    if (calculateMetric) {
        customMetrics.initializeDurationTrend.add(Date.now() - processStartTime, { tag1: `Initialize Finished` })
    }
}

export function deinitializeApp(accessKey, appId, calculateMetric, IS_SEF_AVAILABLE) {
    let expectedStatus, ro;
    let processStartTime = Date.now();
    group(`Deinitializing App for App Id : ${appId}`, () => {
        consoleInfo(`Starting deinitialize for App Id : ${appId}`);
        ro = new appCommons.RequestObject();

        ro.url = appMgrConstants.LEGACY_URL + appMgrConstants.APP_LCM_PATH_ACMR + `apps/${appId}/initialization-actions`;

        ro.header.add(accessKey);
        ro.header.add('application/json');

        ro.payload.add({
            "action": "DEINITIALIZE"
        });

        ro.post();
        ro.defaultReturnCode = 202;
        //expectedStatus = ro.expected([appId])//202;
        expectedStatus = 202;
        check(ro.response, {
            [`Deinitialize Response status equals ${expectedStatus}`]: (r) => r.status === expectedStatus
        });
        checkInitializeState(accessKey, 'deinitialize', appId, calculateMetric, processStartTime, 'DEINITIALIZED');
    });
    if (calculateMetric) {
        customMetrics.deinitializeDurationTrend.add(Date.now() - processStartTime, { tag1: `Deinitialize Finished` })
    }
}

export function enableMode(accessKey, appId, calculateMetric, IS_SEF_AVAILABLE) {
    let expectedStatus, ro;
    let processStartTime = Date.now();

    ro = new appCommons.RequestObject();

    ro.url = appMgrConstants.LEGACY_URL + appMgrConstants.APP_LCM_PATH_ACMR + `apps/${appId}/mode`;

    ro.header.add(accessKey);
    ro.header.add('application/json');

    ro.payload.add({
        "mode": "ENABLED"
    });

    ro.put();

    expectedStatus = 200;
    check(ro.response, {
        [`Enable Response status equals ${expectedStatus}`]: (r) => r.status === expectedStatus
    });
    group(`Monitor Enable App in AppMgr`, () => {
        checkInitializeState(accessKey, 'enable', appId, calculateMetric, processStartTime, 'ENABLED');
    });
    if (calculateMetric) {
        customMetrics.enableDurationTrend.add(Date.now() - processStartTime, { tag1: `Enable App Finished` })
    }
}

export function disableMode(accessKey, appId, calculateMetric, IS_SEF_AVAILABLE) {
    let expectedStatus, ro;
    let processStartTime = Date.now();

    ro = new appCommons.RequestObject();

    ro.url = appMgrConstants.LEGACY_URL + appMgrConstants.APP_LCM_PATH_ACMR + `apps/${appId}/mode`;

    ro.header.add(accessKey);
    ro.header.add('application/json');

    ro.payload.add({
        "mode": "DISABLED"
    });

    ro.put();

    expectedStatus = 200;
    check(ro.response, {
        [`Disable Response status equals ${expectedStatus}`]: (r) => r.status === expectedStatus
    });
    group(`Monitor Disable App in AppMgr`, () => {
        checkInitializeState(accessKey, 'disable', appId, calculateMetric, processStartTime, 'DISABLED');
    });
    if (calculateMetric) {
        customMetrics.enableDurationTrend.add(Date.now() - processStartTime, { tag1: `Disable App Finished` })
    }
}

export function checkInitializeState(accessKey, operation, appId, calculateMetric, processStartTime, finalState, IS_SEF_AVAILABLE) {
    let ro;
    let appStatusOrMode = 'PENDING';
    let retryNumber = 1;

    ro = new appCommons.RequestObject();

    ro.url = appMgrConstants.LEGACY_URL + appMgrConstants.APP_LCM_PATH_ACMR + 'apps/' + appId;

    ro.header.add(accessKey);

    while (!(finalState === appStatusOrMode)) {
        consoleInfo(`Monitoring ${operation} process for state: ${finalState} by appId: ${appId}`);
        consoleInfo(`Check state url is ${ro.url}`);
        ro.get();
        if(operation === 'initialize' || operation === 'deinitialize'){
            appStatusOrMode = ro.response.json().status;
        }
        else{
            appStatusOrMode = ro.response.json().mode;
        }
        if (finalState === appStatusOrMode) {
            break;
        }
        else if(appStatusOrMode.includes("ERROR"))
        {
            fail(`AppStatus is ${appStatusOrMode}`);
        }
        pause(appMgrConstants.pollAppStateIntervalSecs);
        retryNumber += 1;
    }
    consoleInfo(`Final Status: ${appStatusOrMode}`);
    check(appStatusOrMode, {
        [`Response status is ${finalState}`] : (r) => r === finalState
    });
}