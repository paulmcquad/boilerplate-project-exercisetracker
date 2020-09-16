const express = require("express");
const app = express();
const bodyParser = require("body-parser");

const cors = require("cors");

const mongodb = require("mongodb");
const mongoose = require("mongoose");

/* mongoose.connect(process.env.DB_URI, {
  useNewUrlParser: true,
  useFindAndModify: false,
  useCreateIndex: true,
  useUnifiedTopology: true,
}); */

mongoose.connect(
  "mongodb://localhost:27017/?readPreference=primary&appname=MongoDB%20Compass%20Community&ssl=false",
  {
    useMongoClient: true,
  }
);

//FreeCodeCamp's validation
app.use(cors());

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(express.static("public"));
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

//Create User Schema
const Schema = mongoose.Schema;
const exerciseUsers = new Schema({
  username: { type: String, required: true },
  exercise: [
    {
      _id: false,
      description: {
        type: String,
        required: true,
      },
      duration: {
        type: Number,
        required: true,
      },
      date: {
        type: Date,
        default: Date.now,
      },
    },
  ],
});

//Convert User Schema into a Model
const ExerciseUsers = mongoose.model("ExerciseUsers", exerciseUsers);

//Create New User
const createUser = (username, done) => {
  ExerciseUsers.create({ username: username }, (err, data) => {
    if (err) done(err);
    done(null, data);
  });
};

//Post New User
app.post("/api/exercise/new-user", (req, res) => {
  let username = req.body.username;
  createUser(username, (err, data) => {
    err
      ? res.send("Error")
      : res.send({ username: data.username, _id: data._id });
  });
});

//Get all users
app.get("/api/exercise/users", (req, res) => {
  ExerciseUsers.find({})
    .select("username _id")
    .exec((err, data) => {
      if (err) console.log(err);
      res.send(data);
    });
});

///Add Exercise v2.
app.post("/api/exercise/add", (req, res) => {
  let { userId, description, duration } = req.body;

  ExerciseUsers.findOneAndUpdate(
    { _id: userId },
    {
      $push: {
        exercise: {
          description: description,
          duration: Number(duration),
          date: req.body.date
            ? new Date(req.body.date).toDateString()
            : new Date().toDateString(),
        },
      },
    },
    { new: true },
    (err, data) => {
      if (data == null) {
        res.json("Please make sure all camps were introduced correctly");
      } else {
        res.send({
          _id: data._id,
          description: description,
          duration: Number(duration),
          date: req.body.date
            ? new Date(req.body.date).toDateString()
            : new Date().toDateString(),
          username: data.username,
        });
      }
    }
  );
});

//Retrieve users exercise data
app.get("/api/exercise/log", (req, res) => {
  //Define variables from url and apply logic
  let userId = req.query.userId;
  let from = req.query.from !== undefined ? new Date(req.query.from) : null;
  let to = req.query.to !== undefined ? new Date(req.query.to) : null;
  let limit = parseInt(req.query.limit);

  ExerciseUsers.findOne({ _id: userId }, (err, data) => {
    let count = data.exercise.length;

    if (data == null) {
      res.send("User not found");
    } else {
      if (from && to) {
        res.send({
          _id: userId,
          username: data.username,
          count: limit || count,
          log: data.exercise
            .filter((e) => e.date >= from && e.date <= to)
            .slice(0, limit || count),
        });
      } else {
        res.send({
          _id: userId,
          username: data.username,
          count: limit || count,
          log: data.exercise.slice(0, limit || count),
        });
      }
    }
  });
});

const deleteAllDocs = () => {
  ExerciseUsers.remove({}, (err, data) => {
    if (err) console.log(err);
    console.log("All users were deleted");
  });
};
// Not found middleware
app.use((req, res, next) => {
  return next({ status: 404, message: "not found" });
});

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage;

  if (err.errors) {
    // mongoose validation error
    errCode = 400; // bad request
    const keys = Object.keys(err.errors);
    // report the first validation error
    errMessage = err.errors[keys[0]].message;
  } else {
    // generic or custom error
    errCode = err.status || 500;
    errMessage = err.message || "Internal Server Error";
  }
  res.status(errCode).type("txt").send(errMessage);
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("http://localhost:" + listener.address().port);
});

/*const callback = (err, data) => {
    err ? console.log(err) : console.log(data);
  }*/
