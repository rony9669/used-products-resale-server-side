const express = require("express");
const cors = require("cors");
//for jwt
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const app = express();
const port = process.env.PORT || 5000;

//use or middle wares
app.use(cors());
app.use(express.json());

//for jwt
app.post("/jwt", (req, res) => {
  const user = req.body;
  const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET);
  res.send({ token });
});

//for verifyJWT token which i get in order api which is a get operation
function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: "unauthorized access" });
  }
  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
    //token verify
    if (err) {
      return res.status(403).send({ message: "Forbidden access" });
    }
    req.decoded = decoded;
    next();
  });
}

//console.log(process.env.DB_USER);
//console.log(process.env.DB_PASSWORD);

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.gavhqqs.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

//function
async function run() {
  try {
    const categoryCollection = client
      .db("bikeBazaar")
      .collection("bikeCategory");

    const allBikesCollection = client.db("bikeBazaar").collection("allBikes");
    const usersCollection = client.db("bikeBazaar").collection("users");
    const bookingsCollection = client.db("bikeBazaar").collection("bookings");
    const wishlistCollection = client.db("bikeBazaar").collection("wishlist");
    const paymentsCollection = client.db("bikeBazaar").collection("payments");

    //!new NOTE: make sure you use {verifyAdmin} after verifyJWT
    const verifyAdmin = async (req, res, next) => {
      const decodedEmail = req.decoded.email;
      const query = { email: decodedEmail };
      const user = await usersCollection.findOne(query);

      if (user?.role !== "Admin") {
        return res.status(403).send({ message: "forbidden access" });
      }
      next();
    };
    //new NOTE: make sure you use {verifySeller} after verifyJWT
    const verifySeller = async (req, res, next) => {
      const decodedEmail = req.decoded.email;
      const query = { email: decodedEmail };
      const user = await usersCollection.findOne(query);

      if (user?.role !== "Seller") {
        return res.status(403).send({ message: "forbidden access" });
      }
      next();
    };
    //new NOTE: make sure you use {verifyBuyer} after verifyJWT
    const verifyBuyer = async (req, res, next) => {
      const decodedEmail = req.decoded.email;
      const query = { email: decodedEmail };
      const user = await usersCollection.findOne(query);

      if (user?.role !== "Buyer") {
        return res.status(403).send({ message: "forbidden access" });
      }
      next();
    };

    // new for bike add to db by seller
    app.post("/allbikes", async (req, res) => {
      const bike = req.body;
      const result = await allBikesCollection.insertOne(bike);
      res.send(result);
    });
    // new for get advertise data {Problem}
    app.get("/allbikes", async (req, res) => {
      const query = { advertise: "on" };
      const result = await allBikesCollection.find(query).toArray();
      res.send(result);
    });
    // new for bike get from db by seller my product page using transtec query/react query
    app.get("/allbikes/myproduct", async (req, res) => {
      const email = req.query.email;
      // console.log(email);
      const query = { email: email };
      const result = await allBikesCollection.find(query).toArray();
      res.send(result);
    });
    //new for geting all bikes by name
    app.get("/category", async (req, res) => {
      const query = {};
      const result = await categoryCollection.find(query).toArray();
      res.send(result);
    });
    //new for geting all bikes by name
    app.get("/categoryDetails/:name", async (req, res) => {
      const name = req.params.name;
      const query = { name };
      const bikes = await allBikesCollection.find(query).toArray();
      res.send(bikes);
    });
    //!new for  user add
    app.post("/users", async (req, res) => {
      const user = req.body;
      // console.log(user.email);
      const query = { email: user.email };
      const alreadyUser = await usersCollection.findOne(query);
      // console.log(alreadyUser);
      if (alreadyUser == null) {
        const result = await usersCollection.insertOne(user);
        res.send(result);
      }
    });

    //!new for  user update after verify
    app.put("/users/update", async (req, res) => {
      const email = req.query.email;
      console.log(email);
      const filter = { email: email };
      const options = { upsert: true };
      const updatedDoc = {
        $set: {
          verification: "verified",
        },
      };
      const result = await allBikesCollection.updateOne(
        filter,
        updatedDoc,
        options
      );
      res.send(result);
    });

    //!new for check user admin or not
    app.get("/users/admin/:email", async (req, res) => {
      const email = req.params.email;
      // console.log(email);
      const query = { email };
      const user = await usersCollection.findOne(query);
      res.send({ isAdmin: user?.role === "Admin" });
    });

    //!new for check user seller or not
    app.get("/users/seller/:email", async (req, res) => {
      const email = req.params.email;
      // console.log(email);
      const query = { email };
      const user = await usersCollection.findOne(query);
      res.send({ isSeller: user?.role === "Seller" });
    });
    //!new for check user buyer or not
    app.get("/users/buyer/:email", async (req, res) => {
      const email = req.params.email;
      // console.log(email);
      const query = { email };
      const user = await usersCollection.findOne(query);
      res.send({ isBuyer: user?.role === "Buyer" });
    });

    //! new for get api check {buyer}
    app.get("/sellers", async (req, res) => {
      const query = { role: "Seller" };
      const result = await usersCollection.find(query).toArray();
      res.send(result);
    });
    //! new for get api {buyers}
    app.get("/buyers", async (req, res) => {
      const query = { role: "Buyer" };
      const result = await usersCollection.find(query).toArray();
      res.send(result);
    });

    //!new Delete a sellers
    app.delete("/users/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const result = await usersCollection.deleteOne(filter);
      res.send(result);
    });
    //!New for update sellers
    app.put("/users/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const options = { upsert: true };
      const updatedDoc = {
        $set: {
          status: "verified",
        },
      };
      const result = await usersCollection.updateOne(
        filter,
        updatedDoc,
        options
      );
      res.send(result);
    });

    //!new for booking add to db
    app.post("/bookings", async (req, res) => {
      const booking = req.body;

      const result = await bookingsCollection.insertOne(booking);
      res.send(result);
    });
    //! new for get api {bookig} using axios
    app.get("/bookings", async (req, res) => {
      const email = req.query.email;
      // console.log(email);
      const query = { email: email };
      const result = await bookingsCollection.find(query).toArray();
      res.send(result);
    });
    //!new for getting booking data for payment
    app.get("/bookings/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const booking = await bookingsCollection.findOne(query);
      res.send(booking);

      // if (!booking) {
      //   const booking = await wishlistCollection.findOne(query);
      //   res.send(booking);
      // }
    });
    //!new for getting wishlist data for payment{error}
    app.get("/wishlists/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      // const booking = await bookingsCollection.findOne(query);
      // res.send(booking);
      const booking = await wishlistCollection.findOne(query);
      res.send(booking);
    });

    //!new payment api for stripe
    app.post("/create-payment-intent", async (req, res) => {
      const booking = req.body;
      const price = booking.price; //change korte hote pare
      const amount = price * 100;

      const paymentIntent = await stripe.paymentIntents.create({
        currency: "usd",
        amount: amount,
        payment_method_types: ["card"],
      });
      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });
    //!new payment info save to db
    app.post("/payments", async (req, res) => {
      const payment = req.body;
      const result = await paymentsCollection.insertOne(payment);
      const id = payment.bookingId;
      const filter = { _id: ObjectId(id) };
      const updatedDoc = {
        $set: {
          paid: true,
          transactionId: payment.transactionId,
        },
      };
      const updatedResult = await bookingsCollection.updateOne(
        filter,
        updatedDoc
      );
      res.send(result);
    });
    //!new payment info save to db for booking and delete from product ui
    app.post("/payments/product", async (req, res) => {
      const payment = req.body;
      const result = await paymentsCollection.insertOne(payment);
      const id = payment.productId;
      const filter = { _id: ObjectId(id) };
      const updatedDoc = {
        $set: {
          paid: true,
          transactionId: payment.transactionId,
        },
      };
      const updatedResult = await allBikesCollection.updateOne(
        filter,
        updatedDoc
      );
      res.send(result);
    });
    //!new payment info save to db for wishlist
    app.post("/payments/wishlist", async (req, res) => {
      const payment = req.body;
      const result = await paymentsCollection.insertOne(payment);
      const id = payment.bookingId;
      const filter = { _id: ObjectId(id) };
      const updatedDoc = {
        $set: {
          paid: true,
          transactionId: payment.transactionId,
        },
      };
      const updatedResult = await wishlistCollection.updateOne(
        filter,
        updatedDoc
      );
      res.send(result);
    });
    //!new payment info save to db for wishlist and delete from product ui
    app.post("/payments/wishlist/product", async (req, res) => {
      const payment = req.body;
      const result = await paymentsCollection.insertOne(payment);
      const id = payment.productId;
      const filter = { _id: ObjectId(id) };
      const updatedDoc = {
        $set: {
          paid: true,
          transactionId: payment.transactionId,
        },
      };
      const updatedResult = await allBikesCollection.updateOne(
        filter,
        updatedDoc
      );
      res.send(result);
    });

    //!new for wishlist add to db
    app.post("/wishlist", async (req, res) => {
      const wishlist = req.body;

      const result = await wishlistCollection.insertOne(wishlist);
      res.send(result);
    });
    //! new for get api {wishlist} using axios
    app.get("/wishlist", async (req, res) => {
      const email = req.query.email;
      // console.log(email);
      const query = { email: email };
      const result = await wishlistCollection.find(query).toArray();
      res.send(result);
    });

    //!New for making advertisement
    app.put("/allbikes/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const options = { upsert: true };
      const updatedDoc = {
        $set: {
          advertise: "on",
        },
      };
      const result = await allBikesCollection.updateOne(
        filter,
        updatedDoc,
        options
      );
      res.send(result);
    });

    //!new Delete a product
    app.delete("/allbikes/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const result = await allBikesCollection.deleteOne(filter);
      res.send(result);
    });

    //স্পেসিফিক ডাটা গেট করার জন্য service id unojie. jeta mdb te save  koorce{reviews own}
    app.get("/myreviews", verifyJWT, async (req, res) => {
      const decoded = req.decoded;

      if (decoded.email !== req.query.email) {
        res.status(403).send({ message: "unauthorized access" });
      }
      let query = {};
      if (req.query.email) {
        query = {
          email: req.query.email,
        };
      }

      const cursor = reviewCollection.find(query); // colection er help nea cursor banalam khujar jonno data ta computer er cursor er moto kore. akhne findone use korce akta khujtese tai
      const reviews = await cursor.toArray(); // cursor er sahajje data ta  anlam. akhne to array korte hoine cause ata akta element only
      res.send(reviews); // data ta pathia delam response hisabe|
    });
    //end
  } finally {
  }
}

run().catch((err) => console.log(err));

app.get("/", (req, res) => {
  res.send("welcome to misu's kitchen");
});

app.listen(port, () => {
  console.log(`server is running on ${port}`);
});
