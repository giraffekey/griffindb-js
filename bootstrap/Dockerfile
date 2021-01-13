FROM node:15-alpine

COPY . .

RUN apk add --update python make g++ && rm -rf /var/cache/apk/*
RUN yarn

EXPOSE 8765
EXPOSE 8766
EXPOSE 8767

CMD ["node", "index.js"]
