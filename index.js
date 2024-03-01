const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.sezawpu.mongodb.net/?retryWrites=true&w=majority`;

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

    const customerCollection = client.db("broadband").collection("customers");
    const userCollection = client.db("broadband").collection("users");
    const customerPaymentCollection = client.db("broadband").collection("customers-payment");
    const expenseCollection = client.db("broadband").collection("expense");
    const expenseCollection1 = client.db("broadband").collection("expense1");
    // jwt related api
    app.post('/jwt', async (req, res) => {
      const user = req.body;
     
      const token = jwt.sign(user, process.env.ACCESS_TOKEN, { expiresIn: '1h' });
      res.send({ token });
    })

    // middlewares 
    const verifyToken = (req, res, next) => {
      // console.log('inside verify token', req.headers.authorization);
      if (!req.headers.authorization) {
        return res.status(401).send({ message: 'unauthorized access' });
      }
      const token = req.headers.authorization.split(' ')[1];
      jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: 'unauthorized access' })
        }
        req.decoded = decoded;
        next();
      })
    }

    // use verify admin after verifyToken
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const isAdmin = user?.role === 'admin';
      // console.log(isAdmin);
      if (!isAdmin) {
        return res.status(403).send({ message: 'forbidden access' });
      }
      next();
    }

    // users related api
    app.get('/users', verifyToken, async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });

    // Customers related api
    app.get('/customers', verifyToken, async (req, res) => {
      const result = await customerCollection.find().toArray();
      res.send(result);
    });
    app.post('/customer', verifyToken, verifyAdmin, async (req, res) => {
      const customers = req.body;
      const findCustomer = await customerCollection.find().toArray()
      const alreadyCustomer = findCustomer.filter(customer=>customer?.email === customers.email);
      // console.log(alreadyCustomer);
      if(alreadyCustomer.length > 0){
        res.send("Oop! Customer already added")
      }
      else{
        const result = await customerCollection.insertOne(customers);
        res.send(result);
      }

  })

  // Expense Related Api
  app.get('/expense', verifyToken, async (req, res) => {
    const result = await expenseCollection1.find().toArray();
    res.send(result);
  });
  app.post('/expense', verifyToken, async (req, res) => {
    const expense = req.body;
    const result = await expenseCollection1.insertOne(expense);
    res.send(result);
})



    // Customer Payment Related Api
    app.get('/customerspayment', verifyToken, async (req, res) => {
      const result = await customerPaymentCollection.find().toArray();
      res.send(result);
    });

    app.put('/updatepayments', async (req, res) => {

      const updateCustomerPayment = req.body;

      // console.log();
      const id = updateCustomerPayment.id;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updateDoc = {
          $set: {

              amount: updateCustomerPayment.amount,
              date: updateCustomerPayment.date,
              status: updateCustomerPayment.status,
              payment: updateCustomerPayment.payment
          }
      }
      const result = await customerCollection.updateOne(filter, updateDoc, options)
      res.send(result);
  })


  app.post('/updatepaymentsdate', async (req, res) => {

    const customerPayment = req.body;
    // console.log(customerPayment)
    const result = await customerPaymentCollection.insertOne(customerPayment);
    res.send(result);

})


app.put('/banktransfer', async (req, res) => {

  const data = req.body;

  console.log(data);
  const id = data.spid;
  console.log(id);
const filter = { spid: id };
// console.log(filter)
const options = { upsert: true };
// console.log(options)
const updateDoc = {
    $set: {

      bankTransferStatus: true,

    }
}
const result = await customerPaymentCollection.updateOne(filter, updateDoc, options)
console.log(result);
  
}
)


    app.post('/users', async (req, res) => {
      const user = req.body;
      // console.log(user)
      // insert email if user doesnt exists: 
      // you can do this many ways (1. email unique, 2. upsert 3. simple checking)
      const query = { email: user.email }
      const existingUser = await userCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: 'user already exists', insertedId: null })
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    app.put('/users/admin/:id', verifyToken, async (req, res) => {
      const id = req.params.id;
      // console.log(id)
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          role: 'admin'
        }
      }
      const result = await userCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });


    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    // console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('Broadband server is running')
})

app.listen(port, () => {
  console.log(`Broadband server is running on port ${port}`);
})

