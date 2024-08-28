FROM python:3.9-alpine
WORKDIR /python-docker
COPY helper-lib/ ./
RUN apk --no-cache add curl build-base\
  && python -m pip install --no-index --no-deps *.whl\
  && pip install *.tar.gz\
  && pip install pyyaml \
  && apk del build-base

COPY *.py ./

CMD [ "python3", "app.py"]
