import os
import shutil
import uuid
import zipfile
import urllib.request
from datetime import datetime
import hashlib
from common import logger
from requests_toolbelt.multipart.encoder import MultipartEncoder
import requests
from time import sleep

class EditCsar:
    def __init__(self, original_csar_filename, new_csar_filename):
        self.timestamp = str(datetime.now().strftime("%Y%m%dt%H%M%S"))
        self.original_csar_filename = original_csar_filename.replace(".csar", "")
        self.new_csar_filename = new_csar_filename
        self.make_temp_directory()

    def generate_uuid(self):
        logger.info("Generating UUID...")
        return str(uuid.uuid4())

    def make_temp_directory(self):
        logger.info(f"Creating temp directory: {self.new_csar_filename}")
        os.mkdir(self.new_csar_filename)

    def remove_temp_directory(self):
        logger.info(f"Removing temporary directory: {self.new_csar_filename}")
        shutil.rmtree(self.new_csar_filename, ignore_errors=True)

    def extract_csar_file(self):
        logger.info(f"Extracting original csar file: {self.original_csar_filename}")
        with zipfile.ZipFile(f"{self.original_csar_filename}.csar") as orginal:
            orginal.extractall(f"{self.new_csar_filename}")
            orginal.close()
        logger.info(f"Finished extracting csar file.")

    def update_descriptor_id(self, original_vnfd_id):
        new_uuid = self.generate_uuid()
        logger.info(f"Generated UUID: {new_uuid}")
        ppf_yaml_update = (
            f"{self.new_csar_filename}/Definitions/eric-ran-cu-up-ppf.yaml"
        )
        self.original_hash = calculate_sha256(ppf_yaml_update)

        with open(ppf_yaml_update, "r") as file:
            filedata = file.read()

        logger.info(f"Updating descriptior_id with: ({new_uuid})")
        filedata = filedata.replace(original_vnfd_id, new_uuid)

        with open(ppf_yaml_update, "w") as file:
            logger.info(f"Writing to eric-ran-cu-up-ppf.yaml")
            file.write(filedata)

        self.update_sha256_reference(ppf_yaml_update)

    def update_sha256_reference(self, reference_file):
        logger.info(f"Updating manifest reference for: {reference_file}")
        mf_update = f"{self.new_csar_filename}/eric-ran-cu-up-ppf.mf"
        updated_hash = calculate_sha256(reference_file)
        with open(mf_update, "r") as file:
            filedata = file.read()

        logger.info(f"Updating sha256 reference: {updated_hash}")
        filedata = filedata.replace(self.original_hash, updated_hash)

        with open(mf_update, "w") as file:
            logger.info(f"Writing to manifest file")
            file.write(filedata)

def upload_with_retry(request_params, post_data, retry_count=3):
    for attempt in range(retry_count):
        try:
            response = requests.post(request_params.get('url'), verify= False,
                **post_data, headers=request_params.get('headers'))
            if 200 <= response.status_code < 300:
                return response
        except requests.exceptions.RequestException as e:
            logger.info(f"Error during upload attempt {attempt + 1}: {e}")
            sleep(1)  # Wait for 1 second before retrying
    return None

def handle_request_based_on_file_size(request_params, filename, form_field_name, filename_full_path):
    with open(filename_full_path, 'rb') as upload_file:
        if os.stat(filename_full_path).st_size > ((2 * 1024**3) - 1):
            logger.info(f"Handling a file larger than 2 GB, filename: {filename}")
            fileMultipart = MultipartEncoder(
                        fields={form_field_name: (filename, upload_file)}
                    )
            post_data = {'data': fileMultipart}
        else:
            logger.info(f"Handling a file smaller than 2 GB, filename: {filename}")
            post_data = {'files': {form_field_name: (filename, upload_file)}}
        response = upload_with_retry(request_params, post_data)
    response.raise_for_status()
    return response


def download_file_locally(url, filename, retryCount = 1):
    full_url = "{}/{}".format(url, filename)

    try:
        current_directory = os.path.dirname(os.path.abspath(__file__))
        filename_full_path = os.path.join(current_directory, filename)
        if not os.path.isfile(filename_full_path):
            logger.info("Attempting to Download file {}".format(full_url))
            urllib.request.urlretrieve(full_url, filename)
            remote_hash = urllib.request.urlopen("{}.sha256".format(full_url)).read().decode("utf-8")
            local_file_hash = calculate_sha256(filename)
            logger.info("Local hash: {}, Remote hash: {}".format(local_file_hash, remote_hash))
            if local_file_hash == remote_hash:
                logger.info("Downloaded file {} is OK".format(filename))
            else:
                logger.info("Downloaded file {} is corrputed".format(filename))
                if retryCount < 2:
                    logger.info("Retrying Download")
                    download_file_locally(url, filename, retryCount + 1)
                else:
                    logger.info("No more retries left")
        else:
            logger.info("File {} already downloaded".format(filename))
    except Exception as e:
        logger.info("Unable to fetch requested file {} from Artifactory, Error: {}".format(filename, str(e)))
        raise


def calculate_sha256(filename):
    hash_sha256 = hashlib.sha256()
    with open(filename, "rb") as f:
        for chunk in iter(lambda: f.read(4096), b""):
            hash_sha256.update(chunk)
    return hash_sha256.hexdigest()
