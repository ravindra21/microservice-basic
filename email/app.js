const express = require('express')
var nodemailer = require('nodemailer')
const { Kafka } = require('kafkajs')

/**
 * SETUP
 */
const app = express()
const port = 3002
const kafka = new Kafka({
    clientId: '0',
    brokers: [ process.env.KAFKA_SERVER_1 || 'localhost:9092' ],
})
const producer = kafka.producer()
var transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.MAIL_HOST,
        pass: proccess.env.MAIL_PASSWORD
    }
});

/**
 * MIDDLEWARE
 */
app.use(express.json())

/**
 * MAIN FUNCTIONS
 */
async function main() {

    async function sendEmail(data) {
        var option = {
            from: process.env.MAIL_HOST,
            to: process.env.MAIL_TO,
            subject: `product ${data.name} has been created`,
            text: `hi you just created a new product with id: ${data._id}`
        };

        transporter.sendMail(option, function (error, info) {
            if (error) {
                console.log(error);
            } else {
                console.log('Email sent: ' + info.response);
            }
        });

        await producer.connect()
        await producer.send({
            topic: 'send-email-topic',
            messages: [
                { "key": data._id, "value": JSON.stringify({...option, _id: data._id}) },
            ],
        })
        await producer.disconnect()
    }

    app.listen(port, async () => {
        console.log(`Server Running on port ${port}`);
        const consumer = kafka.consumer({ groupId: 'email-group' })

        await consumer.connect()
        await consumer.subscribe({ topic: 'create-product-topic' })
        await consumer.run({
            eachMessage: async ({ topic, partition, message }) => {
                console.log({
                    topic,
                    partition,
                    key: message.key.toString(),
                    value: message.value.toString(),
                    headers: message.headers,
                })

                switch (topic) {
                    case 'create-product-topic':
                        sendEmail(JSON.parse(message.value.toString()))
                        break;
                    default:
                        console.log('topic not implemented')
                        break;
                }
            },
        })
    });
}

main().catch(err => console.log(err))