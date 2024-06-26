FROM node:16-alpine3.11 AS fnl_base_image

ENV PORT 8083
ENV NODE_ENV production

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm ci --only=production

#USER node

COPY  --chown=node:node . .

EXPOSE 8083

CMD [ "node", "./bin/www" ]
