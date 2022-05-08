const express = require('express')
const { Kafka } = require('kafkajs')
const { Client: Elastic } = require('@elastic/elasticsearch')
const VaultSDK = require('node-vault');

const vaultClient = VaultSDK({
    apiVersion: 'v1',
    endpoint: process.env.VAULT_ADDR || 'http://localhost:8200',
    token: process.env.VAULT_TOKEN || 'myroot',
})

/**
 * SETUP
 */
const app = express()
const port = 3001
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

/**
 * ENV FROM VAULT
 */
 vaultClient.read('secret/data/elastic').then((result) => {
    process.env.ELASTIC_CLOUD_ID = result.data.data.ELASTIC_CLOUD_ID
    process.env.ELASTIC_USERNAME = result.data.data.ELASTIC_USERNAME
    process.env.ELASTIC_PASSWORD = result.data.data.ELASTIC_PASSWORD

    const elastic = new Elastic({
        cloud: { id: process.env.ELASTIC_CLOUD_ID },
        auth: {
            username: process.env.ELASTIC_USERNAME,
            password: process.env.ELASTIC_PASSWORD
        }
    })
    main().catch(err => console.log(err))
});