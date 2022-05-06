## architecture

![image](https://user-images.githubusercontent.com/26089535/167200992-f4212d09-72a1-4458-9e4f-6beaf61a28e5.png)

install docker

edit email service environment (./docker-compose.yml) add :
    
    MAIL_HOST
    
    MAIL_PASSWORD
    
    MAIL_TO

edit productSearch service environment (./docker-compose.yml) add :
    
    ELASTIC_CLOUD_ID
    
    ELASTIC_USERNAME
    
    ELASTIC_PASSWORD

run docker-compose :

    docker-compose up -d --build

open kong-gateway container :
    
    kong migrations bootstrap

configure kong-gateway and jwt plugin :
    
    COMING SOON :)