FROM iron/images:node-4.1
WORKDIR /worker
ADD ./updater /worker
RUN apt-get update
RUN apt-get install zip
RUN /bin/bash -c 'cd /worker; npm install;'
RUN curl -sSL http://get.iron.io/cli | sh
