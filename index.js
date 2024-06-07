const express = require('express');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 5000
require('dotenv').config();

// middlewere 
app.use(cors());
app.use(express.json());




const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.vmk1mwc.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();

        const collectionUser = client.db('SurveyScape').collection('users');
        const collectionSurvay = client.db('SurveyScape').collection('survay');


        // user releted api 
        app.post('/users', async (req, res) => {
            const user = req.body;
            const quary = { email: user.email }
            const existingUser = await collectionUser.findOne(quary)

            if (existingUser) {
                return res.send({ massages: 'user already exist', insertedID: null })
            }
            const result = await collectionUser.insertOne(user);
            res.send(result);
        })

        app.get('/users', async (req, res) => {
            const result = await collectionUser.find().toArray();
            res.send(result);
        })

        app.patch('/users/admin/:id', async (req, res) => {
            const id = req.params.id;
            const update = req.body;
            console.log(id, update);
            const quary = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: {
                    role: update.role
                }
            };
            const result = await collectionUser.updateOne(quary, updateDoc);
            console.log(result);
            res.send(result);
        })

        // survayor releted data 

        app.post('/survayCreate', async (req, res) => {
            const { title, description, options, category, deadline } = req.body;
            const surveyData = {
                title,
                description,
                options,
                category,
                deadline,
                status: 'publish',
                timestamp: new Date()
            };
            const result = await collectionSurvay.insertOne(surveyData);
            res.send(result);

        })

        app.get('/survayCreate', async (req, res) => {
            const result = await collectionSurvay.find().toArray();
            res.send(result);
        })
        
        app.get('/survayCreate/:id', async(req, res) => {
            const id = req.params.id;
            const quary = {_id: new ObjectId(id)};
            const result = await collectionSurvay.findOne(quary);
            res.send(result); 
        })


        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('SURVAY APP API')
})

app.listen(port, () => {
    console.log(`server is ranning port ${port}`);
});

