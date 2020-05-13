FROM node:10.16-stretch-slim

RUN apt-get update \
    && apt-get install -y curl git openssl \
    && apt-get clean

COPY package.json /app/package.json
WORKDIR /app

RUN npm install

COPY . /app

RUN npm test
RUN npm run copy-data

CMD BASE_URL=https://registry.opendata.aws npm run serve

