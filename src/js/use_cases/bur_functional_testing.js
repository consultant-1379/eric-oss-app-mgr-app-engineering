import { group } from 'k6';
import { consoleInfo } from "../modules/common_functions.js";
import http from 'k6/http';
import * as appMgrConstants from "../modules/app_constants.js";
// import * as customMetrics from "../modules/custom_metrics.js";
import { expect } from "../jslib/k6chaijs_4.3.4.3.js";


export function manageBackup(action = "create") {
    action = action.toLowerCase();

    let actions = {
        "create" : "CREATE_BACKUP",
        "delete" : "DELETE_BACKUP",
        "restore" : "RESTORE"}

    group(`${action} backup on BUR Orchestrator`, () => {
        let jsonBody = {
            "action": actions[action],
            "payload": {
            "backupName": appMgrConstants.APP_MGR_BACKUP_NAME
            }
        }

        let requestUrl = appMgrConstants.BUR_URL + appMgrConstants.BUR_TRIGGER_PATH;

        const REQUEST_PARAMS = {
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const apiResponse = http.post(requestUrl, JSON.stringify(jsonBody), REQUEST_PARAMS);
        consoleInfo(`STATUS for ${action}: ${apiResponse.status}`);

        expect(apiResponse.status, 'response status').to.equal(201);
    });
}

export function listBackups() {
    let apiResponse;

    group(`Getting existing backups from BUR Orchestrator`, () => {
        let requestUrl = appMgrConstants.BUR_URL + appMgrConstants.BUR_GET_BACKUPS_PATH;

        apiResponse = http.get(requestUrl);
        apiResponse => apiResponse.json();

        expect(apiResponse.status, 'response status').to.equal(200);
        expect(apiResponse).to.have.validJsonBody();
    });
    return apiResponse.json();
}

export function getBackup(id) {
    let apiResponse;

    group(`Getting existing backup by ID from BUR Orchestrator`, () => {
        let requestUrl = appMgrConstants.BUR_URL + appMgrConstants.BUR_GET_BACKUPS_PATH + `/${id}`;

        apiResponse = http.get(requestUrl);
        apiResponse => apiResponse.json();

        expect(apiResponse).to.have.validJsonBody();
    });
    return apiResponse.json();
}

export function getActionByID(id) {
    let apiResponse;

    group(`Getting and action ongiong by ID from BUR Orchestrator`, () => {
        let requestUrl = appMgrConstants.BUR_URL + appMgrConstants.BUR_TRIGGER_PATH + `/${id}`;

        apiResponse = http.get(requestUrl);
        apiResponse => apiResponse.json();

        expect(apiResponse).to.have.validJsonBody();
    });
    return apiResponse.json();
}

export function getStatus() {
    let apiResponse;

    group(`Getting current status of BUR Orchestrator`, () => {
        let requestUrl = appMgrConstants.BUR_URL + appMgrConstants.BUR_HEALTH_CHECK;

        apiResponse = http.get(requestUrl);
        apiResponse => apiResponse.json();

        expect(apiResponse).to.have.validJsonBody();
    });
    return apiResponse.json();
}