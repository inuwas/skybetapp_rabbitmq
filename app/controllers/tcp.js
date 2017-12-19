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
 * @param {*} res 
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
        saveToDatabase(msg);
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


var saveToDatabase = (message) => {
  
  message.replace('||', '|').replace('| vs |', ' vs ').replace('||', '|');
  let eventData = splitArray(message);
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
  let messageDetails = convertToJson(eventData, dataType);

  // Store the Event Data
  switch (dataType) {
    case 'event': {
      let newEvent = new Event(messageDetails);
      // save the new event
      newEvent.save((error) => {
        if (error) {
          throw new Error(error);
        } else {
          console.log('Saved');
        }
      });
      break;
    }
    case 'market': {
      // push messageDetails data to a db
      // Find a related event and push the market to it
      Event.findOne({ eventID: messageDetails.eventId }).then((theEvent) => {
        let newMarket = new Market(messageDetails);
        newMarket.save((error) => {
          if (error) throw new Error(error);
          theEvent.markets.push(newMarket._id);
        }); 
      }).catch((error) => {
        throw new Error(error);
      });
      break;
    }
    case 'outcome':
      Market.findOne({ marketId: messageDetails.marketId }).then((theMarket) => {
        let newOutcome = new Outcome(messageDetails);
        newOutcome.save((error) => {
          if (error) throw new Error(error);
          theMarket.outcomes.push(newOutcome._id);
        });
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
var splitArray = (pipedString) => {
  let returnedArray = pipedString.split('|');
  return returnedArray;
};
/**
 * Converts String to JSON from pipe delimiter
 * @param {Array} eventData 
 * @param {String} messageType 
 * @returns Object
 */
var convertToJson = (eventData, messageType) => {
  let eventJSONData = {};
  eventData.forEach((element, index) => {
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
        if (messageType === 'outcome')
        {
          eventJSONData.header.marketId = element;
        }
        else {
          eventJSONData.header.eventId = element;          
        }
        break;
      case 5:
        if (messageType === 'market') {
          eventJSONData.header.marketId = element;
        }
        else if (messageType === 'outcome') {
          eventJSONData.header.eventId = element;
        }
        else {
          eventJSONData.header.category = element;
        }
        break;
        case 6:
        if ((messageType) ? 'market' : 'outcome') {
          eventJSONData.header.name = element;
        }
        else {
          eventJSONData.header.subCategory = element;
        }
        break;
        case 7:
        if (messageType === 'market') {
          eventJSONData.header.displayed = element;
        }
        else if (messageType === 'outcome') {
          eventJSONData.header.price = element;
        }
        else {
          eventJSONData.header.name = element;
        }
        break;
        case 8:
        if (messageType === 'market') {
          eventJSONData.header.suspended = element;
        }
        else if (messageType === 'outcome') {
          eventJSONData.header.displayed = element;
        }
        else {
          eventJSONData.header.startTime = element;
        }
        break;
        case 9:
        if (messageType === 'outcome') {
          eventJSONData.header.suspended = element;
        }
        else if (messageType !== 'market'){
          eventJSONData.header.displayed = element;
        }
        break;
        case 10:
          eventJSONData.header.suspended = element;
        break;
    }
  });
  return eventJSONData;
};
module.exports.consumerService = consumerService;

