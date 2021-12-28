FROM node:current-alpine

LABEL maintainer Ascensio System SIA <support@onlyoffice.com>

WORKDIR /usr/src/app

COPY ./src/package*.json ./

RUN npm install

COPY ./src/* ./

EXPOSE 80 1337

CMD [ "node", "index.js" ]

