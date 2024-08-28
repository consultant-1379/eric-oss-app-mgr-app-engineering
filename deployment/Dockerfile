#FROM armdocker.rnd.ericsson.se/proj-eric-oss-dev-test/k6-base-image:latest as k6base
FROM armdocker.rnd.ericsson.se/proj-eric-oss-drop/k6-base-image:latest as k6base
COPY src/js/ .
COPY src/resources/ .
COPY ci/scripts/runK6.sh .
ENTRYPOINT ["/bin/sh", "runK6.sh"]

FROM armdocker.rnd.ericsson.se/proj-adp-cicd-drop/bob-py3kubehelmbuilder:latest

RUN pip3 install --no-cache-dir awscli
# Create directory for config files
RUN mkdir /workdir
RUN chmod 777 /
RUN chmod 777 /workdir
RUN chmod 777 /workdir/
CMD ["/bin/sh"]
