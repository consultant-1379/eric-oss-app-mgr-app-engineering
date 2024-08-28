import { expect } from "../jslib/k6chaijs_4.3.4.3.js";
import * as appCommons from "../modules/common_functions.js";

export function ValidateRolePermission(accessToken, requestUrl) {
    let ro;

    ro = new appCommons.RequestObject();

    ro.url = requestUrl;

    ro.header.add('application/json');
    ro.header.add(accessToken);

    ro.get();

    expect(ro.response.status, 'Status is 200, OK').to.equal(200);

}
