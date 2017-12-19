
/**
 * Module dependencies
 */

var mongoose = require('mongoose');
var Schema = mongoose.Schema;
mongoose.Promise = require('bluebird');


var OutcomeSchema = {
  header: {
    msgId: { type: Number, default: '' },
    operation: { type: String, default: '' },
    type: { type: String, default: '' },
    timestamp: { type: Number, default: '' }
  },
  body: {
    marketId: { type: String, default: '' },
    outcomeId: { type: String, default: '' },
    name: { type: String, default: '' },
    price: { type: String, default: '' },
    displayed: { type: Boolean, default: '' },
    suspended: { type: Boolean, default: '' }
  }
};
var Outcome = mongoose.model('Outcome', OutcomeSchema);

var MarketSchema = new Schema ({
  header: {
    msgId: { type: Number, default: '' },
    operation: { type: String, default: '' },
    type: { type: String, default: '' },
    timestamp: { type: Number, default: '' }
  },
  body: {
    eventId: { type: String, default: '' },
    marketId: { type: String, default: '' },
    name: { type: String, default: '' },
    displayed: { type: Boolean, default: '' },
    suspended: { type: Boolean, default: '' }
  },
  outcomes: [{
    type: Schema.ObjectId,
    ref: 'Outcome'
  }]
});

var Market = mongoose.model('Market', MarketSchema);

/**
 * Event Data schema
 */

var EventSchema = new Schema({
  header: {
    msgId: { type: Number, default: '' },
    operation: { type: String, default: '' },
    type: { type: String, default: '' },
    timestamp: { type: Number, default: '' }
  },
  body: {
    eventId: { type: String, default: '' },
    category: { type: String, default: '' },
    subCategory: { type: String, default: '' },
    name: { type: String, default: '' },
    startTime: { type: Number, default: '' },
    displayed: { type: Boolean, default: '' },
    suspended: { type: Boolean, default: '' },
  },
  markets: [{
    type : Schema.ObjectId,
    ref:'Market'
  }]
});
var Event = mongoose.model('Event', EventSchema);
module.exports = {
  Event: Event,
  Market: Market,
  Outcome: Outcome
};