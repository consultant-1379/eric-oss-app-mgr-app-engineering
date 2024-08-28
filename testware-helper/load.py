import zipfile
import glob
import os
import yaml
import shutil
import glob
import tarfile
import requests
import time

import load_helpers

onboarding_jobs_list = []
apps_list = []

def download_correct_csar(i):
    if i == 1:
        product_eng_url="https://arm.seli.gic.ericsson.se/artifactory/proj-eric-oss-product-engineering-generic-local/csars/eric-oss-hello-world-1.1.0.2.csar"
    elif i == 4:
        product_eng_url="https://arm.seli.gic.ericsson.se/artifactory/proj-eric-oss-product-engineering-generic-local/csars/eric-oss-hello-world-med-load.csar"
    elif i == 7:
        product_eng_url="https://arm.seli.gic.ericsson.se/artifactory/proj-eric-oss-product-engineering-generic-local/csars/eric-oss-hello-world-large-load.csar"
    else:
        return

    response = requests.get(product_eng_url, verify=False)
    file = open("file.zip", "wb")
    file.write(response.content) #save our CSAR to file.zip
    file.close()
    shutil.rmtree("temp", ignore_errors=True)
    with zipfile.ZipFile("file.zip", "r") as zf:
        zf.extractall("temp")

def initalize_and_deploy(url, cookie):
    for i in range(0, 3):
        app_id = load_helpers.get_app_id(cookie, onboarding_jobs_list[i], url)
        load_helpers.initalize_app(cookie, app_id, url)
        load_helpers.enable_app(cookie, app_id, url)
        app_instance_id = load_helpers.create_app_instance(cookie, app_id, url)
        load_helpers.deploy_app_instance(cookie, app_instance_id, url)

def onboard_csars(url, cookie):
    for i in range (1, 10):
        download_correct_csar(i)

        with open("./temp/Definitions/AppDescriptor.yaml", "r") as f:
            data = yaml.load(f, Loader=yaml.SafeLoader)

        rapp_name = "oss-hello-world-" +  str(i)

        if i <= 3:
            rapp_name = "small-" + rapp_name
        elif i <= 6:
            rapp_name = "med-" + rapp_name
        else:
            rapp_name = "large-" + rapp_name

        data["Description of an APP"]["APPName"] = rapp_name
        data["APPComponent"]["NameofComponent"] = rapp_name

        if 'APPPermissions' in data:
            del data['APPPermissions']

        if 'APPRoles' in data:
            del data['APPRoles']

        with open("./temp/Definitions/AppDescriptor.yaml", "w") as f:
            data = yaml.safe_dump(data, f)

        pattern = "./temp/OtherDefinitions/ASD/*.yaml"
        ASDyaml = glob.glob(pattern)[0]

        with open(ASDyaml, "r") as f:
            data = yaml.load(f, Loader=yaml.SafeLoader)

        data["asdApplicationName"] = rapp_name
        data["deploymentItems"]["artifactId"] = "OtherDefinitions/ASD/" + rapp_name + "-1.0.0-2.tgz"

        with open(ASDyaml, "w") as f:
            data = yaml.safe_dump(data, f)

        # Pattern to search for the .tgz file
        pattern = "./temp/OtherDefinitions/ASD/*.tgz"
        tar_name = glob.glob(pattern)[0]

        # Edit the TAR Chart.yaml and values.yaml of the tgz
        tar = tarfile.open(tar_name)
        tar.extractall("./tmp")
        tar.close()

        with open("./tmp/eric-oss-hello-world-go-app/Chart.yaml", "r") as f:
            data = yaml.safe_load(f)

        data["name"] = rapp_name

        with open("./tmp/eric-oss-hello-world-go-app/Chart.yaml", "w") as f:
            yaml.safe_dump(data, f)

        tar = tarfile.open(tar_name, "w:gz")

        for file in glob.glob("tmp/*"):
            tar.add(file, arcname=os.path.basename(file))

        tar.close()

        os.rename(tar_name, "./temp/OtherDefinitions/ASD/" + rapp_name + "-1.0.0-2.tgz")

        dir_path = "./temp"
        zip_path = "./my-zip"

        # Create a zip file with the directory and its subdirectories
        shutil.make_archive(zip_path, "zip", dir_path)
        os.rename("my-zip.zip", "my-csar" + str(i) + ".csar")
        onboarding_id = load_helpers.onboard_app(cookie, str(i), url)
        onboarding_jobs_list.append(onboarding_id)

        shutil.rmtree("tmp")
        os.remove("my-csar" + str(i) + ".csar")

        time.sleep(30)

    initalize_and_deploy(url, cookie)
