FROM node:10-alpine

ARG HOST=localhost
ARG USER=guest
ARG PASS=guest
ARG PORT=5672
ARG MNG_PORT=15672
ARG TIME=10

# install curl
RUN apk --no-cache add curl

COPY ./src /vidExtractor

WORKDIR /vidExtractor

RUN npm install

RUN chmod +x ./wait-for-rabbit.sh

CMD ["./wait-for-rabbit.sh", "node", "vidExtractorScript"]