import * as appMgrConstants from "./app_constants.js";

export const PARAMS_AUTH = {
    headers: {
        'Content-Type': 'application/json',
        'X-Login': appMgrConstants.TESTWARE_USER,
        'X-password': appMgrConstants.TESTWARE_PASSWORD,
    },
};

export const KEYCLOAK_AUTH_HEADER = {
    headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
    },
};

export const KEYCLOAK_CLIENT_CREATION_BODY =
{
    "protocol":"openid-connect",
    "clientId":appMgrConstants.TESTWARE_CLIENT_NAME,
    "name":"",
    "description":"",
    "publicClient":false,
    "authorizationServicesEnabled":false,
    "serviceAccountsEnabled":true,
    "implicitFlowEnabled":false,
    "directAccessGrantsEnabled":true,
    "standardFlowEnabled":true,
    "frontchannelLogout":true,
    "attributes":{
        "saml_idp_initiated_sso_url_name":"",
        "oauth2.device.authorization.grant.enabled":false,
        "oidc.ciba.grant.enabled":false
    },
    "alwaysDisplayInConsole":false,
    "rootUrl":"",
    "baseUrl":""
}
