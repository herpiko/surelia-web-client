
var should = require("should");
var Pool = require(__dirname + '/../../../api/surelia/pool');
describe('Pool', function() {
  it('should be able to create Pool', function(done) {
    var pool = Pool.getInstance();
    should.ok(pool);  
    done();
  });
  it('should not be able to create Pool', function(done) {
    var p = function() {
      var pool = new Pool();
    }
    p.should.throw();
    done();
  });
  it('should get an object from the pool', function(done) {
    var pool = Pool.getInstance();

    var createFunc = function() {
      return 'ok';
    }
    var destroyFunc = function() {
    }

    var o = pool.get('abc', null, createFunc, destroyFunc);
    o.should.equal('ok');
    done();
  });

  it('should get an object from the pool and get it from the pool not from newly created object', function(done) {
    var pool = Pool.getInstance();

    var createFunc = function() {
      return 'ok';
    }
    var destroyFunc = function() {
    }

    var o = pool.get('abc', null, createFunc, destroyFunc);
    o.should.equal('ok');
    // modify the contents directly to verify that it gets from the pool
    pool.map['abc'].obj = 'ko';
    var o = pool.get('abc', null, createFunc, destroyFunc);
    o.should.equal('ko');
    done();
  });

  it('should get an object from the pool (object version)', function(done) {
    var pool = Pool.getInstance();
    // reset map
    pool.map = {};

    var P = function() {
    }
    P.prototype.createFunc = function() {
      return 'ok';
    }
    P.prototype.destroyFunc = function() {
    }

    var p = new P();
    var o = pool.get('abc', p, p.createFunc, p.destroyFunc);
    o.should.equal('ok');
    done();
  });

  it('should get an object from the pool and will be removed at some point', function(done) {
    var pool = Pool.getInstance();
    // reset map
    pool.map = {};

    var P = function() {
      this.destroyed = false;
    }
    P.prototype.createFunc = function() {
      return 'ok';
    }
    P.prototype.destroyFunc = function() {
      this.destroyed = true;
    }

    pool.period = 1; // make iteration fast
    pool.expiry = 10; 
    var p = new P();
    var o = pool.get('abc', p, p.createFunc, p.destroyFunc);
    o.should.equal('ok');
    // modify the contents directly to verify that it gets from the pool
    pool.map['abc'].obj = 'ko';
    setTimeout(function() {
      p.destroyed.should.equal(true);
      var o = pool.get('abc', p, p.createFunc, p.destroyFunc);
      // It should not be ko, as it should be re-created
      o.should.equal('ok');
      done();
    }, 500);
  });




});
