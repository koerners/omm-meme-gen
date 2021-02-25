### STAGE 1: Build ###
FROM node:12.7-alpine AS build
WORKDIR /frontend
COPY package.json package-lock.json ./
RUN npm install
COPY . .
RUN npm run build
### STAGE 2: Run ###
FROM nginx:1.17.1-alpine
FROM httpd:2.4
COPY --from=build /frontend/dist/frontend /usr/local/apache2/htdocs/
