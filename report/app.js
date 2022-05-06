const express = require('express')
const { Kafka } = require('kafkajs')
const mongoose = require('mongoose')

/**
 * SETUP
 */
const app = express()
const port = 3003
const mongoUrl = process.env.MONGO_URL || 'mongodb://127.0.0.1:27017/report'
const kafka = new Kafka({
    clientId: '0',
    brokers: [ process.env.KAFKA_SERVER_1 || 'localhost:9092' ],
})

/**
 * MIDDLEWARE
 */
app.use(express.json())

/**
 * MAIN FUNCTIONS
 */
const productSchema = new mongoose.Schema({ 
    name: String 
}) // validations
const Product = new mongoose.model('product', productSchema); // collection name is 'products'
const emailSchema = new mongoose.Schema({
    from: String,
    to: String,
    subject: String,
    text: String
}) // validations
const Email = new mongoose.model('email', emailSchema); // collection name is 'products'


async function main() {
    await mongoose.connect(mongoUrl)

    async function storeProduct(data) {
        const product = new Product(data); // create new document
        await product.save() // save to db
    }

    async function storeEmail(data) {
        const email = new Email(data); // create new document
        await email.save() // save to db
    }
    
    app.get('/', async (req, res) => {
        const reports = await Product.aggregate([{$lookup: { from: 'emails', localField: '_id', foreignField: '_id', as: 'emails' } }])
        res.send(reports)
    })

    app.listen(port, async () => {
        console.log(`Server Running on port ${port}`);
        const consumer = kafka.consumer({ groupId: 'report-group' })

        await consumer.connect()
        await consumer.subscribe({ topic: 'create-product-topic' })
        await consumer.subscribe({ topic: 'send-email-topic' })
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
                        storeProduct(JSON.parse(message.value.toString()))
                        break;
                    case 'send-email-topic':
                        storeEmail(JSON.parse(message.value.toString()))
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