import { group } from 'k6';
import * as instantiation from './app_instantiation.js';
import * as appOnboarding from "./app_onboarding.js";
import * as appDeletion from './app_deletion.js';
import * as customMetrics from "../modules/custom_metrics.js";
import * as appMgrConstants from "../modules/app_constants.js";


export function parallelInstantiation(accessKey, appId, IS_SEF_AVAILABLE) {
    let instanceId = instantiation.instantiateApp(accessKey, appId, IS_SEF_AVAILABLE);
    appOnboarding.checkState(accessKey, 'INSTANTIATED', 'Instantiation', instanceId, false, undefined, false, IS_SEF_AVAILABLE);
}
export function parallelInstanceTermination(accessKey, appId) {
    instantiation.appTermination(accessKey, appId);
    appOnboarding.checkState(accessKey, 'TERMINATED', 'Termination', appId, false, undefined)
}
export function getAppInstanceIds(accessKey, appId, IS_SEF_AVAILABLE) {
    return instantiation.getAppInstanceIds(accessKey, appId, IS_SEF_AVAILABLE);
}
export function deleteAppWithoutInstance(accessKey, appId) {
    let startProcessTime = Date.now();
    appDeletion.deleteApp(accessKey, appId, appMgrConstants.deleteOperationType.without);
    customMetrics.deleteAppWithoutInstanceTrend.add(Date.now() - startProcessTime, { tag1: 'DELETE' })
}
