import { check, group } from 'k6';
import http from 'k6/http';
import { describe, expect } from "../jslib/k6chaijs_4.3.4.3.js";
import * as appMgrConstants from "../modules/app_constants.js";
import { consoleDebug, consoleInfo, pause } from "../modules/common_functions.js";
import { terminatingTrend } from "../modules/custom_metrics.js";

export function instantiateApp(accessKey, appId, IS_SEF_AVAILABLE) {
    let requestUrl;
    let headers;
    let jsonLcm = '{"appId":' + appId + '}';
    let apiResponse;
    let appInstanceId;
    group(`Instantiating App with ID:${appId}`, () => {
        jsonLcm = JSON.parse(jsonLcm);
        consoleInfo(`Instantiating App with ID: ${appId}`);

        if (IS_SEF_AVAILABLE) {
            headers = {
                'Authorization': `${accessKey}`,
                'Content-Type': 'application/json'
            };
            requestUrl = appMgrConstants.APPMGR_URL + appMgrConstants.APP_LCM_PATH + 'app-instances';
        }
        else
        {
            headers = {
                'cookie': accessKey,
                'Content-Type': 'application/json'
            };
            requestUrl = appMgrConstants.LEGACY_URL + appMgrConstants.APP_LCM_PATH + 'app-instances';
        }
        apiResponse = http.post(requestUrl, JSON.stringify(jsonLcm), { headers });
        expect(apiResponse.status, 'POST Status code').to.equal(201);
        expect(apiResponse, 'instantiateApp response').to.have.validJsonBody();
        appInstanceId = JSON.parse(apiResponse.body).id;
        expect(appInstanceId, 'instantiateApp ID Instance').to.be.ok;
        expect(apiResponse.json().healthStatus, 'health status').to.equal('PENDING');
    });
    return appInstanceId;
}

export function upgradeApp(accessKey, latestLcmId, greaterVersionUploadedId, IS_SEF_AVAILABLE) {
    let jsonBody = '{"appInstanceId":' + latestLcmId + ', "appOnBoardingAppId":' + greaterVersionUploadedId + '}';
    let headers;
    let requestUrl;
    let put_responses;

    consoleInfo(`Upgrading Instance ID ${latestLcmId} App by ID ${greaterVersionUploadedId}`)
    group(`Upgrading the instance of App with ID:${latestLcmId}, to an instance of app App with ID:${greaterVersionUploadedId}`, () => {
        if (IS_SEF_AVAILABLE) {
            headers = {
                'Authorization': `${accessKey}`,
                'Content-Type': 'application/json'
            };
            requestUrl = appMgrConstants.APPMGR_URL + appMgrConstants.APP_LCM_PATH + 'app-instances';
        }
        else
        {
            headers = {
                'cookie': accessKey,
                'Content-Type': 'application/json'
            };
            requestUrl = appMgrConstants.LEGACY_URL + appMgrConstants.APP_LCM_PATH + 'app-instances';
        }
        jsonBody = JSON.parse(jsonBody);

        put_responses = http.put(requestUrl, JSON.stringify(jsonBody), { headers });
        expect(put_responses.status, 'response status').to.equal(200)
        expect(put_responses).to.have.validJsonBody()
        expect(put_responses.json().healthStatus, 'health status').to.equal('PENDING')
        expect(put_responses.json().appOnBoardingAppId, 'updated App Id').to.equal(greaterVersionUploadedId)
    });
}

export function appTermination(accessKey, latestLcmId, IS_SEF_AVAILABLE) {
    let headers;
    let requestUrl;
    let terminateAppResponse;
    group(`Terminating App Instance By ID: ${latestLcmId}`, function () {
        consoleInfo(`Terminating App Instance By ID: ${latestLcmId}`);

        http.setResponseCallback(
            http.expectedStatuses({ min: 200, max: 204 }, 404)
        );
        if (IS_SEF_AVAILABLE) {
            headers = {
                'Authorization': `${accessKey}`
            };
            requestUrl = appMgrConstants.APPMGR_URL + appMgrConstants.APP_LCM_PATH + 'app-instances' + "/" + latestLcmId;
        }
        else
        {
            headers = {
                'cookie': accessKey
            };
            requestUrl = appMgrConstants.LEGACY_URL + appMgrConstants.APP_LCM_PATH + 'app-instances' + "/" + latestLcmId;
        }
        consoleDebug(`Terminate App requestUrl: ${requestUrl}`);
        terminateAppResponse = http.put(requestUrl, null, { headers });
        expect(terminateAppResponse.status, 'PUT response status is 204, app-lcm terminating').to.equal(204);
    });
}

export function getAppInstanceIds(accessKey, requestUrl, IS_SEF_AVAILABLE) {
    let instanceIds = new Map();
    let headers;
    let getAllInstancesResponse;
    group('Retrieve All App Instances by Id', () => {
        if (IS_SEF_AVAILABLE) {
            headers = {
                'Authorization': `${accessKey}`
            };
        }
        else
        {
            headers = {
                'cookie': accessKey
            };
        }
        getAllInstancesResponse = http.get(requestUrl, { headers });
        check(getAllInstancesResponse, {
            "Status is 200, OK": (r) => r.status === 200
        }, { legacy: "true" });
        getAllInstancesResponse.json().appInstances.forEach(app => {
            instanceIds.set(app.id, app.appOnBoardingAppId);
        });
        instanceIds = new Map([...instanceIds.entries()].sort((a, b) => b[0] - a[0]));
    });
    return instanceIds;
}
