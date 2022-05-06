const express = require('express')
const mongoose = require('mongoose')
const { Kafka } = require('kafkajs')

/**
 * SETUP
 */
const app = express()
const port = 3000
const mongoUrl = process.env.MONGO_URL || 'mongodb://127.0.0.1:27017/product'
const kafka = new Kafka({
    clientId: '0',
    brokers: [ process.env.KAFKA_SERVER_1 || 'localhost:9092' ],
})
const producer = kafka.producer()

/**
 * MIDDLEWARE
 */
app.use(express.json())

/**
 * MAIN FUNCTIONS
 */
const productSchema = new mongoose.Schema({ name: String }) // validations
const Product = new mongoose.model('product', productSchema); // collection name is 'products'

async function main() {
    await mongoose.connect(mongoUrl)

    app.get('/', async (req, res) => {
        res.send('product service')
    })

    app.post('/', async (req, res) => {
        const productA = new Product(req.body); // create new document
        await productA.save() // save to db

        // todo send event to kafka
        await producer.connect()
        await producer.send({
            topic: 'create-product-topic',
            messages: [
                { "key": productA.id, "value": JSON.stringify(productA) },
            ],
        })
        await producer.disconnect()

        res.send(productA)
    })

    app.put('/:name', async (req, res) => {
        const newProduct = await Product.findOneAndUpdate({ name: req.params.name }, req.body, { new: true }).exec()
        
        // todo send event to kafka
        await producer.connect()
        await producer.send({
            topic: 'update-product-topic',
            messages: [
                { "key": newProduct.id, "value": JSON.stringify(newProduct) },
            ],
        })
        await producer.disconnect()

        res.send(newProduct)
    })

    app.delete('/:name', async (req, res) => {
        const newProduct = await Product.findOneAndDelete({ name: req.params.name }).exec()

        // todo send event to kafka
        await producer.connect()
        await producer.send({
            topic: 'delete-product-topic',
            messages: [
                { "key": newProduct.id, "value": JSON.stringify(newProduct) },
            ],
        })
        await producer.disconnect()

        res.send(newProduct)
    })

    app.listen(port, () => {
        console.log(`Server Running on port ${port}`);
    });
}

main().catch(err => console.log(err))