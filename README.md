install docker

edit email service environment (./docker-compose.yml) add :
    MAIL_HOST
    MAIL_PASSWORD
    MAIL_TO

edit productSearch service environment (./docker-compose.yml) add :
    ELASTIC_CLOUD_ID
    ELASTIC_USERNAME
    ELASTIC_PASSWORD

docker-compose up -d --build

open kong-gateway container :
    kong migrations bootstrap

configure kong-gateway and jwt plugin :
    COMING SOON :)