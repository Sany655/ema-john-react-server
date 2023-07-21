const express = require('express');
const cors = require('cors');
require('dotenv').config()
const { MongoClient } = require('mongodb')
const ObjectId = require('mongodb').ObjectId;
const app = express()
const port = process.env.PORT || 5000;
const admin = require("firebase-admin");
// const serviceAccount = require("./ema-john-complicated-firebase-adminsdk-b9630-e4379ae584.json");
const serviceAccount = require("./ema-john-complicated-firebase-adminsdk-b9630-27d43886fe.json");

// middlewares
app.use(cors())
app.use(express.json())

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

app.get('/', (req,res) => {
    res.send('emma john');
})

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.e2cer.mongodb.net/${process.env.DB}?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

async function verifyToken(req,res,next) {
    if (req?.headers?.authorization?.startsWith('Bearer ')) {
        const idToken = req.headers.authorization.split('Bearer ')[1];
        try {
            const userDecoded = await admin.auth().verifyIdToken(idToken)
            req.userDecoded = userDecoded.email;
        } catch (error) {
            console.log(error);
        }
    }
    next()
}

async function run() {
    try {
        await client.connect();
        console.log('connected');
        const products = await client.db('emaJohn').collection('products');
        const orders = await client.db('emaJohn').collection('orders');

        // apis here
        app.get('/products', async(req,res)=>{
            const query = await products.find({})
            const count = await query.count()
            const result = req.query.page?await query.skip(req.query.page*req.query.size).limit(5).toArray():await query.limit(5).toArray();
            res.send({count,
                products:result});
        })

        app.post('/products/byKeys', async(req,res)=>{
            const result = await products.find({key: { $in: req.body } }).toArray()
            res.send(result);
        })

        app.post('/orders', async(req,res)=>{
            req.body.createdAt = new Date();
            const result = await orders.insertOne(req.body)
            res.send(result);
        })

        app.get('/orders',verifyToken, async(req,res)=>{
            if (req.userDecoded==req.query.email) {
                const result = req.query.email?await orders.find({email:req.query.email}).toArray():await orders.find({}).toArray();
                res.send(result);                
            }else{
                res.status(401).json({message:'user not authorized'})
            }
        })

    } finally {
        // await client.close()
    }
}

run().catch(console.dir)

app.listen(port, () => {
    console.log('emma john - '+port);
})