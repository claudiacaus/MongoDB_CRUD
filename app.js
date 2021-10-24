const express = require('express');
const path = require('path');
const db = require('./db');
const collection = 'todo';
const Joi = require('joi');

const app = express();

// parses json data sent to us by the user
app.use(express.json());

// schema used for data validation for our todo document
const schema = Joi.object().keys({
  todo: Joi.string().required(),
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// read
app.get('/getTodos', (req, res) => {
  // get all Todo documents within our todo collection
  // send back to user as json
  db.getDB()
    .collection(collection)
    .find({})
    .toArray((err, documents) => {
      if (err) console.log(err);
      else {
        console.log(documents);
        res.json(documents);
      }
    });
});

// update
app.put('/:id', async (req, res, next) => {
  // Primary Key of Todo Document we wish to update
  const todoId = req.params.id;
  // Document used to update
  const userInput = req.body;

  // Find Document By ID and Update
  try {
    await schema.validateAsync(userInput);
    db.getDB()
      .collection(collection)
      .findOneAndUpdate(
        { _id: db.getPrimaryKey(todoId) },
        { $set: { todo: userInput.todo } },
        { returnDocument: 'after', returnOriginal: false },
        (err, result) => {
          if (err) {
            const error = new Error('An error occurred while updating');
            error.status = 400;
            next(error);
          } else {
            res.json({
              result: result,
              msg: 'Successfully updated!!!',
              error: null,
            });
          }
        },
      );
  } catch (err) {
    const error = new Error('Invalid Input');
    console.log('Validation error');
    error.status = 400;
    next(error);
  }
});

// create
app.post('/', async (req, res, next) => {
  // Document to be inserted
  const userInput = req.body;

  // Validate document
  // If document is invalid pass to error middleware
  // else insert document within todo collection
  try {
    await schema.validateAsync(userInput);
    db.getDB()
      .collection(collection)
      .insertOne(userInput, (err, result) => {
        if (err) {
          const error = new Error('Failed to insert ToDo Document');
          error.status = 400;
          next(error);
        } else {
          db.getDB()
            .collection(collection)
            .findOne(
              { _id: db.getPrimaryKey(result.insertedId) },
              (err, result2) => {
                if (err) {
                  const error = new Error('Failed to insert ToDo Document');
                  error.status = 400;
                  next(error);
                } else {
                  console.log('Todo: ', result2);
                  res.json({
                    result: result,
                    document: result2,
                    msg: 'Successfully inserted!!!',
                    error: null,
                  });
                }
              },
            );
        }
      });
  } catch (err) {
    const error = new Error('Invalid Input');
    console.log('Validation error');
    error.status = 400;
    next(error);
  }
});

//delete
app.delete('/:id', (req, res) => {
  // Primary Key of Todo Document
  const todoId = req.params.id;
  // Find Document By ID and delete document from record
  db.getDB()
    .collection(collection)
    .findOneAndDelete({ _id: db.getPrimaryKey(todoId) }, (err, result) => {
      if (err) console.log(err);
      else res.json(result);
    });
});

// Middleware for handling Error
// Sends Error Response Back to User
app.use((err, req, res, next) => {
  res.status(err.status).json({
    error: {
      message: err.message,
    },
  });
});

db.connect((err) => {
  // If err unable to connect to database
  // End application
  if (err) {
    console.log('unable to connect to database');
    process.exit(1);
  }
  // Successfully connected to database
  // Start up our Express Application
  // And listen for Request
  else {
    app.listen(3000, () => {
      console.log('connected to database, app listening on port 3000');
    });
  }
});
