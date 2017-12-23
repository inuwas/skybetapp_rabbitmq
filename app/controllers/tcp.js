'use strict';
var amqp = require('amqplib/callback_api');
var q = 'tasks';
var net = require('net');
// var dataPacket = [];
var Event = require('../models/event').Event;
var Market = require('../models/event').Market;
var Outcome = require('../models/event').Outcome;

/**
 * Connects TCP service and saves data to mongodb
 * @param {channel} conn 
 * @param {response} res 
 */
var connectToServer = (conn,res) => {
  // var client = new net.Socket();

  let client = net.createConnection({ port: 8282 }, () => {

    client.write('Test Worked!\r\n');
  });

  client.on('data', (data) => {
    // End client after server's final response
    publisher(conn, data);
    client.end();
  });

  client.on('end', () => {
    // res.json({ message: dataPacket });
    consumer(conn, res);
    console.log('Ended');
  });
  
  client.on('close', () => {
    console.log('Connection closed');
  });
};

var bail = (err) => {
  console.error(err);
  process.exit(1);
};

// Publisher
var publisher = (conn, data) => {
  let on_open = (err, ch) => {
    if (err != null) bail(err);
    ch.assertQueue(q, { durable: true } );
    ch.sendToQueue(q, data, { persistent: true });
  };
  conn.createChannel(on_open);
};

var consumer = (conn, res) => {
  let on_open = (err, ch) => {
    if (err != null) bail(err);
    ch.assertQueue(q);
    ch.prefetch(1);
    
    ch.consume(q, (msg) => {
      if (msg !== null) {
        // console.log(msg.content.toString());
        // dataPacket.push(msg.content.toString());
        let messageDetails = convertToJson(msg.content.toString());
        // saveToDatabase(msg);
        saveToDatabase(messageDetails);
        ch.ack(msg);
      }
    }, { noAck: false });
  };
  let ok = conn.createChannel(on_open);
};
/**
 * Runs the RabbitMQ Consumer Service
 * @param {request} req 
 * @param {response} res 
 */
var consumerService = (req, res) => {
  amqp.connect('amqp://localhost', (err, conn) => {
    conn.createChannel((err, ch) => {
      if (err != null) bail(err);
      // consumer(conn);
      // publisher(conn);
      connectToServer(conn, res);
    });
  });
};

/**
 * Saves the json object ot 
 * @param {Object} message 
 */
// var saveToDatabase = (message) => {
//   let messageDetails = convertToJson(message);
var saveToDatabase = (messageDetails) => {
    // messageDetails = convertToJson(message);
  switch (messageDetails.dataType) {
    case 'event': {
      let newEvent = new Event(messageDetails);
      // save the new event
      newEvent.save().then((event) => {
        return event;
      }).catch((error) => {
        throw new Error(error);
      });
      break;
    }
    case 'market': {
      // push messageDetails data to a db
      // Find a related event and push the market to it
      Event.findOne({ eventID: messageDetails.eventId }).then((theEvent) => {
        console.log('EventID: ', messageDetails.eventId);
        let newMarket = new Market(messageDetails);
        newMarket.save().then((market) => {
          if (theEvent){
            let markets = theEvent.markets;
            markets.push(market._id);
            // theEvent.markets.push(market._id);
            theEvent.markets = markets;
            theEvent.save();
          }
          return market;
        }).catch((error) => {
          throw new Error(error);
        });
        return theEvent;
      }).catch((error) => {
        console.log('see');
        throw new Error(error);
      });
      break;
    }
    case 'outcome':
      Market.findOne({ marketId: messageDetails.marketId }).then((theMarket) => {
        let newOutcome = new Outcome(messageDetails);
        newOutcome.save().then((outcome) => {
          if (theMarket) {
            let outcomes = theMarket.outcomes;
            outcomes.push(outcome._id);
            // theMarket.outcomes.push(outcome._id);
            theMarket.outcomes = outcomes;
            theMarket.save();
          }
          return theMarket;
        }).catch((error) => {
          throw new Error(error);
        });
        return theMarket;
      }).catch((error) => {
        throw new Error(error);
      });
      break;
  }
};
/**
 * Splits string with pipe into array
 * @param {String} pipedString 
 * @returns Array
 */
var splitArray = (message) => {
  message.replace('||', '|').replace('| vs |', ' vs ').replace('||', '|');
  let arrayInitialSplit = message.split('|');
  arrayInitialSplit.shift();
  let returnedArray = arrayInitialSplit.map((element, index) => {
    if (!element || element === '\\' || element === '\n') {
      arrayInitialSplit.splice(index, 1);
    }
  });
  console.log('arrayInitial: ', arrayInitialSplit);
  return returnedArray;
};
/**
 * Converts String to JSON from pipe delimiter
 * @param {String} message 
 * @returns Object
 */
var convertToJson = (message) => {
  let eventData = splitArray(message);
  eventData.map((element, index) => {
    console.log('%d: ', index, JSON.stringify(element));
  });
  let dataType = '';
  if (message.indexOf('event') != -1) {
    dataType = 'event';
  }
  else if (message.indexOf('market') != -1) {
    dataType = 'market';
  }
  else {
    dataType = 'outcome';
  }
  let eventJSONData = {};
  eventJSONData.dataType = dataType;
  eventJSONData.header = {};
  eventJSONData.body = {};
  eventData.forEach((element, index) => {
    if (!element || element.trim() === '\\' || element.trim() === '') {
      eventData.splice(index, 1);
    }
    else {
      switch (index) {
        case 0:
          eventJSONData.header.msgId = element;
          break;
        case 1:
          eventJSONData.header.operation = element;
          break;
        case 2:
          eventJSONData.header.type = element;
          break;
        case 3:
          eventJSONData.header.timestamp = element;
          break;
        case 4:
          if (dataType === 'outcome')
          {
            eventJSONData.body.marketId = element;
          }
          else {
            eventJSONData.body.eventId = element;          
          }
          break;
        case 5:
          if (dataType === 'market') {
            eventJSONData.body.marketId = element;
          }
          else if (dataType === 'outcome') {
            eventJSONData.body.eventId = element;
          }
          else {
            eventJSONData.body.category = element;
          }
          break;
        case 6:
          if ((dataType) ? 'market' : 'outcome') {
            eventJSONData.body.name = element;
          }
          else {
            eventJSONData.body.subCategory = element;
          }
          break;
        case 7:
          if (dataType === 'market') {
            eventJSONData.body.displayed = element;
          }
          else if (dataType === 'outcome') {
            eventJSONData.body.price = element;
          }
          else {
            eventJSONData.body.name = element;
          }
          break;
        case 8:
          if (dataType === 'market') {
            eventJSONData.body.suspended = element;
          }
          else if (dataType === 'outcome') {
            eventJSONData.body.displayed = element;
          }
          else {
            eventJSONData.body.startTime = element;
          }
          break;
        case 9:
          if (dataType === 'outcome') {
            eventJSONData.body.suspended = element;
          }
          else if (dataType !== 'market'){
            eventJSONData.body.displayed = element;
          }
          break;
        case 10:
          eventJSONData.body.suspended = element;
          break;
      }
    }
  });
  return eventJSONData;
};

module.exports.consumerService = consumerService;

