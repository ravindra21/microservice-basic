const express = require('express')
const mongoose = require('mongoose')
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const axios = require('axios');

/**
 * SETUP
 */
const app = express()
const port = 3004
const mongoUrl = process.env.MONGO_URL || 'mongodb://127.0.0.1:27017/auth'
const kongAdminUrl = process.env.KONG_ADMIN_URL || 'http://127.0.0.1:8001'
const userSchema = new mongoose.Schema({
    username: String,
    password: String,
    role: String
})
const User = new mongoose.model('user', userSchema);

/**
 * MIDDLEWARE
 */
app.use(express.json())

/**
 * MAIN FUNCTIONS
 */
async function main() {
    await mongoose.connect(mongoUrl)

    app.get('/', (req, res) => { return res.send('auth service') })

    app.post('/', async (req, res) => {
        const user = await User.findOne({username: req.body.username});
        
        if(user) {
            bcrypt.compare(req.body.password, user.password, async (err, result) => {
                if(result) {
                    const cred = await getJwtCredential(req.body.username);
                    if(cred == false) { res.sendStatus(500) }
                    else {
                        const token = jwt.sign({ iss: cred.key }, cred.secret);
                        res.send(token)
                    }
                } else {
                    res.sendStatus(401)
                }
            })
        } else {
            res.sendStatus(401)
        }
    })

    app.post('/register', async (req, res) => {
        const user = new User({
            username: req.body.username,
            password: await bcrypt.hash(req.body.password, 10),
            role: 'admin'
        })

        user.save();

        await saveToKong(user.username);
        await generateKey(user.username);

        res.send(user);
    })

    app.listen(port, async () => {
        console.log(`Server Running on port ${port}`);
    })
    
    async function getJwtCredential(username) {
        try {
            const cred = await axios.get(kongAdminUrl+'/consumers/'+username+'/jwt')
            return cred.data.data[0];
        } catch(error) {
            return false;
        }
    }

    async function saveToKong(username) {
        try {
            const result = await axios.post(kongAdminUrl+'/consumers/', {
                username: username
            })
            return result.data.data[0];
        } catch(error) {
            return false;
        }
    }

    async function generateKey(username) {
        try {
            const result = await axios.post(kongAdminUrl+'/consumers/'+username+'/jwt')
            return result.data.data[0];
        } catch(error) {
            return false;
        }
    }
}

main().catch(err => console.log(err))