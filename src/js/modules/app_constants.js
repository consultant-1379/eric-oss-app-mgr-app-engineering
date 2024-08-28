// From Env.
const hostNameUrl = `${__ENV.hostname_url}`;
const keyCloakUrl = `${__ENV.keycloak_url}`;
export const APP_MGR_USERNAME = `${__ENV.appmgr_user}`;
export const APP_MGR_PASSWORD = `${__ENV.appmgr_pass}`;
export const TESTWARE_USER = 'testware-user'
export const TESTWARE_PASSWORD = `${APP_MGR_PASSWORD}`

// App Manager Variables.
export const APP_MGR_BACKUP_NAME = 'AppMgrTestBackup123';
export const TESTWARE_CLIENT_NAME = 'K6Testware-Client';
export const CLIENT_NAME_ROLE_TEST_APPS = 'K6Testware-Client-Role-Test-Apps';
export const CLIENT_NAME_ROLE_TEST_APP_INSTANCES = 'K6Testware-Client-Role-Test-App-Instances';
export const CLIENT_NAME_ROLE_TEST_APP_ONBOARDING_JOB = 'K6Testware-Client-Role-Test-App-Onboarding-Job';

export const APP_READONLY_ROLE = 'AppMgr_App_Application_ReadOnly';
export const APP_INSTANCES_READONLY_ROLE = 'AppMgr_AppInstance_Application_ReadOnly';
export const APP_ONBOARDING_JOB_READONLY_ROLE = 'AppMgr_AppOnboardingJob_Application_ReadOnly';
export const CLIENT_ROLES = [
    'AppMgrAdmin', // v1 endpoint Admin
    'AppMgrOperator', // endpoint v1 Operator
    'AppMgr_Application_Administrator', // v2, v3 endpoint Admin
    'AppMgr_Application_Operator', // v2, v3 endpoint Operator
    'System_SecurityAdministrator', // to be able to set token duration, not an AppMgr role
    'AppMgr_App_Application_ReadOnly',
    'AppMgr_AppInstance_Application_ReadOnly',
    'AppMgr_AppOnboardingJob_Application_ReadOnly',
    'AppMgr_LogViewer_Application_TroubleShooter'
]

export const appModes = { disabled: 'DISABLED', enabled: 'ENABLED' };
export const deleteOperationType = { with: 'with', without: 'without' };

export const testwareHelperMessage = 'The request that is to be sent to EIAP to'
    + ' upload CSAR file will be issued via webserver running in testware-helper-sidecar '
    + 'container (due to k6 limitations - see logs for that container '
    + 'for further details on the request that was issued towards EIAP and '
    + 'its associated response';

// Backend endpoints.
export const LEGACY_URL = hostNameUrl.includes("https://") ? hostNameUrl : `https://${hostNameUrl}`;
export const APPMGR_URL = keyCloakUrl.includes("https://") ? keyCloakUrl : `https://${keyCloakUrl}`; // on new env, both is eic.
export const KEYCLOAK_URL = keyCloakUrl.includes("https://") ? keyCloakUrl : `https://${keyCloakUrl}`;
export const BUR_URL = 'http://eric-ctrl-bro:7001'

// Backend routes.
export const AUTH_PATH = '/auth/v1';
export const APP_LCM_PATH = '/app-manager/lcm/app-lcm/v1/';
export const APP_ONBOARDING_PATH = '/app-manager/onboarding/v1/';
export const APP_ONBOARDING_PATH_ACM_R = '/app-onboarding/v2/onboarding-jobs';
export const APP_ONBOARDING_PATH_ACM_R_UPLOAD = '/app-onboarding/v2/app-packages';
export const APP_LCM_PATH_ACMR = '/app-lifecycle-management/v3/';
export const APP_LCM_PATH_ACMR_INSTANCES = '/app-lifecycle-management/v3/app-instances';
export const APP_HEALTH_CHECK = '/app-manager/onboarding/actuator/health';

export const BUR_TRIGGER_PATH = '/v1/backup-manager/DEFAULT/action';
export const BUR_GET_BACKUPS_PATH = '/v1/backup-manager/DEFAULT/backup';
export const BUR_HEALTH_CHECK = '/v1/health';

export const KEYCLOAK_AUTH_URL = '/auth/realms/master/protocol/openid-connect/token';
export const KEYCLOAK_ADMIN_URL = '/auth/admin/realms/master';

// Timeouts, Intervals.
export const APP_MGR_CSAR_UPLOAD_TIMEOUT_MINS = 10;
export const onboardingTimeoutMins = 40;
export const onboardingTimeoutSecs = onboardingTimeoutMins * 60;
export const initializeTimeoutSecs = 4 * 60;
export const instantiationTimeoutSecs = 6 * 60;
export const pollAppStateIntervalSecs = onboardingTimeoutMins;
export const appDeletionTimeoutInterval = 5;
export const appDeletionTimeoutSecs = appDeletionTimeoutInterval * 30;
export const pollAppDeletionIntervalSecs = appDeletionTimeoutInterval;
export const KEYCLOAK_TOKEN_LIFESPAN = 90 * 60; // 90 minutes

export const vuToCsarMapping = {
    1: { name: 'eric-oss-hello-world-med-load-deploy.csar' }, // this one is broken
    2: { name: 'eric-oss-5gcnr-medium-1.0.173-1.csar' },
    3: { name: 'eric-oss-5gcnr-large-1.1.149-1.csar'}, // Please change to PME
};

export const roleNamesList = [
    'AppMgr_App_Application_ReadOnly',
    'AppMgr_AppInstance_Application_ReadOnly',
    'AppMgr_AppOnboardingJob_Application_ReadOnly',
    'AppMgr_LogViewer_Application_TroubleShooter'
]

export const roleAccessDict = {
    'AppMgr_Application_Administrator': {
        'get': {
            ['/app-manager/onboarding/v1/apps'] : 200,
            ['/app-onboarding/v2/onboarding-jobs'] : 200,
            ['/app-onboarding/v2/onboarding-jobs/*'] :200,
            ['/app-lifecycle-management/v3/apps']: 200,
            ['/app-lifecycle-management/v3/apps/*'] :200,
            ['/app-lifecycle-management/v3/app-instances']: 200
        },
        'post': {
            ['/app-manager/onboarding/v1/']: 200,
            ['/app-onboarding/v2/app-packages']: 200,
            ['/app-manager/lcm/app-lcm/v1/']: 200,
            ['/app-lifecycle-management/v3/apps/*/initialization-actions']: 200,
            ['/app-lifecycle-management/v3/app-instances']: 200,
            ['/app-lifecycle-management/v3/app-instances/*/deployment-actions']: 200
        },
        'put': {
            ['/app-lifecycle-management/v3/apps/*/mode']: 200,
            ['/app-lifecycle-management/v3/app-instances/*/component-instances']: 200
        },
        'delete': {
            ['/app-onboarding/v2/onboarding-jobs']: 200,
            ['/app-manager/lcm/app-lcm/v1/']: 200,
            ['/app-lifecycle-management/v3/apps']: 200,
            ['/app-lifecycle-management/v3/app-instances']: 200
        }
    },
    'AppMgr_Application_Operator': {
        'get': {
            ['/app-manager/onboarding/v1/apps'] : 200,
            ['/app-onboarding/v2/onboarding-jobs'] : 200,
            ['/app-onboarding/v2/onboarding-jobs/*'] :200,
            ['/app-lifecycle-management/v3/apps']: 200,
            ['/app-lifecycle-management/v3/apps/*'] :200,
            ['/app-lifecycle-management/v3/app-instances']: 200
        },
        'post': {
            ['/app-manager/onboarding/v1/']: 407,
            ['/app-onboarding/v2/app-packages']: 407,
            ['/app-manager/lcm/app-lcm/v1/']: 200,
            ['/app-lifecycle-management/v3/apps/*/initialization-actions']: 407,
            ['/app-lifecycle-management/v3/app-instances']: 200,
            ['/app-lifecycle-management/v3/app-instances/*/deployment-actions']: 200
        },
        'put': {
            ['/app-lifecycle-management/v3/apps/*/mode']: 407,
            ['/app-lifecycle-management/v3/app-instances/*/component-instances']: 200
        },
        'delete': {
            ['/app-onboarding/v2/onboarding-jobs']: 407,
            ['/app-manager/lcm/app-lcm/v1/']: 200,
            ['/app-lifecycle-management/v3/apps']: 407,
            ['/app-lifecycle-management/v3/app-instances']: 200
        }
    },
    'AppMgr_App_Application_ReadOnly': {
        'get': {
            ['/app-manager/onboarding/v1/apps'] : 407,
            ['/app-onboarding/v2/onboarding-jobs'] : 407,
            ['/app-onboarding/v2/onboarding-jobs/*'] :407,
            ['/app-lifecycle-management/v3/apps']: 200,
            ['/app-lifecycle-management/v3/apps/*'] :200,
            ['/app-lifecycle-management/v3/app-instances']: 407
        },
        'post': {
            ['/app-manager/onboarding/v1/']: 407,
            ['/app-onboarding/v2/app-packages']: 407,
            ['/app-manager/lcm/app-lcm/v1/']: 407,
            ['/app-lifecycle-management/v3/apps/*/initialization-actions']: 407,
            ['/app-lifecycle-management/v3/app-instances']: 407,
            ['/app-lifecycle-management/v3/app-instances/*/deployment-actions']: 407
        },
        'put': {
            ['/app-lifecycle-management/v3/apps/*/mode']: 407,
            ['/app-lifecycle-management/v3/app-instances/*/component-instances']: 407
        },
        'delete': {
            ['/app-onboarding/v2/onboarding-jobs']: 407,
            ['/app-manager/lcm/app-lcm/v1/']: 407,
            ['/app-lifecycle-management/v3/apps']: 407,
            ['/app-lifecycle-management/v3/app-instances']: 407
        }
    },
    'AppMgr_AppInstance_Application_ReadOnly': {
        'get': {
            ['/app-manager/onboarding/v1/apps'] : 407,
            ['/app-onboarding/v2/onboarding-jobs'] : 407,
            ['/app-onboarding/v2/onboarding-jobs/*'] :407,
            ['/app-lifecycle-management/v3/apps']: 407,
            ['/app-lifecycle-management/v3/apps/*'] :407,
            ['/app-lifecycle-management/v3/app-instances']: 200
        },
        'post': {
            ['/app-manager/onboarding/v1/']: 407,
            ['/app-onboarding/v2/app-packages']: 407,
            ['/app-manager/lcm/app-lcm/v1/']: 407,
            ['/app-lifecycle-management/v3/apps/*/initialization-actions']: 407,
            ['/app-lifecycle-management/v3/app-instances']: 407,
            ['/app-lifecycle-management/v3/app-instances/*/deployment-actions']: 407
        },
        'put': {
            ['/app-lifecycle-management/v3/apps/*/mode']: 407,
            ['/app-lifecycle-management/v3/app-instances/*/component-instances']: 407
        },
        'delete': {
            ['/app-onboarding/v2/onboarding-jobs']: 407,
            ['/app-manager/lcm/app-lcm/v1/']: 407,
            ['/app-lifecycle-management/v3/apps']: 407,
            ['/app-lifecycle-management/v3/app-instances']: 407
        }
    },
    'AppMgr_AppOnboardingJob_Application_ReadOnly': {
        'get': {
            ['/app-manager/onboarding/v1/apps'] : 407,
            ['/app-onboarding/v2/onboarding-jobs'] : 200,
            ['/app-onboarding/v2/onboarding-jobs/*'] :200,
            ['/app-lifecycle-management/v3/apps']: 407,
            ['/app-lifecycle-management/v3/apps/*'] :407,
            ['/app-lifecycle-management/v3/app-instances']: 407
        },
        'post': {
            ['/app-manager/onboarding/v1/']: 407,
            ['/app-onboarding/v2/app-packages']: 407,
            ['/app-manager/lcm/app-lcm/v1/']: 407,
            ['/app-lifecycle-management/v3/apps/*/initialization-actions']: 407,
            ['/app-lifecycle-management/v3/app-instances']: 407,
            ['/app-lifecycle-management/v3/app-instances/*/deployment-actions']: 407
        },
        'put': {
            ['/app-lifecycle-management/v3/apps/*/mode']: 407,
            ['/app-lifecycle-management/v3/app-instances/*/component-instances']: 407
        },
        'delete': {
            ['/app-onboarding/v2/onboarding-jobs']: 407,
            ['/app-manager/lcm/app-lcm/v1/']: 407,
            ['/app-lifecycle-management/v3/apps']: 407,
            ['/app-lifecycle-management/v3/app-instances']: 407
        }
    },
    'AppMgr_LogViewer_Application_TroubleShooter': {
        'get': {
            ['/app-manager/onboarding/v1/apps'] : 407,
            ['/app-onboarding/v2/onboarding-jobs'] : 407,
            ['/app-onboarding/v2/onboarding-jobs/*'] :407,
            ['/app-lifecycle-management/v3/apps']: 407,
            ['/app-lifecycle-management/v3/apps/*'] :407,
            ['/app-lifecycle-management/v3/app-instances']: 407
        },
        'post': {
            ['/app-manager/onboarding/v1/']: 407,
            ['/app-onboarding/v2/app-packages']: 407,
            ['/app-manager/lcm/app-lcm/v1/']: 407,
            ['/app-lifecycle-management/v3/apps/*/initialization-actions']: 407,
            ['/app-lifecycle-management/v3/app-instances']: 407,
            ['/app-lifecycle-management/v3/app-instances/*/deployment-actions']: 407
        },
        'put': {
            ['/app-lifecycle-management/v3/apps/*/mode']: 407,
            ['/app-lifecycle-management/v3/app-instances/*/component-instances']: 407
        },
        'delete': {
            ['/app-onboarding/v2/onboarding-jobs']: 407,
            ['/app-manager/lcm/app-lcm/v1/']: 407,
            ['/app-lifecycle-management/v3/apps']: 407,
            ['/app-lifecycle-management/v3/app-instances']: 407
        }
    }
}

export const ClientsAndRoles = {
    [CLIENT_NAME_ROLE_TEST_APPS] : [APP_READONLY_ROLE],
    [CLIENT_NAME_ROLE_TEST_APP_INSTANCES] : [APP_INSTANCES_READONLY_ROLE],
    [CLIENT_NAME_ROLE_TEST_APP_ONBOARDING_JOB] : [APP_ONBOARDING_JOB_READONLY_ROLE]
}

export const ClientsAndResources = {
    [CLIENT_NAME_ROLE_TEST_APPS] : [APP_LCM_PATH_ACMR] +'apps',
    [CLIENT_NAME_ROLE_TEST_APP_INSTANCES] : [APP_LCM_PATH_ACMR_INSTANCES],
    [CLIENT_NAME_ROLE_TEST_APP_ONBOARDING_JOB] : [APP_ONBOARDING_PATH_ACM_R]
}