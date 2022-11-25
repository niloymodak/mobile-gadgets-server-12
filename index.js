const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config();
const port = process.env.PORT || 5000;

const app = express();

// middleware
app.use(cors());
app.use(express.json());



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.hagnwzq.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try {
        const categoriesCollection = client.db('mobileGadgets').collection('categories');
        const bookingsCollection = client.db('mobileGadgets').collection('bookings');

        app.get('/categories', async (req, res) => {
            const date = req.query.date;
            const query = {};
            const options = await categoriesCollection.find(query).toArray();
            res.send(options);
        });

        app.get('/v2/categories', async (req, res) => {
            const mobile = req.query.date;
            const options = await categoriesCollection.aggregate([
                {
                    $lookup: {
                        from: 'bookings',
                        localField: 'name',
                        foreignField: 'model',
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $eq: ['$mobile', mobile]
                                    }
                                }
                            }
                        ],
                        as: 'booked'
                    }
                },
                {
                    $project: {
                        name: 1,
                        mobile: 1,
                        booked: {
                            $map: {
                                input: '$booked',
                                as: 'book',
                                in: '$$book.mobile'
                            }
                        }
                    }
                },
                {
                    $project: {
                        name: 1,
                        mobile: {
                            $setDifference: ['$mobile', '$booked']
                        }
                    }
                }
            ]).toArray();
            res.send(options);
        })

        app.post('/bookings', async (req, res) => {
            const booking = req.body;
            console.log(booking);
            const query = {
                model: booking.model,
                email: booking.email,
            }

            const alreadyBooked = await bookingsCollection.find(query).toArray();

            if (alreadyBooked.length) {
                const message = `You already have a booking on ${booking.model}`
                return res.send({ acknowledged: false, message })
            }

            const result = await bookingsCollection.insertOne(booking);
            res.send(result);
        })




    }
    finally {

    }
}
run().catch(console.log);

app.get('/', async (req, res) => {
    res.send('Mobile Gadgets server is running');
})

app.listen(port, () => console.log(`Mobile Gadgets running on ${port}`))