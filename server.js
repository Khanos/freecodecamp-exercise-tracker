require('dotenv').config();
const express = require('express')
const app = express()
const bodyParser = require('body-parser')

const cors = require('cors')

const mongoose = require('mongoose');
mongoose.connect(process.env.CONNECTION_URL, {
  dbName: 'test',
  useNewUrlParser: true,
  useUnifiedTopology: true
});
let userSchema = new mongoose.Schema(
  {
    username: String
  }
);
let userModel = mongoose.model('userModel', userSchema );
let exerciseSchema = new mongoose.Schema(
  {
    userId: String,
    description: String,
    duration: String,
    date: Date
  }
);
let exerciseModel = mongoose.model('exerciseModel', exerciseSchema );

app.use(cors())

app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())


app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});
// response.id "5db6c23290dc400230efbe9b"
app.post('/api/exercise/new-user', (req, res) => {
  if(req.body){
    userModel.find({username: req.body.username}, function(err, response){
      if(err) {
        return res.status(500).send({error: err});
      }
      if(response.length === 0){
        userModel.create({username: req.body.username}, function(err, response){
          if(err) {
            return res.status(500).send({error: err});
          }
          return res.json(response);
        })
      } else {
        return res.json(response);
      }
    });
  } else {
    return res.status(500).send({error: new Error('Bad POST')});
  }
});

app.get('/api/exercise/users', (req, res) => {
  userModel.find((err, response) => {
    if(err){
      return res.status(500).send({error: err});
    }
    return res.json(response);
  });
});

app.post('/api/exercise/add', (req, res) => {
  if(req.body.userId){
    userModel.findById(req.body.userId, (err, response) => {
      if(err){
        return res.status(500).send({error: err});
      }
      if(response.length === 1){
        exerciseModel.create(req.body, (err, response) => {
          if(err){
            return res.status(500).send({error: err});
          }
          return res.json(response);
        });
      } else {
        return res.send({message: 'Invalid UserId'});
      }
    });
  } else {
    return res.status(500).send({error: new Error('BAD REQUEST')})
  }
});

// http://localhost:3000/api/exercise/log?userId=5db8139f2393353bb4117b28&from=2000-02-02&&to=2004-05-05&&limit=2
app.get('/api/exercise/log', (req, res) => {
  let query = {};
  if(req.query.userId){
    userModel.findById(req.query.userId, function(err, response){
      if(err){
        return res.send('unknown userId');
      }
      if(response.length === 0){
        return res.send('unknown userId');
      }
      let result = {
        "_id": response.id,
        "username": response.username
      }
      query.userId = response.id;
      if(req.query.from){
        if(!query.hasOwnProperty('date')){
          query.date = new Object();
        };
        query.date['$gte'] = new Date(req.query.from);
      };
      if(req.query.to){
        if(!query.hasOwnProperty('date')){
          query.date = new Object();
        };
        query.date['$lte'] = new Date(req.query.to);
      };
      let q = exerciseModel.find(query).limit(req.query.limit ? parseInt(req.query.limit) : 0);
      q.exec((err, response) => {
        if(err){
          return res.status(500).send({error: err});
        } else {
          result.count = response.length;
          result.log = new Array();
          response.forEach(element => {
            result.log.push({
              "description": element.description,
              "duration": element.duration,
              "date": element.date
            });
          })
          return res.json(result);
        }
      });
    });
  } else {
    return res.send('unknown userId');
  }
})


// Not found middleware
app.use((req, res, next) => {
  return next({status: 404, message: 'not found'})
})

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage

  if (err.errors) {
    // mongoose validation error
    errCode = 400 // bad request
    const keys = Object.keys(err.errors)
    // report the first validation error
    errMessage = err.errors[keys[0]].message
  } else {
    // generic or custom error
    errCode = err.status || 500
    errMessage = err.message || 'Internal Server Error'
  }
  res.status(errCode).type('txt')
    .send(errMessage)
});
mongoose.connection.on('error', function (err) {
  console.log('Could not connect to mongo server!');
  console.log(err);
});
mongoose.connection.on('open', function (ref) {
  console.log('Connected to mongo server.');
  const listener = app.listen(process.env.PORT || 3000, () => {
    console.log('Your app is listening on port ' + listener.address().port)
  })
});

