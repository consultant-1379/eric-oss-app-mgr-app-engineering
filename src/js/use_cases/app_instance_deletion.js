import http from 'k6/http';
import { group } from 'k6';
import { expect } from "../jslib/k6chaijs_4.3.4.3.js";
import * as appMgrConstants from "../modules/app_constants.js";
import { consoleInfo } from "../modules/common_functions.js";

export function deleteAppInstance(accessKey, appId, appInstanceId, IS_SEF_AVAILABLE) {
    let requestUrl;
    let headers;
    let jsonBody;
    let delete_response;
    group(`Deleting App Instance By ID: ${appInstanceId} for Onboarded App by Id: ${appId}`, function () {
        consoleInfo(`Deleting App Instance By AppID: `, appId, ' Instance Id: ', appInstanceId);

        if (IS_SEF_AVAILABLE) {
            headers = {
                'Authorization': `${accessKey}`,
                'Content-Type': 'application/json'
            };
            requestUrl = appMgrConstants.APPMGR_URL + appMgrConstants.APP_LCM_PATH + "apps/" + appId + '/app-instances';
        }
        else
        {
            headers = {
                'cookie': accessKey,
                'Content-Type': 'application/json'
            };
            requestUrl = appMgrConstants.LEGACY_URL + appMgrConstants.APP_LCM_PATH + "apps/" + appId + '/app-instances';
        }
        jsonBody = '{"appInstanceId":[' + appInstanceId + ']}';
        jsonBody = JSON.parse(jsonBody);
        delete_response = http.del(requestUrl, JSON.stringify(jsonBody), { headers });
        expect(delete_response.status, 'response status').to.equal(204)
    });
}
