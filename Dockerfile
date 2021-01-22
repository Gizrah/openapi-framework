FROM node:14.5.0 AS compile-image

# RUN npm install -g yarn --force

WORKDIR /opt/ng
COPY .npmrc package.json yarn.lock ./
RUN npm install

ENV PATH="./node_modules/.bin:$PATH" 

COPY . ./
RUN ng build --prod --source-map=true --vendor-chunk=true

FROM nginx
COPY docker/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=compile-image /opt/ng/dist/quebble-front-end /usr/share/nginx/html
