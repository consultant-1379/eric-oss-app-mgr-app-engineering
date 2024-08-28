import { check, group, fail } from 'k6';
import { consoleDebug, consoleInfo, pause } from "../modules/common_functions.js";
import http from 'k6/http';
import * as appMgrConstants from "../modules/app_constants.js";
import * as customMetrics from "../modules/custom_metrics.js";
import { describe, expect } from "../jslib/k6chaijs_4.3.4.3.js";
import * as appCommons from "../modules/common_functions.js";

let isKafkaEnabledMap = new Map();

export function getAllApps(mode) {
    let requestUrl = appMgrConstants.APPMGR_URL + appMgrConstants.APP_ONBOARDING_PATH + 'apps';
    let apiResponse = http.get(requestUrl);
    expect(apiResponse.status, 'Status is 200, OK').to.equal(200);
    apiResponse.json().forEach(app => {
        expect(app.mode, ['app_status is ' + mode]).to.equal(200);
    });
}

export function getAllAppsACMr(accessKey) {
    let requestUrlByAppID = appMgrConstants.LEGACY_URL + appMgrConstants.APP_LCM_PATH_ACMR + 'apps';
    let headers = {
        'cookie': accessKey
    };
    let processStartTime = Date.now();
    http.get(requestUrlByAppID, { headers });
    customMetrics.getACMAppsTrend.add(Date.now() - processStartTime);

    requestUrlByAppID = appMgrConstants.LEGACY_URL + appMgrConstants.APP_ONBOARDING_PATH_ACM_R;
    http.get(requestUrlByAppID, { headers })
    customMetrics.getACMJobsTrend.add(Date.now() - processStartTime);
}

export function parallelEnableDisable(accessKey, appId, mode, IS_SEF_AVAILABLE) {
    enableDisableApp(accessKey, appId, mode, IS_SEF_AVAILABLE);
}

export function enableDisableApp(accessKey, appId, mode, IS_SEF_AVAILABLE) {
    let jsonBody = JSON.parse('{"mode":"' + mode + '"}');
    let requestUrl;
    let headers;
    let apiResponse;
    group(`Changing the mode of App Id : ${appId} to ${mode}`, () => {
        consoleInfo(`Changing the mode of App Id : ${appId} to ${mode}`);
        if (IS_SEF_AVAILABLE) {
            headers = {
                'Authorization': `${accessKey}`,
                'Content-Type': 'application/json'
            };
            requestUrl = appMgrConstants.APPMGR_URL + appMgrConstants.APP_ONBOARDING_PATH + 'apps/' + appId;
        }
        else
        {
            headers = {
                cookie: accessKey,
                'Content-Type': 'application/json'
            };
            requestUrl = appMgrConstants.LEGACY_URL + appMgrConstants.APP_ONBOARDING_PATH + 'apps/' + appId;
        }
        apiResponse = http.put(requestUrl, JSON.stringify(jsonBody), { headers });
        expect(apiResponse.status, 'response status').to.equal(200);
        expect(apiResponse.json().mode, 'app status mode').to.equal(mode);
    });
}

export function onboardApp(accessKey, csarFilename, calculateMetric, acm_r, IS_SEF_AVAILABLE) {
    let processStartTime;
    let appId;

    processStartTime = Date.now();
    appId = uploadApp(accessKey, csarFilename, acm_r, IS_SEF_AVAILABLE);
    checkState(accessKey, 'ONBOARDED', 'Onboarding', appId, calculateMetric, processStartTime, acm_r, IS_SEF_AVAILABLE);

    return appId;
}

export function uploadApp(accessKey, csarFilename, acm_r, IS_SEF_AVAILABLE) {
    let urlOnboarding;
    let authTokenHeader;
    let appId;
    let payload;

    consoleInfo(`Attempting to upload App: ${csarFilename}`);
    group(`Upload ${csarFilename} Csar Package`, () => {
        let ro;

        ro = new appCommons.RequestObject();

        ro.url = 'http://localhost/upload';

        if (IS_SEF_AVAILABLE) {
            authTokenHeader = {
                'Authorization': `${accessKey}`,
            };
            urlOnboarding = appMgrConstants.APPMGR_URL;
        }
        else
        {
            authTokenHeader = {
                cookie: accessKey,
            };
            urlOnboarding = appMgrConstants.LEGACY_URL;
        }
        urlOnboarding += acm_r ? appMgrConstants.APP_ONBOARDING_PATH_ACM_R_UPLOAD : appMgrConstants.APP_ONBOARDING_PATH + 'apps';

        ro.payload.add({
            file: csarFilename,
            url: urlOnboarding,
            headers: authTokenHeader,
        });

        consoleInfo(`request payload: ${ro.payload.stringify()}`);
        consoleInfo(appMgrConstants.testwareHelperMessage);

        ro.post('20m')

        expect(ro.response.status, 'POST Status code').to.equal(202);
        appId = acm_r? JSON.parse(ro.response.body).onboardingJob.id : JSON.parse(ro.response.body).id;
        expect(appId, 'onboardApp ID').to.be.ok;
    });
    return appId;
}

export function checkState(accessKey, finalState, operation, appId, calculateMetric, processStartTime, acm_r, IS_SEF_AVAILABLE) {

    const finalStates = ['INSTANTIATED', 'DELETED', 'TERMINATED', 'ONBOARDED', 'FAILED'];
    let apiResponse = "";
    let appStatus = 'PENDING';
    let retryNumber = 1;
    let timeSeconds = 0;
    const timeoutSecs = finalState === 'ONBOARDED' ? appMgrConstants.onboardingTimeoutSecs : appMgrConstants.instantiationTimeoutSecs;
    let requestUrl;
    let headers;
    group(`Monitor the ${operation} of ${appId}`, () => {
        consoleInfo(`Monitoring ${operation} process for state: ${finalState} by appId: ${appId}`);
        if (IS_SEF_AVAILABLE) {
            headers = {
                'Authorization': `${accessKey}`,
            };
            if (acm_r){
                requestUrl=  appMgrConstants.APPMGR_URL + appMgrConstants.APP_ONBOARDING_PATH_ACM_R+`/${appId}`;
            }else{
                requestUrl = finalState === 'ONBOARDED' ? appMgrConstants.APPMGR_URL + appMgrConstants.APP_ONBOARDING_PATH + `apps/${appId}` : appMgrConstants.APPMGR_URL + appMgrConstants.APP_LCM_PATH + `app-instances/${appId}`;
            }
        }
        else
        {
            headers = {
                cookie: accessKey,
            };
            if (acm_r){
                requestUrl=  appMgrConstants.LEGACY_URL + appMgrConstants.APP_ONBOARDING_PATH_ACM_R+`/${appId}`;
            }else{
                requestUrl = finalState === 'ONBOARDED' ? appMgrConstants.LEGACY_URL + appMgrConstants.APP_ONBOARDING_PATH + `apps/${appId}` : appMgrConstants.LEGACY_URL + appMgrConstants.APP_LCM_PATH + `app-instances/${appId}`;
            }
        }
        consoleInfo(`check state url is ${requestUrl}`)

        while (!finalStates.includes(appStatus)) {
            consoleDebug(`requestUrl ${requestUrl} `);
            apiResponse = http.get(requestUrl, { headers });
            appStatus = finalState === 'ONBOARDED' ? apiResponse.json().status : apiResponse.json().healthStatus;
            timeSeconds = appMgrConstants.pollAppStateIntervalSecs * retryNumber;
            if (timeSeconds > timeoutSecs) {
                consoleInfo(`App ${operation} unable to complete in`
                    + ` ${timeoutSecs / 60} mins`);
                expect(timeSeconds, `${operation} of app ${appId} completed in `
                    + `${timeSeconds / 60} min, which is `)
                    .to.be.below(timeoutSecs / 60);
            }
            if (finalStates.includes(appStatus)) {
                if (operation === "Onboarding") {
                    if (calculateMetric) {
                        customMetrics.onboardDurationTrend.add(Date.now() - processStartTime, { tag1: `${operation} Finished` })
                    }
                }
                break;
            }
            pause(appMgrConstants.pollAppStateIntervalSecs);
            retryNumber += 1;
        }
        consoleInfo(`Final Status: ${appStatus}`);
        if (acm_r) {
            if (calculateMetric) {
                customMetrics.onboardAppACMDurationTrend.add(Date.now() - processStartTime, { tag1: `${operation} Finished` })
            }
            check(appStatus, {
                'Response status is Onboarded': (r) => r === 'ONBOARDED',
            });
        }
        else {
            expect(appStatus, 'response status').to.equal(finalState);
        }
    });
    return isKafkaEnabledMap;
}

export function getAppIds(accessKey, requestUrl, limit, IS_SEF_AVAILABLE) {
    let headers;
    let apiResponse;
    let appIds = [];
    let latestThreeAppIds;
    group(`Retrieve the last ${limit} of Onboarded App Ids`, () => {
        if (IS_SEF_AVAILABLE) {
            headers = {
                'Authorization': `${accessKey}`
            };
        }
        else
        {
            headers = {
                cookie: accessKey
            };
        }

        apiResponse = http.get(requestUrl, { headers });

        expect(apiResponse.status, "Status is 200, OK", 200);
        apiResponse.json().forEach(app => {
            appIds.push(app.id);
        });
        appIds.sort((a, b) => b - a);
        latestThreeAppIds = appIds.slice(0, limit);
        latestThreeAppIds.sort((a, b) => a - b);
    });
    return latestThreeAppIds;
}

export function isKeyCloakVerificationRequired(accessKey, appId, IS_SEF_AVAILABLE) {
    let requestUrl;
    let apiResponse = "";
    let headers;
    let returnValue;
    group(`Check if KeyCloak verification is needed for Id: ${appId}`, () => {
        if (IS_SEF_AVAILABLE) {
            headers = {
                'Authorization': `${accessKey}`
            };
            requestUrl =  appMgrConstants.APPMGR_URL + appMgrConstants.APP_ONBOARDING_PATH + `apps/${appId}`;
        }
        else
        {
            headers = {
                'cookie': accessKey
            };
            requestUrl =  appMgrConstants.LEGACY_URL + appMgrConstants.APP_ONBOARDING_PATH + `apps/${appId}`;
        }
        apiResponse = http.get(requestUrl, { headers });
        consoleDebug(`Kafka Permission ${apiResponse.json().permissions.length} `)
        if (apiResponse.json().permissions.length > 0 && apiResponse.json().permissions != null) {
            returnValue = true;
        } else {
            returnValue = false;
        }
    });
    return returnValue;
}

export function deleteAppOnboardingJob(accessKey, appId) {
    group(`Deleting App Onboarding job by Id: ${appId}`, () => {
        consoleInfo(`Deleting job By ID: ${appId}`);

        let processStartTime = Date.now();
        let ro;

        ro = new appCommons.RequestObject();

        ro.url = appMgrConstants.LEGACY_URL + appMgrConstants.APP_ONBOARDING_PATH_ACM_R + '/' + appId;

        ro.header.add(accessKey);

        ro.delete();

        check(ro.response, {
            'Status is 204': (r) => r.status === 204,
        });

        customMetrics.deleteOnboardingJobTrend.add(Date.now() - processStartTime)

    });
}

export function getAppByID(accessKey, onboardingJobId) {
    let appId, ro;
    consoleInfo(`Get App by id: ${onboardingJobId}`);

    ro = new appCommons.RequestObject();

    ro.url = appMgrConstants.LEGACY_URL + appMgrConstants.APP_ONBOARDING_PATH_ACM_R + `/${onboardingJobId}`;
    ro.header.add(accessKey);
    group(`Get App by Onboarding Job Id: ${onboardingJobId}`, () => {
        ro.get();
        // expect(apiResponse.status, 'Get App by ID response Status is 200, OK').to.equal(200);
        check(ro.response, {
            'Get App by ID response Status is 200' : (r) => r.status === 200
        });
        appId = ro.response.json().app.id;
    });

    if (appId === undefined){
        fail(`Retrieving AppId by Onboarding job ID ${onboardingJobId} failed.`)
    }

    group(`Get App by rApp Id: ${appId}`, () => {
        consoleInfo(`Get App by rApp Id: ${appId}`);
        ro.url = appMgrConstants.LEGACY_URL  + appMgrConstants.APP_LCM_PATH_ACMR + 'apps' + "/" + appId ;
        ro.get();
        check(ro.response, {
            'Get App by ID response Status is 200' : (r) => r.status === 200
        });
    });
    return appId;
}
