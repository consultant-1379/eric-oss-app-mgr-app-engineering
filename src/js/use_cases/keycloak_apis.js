import *  as appMgrConstants from "../modules/app_constants.js";
import * as appMgrPayload from "../modules/app_payload.js";
import { consoleDebug, pause, consoleInfo } from "../modules/common_functions.js";
import { check, encode, group } from 'k6';
import http from 'k6/http';
import { expect, describe } from "../jslib/k6chaijs_4.3.4.3.js";
import * as appCommons from "../modules/common_functions.js";

export function authorize(userName = null, userPass = null) {
  let session_cookie, ro;

  if (userName === null){
    userName = appMgrConstants.TESTWARE_USER
  }
  if (userPass === null){
    userPass = appMgrConstants.TESTWARE_PASSWORD
  }

  ro = new appCommons.RequestObject();

  ro.url = appMgrConstants.LEGACY_URL + appMgrConstants.AUTH_PATH;

  ro.header.add('application/json');
  ro.header.add(userName, 'X-Login');
  ro.header.add(userPass, 'X-password')

  ro.post();

  expect(ro.response.status, 'response status').to.equal(200);
  expect(ro.response).to.have.validJsonBody()

  for (const name in ro.response.cookies) {
    session_cookie = appCommons.logCookie(ro.response.cookies[name][0]);
  }

  return session_cookie;
}

export function authorizeKeyCloak() {
  // Logging in with kcadmin to manage testware users, clients, roles, etc.
  let accessToken, ro;

  ro = new appCommons.RequestObject();

  ro.url = appMgrConstants.KEYCLOAK_URL + appMgrConstants.KEYCLOAK_AUTH_URL;

  ro.header.add('application/x-www-form-urlencoded')

  ro.payload.add({"grant_type":"password"});
  ro.payload.add({"username": appMgrConstants.APP_MGR_USERNAME});
  ro.payload.add({"password": appMgrConstants.APP_MGR_PASSWORD});
  ro.payload.add({"client_id":"admin-cli"});

  ro.post();
  accessToken = ro.response.json().access_token;
  expect(ro.response.status, 'response status').to.equal(200);
  expect(ro.response).to.have.validJsonBody()

  return 'Bearer ' + accessToken;
}

export function getAllKeyCloakClients(accessToken) {
    consoleInfo(`Fetching All Clients from Keycloak ${accessToken}`);
    let ro;

    ro = new appCommons.RequestObject();

    ro.url = `${appMgrConstants.KEYCLOAK_URL + appMgrConstants.KEYCLOAK_ADMIN_URL}/clients`;

    ro.header.add('application/json');
    ro.header.add(accessToken);

    ro.get()

    expect(ro.response.status, 'KeyClock GetAll Apps response status').to.equal(200);
    return ro.response;
}

export function checkIfResourcesRemoved(id) {
    let accessToken = authorizeKeyCloak();
    let isDeleted = true;
    let count = 0;
    let keyCloak_response;
    group(`Validating Keycloak resources Removal for Id: ${id}`, function () {
        do {
            count++;
            keyCloak_response = getAllKeyCloakClients(accessToken);
            try {
                keyCloak_response.json().forEach(app => {
                    if (JSON.stringify(app).toLowerCase().includes("\"clientid\":\"rappid--" + id)) {
                        isDeleted = false;
                        consoleDebug(`KeyCloak Api Call ${count}`);
                    } else {
                        isDeleted = true;
                        throw 'Break';
                    }
                });
                pause(10);
            } catch (e) {
                if (e !== 'Break') throw e;
            }
            consoleDebug(`KeyCloak resources Deleted: ${isDeleted}`);
        } while (count !== 10 && !isDeleted);
        expect(true, 'rApp Client removed').to.equal(isDeleted);
    });
}

export function validateKeyCloakResources(accessKey, appId, IS_SEF_AVAILABLE) {
    let accessToken;
    let keyCloak_response;
    let isFound = false;
    group(`Validating Keycloak resources Creation for Id: ${appId}`, function () {
        if (IS_SEF_AVAILABLE) {
            accessToken = accessKey;
        }else{
            accessToken = authorizeKeyCloak();
        }
        consoleInfo(`Validating Keycloak resources for AppId: ${appId}`);
        keyCloak_response = getAllKeyCloakClients(accessToken);

        keyCloak_response.json().forEach(app => {
            if (JSON.stringify(app).toLowerCase().includes("\"clientid\":\"rappid--" + appId)) {
                isFound = true;
            }
        });
        consoleDebug(`KeyCloak resources Found: ${isFound}`);
        expect(true, 'rApp Client resource created').to.equal(isFound);
    });
}

export function createTestwareUser(keycloakToken, userName = null){
  let response, ro;

  ro = new appCommons.RequestObject();

  ro.url = `${appMgrConstants.KEYCLOAK_URL + appMgrConstants.KEYCLOAK_ADMIN_URL}/users`;

  ro.header.add(keycloakToken);
  ro.header.add('application/json');
  ro.header.add('*/*', 'Accept');

  ro.payload.add((userName === null) ? {'username': `${appMgrConstants.TESTWARE_USER}`}:{'username': `${userName}`});
  ro.payload.add({
    "email":"",
    "firstName":"",
    "lastName":"",
    "requiredActions":[],
    "emailVerified":false,
    "groups":[],
    "enabled":true
  });

  response = ro.post();
  // accepted: 409, 201
  check(response, {
    'is 201 or 409': (r) => r.status === 201 || r.status === 409,
  });
  expect(response).to.have.validJsonBody();
}

export function resetTestwareUserPassword(keycloakToken, userId){
  let response, ro;

  ro = new appCommons.RequestObject();

  ro.url = `${appMgrConstants.KEYCLOAK_URL + appMgrConstants.KEYCLOAK_ADMIN_URL}/users/${userId}/reset-password`;

  ro.header.add(keycloakToken);
  ro.header.add('application/json');
  ro.header.add('*/*', 'Accept');

  ro.payload.add({
    'temporary': 'false',
    'type': 'password',
    'value': `${appMgrConstants.TESTWARE_PASSWORD}`
  });

  response = ro.put();
  // accepted: 400, 204
  check(response, {
    'is 204 or 400': (r) => r.status === 204 || r.status === 400,
  });
}

export function createKeycloakClient(keycloakToken, clientName = null){
  let response, ro;

  ro = new appCommons.RequestObject();

  ro.url = `${appMgrConstants.KEYCLOAK_URL + appMgrConstants.KEYCLOAK_ADMIN_URL}/clients`;

  ro.header.add(keycloakToken);
  ro.header.add('application/json');

  ro.payload.add(appMgrPayload.KEYCLOAK_CLIENT_CREATION_BODY);
  if (clientName !== null){
    ro.payload.add({'clientId': clientName})
  }

  response = ro.post();
  // accepted: 409, 201
  check(response, {
      'is 201 or 409': (r) => r.status === 201 || r.status === 409,
  });
}

export function getTestwareUserId(keycloakToken, userName = null){
    let clientId, response, ro;
    ro = new appCommons.RequestObject();
    if (userName === null){
      userName = appMgrConstants.TESTWARE_USER;
    }
    ro.url = `${appMgrConstants.KEYCLOAK_URL + appMgrConstants.KEYCLOAK_ADMIN_URL}/users`;

    ro.header.add(keycloakToken);
    ro.header.add('application/x-www-form-urlencoded');
    ro.header.add('*/*', 'Accept');

    response = ro.get();
    expect(response.status, 'response status').to.equal(200);
    expect(response).to.have.validJsonBody();

    response.json().forEach(item => {
      if (item.username === userName) {
            clientId = item.id;
        }
    });
    return clientId;
  }

export function getTestwareClientId(keycloakToken, clientName = null){
    let clientId, response, ro;

    ro = new appCommons.RequestObject();

    if (clientName === null){
      clientName = appMgrConstants.TESTWARE_CLIENT_NAME;
    }
    ro.url = `${appMgrConstants.KEYCLOAK_URL + appMgrConstants.KEYCLOAK_ADMIN_URL}/clients?clientId=${clientName}`;

    ro.header.add(keycloakToken);
    ro.header.add('application/x-www-form-urlencoded');
    ro.header.add('*/*', 'Accept');

    response = ro.get();
    expect(response.status, 'response status').to.equal(200);
    expect(response).to.have.validJsonBody();
    clientId = JSON.parse(response.body)[0].id;
    return clientId;
  }

export function authViaSEF(clientSecret, keycloakToken, clientName = null){
    let ro;

    if (clientName === null){
      clientName = appMgrConstants.TESTWARE_CLIENT_NAME;
    }

    ro = new appCommons.RequestObject();

    ro.url = `${appMgrConstants.KEYCLOAK_URL + appMgrConstants.KEYCLOAK_AUTH_URL}`;

    ro.header.add(keycloakToken);
    ro.header.add('application/x-www-form-urlencoded');

    ro.payload.add({
      'grant_type':'client_credentials',
      'client_secret': clientSecret,
      'client_id': clientName
    });

    ro.post();

    expect(ro.response.status, 'response status').to.equal(200);
    expect(ro.response).to.have.validJsonBody();
    return `Bearer ${ro.response.json().access_token}`;
  }

export function setKeycloakTokenDuration(keycloakToken){
        // Setting KC token duration. Normal token duration is 300 seconds (5 minutes)
        let ro;

        ro = new appCommons.RequestObject();

        ro.url = `${appMgrConstants.KEYCLOAK_URL + appMgrConstants.KEYCLOAK_ADMIN_URL}`;

        ro.header.add(keycloakToken);
        ro.header.add('application/json');
        ro.header.add('*/*', 'Accept');

        ro.payload.add({'accessTokenLifespan': `${appMgrConstants.KEYCLOAK_TOKEN_LIFESPAN}`});

        ro.put();
        expect(ro.response.status, 'response status').to.equal(204);
        expect(ro.response).to.have.validJsonBody();
  }

// NOTE! App LCM does the rApp client creation after instantiation!!!! (Thus no need to have a createAppClientId function)

export function getrAppClientId(keycloakToken, appId){
    // ONLY USABLE AFTER APP LCM CREATED THE RAPP CLIENT! (INSTANTIATION)
    const url = `${appMgrConstants.KEYCLOAK_URL + appMgrConstants.KEYCLOAK_ADMIN_URL}/clients?clientId=rappid--${appId}`;
    const headers = {
      'Authorization': `${keycloakToken}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': {},
      'Accept': "*/*",
    };
    const response = http.get(url, { headers });
    expect(response.status, 'response status').to.equal(200);
    expect(response).to.have.validJsonBody();
    const clientId = JSON.parse(response.body)[0].id;
    return clientId;
  }

export function getrKeycloakClientList(keycloakToken){
    // ONLY USABLE AFTER APP LCM CREATED THE RAPP CLIENT! (INSTANTIATION)
    const url = `${appMgrConstants.KEYCLOAK_URL + appMgrConstants.KEYCLOAK_ADMIN_URL}/clients?clientId=rappid--${appId}`;
    const headers = {
        'Authorization': `${keycloakToken}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': {},
        'Accept': "*/*",
    };
    const response = http.get(url, { headers });
    expect(response.status, 'response status').to.equal(200);
    expect(response).to.have.validJsonBody();
    const clientId = JSON.parse(response.body)[0].id;
    return clientId;
}

export function getServiceRolesId(keycloakToken, clientId){
    let ro;

    ro = new appCommons.RequestObject();

    ro.url = `${appMgrConstants.KEYCLOAK_URL + appMgrConstants.KEYCLOAK_ADMIN_URL}/clients/${clientId}/service-account-user`;

    ro.header.add(keycloakToken);
    ro.header.add('application/x-www-form-urlencoded');
    ro.header.add('*/*', 'Accept');

    ro.get()

    expect(ro.response.status, 'response status').to.equal(200);
    expect(ro.response).to.have.validJsonBody();
    return JSON.parse(ro.response.body).id;
}

export function getServiceRolesIdList(keycloakToken, serviceRolesId){
    let rolesWithIds, serviceRoleIdList, ro;

    ro = new appCommons.RequestObject();
    ro.url = `${appMgrConstants.KEYCLOAK_URL + appMgrConstants.KEYCLOAK_ADMIN_URL}/users/${serviceRolesId}/role-mappings/realm/available`;

    ro.header.add(keycloakToken);
    ro.header.add('application/x-www-form-urlencoded');
    ro.header.add('*/*', 'Accept');

    ro.get()
    expect(ro.response.status, 'response status').to.equal(200);
    expect(ro.response).to.have.validJsonBody();
    serviceRoleIdList = JSON.parse(ro.response.body);

    // Fetch the roles by name, and get their IDs so we can attach them to our clients
    // If the role is not available it will skip
    rolesWithIds = appMgrConstants.CLIENT_ROLES.filter(role => {
        if (serviceRoleIdList.find(roleId => roleId.name === role) == null) {
          return false; // skip
        }
        return true;
      }).map(role => {
        const id = serviceRoleIdList.find(roleId => roleId.name === role).id;
        const name = role;
        return {
          id,
          name
        }
      });

    return rolesWithIds;
  }

  export function getRolesAssignedToUserIdList(keycloakToken, userId){
    let rolesWithIds, userRoleIdList, response, ro;

    ro = new appCommons.RequestObject();
    ro.url = `${appMgrConstants.KEYCLOAK_URL + appMgrConstants.KEYCLOAK_ADMIN_URL}/users/${userId}/role-mappings`;

    ro.header.add(keycloakToken);
    ro.header.add('application/x-www-form-urlencoded');
    ro.header.add('*/*', 'Accept');

    response = ro.get()
    expect(response.status, 'response status').to.equal(200);
    expect(response).to.have.validJsonBody();
    userRoleIdList = JSON.parse(response.body);

    // Fetch the roles by name, and get their IDs
    // Filtering to only the AppMgr roles, we are not mapping any other role not present in the dict
    // If the role is not available it will skip
    userRoleIdList = userRoleIdList['realmMappings'];
    rolesWithIds = appMgrConstants.CLIENT_ROLES.filter(role => {
        if (userRoleIdList.find(roleId => roleId.name === role) == null) {
          return false; // skip
        }
        return true;
      }).map(role => {
        const id = userRoleIdList.find(roleId => roleId.name === role).id;
        const name = role;
        return {
          id,
          name
        }
      });

    return rolesWithIds;
  }

  export function getMasterRoles(keycloakToken){
    let masterRoles, ro;

    ro = new appCommons.RequestObject();

    ro.url = `${appMgrConstants.KEYCLOAK_URL + appMgrConstants.KEYCLOAK_ADMIN_URL}/roles`;

    ro.header.add(keycloakToken);
    ro.header.add('application/x-www-form-urlencoded');
    ro.header.add('*/*', 'Accept');

    ro.get()
    expect(ro.response.status, 'response status').to.equal(200);
    expect(ro.response).to.have.validJsonBody();

    // Extract names from response body into an array
    masterRoles = JSON.parse(ro.response.body).map(role => role.name) ;
    return masterRoles;
}


  export function validateRoleNames(masterRolesList, validRoleNames) {

    // Check if every role name in validRoleNames is present in masterRolesList
    return validRoleNames.every(roleName => masterRolesList.includes(roleName));

  }

  export function setServiceRoles(keycloakToken, serviceRolesId, role){
    let result, response, ro;

    ro = new appCommons.RequestObject();

    ro.url = `${appMgrConstants.KEYCLOAK_URL + appMgrConstants.KEYCLOAK_ADMIN_URL}/users/${serviceRolesId}/role-mappings/realm/`;

    ro.header.add(keycloakToken);
    ro.header.add('application/json');
    ro.header.add('*/*', 'Accept');

    ro.payload.add(role);

    response = ro.post();

    result = check(response, {
      [`Set role ${role.name} on Keycloak status should be 204`]: () => response.status === 204
    });
    if (!result) logger(`Set role ${role.name} on Keycloak FAILED`, response)
  }

  export function fetchClientSecret(clientId, keycloakToken){
    let clientSecret, ro;

    ro =new appCommons.RequestObject();

    ro.url = `${appMgrConstants.KEYCLOAK_URL + appMgrConstants.KEYCLOAK_ADMIN_URL}/clients/${clientId}/client-secret`;

    ro.header.add(keycloakToken);
    ro.header.add('application/json');
    ro.header.add('*/*', 'Accept')

    ro.payload.add('');

    ro.post();
    expect(ro.response.status, 'response status').to.equal(200);
    expect(ro.response).to.have.validJsonBody();

    clientSecret = JSON.parse(ro.response.body).value;
    return clientSecret;
  }

  export function getKeycloakTokenSecret(clientSecret, appId){
    const url = `${appMgrConstants.KEYCLOAK_URL + appMgrConstants.KEYCLOAK_AUTH_URL}`;
    const body = {
      'client_id': `rappid--${appId}`,
      'client_secret': clientSecret,
      "tenant": 'master',
      "grant_type": 'client_credentials'
    };
    const headers = {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': '*/*',
    };
    const response = http.post(url, body, { headers });
    expect(response.status, 'response status').to.equal(200);
    expect(response).to.have.validJsonBody();
    const accessToken = JSON.parse(response.body).access_token;
    return `Bearer ${accessToken}`;
  }