FROM armdocker.rnd.ericsson.se/proj-eric-oss-drop/k6-base-image:latest as k6base

#ARG image_version

ENV hostname_url=$hostname_url
#ENV TEST_VERSION=$image_version
ENV STAGING_TYPE="APPLICATION"
ENV APP_NAME="eric-oss-app-mgr"
ENV SHUTDOWN_WAIT_TIME="300"
ENV ADDITIONAL_ARGS=--http-debug="full"
ENV PRODUCT="eric-oss-app-mgr"
#ENV PRODUCT_VERSION=$image_version


ADD js/ /tests
ADD resources/ /resources
ADD scripts/ /scripts
