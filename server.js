const express = require('express');
const router = express.Router();
const app = express();
const bodyParser = require('body-parser');
const fs = require("fs");
const cors = require('cors')
const source = require('./source.json');
let columns = require('./columns.json');

app.use(express.json())

app.use(bodyParser.urlencoded({
  parameterLimit: 10000,
  extended: false,
  limit: 2000000
}));

app.use(cors({credentials: true, origin: true}));

app.use(function(req, res, next) {
  res.header('Content-Type', 'application/json')
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  res.header('Access-Control-Allow-Methods', 'PUT, POST, GET, DELETE, OPTIONS');
  next();
});

router.get('/columns', (request,response) => {
  response.send(columns);
});

router.post('/columns', (request,response) => {
  columns.forEach(column => {
    if (column.field === request.body.field) response.send(500);
  });
  columns.push(request.body);
  fs.writeFile('columns.json', JSON.stringify(columns), function writeJSON(err) {
    if (err) return console.log(err);
    response.send(columns);
  });
});

router.post('/deleteColumn', (request,response) => {
  columns = columns.filter(column => {
    return column.field !== request.body.field;
  });
  fs.writeFile('columns.json', JSON.stringify(columns), function writeJSON(err) {
    if (err) return console.log(err);
    response.send(columns);
  });
});

router.delete('/file/:id', (request,response) => {
  source.forEach((item, index) => {
    if (item.TaskID === request.query.TaskID) source.splice(index, 1);
  });
  fs.writeFile('source.json', JSON.stringify(source), function writeJSON(err) {
    if (err) return console.log(err);
    response.send(200);
  });
});

router.post('/file', (request,response) => {
  if (!Object.keys(request.body).length) {
    response.send(200);
  } else {
    let newItem = request.body.taskData;
    newItem.StartDate = new Date();
    newItem.Priority = 'Critical';
    newItem.isParent = !newItem.ParentItem;
    source.push(newItem);

    if (newItem.ParentItem) {
      source.forEach(item => {
        if (item.TaskID === newItem.ParentItem) item.isParent = true;
      });
    }

    fs.writeFile('source.json', JSON.stringify(source), function writeJSON(err) {
      if (err) return console.log(err);
      let filteredData = source.filter((item) => {
        return item.isParent;
      })
      response.send({count: filteredData.length, items: filteredData, result: filteredData});
    });
  }
});

router.get('/file', (request,response) => {
  if (request.query.$filter.includes('null')) {
    let filteredData = source.filter((item) => {
      return !item.ParentItem;
    })
    response.send({count: filteredData.length, items: filteredData, result: filteredData});
  } else sendPartialData(request, response);
});

router.put('/file', (request,response) => {
  let newItem = {...request.body};
  delete newItem.taskData;
  delete newItem.level;
  delete newItem.index;
  delete newItem.parentItem;
  delete newItem.parentUniqueID;
  delete newItem.uniqueID;
  delete newItem.checkboxState;
  source.forEach(item => {
    if (item.TaskID === request.body.TaskID) item = newItem;
  });
  fs.writeFile('source.json', JSON.stringify(source), function writeJSON(err) {
    if (err) return console.log(err);
    response.send(200);
  });
});

let sendPartialData = (req, res) => {
  let parentID = req.query.$filter.split(" ").splice(-1)[0];
  // let test = [];
  // for (let i = 0; i < source.length; i++) {
  //     if (source[i].ParentItem && (source[i].ParentItem === parentID)) test.push(source[i]);
  // }
  let filteredSource = source.filter(item => {
    return item.ParentItem && (item.ParentItem == parentID);
  });
  res.send({count: filteredSource.length, items: filteredSource, result: filteredSource});
};

app.use("/", router);

app.listen(8080);
