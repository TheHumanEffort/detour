FROM node:6.3.1

RUN mkdir -p /application
WORKDIR /application

ENV PORT 8080
EXPOSE 8080

COPY package.json /application
RUN npm install
COPY src /application

CMD [ "npm", "start" ]