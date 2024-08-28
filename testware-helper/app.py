import os
import requests
import threading
import time
import re
from flask import Flask, request, send_file
from requests.packages.urllib3.exceptions import InsecureRequestWarning
from urllib.error import HTTPError
from waitress import serve

from common import logger
from handle_csar import handle_request_based_on_file_size, download_file_locally
import load

requests.packages.urllib3.disable_warnings(InsecureRequestWarning)

ARTIFACTORY_URL = 'https://arm.seli.gic.ericsson.se/artifactory/proj-eric-oss-product-engineering-generic-local/csars'
# ARTIFACTORY_URL = 'https://arm.seli.gic.ericsson.se/artifactory/proj-eric-oss-dev-test-generic-local/csars'
eiapSetupStatus = "IN_PROGRESS"

app = Flask(__name__)

@app.before_request
def before_request():
    threading.current_thread().name = '{}_{}'.format(
        time.time(), request.endpoint)
    logger.info('Request headers received: ' + str(request.headers))
    logger.info('Request body received: ' + str(request.get_data()))



@app.route('/upload', methods=['POST'])
def upload():
    try:
        request_params = request.get_json(force=True)
        legacy = request_params.get('legacy', True)
        filename = request_params.get('file')
        # checks if file is a url
        url_match = re.findall('https?://(?:www\.)?[\sa-zA-Z0-9\./-]+', filename)
        if url_match:
            list = filename.rsplit('/', 1)
            url = list[0]
            filename = list[1]
        else:
            url = ARTIFACTORY_URL
        current_directory = os.path.dirname(os.path.abspath(__file__))
        form_field_name = request_params.get('field', 'file')
        download_file_locally(url, filename)
        filename_full_path = os.path.join(current_directory, filename)
        response = handle_request_based_on_file_size(request_params, filename, form_field_name, filename_full_path)
        logger.info("EIAP upload endpoint response: {} {}".format(response.text, response.status_code))
    except requests.exceptions.RequestException as e:
        logger.info("Error uploading the CSAR {}".format(e))
    return response.text, response.status_code


@app.route('/v2/upload-csar-to-eiap', methods=['POST'])
def v2_upload_csar_to_eiap():
    try:
        request_params = request.get_json(force=True)
        filename = request_params.get('file')
        aritfactory_url = request_params.get('artifactory_url', ARTIFACTORY_URL)
        current_directory = os.path.dirname(os.path.abspath(__file__))
        form_field_name = request_params.get('field', 'file')
        download_file_locally(aritfactory_url, filename)
        filename_full_path = os.path.join(current_directory, filename)
        response = handle_request_based_on_file_size(
            request_params, filename, form_field_name, filename_full_path)
        response.raise_for_status()
        elapsed_time = response.elapsed.total_seconds()
        logger.info(f"EIAP upload endpoint response: {response.text} {response.status_code}\nElapsed time: {elapsed_time}")
        return {'eiap_response': response.text, 'eiap_status': response.status_code,
            'elapsed_time': elapsed_time}, 200
    except HTTPError as e:
        logger.info(f"Error while trying to download the csar: {str(e)}")
        return {'error': f'unable to download the csar or csar hash\nError: {str(e)}'}, 404
    except Exception as e:
        logger.info(f"Error uploading the CSAR {str(e)}")
        return {'error': f'Problem occured when trying to deal with csar, {str(e)}'}, 500


@app.route('/python-load', methods=['POST'])
def python_load():
    try:
        request_params = request.get_json(force=True)
        jsession_id = request_params.get('jsession_id')
        url = request_params.get('url')
        cookie = {
            "Cookie": jsession_id
        }
        load.onboard_csars(url, cookie)
        return "Successfully onboarded Python load"
    except HTTPError as e:
        logger.info(f"Error while trying to download the Python load: {str(e)}")
        return {'error': f'unable to download the csar or csar hash\nError: {str(e)}'}, 404
    except Exception as e:
        logger.info(f"Error uploading the Python load {str(e)}")
        return {'error': f'Problem occured when trying to deal with csar, {str(e)}'}, 500


@app.route('/<path:text>', methods=['GET'])
def download_csar_file_from_artifactory(text):
    current_directory = os.path.dirname(os.path.abspath(__file__))
    filename = os.path.join(current_directory, text)
    download_file_locally(ARTIFACTORY_URL, text)
    if os.path.isfile(filename):
        return send_file(filename, as_attachment=True)
    else:
        return '{"error": "Unable to retrieve the file"}', 404


@app.route('/', methods=['GET'])
def server_liveness():
    return 'Server is up and live'



if __name__ == "__main__":
    serve(app, host="0.0.0.0", port=80, threads=10)
