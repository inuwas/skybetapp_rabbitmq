var amqp = require('amqplib/callback_api');
var q = 'tasks';

var bail = (err) => {
  console.error(err);
  process.exit(1);
};

// Publisher
var publisher = (conn) => {
  conn.createChannel(on_open);
  function on_open(err, ch) {
    if (err != null) bail(err);
    ch.assertQueue(q);
    ch.sendToQueue(q, new Buffer('something to do'));
  }
};

// Consumer
var consumer = (conn) => {
  var ok = conn.createChannel(on_open);
  function on_open(err, ch) {
    if (err != null) bail(err);
    ch.assertQueue(q);
    ch.consume(q, function(msg) {
      if (msg !== null) {
        console.log(msg.content.toString());
        ch.ack(msg);
      }
    });
  }
};

var consumerService = (req, res) => {
  amqp.connect('amqp://localhost', (err, conn) => {
    conn.createChannel((err, ch) => {
      if (err != null) bail(err);
      consumer(conn);
      publisher(conn);
      
    });
  });
};
 
module.exports.consumerService = consumerService;

