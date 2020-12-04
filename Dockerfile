FROM node:10-alpine

# install curl
RUN apk --no-cache add curl

COPY ./src /vidExtractor

WORKDIR /vidExtractor

RUN npm install

RUN chmod +x ./wait-for-rabbit.sh

CMD ["./wait-for-rabbit.sh", "node", "vidExtractorScript"]