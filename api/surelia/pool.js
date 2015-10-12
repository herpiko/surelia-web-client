'use strict';

var global = global || {};
var magic = 0x30307070;
/**
 * A singleton class to hold a named resource poo
 */
var Pool = function(m) {
  if (m !== magic) throw new Error('Use getInstance to create this object');

  this.map = {};
  /* this.expiry = 10 * 60 * 1000; // 10 minutes */
  this.expiry = 10000; // 10 seconds
  this.date = Date;
  this.period = 1000; // 1 seconds
}

/**
 * Creates a singleton
 */
Pool.getInstance = function() {
  if (global.Pool) {
    return global.Pool;
  }

  global.Pool = new Pool(magic);
  return global.Pool;
}

/**
 * Get a resource pool or create one
 * @param {String} id - the id of the resource
 * @param {Object} owner - the object which holds the createFunc and destroyFunc
 * @param {Function} createFunc - the function which creates the resource
 * @param {Function} destroyFunc - the function which destroy the resource
 * @return {Object} the object from the pool
 */
Pool.prototype.get = function(id, owner, createFunc, destroyFunc) {
  var self = this;
  if (self.map[id]) {
    return self.map[id].obj;
  }

  var obj = createFunc.apply(owner, [])
  self.map[id] = {
    expire: (self.date.now()).valueOf() + self.expiry,
    obj: obj,
    destroyFunc: destroyFunc,
    owner: owner
  }

  self.check();
  return obj;
}

Pool.prototype.destroy = function() {
  var self = this;
  
  for (var i in self.map) {
    var o = self.map[i];
    var now = self.date.now();
    if (now > o.expire) {
      if (o.destroyFunc && typeof(o.destroyFunc) === 'function') {
        o.destroyFunc.apply(o.owner, []);
        o.obj = null;
      }
      self.map[i] = null;
      delete(self.map[i]);
    }
  }
}

Pool.prototype.check = function() {
  var self = this;

  setTimeout(function() {
    self.destroy();
    self.check();
  }, self.period);
}
module.exports = Pool;
