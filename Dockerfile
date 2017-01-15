FROM node:6.5.0-onbuild

RUN apt update && apt install --yes --force-yes sqlite3
