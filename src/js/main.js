import { group, check } from 'k6';
import { scenario } from 'k6/execution';
import { textSummary } from './jslib/k6-summary_0.0.3.js';
import { describe } from "./jslib/k6chaijs_4.3.4.3.js";
import * as appMgrConstants from "./modules/app_constants.js";
import { consoleDebug, consoleInfo } from "./modules/common_functions.js";
import { deleteAppWithInstanceTrend, disableAppDurationTrend, enableAppDurationTrend, terminatingTrend } from "./modules/custom_metrics.js";
import * as instantiation from "./use_cases/appInstantiationFlow.js";
import * as appDeletion from "./use_cases/app_deletion.js";
import * as appInstanceDeletion from "./use_cases/app_instance_deletion.js";
import * as appInstantiation from './use_cases/app_instantiation.js';
import * as appInstance from './use_cases/app_instances.js';
import * as appOnboarding from "./use_cases/app_onboarding.js";
import * as burTesting from "./use_cases/bur_functional_testing.js";
import * as keyCloakApis from './use_cases/keycloak_apis.js';
//import { htmlReport } from "https://arm1s11-eiffel004.eiffel.gic.ericsson.se:8443/nexus/content/sites/oss-sites/common/k6/eric-k6-static-report-plugin/latest/bundle/eric-k6-static-report-plugin.js";
import { htmlReport } from "/modules/plugins/eric-k6-static-report-plugin/eric-k6-static-report-plugin.js";
import exec from 'k6/execution';
import { vu } from 'k6/execution';
import * as appInitialize from "./use_cases/app_initialize.js";
import { sleep } from 'k6';
import http from 'k6/http';
import * as appRolePermission from './use_cases/app_role_permission_testing.js';

export function setup() {
    let sefToken;
    let jSessionId;
    let IS_SEF_AVAILABLE;
    let keycloakToken;
    let clientId;
    let clientSecret;
    let serviceRolesId;
    let rolesWithIds;
    let userId;
    let epochTimeWithMiliseconds = Date.now();
    let randomNumber=Math.floor(Math.random()*100)+1;
    let randomStringNamespace = epochTimeWithMiliseconds+randomNumber;
    let masterRoles;
    let clientIdForRoleTest;
    let clientSecretForRoleTest;
    let serviceRolesIdForRoleTest;
    let sefTokenForRoleTest;
    let clientTokensForRoleTest = {
        [appMgrConstants.CLIENT_NAME_ROLE_TEST_APPS] : '',
        [appMgrConstants.CLIENT_NAME_ROLE_TEST_APP_INSTANCES] :'',
        [appMgrConstants.CLIENT_NAME_ROLE_TEST_APP_ONBOARDING_JOB] :''
    };

    describe('Setup -- Get Tokens', () => {
        IS_SEF_AVAILABLE = true;

        group('Testware User Login and Configuration', () => {
            //Auth to KeyCloak
            keycloakToken = keyCloakApis.authorizeKeyCloak();
            keyCloakApis.setKeycloakTokenDuration(keycloakToken);

            // Create TestWare User
            keyCloakApis.createTestwareUser(keycloakToken)

            // Get userID for TestWare User
            userId = keyCloakApis.getTestwareUserId(keycloakToken);

            // Set password to the testWare User so we can login to API-GW with user/pwd
            keyCloakApis.resetTestwareUserPassword(keycloakToken, userId);

            // Get master roles from realm
            masterRoles = keyCloakApis.getMasterRoles(keycloakToken);
            const isValidResponse = keyCloakApis.validateRoleNames(masterRoles, appMgrConstants.roleNamesList);

            if (isValidResponse) {
                console.info('All valid role names are present.');
            } else {
                console.info('One or more valid role is missing.');
                // return false;
            }

            // Getting available roles for the TestWare User
            rolesWithIds = keyCloakApis.getServiceRolesIdList(keycloakToken, userId)
            // Setting the roles for the
            rolesWithIds.forEach(roleWithId => {
                keyCloakApis.setServiceRoles(keycloakToken, userId, [ roleWithId ]);
            });

            if (IS_SEF_AVAILABLE) {
                // Create and Fetch info of the TestWare Client
                keyCloakApis.createKeycloakClient(keycloakToken);
                clientId = keyCloakApis.getTestwareClientId(keycloakToken);

                clientSecret = keyCloakApis.fetchClientSecret(clientId, keycloakToken)

                // Configuring the TestWare Client for roles
                serviceRolesId = keyCloakApis.getServiceRolesId(keycloakToken, clientId)
                rolesWithIds = keyCloakApis.getServiceRolesIdList(keycloakToken, serviceRolesId)

                // Setting the roles for the
                rolesWithIds.forEach(roleWithId => {
                    keyCloakApis.setServiceRoles(keycloakToken, serviceRolesId, [ roleWithId ]);
                });

                // Creating the SEF token and setting its timeout duration
                sefToken = keyCloakApis.authViaSEF(clientSecret, keycloakToken);
                keyCloakApis.setKeycloakTokenDuration(keycloakToken);

                // Creating the clients for testing App Mgr Readonly roles
                for (let client in appMgrConstants.ClientsAndRoles) {

                    keyCloakApis.createKeycloakClient(keycloakToken, client);

                    clientIdForRoleTest = keyCloakApis.getTestwareClientId(keycloakToken, client);
                    clientSecretForRoleTest = keyCloakApis.fetchClientSecret(clientIdForRoleTest, keycloakToken)

                    // Configuring the TestWare Client for roles
                    serviceRolesIdForRoleTest = keyCloakApis.getServiceRolesId(keycloakToken, clientIdForRoleTest);
                    rolesWithIds = keyCloakApis.getServiceRolesIdList(keycloakToken, serviceRolesIdForRoleTest);

                    // Setting the relevant role for the client
                    rolesWithIds.forEach(roleWithId => {
                    let roleName = appMgrConstants.ClientsAndRoles[client].toString();

                    if (roleWithId.name === roleName ) {
                        keyCloakApis.setServiceRoles(keycloakToken, serviceRolesIdForRoleTest, [roleWithId]);
                    }
                });

                // Creating the SEF token and setting its timeout duration and updating the same in dict
                sefTokenForRoleTest = keyCloakApis.authViaSEF(clientSecretForRoleTest, keycloakToken, client);
                //keyCloakApis.setKeycloakTokenDuration(keycloakToken);
                clientTokensForRoleTest[client] = sefTokenForRoleTest;

            }

        }
    });

        group('Getting JSESSIONID', () => {
            jSessionId = keyCloakApis.authorize();
        });

        group('Load app-mgr via Python sidecar', () => {
            const python_payload = {
                jsession_id: jSessionId,
                url: appMgrConstants.LEGACY_URL
            }

            const params = {
                timeout: '1200s',
            };
            http.post('http://localhost/python-load', JSON.stringify(python_payload), params)
        });
    });
    return {
        jSessionId,
        sefToken,
        randomStringNamespace,
        clientTokensForRoleTest
    };
}

export function rolesTest(data) {
    describe('AppMgr ReadOnly Roles Test', () => {
        let accessKey;

        // Turning SEF on, for client roles.
        let IS_SEF_AVAILABLE = true;

        try {
        // Setting URLs and Tokens based on SEF on/off
            const { jSessionId, clientTokensForRoleTest } = data;

            // Validate the request response for each client
            for (let client in appMgrConstants.ClientsAndResources){
                accessKey = IS_SEF_AVAILABLE ? clientTokensForRoleTest[client] : jSessionId;
                let requestUrl =  appMgrConstants.LEGACY_URL + appMgrConstants.ClientsAndResources[client].toString();

                appRolePermission.ValidateRolePermission(accessKey, requestUrl);
            }
        }
        catch(error)
        {
            console.error('test failure occured in roletest :', error);
        }
    });
}

export function functionale2eFlow(data) {
    describe('Non-SEF -- Non-Parallel -- Non-ACMR', () => {
        let appId;
        let startProcessTime;
        let greaterVersionAppId;
        let instanceId;
        let IS_SEF_AVAILABLE;

        // Turning SEF off, to test Legacy auth for the deprecation period.
        IS_SEF_AVAILABLE = false;
        // Setting URLs and Tokens based on SEF on/off
        let { jSessionId, sefToken } = data;

        jSessionId = IS_SEF_AVAILABLE ? jSessionId : keyCloakApis.authorize();

        let accessKey = IS_SEF_AVAILABLE ? sefToken : jSessionId;

        // Onboarding the First CSAR
        appId = appOnboarding.onboardApp(accessKey, __ENV.CSAR_FILE_NAME_01.trim(), true, false, IS_SEF_AVAILABLE);

        // Enable the First CSAR
        appOnboarding.enableDisableApp(accessKey, appId, appMgrConstants.appModes.enabled, IS_SEF_AVAILABLE);

        // Onboarding the Second CSAR
        greaterVersionAppId = appOnboarding.onboardApp(accessKey, __ENV.CSAR_FILE_NAME_02.trim(), false);

        // Enable the Second CSAR
        appOnboarding.enableDisableApp(accessKey, greaterVersionAppId, appMgrConstants.appModes.enabled, IS_SEF_AVAILABLE);

        // Instantiate First Onboarded App
        instanceId = appInstantiation.instantiateApp(accessKey, appId, IS_SEF_AVAILABLE);

        // Monitoring of the state of Instantiation
        appOnboarding.checkState(accessKey, 'INSTANTIATED', 'Instantiation', instanceId, false, false, IS_SEF_AVAILABLE);

        // Upgrade the Instance of the First App to the Instance of the Second App (Note: Instance of First App is Consumed)
        instanceUpgrade(accessKey, instanceId, greaterVersionAppId, IS_SEF_AVAILABLE);

        startProcessTime = Date.now();
        // Temrinate the Instance of the Second App
        appInstantiation.appTermination(accessKey, instanceId, IS_SEF_AVAILABLE);

        // Monitoring of the Termination of the Instance of the Second App
        appOnboarding.checkState(accessKey, 'TERMINATED', 'Termination', instanceId, false, false, IS_SEF_AVAILABLE);
        terminatingTrend.add(Date.now() - startProcessTime, { tag1: 'terminationFinished' });

        startProcessTime = Date.now();
        // Disable the First App
        appOnboarding.enableDisableApp(accessKey, appId, appMgrConstants.appModes.disabled, IS_SEF_AVAILABLE);
        disableAppDurationTrend.add(Date.now() - startProcessTime, { tag1: 'disableAppDurationTrend' })

        // Disable the Second App
        appOnboarding.enableDisableApp(accessKey, greaterVersionAppId, appMgrConstants.appModes.disabled, IS_SEF_AVAILABLE);
        startProcessTime = Date.now();

        // Delete the Second App with the Instance Artifacts
        appDeletion.deleteApp(accessKey, greaterVersionAppId, appMgrConstants.deleteOperationType.with, undefined, IS_SEF_AVAILABLE);
        deleteAppWithInstanceTrend.add(Date.now() - startProcessTime, { tag1: 'deleteAppWithInstance' });

        // Delete the First App without any Instance Artifact
        appDeletion.deleteAppWithoutInstance(accessKey, appId, IS_SEF_AVAILABLE);
    });
}

export function functionale2eFlowACM_R(data) {
    describe('Non-SEF -- Non-Parallel -- ACMR', () => {
        let accessKey;
        let appOnboardingId;
        let appLcmId;
        let greaterVersionAppOnboardingId;
        let greaterVersionAppLcmId;
        let appInstanceId;

        // Turning SEF off, ACMR does not work with SEF just yet.
        let IS_SEF_AVAILABLE = false;
        // Setting URLs and Tokens based on SEF on/off
        let { jSessionId, sefToken, randomStringNamespace } = data;

        jSessionId = IS_SEF_AVAILABLE ? jSessionId : keyCloakApis.authorize();

        accessKey = IS_SEF_AVAILABLE ? sefToken : jSessionId;

        try {
            // Onboarding the First CSAR
            appOnboarding.getAllAppsACMr(accessKey)
            appOnboardingId = appOnboarding.onboardApp(accessKey, __ENV.CSAR_FILE_NAME_03.trim(), true, true, IS_SEF_AVAILABLE);
            appLcmId = appOnboarding.getAppByID(accessKey, appOnboardingId);

            // Onboarding the Second CSAR
            greaterVersionAppOnboardingId = appOnboarding.onboardApp(accessKey, __ENV.CSAR_FILE_NAME_04.trim(), true, true, IS_SEF_AVAILABLE);
            greaterVersionAppLcmId = appOnboarding.getAppByID(accessKey, greaterVersionAppOnboardingId);

            // Delete Onboarding Job for the Onboarding of the First CSAR
            appOnboarding.deleteAppOnboardingJob(accessKey, appOnboardingId,);

            // Delete Onboarding Job for the Onboarding of the Second CSAR
            appOnboarding.deleteAppOnboardingJob(accessKey, greaterVersionAppOnboardingId,);

            // Initialize the First App
            appInitialize.initializeApp(accessKey, appLcmId, true, IS_SEF_AVAILABLE);

            // Enable the First App
            appInitialize.enableMode(accessKey, appLcmId, true);

            // Initialize the Second App
            appInitialize.initializeApp(accessKey, greaterVersionAppLcmId, true, IS_SEF_AVAILABLE);

            // Enable the Second App
            appInitialize.enableMode(accessKey, greaterVersionAppLcmId, true);

            // Create Instance for the First App
            appInstanceId = appInstance.CreateAppInstance(accessKey, appLcmId, true);

            // deploy the app Instance with defined namespace
             appInstance.DeployAppInstanceInOtherNamespace(accessKey,appInstanceId, true, randomStringNamespace)

             //sleep(120)

            // Undeploy the app Instance without defined namespace
            appInstance.UndeployAppInstance(accessKey,appInstanceId, true);

            // Deploy the App Instance
            appInstance.DeployAppInstance(accessKey, appInstanceId, true);

            //sleep(120)

            // Upgrade the First App Instance to be the Instance of the Second App
            appInstance.UpgradeAppInstance(accessKey, appInstanceId, true, greaterVersionAppLcmId);

            //sleep(120)

            // Update the First App Instance
            appInstance.UpdateAppInstance(accessKey, appInstanceId, true);

            // Undeploy the First App Instance
            appInstance.UndeployAppInstance(accessKey, appInstanceId, true);

            // Delete the first App Instance
            appInstance.DeleteAppInstance(accessKey, appInstanceId, true);

            // Disable the First App
            appInitialize.disableMode(accessKey, appLcmId, true);

            // Deinitialize the First App
            appInitialize.deinitializeApp(accessKey, appLcmId, true, IS_SEF_AVAILABLE);

            // Disable the Second App
            appInitialize.disableMode(accessKey, greaterVersionAppLcmId, true);

            // Deinitialize the Second App
            appInitialize.deinitializeApp(accessKey, greaterVersionAppLcmId, true, IS_SEF_AVAILABLE);

            // Delete the First App
            appDeletion.deleteAppACMR(accessKey, appLcmId, true, IS_SEF_AVAILABLE);

            // Delete the Second App
            appDeletion.deleteAppACMR(accessKey, greaterVersionAppLcmId, true, IS_SEF_AVAILABLE);
        }
        catch(error)
        {
            console.error('test failure occured in functionale2eFlowACM_R:', error);
        }
    });
}

export function functionale2eFlowACM_R_Parallel(data) {
    describe('Non-SEF -- Parallel -- ACMR', () => {
        let accessKey;
        let appOnboardingId;
        let appLcmId;
        let appInstanceId;

        // Turning SEF off, ACMR does not work with SEF just yet.
        let IS_SEF_AVAILABLE = false;

        // Setting URLs and Tokens based on SEF on/off
        let { jSessionId, sefToken, randomStringNamespace} = data;

        jSessionId = IS_SEF_AVAILABLE ? jSessionId : keyCloakApis.authorize();

        accessKey = IS_SEF_AVAILABLE ? sefToken : jSessionId;

        try {
            consoleInfo("Running scenario for vu id : " + vu.idInTest )
            // Onboarding the First CSAR
            appOnboardingId = appOnboarding.onboardApp(accessKey, appMgrConstants.vuToCsarMapping[exec.scenario.iterationInInstance + 1].name, true, true, IS_SEF_AVAILABLE);
            //return
            appLcmId = appOnboarding.getAppByID(accessKey, appOnboardingId);

            // Delete Onboarding Job for the Onboarding of the First CSAR
            appOnboarding.deleteAppOnboardingJob(accessKey, appOnboardingId,);

            // Initialize the First App
            appInitialize.initializeApp(accessKey, appLcmId, true, IS_SEF_AVAILABLE);

            // Enable the First App
            appInitialize.enableMode(accessKey, appLcmId, true);

            // Create Instance for the First App
            appInstanceId = appInstance.CreateAppInstance(accessKey, appLcmId, true);

            // deploy the app Instance with defined namespace
            appInstance.DeployAppInstanceInOtherNamespace(accessKey,appInstanceId, true, randomStringNamespace)

            //sleep(120)

            // Undeploy the app Instance without defined namespace
            appInstance.UndeployAppInstance(accessKey,appInstanceId, true);

            // Deploy First App Instance
            appInstance.DeployAppInstance(accessKey,appInstanceId, true);

            // Undeploy the First App Instance
            appInstance.UndeployAppInstance(accessKey,appInstanceId, true);

            // Delete the Instance Artifacts for First App
            appInstance.DeleteAppInstance(accessKey,appInstanceId, true);

            // Disable the First App
            appInitialize.disableMode(accessKey, appLcmId, true);

            //sleep(120)
            // Deinitialize the First App
            appInitialize.deinitializeApp(accessKey, appLcmId, true, IS_SEF_AVAILABLE);

            // Delete the First App
            appDeletion.deleteAppACMR(accessKey, appLcmId, true, IS_SEF_AVAILABLE);
         }catch(error)
            {
            console.error('test failure occured in functionale2eFlowACM_R Parallel :', error);
        }
    });
}

export function bur_testing(accessKey=undefined, appArray=[]) {
    /*
    Manage backup:
        actions: create, delete, restore
        eg.: burTesting.manageBackup("delete");

    Generic wait for function:
        - targetValues: This is the value, or list of values we are waiting for
        - fetchFunction: The function that returns the value, list of values we are waiting for the target value to appear
        - fetchParam: [OPTIONAL] defaulting to false, if the fetch function has args for calling, can define < ToDo
        - keyPath: defaulting to false, if the return value from the fetch function is a JSON this is mandatory, this is the key for values
        - notExpected: defaulting to false, this is to negate the wait for expression, will wait till the value is in the results
        eg.: waitFor(finalStates, burTesting.getBackup, backupId, 'status');

    */
    describe('Backup and Restore testing', () => {
        // Locals.
        let backups;
        let backupId;
        let status_response;
        let actionId;
        let restore_process;
        const finalStates = ['CORRUPTED', 'COMPLETE'];

        // Precheck.
        //   Checking if there is any ongoing operation in progress that might fail the test.
        waitFor('actionId', burTesting.getStatus, false, 'ongoingAction', true);

        backups = burTesting.listBackups();

        // Checking if there is a backup already with this name, and deletes if there is.
        consoleInfo(`DELETING EXISTING TEST BACKUPS`);
        let len = backups["backups"].length;

        for (var i = 0; i < len; i++) {
            let row = backups["backups"][i];

            if (row["name"] === appMgrConstants.APP_MGR_BACKUP_NAME) {
                burTesting.manageBackup("delete");
                waitFor(appMgrConstants.APP_MGR_BACKUP_NAME, burTesting.listBackups, false, false, true);
                break;
            }
        }

        // Creating the 1st backup for testing.
        consoleInfo(`CREATE BACKUP!`);
        burTesting.manageBackup("create");
        sleep(1); // For some reason the BUR orchestrator is slow, if we don't wait here, the request is lost!
        consoleInfo(`WAITING - Backup to appear as a task in the BUR Orchestrator.`);
        waitFor(appMgrConstants.APP_MGR_BACKUP_NAME, burTesting.listBackups);
        backups = burTesting.listBackups();
        for (var i = 0; i < len; i++) {
            let row = backups["backups"][i];
            if (row["name"] === appMgrConstants.APP_MGR_BACKUP_NAME) {
                backupId = row["id"];
            }
        }

        consoleInfo(`WAITING - Status of backup to complete.`);
        // Waiting for the INCOMPLETE status to disappear first, to be able to check for COMPLETE as its a substring.
        waitFor('INCOMPLETE', burTesting.getBackup, backupId, 'status', true);
        waitFor(finalStates, burTesting.getBackup, backupId, 'status');

        // Deleting apps via the LCM APIs
        if (appArray.length > 0) {
            consoleInfo(`Disabling and Deleting Apps.`);
        }
        for (let i = 0; i < appArray.length; i++) {
            const appID = appArray[i];
            appOnboarding.enableDisableApp(accessKey, appID, appMgrConstants.appModes.disabled);
            appDeletion.deleteApp(accessKey, appID, appMgrConstants.deleteOperationType.with);
        }

        // Making sure no ongoing action is present before triggering Restore, making sure we aint waiting for the wrong action.
        waitFor('actionId', burTesting.getStatus, false, 'ongoingAction', true);

        // Triggering Restore, and monitoring if it appeard as an action.
        burTesting.manageBackup("restore");

        waitFor('actionId', burTesting.getStatus, false, 'ongoingAction');

        status_response = burTesting.getStatus();
        actionId = status_response['ongoingAction']['actionId'];
        consoleInfo(`Restore's Process ID: ${JSON.stringify(actionId)}`);
        restore_process = burTesting.getActionByID(actionId);
        consoleInfo(`Restore's Status: ${JSON.stringify(restore_process['state'])}`);

        consoleInfo(`WAITING - Status of restore to complete.`);
        waitFor('RUNNING', burTesting.getActionByID, actionId, 'state', true);
        waitFor('FINISHED', burTesting.getActionByID, actionId, 'state');

        consoleInfo(`Restore completed.`);
        restore_process = burTesting.getActionByID(actionId);
        consoleInfo(`Restore's Status: ${JSON.stringify(restore_process['state'])}`);
    });
}

export function parallel_onboarding(data) {
    describe('SEF -- Parallel -- Non-ACMR', () => {
        let csarFileName = __ENV.CSAR_FILE_NAME;
        let IS_SEF_AVAILABLE = true;

        // Setting URLs and Tokens based on SEF on/off.
        let { jSessionId, sefToken } = data;

        jSessionId = IS_SEF_AVAILABLE ? jSessionId : keyCloakApis.authorize();

        let accessKey = IS_SEF_AVAILABLE ? sefToken : jSessionId;
        appOnboarding.onboardApp(accessKey, csarFileName,  __ENV.CALCULATE_METRIC, false, IS_SEF_AVAILABLE);
    });
}

export function parallel_enable(data) {
    describe('SEF -- Parallel -- Non-ACMR', () => {
        let { jSessionId, sefToken } = data;
        let IS_SEF_AVAILABLE = true;
        let accessKey = IS_SEF_AVAILABLE ? sefToken : jSessionId;
        let appIds = getAppIds(accessKey, exec.instance.vusActive, IS_SEF_AVAILABLE);
        appOnboarding.parallelEnableDisable(accessKey, appIds[scenario.iterationInTest], __ENV.MODE, IS_SEF_AVAILABLE);
    });
}

export function parallel_app_instantiation(data) {
    describe('SEF -- Parallel -- Non-ACMR', () => {
        let { jSessionId, sefToken } = data;
        let IS_SEF_AVAILABLE = true;
        let accessKey = IS_SEF_AVAILABLE ? sefToken : jSessionId;
        let appIds = getAppIds(accessKey, exec.instance.vusActive, IS_SEF_AVAILABLE);
        instantiation.parallelInstantiation(accessKey, appIds[scenario.iterationInTest], IS_SEF_AVAILABLE);
        if (appOnboarding.isKeyCloakVerificationRequired(accessKey, appIds[scenario.iterationInTest], IS_SEF_AVAILABLE)) {
            keyCloakApis.validateKeyCloakResources(accessKey, appIds[scenario.iterationInTest], IS_SEF_AVAILABLE);
        }
    });
}

export function parallel_instance_termination(data) {
    describe('SEF -- Parallel -- Non-ACMR', () => {
        let requestUrl;
        let { jSessionId, sefToken } = data;
        let IS_SEF_AVAILABLE = true;
        let accessKey = IS_SEF_AVAILABLE ? sefToken : jSessionId;

        if (IS_SEF_AVAILABLE) {
            requestUrl = appMgrConstants.APPMGR_URL + appMgrConstants.APP_LCM_PATH + 'app-instances';
        }
        else
        {
            requestUrl = appMgrConstants.LEGACY_URL + appMgrConstants.APP_LCM_PATH + 'app-instances';
        }

        let instanceIdsMap = instantiation.getAppInstanceIds(accessKey, requestUrl, IS_SEF_AVAILABLE);
        let count = 0;
        for (let [instanceId, appId] of instanceIdsMap) {
            if (count >= 3) {
                break;
            }
            if (scenario.iterationInTest === count) {
                appInstantiation.appTermination(accessKey, instanceId, IS_SEF_AVAILABLE);
                appOnboarding.checkState(accessKey, 'TERMINATED', 'Termination', instanceId, false, undefined, false, IS_SEF_AVAILABLE)
                if (appOnboarding.isKeyCloakVerificationRequired(accessKey, appId, IS_SEF_AVAILABLE)) {
                    consoleDebug(`Removing Kafka Resource for appid ${appId}`)
                    keyCloakApis.checkIfResourcesRemoved(appId);
                }
            }
            count++;
        }
    });
}

export function parallel_app_instantiation_delete(data) {
    describe('SEF -- Parallel -- Non-ACMR', () => {
        let requestUrl;

        let { jSessionId, sefToken } = data;
        let IS_SEF_AVAILABLE = true;
        let accessKey = IS_SEF_AVAILABLE ? sefToken : jSessionId;


        if (IS_SEF_AVAILABLE) {
            requestUrl = appMgrConstants.APPMGR_URL + appMgrConstants.APP_LCM_PATH + 'app-instances';
        }
        else
        {
            requestUrl = appMgrConstants.LEGACY_URL + appMgrConstants.APP_LCM_PATH + 'app-instances';
        }
        let instanceIdsMap = instantiation.getAppInstanceIds(accessKey, requestUrl, IS_SEF_AVAILABLE);
        let count = 0;
        for (let [key, appId] of instanceIdsMap) {
            if (count >= 3) {
                break;
            }
            if (scenario.iterationInTest === count) {
                appInstanceDeletion.deleteAppInstance(accessKey, appId, key, IS_SEF_AVAILABLE);
            }
            count++;
        }
    });
}

export function parallel_disable_app(data) {
    describe('SEF -- Parallel -- Non-ACMR', () => {
        let requestUrl;

        let { jSessionId, sefToken } = data;
        let IS_SEF_AVAILABLE = true;
        let accessKey = IS_SEF_AVAILABLE ? sefToken : jSessionId;

        if (IS_SEF_AVAILABLE) {
            requestUrl = appMgrConstants.APPMGR_URL + appMgrConstants.APP_ONBOARDING_PATH + 'apps';
        }
        else
        {
            requestUrl = appMgrConstants.LEGACY_URL + appMgrConstants.APP_ONBOARDING_PATH + 'apps';
        }

        let appIds = appOnboarding.getAppIds(accessKey, requestUrl, exec.instance.vusActive, IS_SEF_AVAILABLE);
        let appId = appIds[scenario.iterationInTest];
        appOnboarding.parallelEnableDisable(accessKey, appId, appMgrConstants.appModes.disabled, IS_SEF_AVAILABLE);
    });
}

export function parallelAppDeletionFlow(data) {
    describe('SEF -- Parallel -- Non-ACMR', () => {
        let requestUrl;

        let { jSessionId, sefToken } = data;
        let IS_SEF_AVAILABLE = true;
        let accessKey = IS_SEF_AVAILABLE ? sefToken : jSessionId;

        if (IS_SEF_AVAILABLE) {
            requestUrl = appMgrConstants.APPMGR_URL + appMgrConstants.APP_ONBOARDING_PATH + 'apps';
        }
        else
        {
            requestUrl = appMgrConstants.LEGACY_URL + appMgrConstants.APP_ONBOARDING_PATH + 'apps';
        }

        let appIds = appOnboarding.getAppIds(accessKey, requestUrl, exec.instance.vusActive, IS_SEF_AVAILABLE);
        let appId = appIds[scenario.iterationInTest];
        appDeletion.deleteApp(accessKey, appId, appMgrConstants.deleteOperationType.without, undefined, IS_SEF_AVAILABLE);
    });
}

function instanceUpgrade(accessKey, instanceId, appId, IS_SEF_AVAILABLE) {
    appInstantiation.upgradeApp(accessKey, instanceId, appId, IS_SEF_AVAILABLE);
    appOnboarding.checkState(accessKey, 'INSTANTIATED', 'UpgradeApp', instanceId, false, undefined, false, IS_SEF_AVAILABLE);
}

function getAppIds(accessKey, numberOfApps, IS_SEF_AVAILABLE) {
    let requestUrl;
    if (IS_SEF_AVAILABLE) {
        requestUrl = appMgrConstants.APPMGR_URL + appMgrConstants.APP_ONBOARDING_PATH + 'apps';
    }
    else
    {
        requestUrl = appMgrConstants.LEGACY_URL + appMgrConstants.APP_ONBOARDING_PATH + 'apps';
    }
    return appOnboarding.getAppIds(accessKey, requestUrl, numberOfApps, IS_SEF_AVAILABLE);
}

export function handleSummary(data) {
    return {
        '/reports/K6_Test_Report.html': htmlReport(data),
        '/reports/summary.json': JSON.stringify(data),
        stdout: textSummary(data, {
            indent: ' ',
            enableColors: true
        }),
    };
}

export function SEF_ACM_R_Parallel(data) {
    describe('SEF -- Parallel -- ACMR', () => {
        let accessKey;
        let appOnboardingId;
        let appLcmId;
        let appInstanceId;

        // Turning SEF off, ACMR does not work with SEF just yet.
        //let IS_SEF_AVAILABLE = false;
        let IS_SEF_AVAILABLE = true;

        // Setting URLs and Tokens based on SEF on/off
        let { jSessionId, sefToken, randomStringNamespace} = data;

        accessKey = IS_SEF_AVAILABLE ? sefToken : jSessionId;

        // Onboarding the First CSAR
        appOnboardingId = appOnboarding.onboardApp(accessKey, appMgrConstants.vuToCsarMapping[exec.scenario.iterationInInstance + 1].name, true, true, IS_SEF_AVAILABLE);

        appLcmId = appOnboarding.getAppByID(accessKey, appOnboardingId);

        // Delete Onboarding Job for the Onboarding of the First CSAR
        appOnboarding.deleteAppOnboardingJob(accessKey, appOnboardingId,);

        // Initialize the First App
        appInitialize.initializeApp(accessKey, appLcmId, true, IS_SEF_AVAILABLE);

        // Enable the First App
        appInitialize.enableMode(accessKey, appLcmId, true);

        // Create Instance for the First App
        appInstanceId = appInstance.CreateAppInstance(accessKey, appLcmId, true);

        // deploy the app Instance with defined namespace
        appInstance.DeployAppInstanceInOtherNamespace(accessKey, appInstanceId, true, randomStringNamespace)

        // Undeploy the app Instance without defined namespace
        appInstance.UndeployAppInstance(accessKey, appInstanceId, true);

        // Deploy First App Instance
        appInstance.DeployAppInstance(accessKey, appInstanceId, true);

        // Undeploy the First App Instance
        appInstance.UndeployAppInstance(accessKey, appInstanceId, true);

        // Delete the Instance Artifacts for First App
        appInstance.DeleteAppInstance(accessKey,appInstanceId, true);

        // Disable the First App
        appInitialize.disableMode(accessKey, appLcmId, true);

        // Deinitialize the First App
        appInitialize.deinitializeApp(accessKey, appLcmId, true, IS_SEF_AVAILABLE);

        // Delete the First App
        appDeletion.deleteAppACMR(accessKey, appLcmId, true, IS_SEF_AVAILABLE);
    });
}
