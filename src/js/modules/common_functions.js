import {  sleep } from 'k6';
import exec from 'k6/execution';
import http from 'k6/http';
import encoding from 'k6/encoding';
import * as appMgrConstants from "./app_constants.js";
import * as keyCloakApis from '../use_cases/keycloak_apis.js';

export function logCookie(cookie) {
    return cookie.name + "=" + cookie.value
}
export function consoleDebug(...message) {
    const cMessages = `${message.join(', ')} :: Scenario: ${exec.scenario.name}`;
    console.debug(cMessages);
}
export function consoleInfo(...message) {
    const cMessages = `${message.join(', ')} :: Scenario: ${exec.scenario.name}`;
    console.log(cMessages);
}
export function pause(seconds) {
    sleep(seconds);
}

function extractValueFromJson(json, keyPath) {
    const keys = keyPath.split('.');
    let value = json;
    for (let key of keys) {
        value = value[key];
        if (value === undefined) {
            return undefined;
        }
    }
    return value;
}

function isJsonObject(input) {
    // There might be an already implemented check for this
    if (typeof input === 'string') {
        try {
            JSON.parse(input);
            return true;
        } catch (e) {
            return false;
        }
    } else if (input && typeof input === 'object') {
        try {
            JSON.stringify(input);
            return true;
        } catch (e) {
            return false;
        }
    }
    return false;
}

export function waitFor(targetValues, fetchFunction, keyPath = false, notExpected = false, interval = 2, timeout = 300) {
    // If targetValues is not an array, make it one for uniformity.
    if (!Array.isArray(targetValues)) {
        targetValues = [targetValues];
    }
    let elapsed = 0;
    // While the fetch function does not contain one of the target values
    while (elapsed < timeout) {
        try {
            let response;
            response = fetchFunction()

            if (isJsonObject(response)){
                if (keyPath !== false) {
                    response = extractValueFromJson(response, keyPath);
                }
                response = JSON.stringify(response)
            }
            for (const target of targetValues) {
                // Depending on the 'notExpected' flag, determine if the fetched value meets the criteria
                const conditionMet = notExpected
                ? !response.includes(target.toString())
                : response.includes(target.toString());
                if (conditionMet) {
                    return response;
                }
            }
        } catch (error) {
            ;
        }
        sleep(interval);
        elapsed += interval;
    }
    throw new Error('Timeout waiting for target values');
}

export class RequestObject {
    constructor() {
        this.headers = {};
        this.payloads = {};
        this.rawPayload = null;
        this._url = null;
        this.baseURLs = {
            "auth": undefined,
            "onboarding": undefined,
            "app-lcm": undefined,
            "app-lifecycle-management": undefined
        };
        this.response = null;
        this.defaultReturnCode = 200;

        // Encapsulations
        this.header = {
            add: (headerValue, headerKey) => this.addHeader(headerValue, headerKey),
            stringify: () => this.stringifyHeader(),
        };
        this.payload = {
            add: (data) => this.addPayload(data),
            stringify: () => this.stringifyPayload(),
        };
    }

    // Getter for URL
    get url() {
        return this._url;
    }

    // Setter for URL
    set url(url) {
        let domains = parseFQDN(url);
        let legacy_domain = parseFQDN(appMgrConstants.LEGACY_URL);
        let new_domain = parseFQDN(appMgrConstants.APPMGR_URL);

        // Check if at least one mandatory part is there
        if(domains.domain === null && domains.path === null){
            this._url = null;
            return
        }

        // Complement path with base URL guessing
        if (domains.path !== null && domains.domain === null){
            const category = domains.path.includes('auth') ? 'auth' : (domains.path.includes('onboarding') ? 'onboarding' : (domains.path.includes('app-lcm') ? 'app-lcm' : (domains.path.includes('app-lifecycle-management') ? 'app-lifecycle-management' : null)));

            if (category) {
                url = `${appMgrConstants.APPMGR_URL}${domains.path}`;
            } else {
                this._url = null;
                return
            }
        }

        if (this.headers.hasOwnProperty('Authorization') &&
            this.headers.Authorization !== null &&
            this.headers.Authorization.startsWith('Bearer')){
            if (domains.app === legacy_domain.app){
                url = `${domains.protocol}${new_domain.app}${domains.sub.replace(domains.app, '')}.${domains.domain}.${domains.top}${domains.path}`
            }
        }
        else if(this.headers.hasOwnProperty('Cookie') &&
                 this.headers.Cookie !== null &&
                 this.headers.Cookie.startsWith('JSESSIONID=')){
                    if (domains.app === new_domain.app){
                        url = `${domains.protocol}${legacy_domain.app}${domains.sub.replace(domains.app, '')}.${domains.domain}.${domains.top}${domains.path}`
                    }
        }
        else{

        }
        this._url = url;
    }

    // Method to add headers
    addHeader(headerValue, headerKey = null) {
        const newHeader = RequestObject.headerFactory(headerValue, headerKey);
        this.headers = Object.assign(this.headers, newHeader);
        this.url = this.url
    }

    // Method to display headers
    stringifyHeader() {
        return JSON.stringify(this.headers);
    }

    static headerFactory(headerValue, headerKey = null) {
            // If headerKey is provided, return a custom header
            if (headerKey) {
                return { [headerKey]: headerValue };
            }

            // Recognize common header templates
            const headerMap = {
                // Content types
                'application/': 'Content-Type', // Accept uses the same, that must be added manually
                // ...Other possible contents...
                'image/': 'Content-Type',
                'audio/': 'Content-Type',
                'multipart/': 'Content-Type',
                'text/': 'Content-Type',
                'video/': 'Content-Type',
                'message/': 'Content-Type',
                // Authentication types
                'Bearer ': 'Authorization',
                'JSESSIONID=': 'Cookie'
            };

            // Iterate over the headerMap to find a match
            for (const [template, header] of Object.entries(headerMap)) {
                if (headerValue.startsWith(template)) {
                    return { [header]: headerValue };
                }
            }
            // If no match is found, return an empty object
            return {};
    }

    // Payload builder function
    addPayload(data) {
        try{
            const contentType = this.headers['Content-Type'] || 'application/json';
            if ((contentType === 'application/json' || contentType === 'application/x-www-form-urlencoded')) {
                if (Array.isArray(data)){
                    this.rawPayload = JSON.stringify(data)
                }
                for (let key in data) {
                    if (data.hasOwnProperty(key)) {
                        this.payloads[key] = data[key];
                    }
                }
            } else if (contentType === 'text/plain') {
                if (this.rawPayload) {
                    this.rawPayload += ' ' + data;
                } else {
                    this.rawPayload = data;
                }
            } else {
                // For raw data or other content types, overwrite the previous payload
                this.rawPayload = data;
            }
        } catch (e) {
            this.rawPayload = data; // Failed to parse the payload, adding as is
        }
    }

    stringifyPayload() {
        const contentType = this.headers['Content-Type'] || 'application/json';

        if (contentType === 'application/json' && Object.keys(this.payloads).length !== 0 && this.rawPayload === null) {
            return JSON.stringify(this.payloads);
        } else if (contentType === 'application/x-www-form-urlencoded') {
            const urlEncodedData = [];
            for (let key in this.payloads) {
                if (this.payloads.hasOwnProperty(key)) {
                    urlEncodedData.push(encodeURIComponent(key) + '=' + encodeURIComponent(this.payloads[key]));
                }
            }
            return urlEncodedData.join('&');
        } else if (contentType === 'text/plain') {
            return this.rawPayload;
        } else {
            return '[Object object]';
        }
    }

    // Method to get the correct payload format based on content type
    payloadFactory() {
        const contentType = this.headers['Content-Type'] || 'application/json';
        if (contentType === 'application/json' && Object.keys(this.payloads).length !== 0 && this.rawPayload === null) {
            return JSON.stringify(this.payloads);
        }
        else if (contentType === 'application/x-www-form-urlencoded') {
            const urlEncodedData = [];
            for (let key in this.payloads) {
                if (this.payloads.hasOwnProperty(key)) {
                    urlEncodedData.push(encodeURIComponent(key) + '=' + encodeURIComponent(this.payloads[key]));
                }
            }
            return urlEncodedData.join('&');
        } else if (contentType === 'text/plain') {
            return this.rawPayload;
        } else {
            // Default raw data or any other content types
            return this.rawPayload;
        }
    }

    expected(toBeReplaced = null) {
        let domains, url, tokenDetails, accessToken, user_name, userId, rolesWithIds;
        let accessResults = [];
        // Making sure there is a URL to check for
        if (this._url === null){
            return null;
        }

        // We only set the expect if we can get the username. Only possible with Bearer tokens, so retruning otherwise
        if (this.headers.hasOwnProperty('Authorization') &&
        this.headers.Authorization !== null &&
        this.headers.Authorization.startsWith('Bearer')){
            accessToken = this.headers.Authorization.replace(`/Bearer `, '');
        }else{
            return this.defaultReturnCode;
        }


        // If there is no URL path, no point checking
        domains = parseFQDN(this._url);
        if (domains.path === null){
            return this.defaultReturnCode;
        }
        else{
            url = domains.path
        }

        // Making sure the URL is in the shape it can be checked against our dict keys.
        if (toBeReplaced !== null) {
            for (const replaceThis of toBeReplaced) {
                url = replaceIdInPath(url, replaceThis) // Replacing parts, ignoring version numbers
                url = url.replace(/\/$/, ''); // Removing trailing slashes, to ensure uniformity
            }
        }

        tokenDetails = decodeBearerToken(accessToken); // Check for Username

        // Write a function, that checks the assigned roles for the username

        // Get userID for user
        user_name = tokenDetails.preferred_username
        userId = keyCloakApis.getTestwareUserId(accessToken, user_name);

        // Getting available roles for the user
        rolesWithIds = keyCloakApis.getRolesAssignedToUserIdList(accessToken, userId)

        rolesWithIds.forEach(roleWithId => {
            if (appMgrConstants.roleAccessDict.hasOwnProperty(roleWithId.name)){
                let roleAccessMap = appMgrConstants.roleAccessDict[roleWithId.name]
                if (this.response !== null){
                    let endpoints = roleAccessMap[this.response.request_method]
                    if (endpoints.hasOwnProperty(url)){
                        accessResults.push(endpoints[url])
                    }
                }
            }
        });

        if(accessResults.length > 0 && accessResults.every(Number.isInteger)){
            let minValue = accessResults[0];

            // Iterate through the array to find the minimum value
            for (let i = 1; i < accessResults.length; i++) {
                if (accessResults[i] < minValue) {
                    minValue = accessResults[i];
                }
            }
            return minValue
        }
        else{
            return null;
        }
    }

    // Method to make a POST request
    post(request_timeout = '10m') {
        try{
            let post_payload, httpResponse;
            let response = {};
            this.response = null;
            if (this._url === null){
                return
            }
            post_payload = this.payloadFactory() // building the post payload with the factory before sending
            httpResponse = http.post(this._url, post_payload, { headers: this.headers, timeout: request_timeout});
            // Loop through all properties in the response object
            for (let prop in httpResponse) {
                // Check if the property is an own property of the response object (not inherited)
                if (httpResponse.hasOwnProperty(prop)) {
                    // Assign the property to the new object
                    response[prop] = httpResponse[prop];
                }
            }

            response['request_method'] = 'post';
            this.response = response;
            return response;
        } catch (e) {
            console.error(e);
        }
    }

    // Method to make a POST request
    get(request_timeout = '10m') {
        try{
            let httpResponse;
            let response = {};
            this.response = null;
            if (this._url === null){
                return
            }
            httpResponse = http.get(this._url, { headers: this.headers, timeout: request_timeout});
            // Loop through all properties in the response object
            for (let prop in httpResponse) {
                // Check if the property is an own property of the response object (not inherited)
                if (httpResponse.hasOwnProperty(prop)) {
                    // Assign the property to the new object
                    response[prop] = httpResponse[prop];
                }
            }
            response['request_method'] = 'get';
            this.response = response;
            return response;
        } catch (e) {
            console.error(e);
        }
    }

    // Method to make a PUT request
    put(request_timeout = '10m') {
        try{
            let put_payload, httpResponse;
            let response = {};
            this.response = null;
            if (this._url === null){
                return
            }
            put_payload = this.payloadFactory() // building the post payload with the factory before sending
            httpResponse = http.put(this._url, put_payload, { headers: this.headers, timeout: request_timeout});
            // Loop through all properties in the response object
            for (let prop in httpResponse) {
                // Check if the property is an own property of the response object (not inherited)
                if (httpResponse.hasOwnProperty(prop)) {
                    // Assign the property to the new object
                    response[prop] = httpResponse[prop];
                }
            }
            response['request_method'] = 'put';
            this.response = response;
            return response;
        } catch (e) {
            console.error(e);
        }
    }

    // Method to make a DELETE request
    delete(request_timeout = '10m') {
        try{
            let delete_payload, httpResponse;
            let response = {};
            this.response = null;
            if (this._url === null){
                return
            }
            delete_payload = this.payloadFactory() // building the post payload with the factory before sending
            httpResponse = http.del(this._url, delete_payload, { headers: this.headers, timeout: request_timeout});
            // Loop through all properties in the response object
            for (let prop in httpResponse) {
                // Check if the property is an own property of the response object (not inherited)
                if (httpResponse.hasOwnProperty(prop)) {
                    // Assign the property to the new object
                    response[prop] = httpResponse[prop];
                }
            }
            response['request_method'] = 'delete';
            this.response = response;
            return response;
        } catch (e) {
            console.error(e);
        }
    }
}

function replaceIdInPath(path, toBeReplaced) {
    // Split the path into segments
    let segments = path.split('/');

    // Iterate through each segment
    for (let i = 0; i < segments.length; i++) {
        let segment = segments[i];
        // Check if the segment contains the version number (starts with 'v')
        if (segment.startsWith('v')) {
            // Skip this segment and continue to the next one
            continue;
        }

        if (segment.includes(toBeReplaced)){
            segments[i] = segments[i].replace(toBeReplaced, '*');
        }
    }

    // Join the segments back into a path
    let newPath = segments.join('/');
    return newPath;
}

function arrayBufferToString(buffer) {
    let binaryString = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binaryString += String.fromCharCode(bytes[i]);
    }
    return binaryString;
}

export function decodeBearerToken(token) {
    try {
        // Split the token into its three parts: header, payload, and signature
        const parts = token.split('.');
        if (parts.length !== 3) {
            throw new Error('Invalid token format');
        }

        // Remove any characters that are not valid in a Base64 encoded string
        const base64Payload = parts[1].replace(/-/g, '+').replace(/_/g, '/').replace(/\s/g, '');

        // Decode the payload (second part)
        const decodedPayload = encoding.b64decode(base64Payload, 'rawstd');

        // Convert the ArrayBuffer to a string
        const decodedString = arrayBufferToString(decodedPayload);

        // Parse the JSON string into an object
        const decodedObject = JSON.parse(decodedString);

        return decodedObject;
    } catch (error) {
        console.error('Error decoding bearer token:', error.message || error);
        return null;
    }
}

export function parseFQDN(url) {
    if (url.startsWith('/')){
        return {
            protocol: null,
            app: null,
            sub: null,
            domain: null,
            top: null,
            path: url,
        };
    }

    const urlPattern = /^(https?:\/\/)?(([^:\/?#]*)(?::[0-9]+)?)([\/?#].*)?$/i;
    const matches = url.match(urlPattern);

    if (!matches) {
      console.error('Invalid URL');
      return null;
    }

    const protocol = matches[1];
    const hostname = matches[3];
    const path = matches[4] || '/';
    const parts = hostname.split('.');

    const isSinglePartPattern = /^(https?:\/\/)?([a-z0-9-.]+)(?::[0-9]+)?/i; //like kubernetes services
    const IsSinglePart = isSinglePartPattern.test(url);

    if (parts.length < 2 && IsSinglePart !== true) {
      console.error('Invalid FQDN');
      return null;
    }

    // List of common TLDs and public suffixes (simplified for example purposes)
    const publicSuffixes = ['com', 'co.uk', 'org', 'net', 'gov', 'edu', 'io', 'info', 'se'];
    let top = null;
    let domain = null;
    let sub = null;
    let app = null;

    // Find the longest matching public suffix
    for (let i = 0; i < parts.length; i++) {
      const potentialTLD = parts.slice(i).join('.');
      if (publicSuffixes.includes(potentialTLD)) {
        top = potentialTLD;
        if (i > 0) {
          domain = parts[i - 1];
          sub = parts.slice(0, i - 1).join('.') || null;
          app = parts[0] || null;
        }
        break;
      }
    }

    // If no match in publicSuffixes, assume the last part is the TLD
    if (!top) {
      top = parts.slice(-1).join('.');
      domain = parts.slice(-2, -1)[0];
      sub = parts.slice(0, -2).join('.') || null;
    }

    return {
        protocol,
        app,
        sub,
        domain,
        top,
        path,
    };
}

// ################################
// Helper functions to decorate functions with arguments, and pass those functions with those args to other functions
export function argWrapper(func, kwargs) {
    return function(...args) {
        const paramNames = getExpectedArgs(func); // function inspect for args
        const reorganizedArgs = [];

        // Match kwargs to parameter names and reorganize arguments
        paramNames.forEach(paramName => {
        if (kwargs.hasOwnProperty(paramName)) {
            reorganizedArgs.push(kwargs[paramName]);
            delete kwargs[paramName]; // Remove the matched key from kwargs
        } else {
            reorganizedArgs.push(args.shift()); // Use next argument if no value found in kwargs
        }
        });

        // Pass remaining kwargs as options
        reorganizedArgs.push(kwargs);

        // Call the target function with the reorganized arguments
        return func(...reorganizedArgs);
    };
}

function getExpectedArgs(func) {
    let functionSource = func.toString();
    let paramsStartIndex = functionSource.indexOf('(') + 1;
    let paramsEndIndex = functionSource.indexOf(')');
    let paramsString = functionSource.substring(paramsStartIndex, paramsEndIndex);

    let params = paramsString.split(',').map(param => param.trim());
    let defaultValues = [];
    let expectedArgs = [];

    for (let i = 0; i < params.length; i++) {
        let param = params[i];
        let equalIndex = param.indexOf('=');
        if (equalIndex !== -1) {
        let paramName = param.substring(0, equalIndex).trim();
        let defaultValue = param.substring(equalIndex + 1).trim();
        try {
            defaultValue = JSON.parse(defaultValue);
        } catch (error) {
            // Leave defaultValue as is if not parseable as JSON
        }
        defaultValues.push({ name: paramName, value: defaultValue });
        } else {
        expectedArgs.push(param);
        }
    }

    // Add remaining default values as keyword arguments
    defaultValues.forEach(({ name, value }) => {
        expectedArgs.push(name);
    });

    return expectedArgs;
}