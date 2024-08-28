import { check, group } from 'k6';
import { consoleDebug, consoleInfo, pause } from "../modules/common_functions.js";
import * as appMgrConstants from "../modules/app_constants.js";
import http from 'k6/http';
import * as customMetrics from "../modules/custom_metrics.js";
import { describe, expect } from "../jslib/k6chaijs_4.3.4.3.js";
import * as appCommons from "../modules/common_functions.js";

export function deleteApp(accessKey, appId, operation, calculateMetric, IS_SEF_AVAILABLE) {
    let requestUrl;
    let headers;
    let deleteAppResponse;
    let retryNumber = 1;
    let timeSeconds = 0;
    const timeoutSecs = appMgrConstants.appDeletionTimeoutSecs;
    group(`Deleting App ${operation} Instance of App ID: ${appId}`, () => {
        consoleInfo(`Deleting App By ID: ${appId}`);
        http.setResponseCallback(
            http.expectedStatuses({ min: 200, max: 202 }, 404)
        );
        if (IS_SEF_AVAILABLE) {
            headers = {
                'Authorization': `${accessKey}`
            };
            requestUrl = appMgrConstants.APPMGR_URL + appMgrConstants.APP_LCM_PATH + 'apps' + "/" + appId;
        }
        else
        {
            headers = {
                'cookie': accessKey
            };
            requestUrl = appMgrConstants.LEGACY_URL + appMgrConstants.APP_LCM_PATH + 'apps' + "/" + appId;
        }
        deleteAppResponse = http.del(requestUrl, null, { headers });
        expect(deleteAppResponse.status, 'Delete Api response status').to.equal(202);

        if (IS_SEF_AVAILABLE) {
            requestUrl = appMgrConstants.APPMGR_URL + appMgrConstants.APP_ONBOARDING_PATH + 'apps/' + appId;
        }
        else
        {
            requestUrl = appMgrConstants.LEGACY_URL + appMgrConstants.APP_ONBOARDING_PATH + 'apps/' + appId;
        }

        consoleDebug(`requestUrl: ${requestUrl}`);
        deleteAppResponse = http.get(requestUrl, { headers });
        consoleDebug(`Delete Api response Status: ${JSON.stringify(deleteAppResponse.status)}`);

        while (deleteAppResponse.status !== 404) {
            deleteAppResponse = http.get(requestUrl, { headers });
            timeSeconds = appMgrConstants.appDeletionTimeoutInterval * retryNumber;
            if (timeSeconds > timeoutSecs) {
                consoleDebug(`App Deletion unable to complete in`
                    + ` ${timeoutSecs / 60} mins`);
                expect(timeSeconds, `App Deletion of appId ${appName} completed in `
                    + `${timeSeconds / 60} min, which is `)
                    .to.be.below(timeoutSecs / 60);
            }
            if (deleteAppResponse.status === 404) {
                if (calculateMetric) {
                    customMetrics.deleteAppWithoutInstanceTrend.add(Date.now() - startProcessTime, { deleteApp: 'deleteAppWithoutInstance' })
                }
                expect(deleteAppResponse.status, 'response status').to.equal(404);
                break;
            }
            consoleDebug(`Delete Api response Status..: ${deleteAppResponse.status}`);
            pause(appMgrConstants.pollAppDeletionIntervalSecs);
            retryNumber += 1;
        }
    });
}

export function deleteAppWithoutInstance(accessKey, appId, IS_SEF_AVAILABLE) {
    let startProcessTime = Date.now();
    deleteApp(accessKey, appId, appMgrConstants.deleteOperationType.without, IS_SEF_AVAILABLE);
    customMetrics.deleteAppWithoutInstanceTrend.add(Date.now() - startProcessTime, { tag1: 'deleteAppWithoutInstance' })
}

export function deleteAppACMR(accessKey, appId, calculateMetric) {
    let processStartTime = Date.now();

    let expectedStatus, ro;

    ro = new appCommons.RequestObject();

    ro.url = appMgrConstants.LEGACY_URL + appMgrConstants.APP_LCM_PATH_ACMR + 'apps/' + appId;

    ro.header.add(accessKey);

    group(`Deleting App in AppMgr by Id: ${appId}`, () => {
        consoleInfo(`Deleting App By ID: ${appId}`);
        consoleInfo('url for deletion is : '+ ro.url)
        ro.delete();

        expectedStatus = 204;
        check(ro.response, {
            'Status is 204': (r) => r.status === expectedStatus,
        });
    });

    if (calculateMetric) {
        customMetrics.deleteAppACMTrend.add(Date.now() - processStartTime, { tag1: `Delete App Finished` })
    }
}
