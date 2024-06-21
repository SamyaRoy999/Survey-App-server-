require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const jwt = require('jsonwebtoken');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const port = process.env.PORT || 5000

// middlewere 
app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true,
}));

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
        const collectionPayment = client.db('SurveyScape').collection('payment');


        // jwt releted 

        app.post('/jwt', async (req, res) => {
            const user = req.body;
            const token = await jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
            res.send({ token });
        })

        // midelwere

        const verifyToken = (req, res, next) => {
            if (!req.headers.authorization) {
                return res.status(401).send({ massage: 'forbidden access' });
            }
            const token = req.headers.authorization.split(' ')[1]
            jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
                if (err) {
                    return res.status(401).send({ massage: 'forbidden access' });
                }
                req.decoded = decoded;
                next()
            })
        }

        // user releted api for admin
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

        app.get('/users', verifyToken, async (req, res) => {
            const result = await collectionUser.find().toArray();
            res.send(result);
        })

        app.get('/users/admin/:email', verifyToken, async (req, res) => {
            const email = req.params.email;
            if (email !== req.decoded.email) {

                return res.status(403).send({ massage: 'unauthorized access' });
            }
            const quary = { email: email };
            const user = await collectionUser.findOne(quary);
            let admin = false;
            if (user) {
                admin = user?.role === 'admin';
            }
            res.send({ admin });
        });

        app.get('/users/survayor/:email', verifyToken, async (req, res) => {
            const email = req.params.email;
            if (email !== req.decoded.email) {

                return res.status(403).send({ massage: 'unauthorized access' });
            }
            const quary = { email: email };
            const user = await collectionUser.findOne(quary);
            let surveyor = false;
            if (user) {
                surveyor = user?.role === 'surveyor';
            }
            res.send({ surveyor });
        })

        app.get('/users/proUser/:email', verifyToken, async (req, res) => {
            const email = req.params.email;
            if (email !== req.decoded.email) {
                return res.status(403).send({ massage: 'unauthorized access' });
            }
            const quary = { email: email };
            const user = await collectionUser.findOne(quary);
            let proUser = false;
            if (user) {
                proUser = user?.role === 'pro-user';
            }
            res.send({ proUser });
        })

        app.patch('/users/admin/:id', async (req, res) => {
            const id = req.params.id;
            const update = req.body;
            const quary = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: {
                    role: update.role
                }
            };
            const result = await collectionUser.updateOne(quary, updateDoc);
            res.send(result);
        })

        app.delete('/user/role/:id', verifyToken, async (req, res) => {
            const id = req.params.id;
            console.log(id);
            const quary = { _id: new ObjectId(id) };
            const result = await collectionUser.deleteOne(quary);
            res.send(result)
        })

        // all survay for unpublic survay route
        app.get('/allSurvey', verifyToken, async (req, res) => {
            const result = await collectionSurvay.find().toArray();
            res.send(result);
        })

        //admin survay unpublish / publish
        app.patch('/survayStatus/:id', verifyToken, async (req, res) => {
            const id = req.params.id;
            const quary = { _id: new ObjectId(id) };
            const { status } = req.body;
            const updateDoc = {
                $set: {
                    status: status,
                }
            };
            const result = await collectionSurvay.updateOne(quary, updateDoc);
            res.send(result);

        })

        // survayor releted data 

        app.post('/survayCreate', verifyToken, async (req, res) => {
            const { title, description, surveyorEmail, options, category, deadline } = req.body;
            const surveyData = {
                title,
                description,
                surveyorEmail,
                options,
                category,
                deadline,
                status: 'publish',
                timestamp: new Date()
            };
            const result = await collectionSurvay.insertOne(surveyData);
            res.send(result);

        })

        // login survayor get her creation survey data
        app.get('/survayorSurvey/:email', verifyToken, async (req, res) => {
            const email = req.params.email;
            const quary = { surveyorEmail: email };
            const result = await collectionSurvay.find(quary).toArray();
            res.send(result);
        })

        // login survayor survay update 
        app.put('/survayUpdate/:id', verifyToken, async (req, res) => {
            const id = req.params.id;
            const quary = { _id: new ObjectId(id) };
            const { title, description, category, deadline } = req.body;
            const option = { upsert: true };
            const updateSurvay = {
                $set: { title, description, category, deadline }
            };

            const result = await collectionSurvay.updateOne(quary, updateSurvay, option);
            res.send(result);
        })

        // all survey get 
        app.get('/survayCreate', async (req, res) => {
            const result = await collectionSurvay.find().toArray();
            res.send(result);
        })

        // single survay get 
        app.get('/survayCreate/:id', async (req, res) => {
            const id = req.params.id;
            const quary = { _id: new ObjectId(id) };
            const result = await collectionSurvay.findOne(quary);
            res.send(result);
        })



        app.patch('/vote/:id', async (req, res) => {
            const id = req.params.id;
            const { vote, name, email, photo } = req.body
            const quary = { _id: new ObjectId(id) };
            const updateDoc = { $push: { voters: { vote, name, email, photo } } };
            const result = await collectionSurvay.updateOne(quary, updateDoc);
            res.send(result);
        })


        // payment intend
        app.post('/create-payment-intent', async (req, res) => {
            const { payment } = req.body;
            const amount = parseInt(payment * 100);
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: "usd",
                payment_method_types: ['card']
            })
            res.send({
                clientSecret: paymentIntent.client_secret,
            });

        })

        // payment histroy
        app.post('/payment', async (req, res) => {
            const payment = req.body;
            const result = await collectionPayment.insertOne(payment)
            res.send(result)

        })

        // all payment show admin deshboard
        app.get('/payment', verifyToken, async (req, res) => {
            const result = await collectionPayment.find().toArray();
            res.send(result)
        })

        // Participate survey email get 
        app.get('/participate/surveys/:email', async (req, res) => {
            const email = req.params.email;
            const filterEmail = { "voters.email": email };
            const result = await collectionSurvay.find(filterEmail).toArray();
            res.send(result);
        });

        // Pro user comment survey 
        app.patch('/proUser/comment/:id', verifyToken, async (req, res) => {
            const id = req.params.id;
            const { comment, name, email, photo, timestamp } = req.body;
            const quary = { _id: new ObjectId(id) };
            const updateDoc = { $push: { comment: { comment, name, email, photo, timestamp } } };
            const result = await collectionSurvay.updateOne(quary, updateDoc);
            res.send(result)
        })

        // prouser comment find  

        app.get('/proUser/comment/:email', verifyToken, async (req, res) => {
            const email = req.params.email;
            const filter = { 'comment.email': email };
            const result = await collectionSurvay.find(filter).toArray();
            const filteredComments = result.map(survey => {
                return {
                    ...survey,
                    comment: survey.comment.filter(comt => comt.email === email)
                };
            });

            res.send(filteredComments);
        })

        //  Report survay 

        app.patch('/user/report/:id', async (req, res) => {
            const id = req.params.id;
            const { surveyId, userEmail, reason, timestamp } = req.body;
            const quary = { _id: new ObjectId(id) };
            const updateDoc = { $push: { reports: { surveyId, userEmail, reason, timestamp } } };
            const result = await collectionSurvay.updateOne(quary, updateDoc);
            res.send(result)
        })

        // survay report find on user

        app.get('/user/report/:email', async (req, res) => {
            const email = req.params.email;
            const filter = { 'reports.userEmail': email };
            const result = await collectionSurvay.find(filter).toArray();
            const filteredReports = result.map(survey => {
                return {
                    ...survey,
                    reports: survey.reports.filter(rep => rep.userEmail === email)
                };
            });

            res.send(filteredReports);
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

