import requests
import json
import time

onboard_url = "/app-manager/onboarding/v2/app-packages"
jobs_url = "/app-manager/onboarding/v2/onboarding-jobs"
initalize_app_url = "/app-manager/lcm/v3/apps/"
enable_app_url = "/app-lifecycle-management/v3/apps/"
instance_app_url = "/app-lifecycle-management/v3/app-instances"
deploy_app_url = "/app-lifecycle-management/v3/app-instances/"

def onboard_app(cookie, count, url):
    file = open("my-csar" + str(count) + ".csar", "rb")
    response = requests.post(url + onboard_url, files={"file": file}, headers=cookie, verify=False, stream=True)
    json_response = json.loads(response.text)
    onboarding_job_id = json_response['onboardingJob']['id']
    return onboarding_job_id


def get_app_id(cookie, job_id, url):
    response = requests.get(url + jobs_url, headers=cookie, verify=False)
    json_response = json.loads(response.text)
    for item in json_response["items"]:
        if "id" in item and item["id"] == job_id:
            desired_item = item["app"]["id"]
            return desired_item


def initalize_app(cookie, app_id, url):
    initalize_app_url_local = url + initalize_app_url + app_id + "/initialization-actions"
    request_body = '{"action": "INITIALIZE"}'
    jsession_id = cookie["Cookie"]
    headers = {
        "Content-Type": "application/json",
        "Cookie": jsession_id
    }
    response = requests.post(initalize_app_url_local, headers=headers, data=request_body, verify=False)
    time.sleep(60)

def enable_app(cookie, app_id, url):
    enable_app_url_local = url + enable_app_url + app_id + "/mode"
    request_body = '{"mode": "ENABLED"}'
    jsession_id = cookie["Cookie"]
    headers = {
        "Content-Type": "application/json",
        "Cookie": jsession_id
    }
    response = requests.put(enable_app_url_local, headers=headers, data=request_body, verify=False)

def create_app_instance(cookie, app_id, url):
    request_body = '{"appId": "' + app_id + '"}'
    jsession_id = cookie["Cookie"]
    headers = {
        "Content-Type": "application/json",
        "Cookie": jsession_id
    }
    response = requests.post(url + instance_app_url, headers=headers, data=request_body, verify=False)
    json_response = json.loads(response.text)
    app_instance_id = json_response["id"]
    return app_instance_id

def deploy_app_instance(cookie, app_instance_id, url):
    deploy_app_url_local = url + deploy_app_url + app_instance_id + "/deployment-actions"
    jsession_id = cookie["Cookie"]
    headers = {
        "Content-Type": "application/json",
        "Cookie": jsession_id
    }
    request_body = '{"type": "DEPLOY"}'
    response = requests.post(deploy_app_url_local, headers=headers, data=request_body, verify=False)
