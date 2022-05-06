const express = require('express')
const { Kafka } = require('kafkajs')
const { Client: Elastic } = require('@elastic/elasticsearch')

/**
 * SETUP
 */
const app = express()
const port = 3001
const kafka = new Kafka({
    clientId: '0',
    brokers: [ process.env.KAFKA_SERVER_1 || 'localhost:9092' ],
})
const elastic = new Elastic({
    cloud: { id: process.env.ELASTIC_CLOUD_ID },
    auth: {
        username: process.env.ELASTIC_USERNAME,
        password: process.env.ELASTIC_PASSWORD
    }
})

/**
 * MIDDLEWARE
 */
app.use(express.json())

/**
 * MAIN FUNCTIONS
 */
async function main() {
    async function createProduct(data) {
        await elastic.index({
            index: 'product-catalog',
            id: data._id,
            body: {
                name: data.name,
            }
        })

        await elastic.indices.refresh({ index: 'product-catalog' })
    }

    async function deleteProduct(data) {
        await elastic.delete({
            index: "product-catalog",
            id: data._id
        })
    }

    async function updateProduct(data) {
        console.log(data)
        await elastic.update({
            index: "product-catalog",
            id: data._id,
            body: {
                doc: {
                    name: data.name
                }
            }
        })
    }

    async function getProduct(match = 'productE') {
        const body = await elastic.search({
            index: 'product-catalog',
            body: {
                query: {
                    match: { name: match }
                }
            }
        })
        console.log(body.hits.hits)
    }

    app.listen(port, async () => {
        console.log(`Server Running on port ${port}`)

        const consumer = kafka.consumer({ groupId: 'productSearch-group' })

        await consumer.connect()
        await consumer.subscribe({ topic: 'create-product-topic' })
        await consumer.subscribe({ topic: 'update-product-topic' })
        await consumer.subscribe({ topic: 'delete-product-topic' })

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
                        createProduct(JSON.parse(message.value.toString()))
                        break;
                    case 'update-product-topic':
                        updateProduct(JSON.parse(message.value.toString()))
                        break;
                    case 'delete-product-topic':
                        deleteProduct(JSON.parse(message.value.toString()))
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