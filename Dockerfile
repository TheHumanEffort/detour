FROM node:6.3

RUN mkdir -p /application
WORKDIR /application

ENV PORT 8080
EXPOSE 8080

RUN npm install -g nodemon

COPY package.json /application
RUN npm install
COPY . /application

CMD [ "bash","-c","cd src && nodemon router.js" ]