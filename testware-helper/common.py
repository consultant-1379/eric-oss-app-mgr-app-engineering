import logging

logger = logging.getLogger('waitress')
logging.basicConfig(
    format='%(asctime)s %(levelname)-8s %(message)s :: %(threadName)s',
    level=logging.DEBUG,
    datefmt='%Y-%m-%d %H:%M:%S')
