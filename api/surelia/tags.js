var mongoose = require("mongoose");
var Joi = require("joi");
var Tags = function(server, options, next) {
  this.server = server;
  this.options = options || {};
  this.registerEndPoints();
}

Tags.prototype.registerEndPoints = function() {
  var self = this;
  self.server.route({
    method: "GET",
    path: "/api/tags",
    handler: function(request, reply) {
      self.list(request, reply);
    }
  });

  self.server.route({
    method: "POST",
    path: "/api/tags",
    handler: function(request, reply) {
      self.create(request, reply);
    },
    config: {
      validate: {
        payload: {
          name: Joi.string().required(),
          color: Joi.string().regex(/^#[A-Fa-f0-9]{6}/).required(),
        }
      }
    }
  });

  self.server.route({
    method: "GET",
    path: "/api/tag/{id}",
    handler: function(request, reply) {
      self.read(request, reply);
    }
  });

  self.server.route({
    method: "POST",
    path: "/api/tag/{id}",
    handler: function(request, reply) {
      self.update(request, reply);
    },
    config: {
      validate: {
        payload: {
          name: Joi.string(),
          color: Joi.string().regex(/^#[A-Fa-f0-9]{6}/),
        }
      }
    }
  });

  self.server.route({
    method: "DELETE",
    path: "/api/tag/{id}",
    handler: function(request, reply) {
      self.remove(request, reply);
    }
  });
}

/**
 * @api {get} /api/tags List tags 
 * @apiName listTags
 * @apiGroup Tags
 *
 * @apiParam {String} [q] String to filter result 
 * @apiParam {Number} [limit] Number of the result per page 
 * @apiParam {Number} [page] Starting page to query 
 *
 * @apiSuccess {Object} result Result object 
 * @apiSuccess {Number} result.total Total number of result
 * @apiSuccess {Number} result.pages Total number of pages 
 * @apiSuccess {Object[]} result.data List of tags
 * @apiSuccess {String} result.data.name Name of a tag
 * @apiSuccess {String} result.data.color Color of the tag
 */
Tags.prototype.list = function(request, reply) {
  var self = this;
  var defaultLimit = 10;

  var query = {};
  var limit = request.query.limit || defaultLimit;
  var sort = request.query.sort || "name";
  var page = request.query.page || 0;
  if (request.query.q) {
    query = {
      name: new RegExp(request.query.q, "i")
    }
  }

  // count all records first
  model().count(query, function(err, count) {
    if (err) return reply(err);

    var q = model()
      .find(query) 
      .lean()
      .sort(sort)
      ;

    var numPages = 1; 
    if (limit != -1) {
      q.limit(limit);
      q.skip(limit * page);
      numPages =  Math.ceil(count/limit);
    }
    
    q.exec(function(err, result) {
        if (err) return reply(err);
        reply({
          total: count,
          pages: numPages,
          data: result
        }).type("application/json");
      });
  });
}

/**
 * @api {post} /api/tags Creates a new tag
 * @apiName createTag
 * @apiGroup Tags
 *
 * @apiParam {String} name Tag name
 * @apiParam {String} color Hex color code of the tag
 *
 * @apiSuccess {Object} result Result
 * @apiSuccess {Boolean} result.success True 
 *
 * @apiError (400) {Object} resut Result
 * @apiError (400) {Number} result.statusCode 400
 * @apiError (400) {String} result.error Error code
 * @apiError (400) {String} result.message Description about the error 
 * @apiError (400) {Object} result.validation Validation object describing the error 
 * @apiError (400) {String} result.validation.source Source of the error 
 * @apiError (400) {String[]} result.validation.keys Arrays of the keys of the source which caused the error
 */
Tags.prototype.create = function(request, reply) {
  var payload = request.payload;
  model().create(payload, function(err, result) {
    if (err) return reply(err);
    reply(result).type("application/json");
  });
}

/**
 * @api {get} /api/tag/{id} Read a tag
 * @apiName readTag
 * @apiGroup Tags
 *
 * @apiSuccess {Object} result Result
 * @apiSuccess {String} result.name Name of the tag 
 * @apiSuccess {String} result.color Color of the tag 
 *
 * @apiError {Object} result Result, an empty object
 */

Tags.prototype.read = function(request, reply) {
  var self = this;
  var query = model().findOne({_id:request.params.id});
  query
    .lean()
    .exec(function(err, result) {
    if (err) return reply(err);
    if (result == null) {
      return reply({}).statusCode = 404;
    }
    reply(result).type("application/json");
  });

}

/**
 * @api {post} /api/tag/{id} Updates a new tag
 * @apiName updateTag
 * @apiGroup Tags
 *
 * @apiParam {String} [name] Tag name
 * @apiParam {String} [color] Hex color code of the tag
 *
 * @apiSuccess {Object} result Result
 * @apiSuccess {Boolean} result.success True 
 *
 * @apiError {Object} resut Result
 * @apiError {Number} result.statusCode HTTP status code
 * @apiError {String} result.error Error code
 * @apiError {String} result.message Description about the error 
 * @apiError {Object} result.validation Validation object describing the error 
 * @apiError {String} result.validation.source Source of the error 
 * @apiError {String[]} result.validation.keys Arrays of the keys of the source which caused the error
 */
Tags.prototype.update = function(request, reply) {
  var bogus = false;
  var id;
  try {
    id = mongoose.Types.ObjectId(request.params.id);
  } catch (err) {
    bogus = true;
  }
  if (bogus) {
    return reply({
          statusCode: 404,
          message: "Tag was not found", 
          validation: {
            source: "DB",
            keys: [ "id" ]
          }
        }).statusCode = 404;
  }
  model().findOneAndUpdate({ _id: id },
    { $set: request.payload },
    function(err, doc) {
      if (err) 
        return reply({
          statusCode: 500,
          message: err, 
          validation: {
            source: "DB"
          }
        }).statusCode = 500;

      if (doc == null) 
        return reply({
          statusCode: 404,
          message: "Tag was not found",
          validation: {
            source: "DB",
            keys: [ "id" ]
          }
        }).statusCode = 404;
 
      return reply({success: true}).type("application/json").statusCode = 200;
    });
}

/**
 * @api {delete} /api/tag/{id} Removes a tag 
 * @apiName removeTag
 * @apiGroup Tags
 *
 * @apiSuccess {Object} result Result
 * @apiSuccess {Boolean} result.success True 
 *
 * @apiError (500) {Object} resut Result
 * @apiError (500) {Number} result.statusCode 500
 * @apiError (500) {String} result.error Error code
 * @apiError (500) {Object} result.message Description about the error 
 * @apiError (500) {Object} result.validation Validation object describing the error 
 * @apiError (500) {String} result.validation.source Source of the error 
 */

Tags.prototype.remove = function(request, reply) {
  model().findOneAndRemove({ _id: request.params.id}, 
    function(err) {
      if (err) return reply({
        statusCode: 500,
        message: err,
        validation: {
          source: "DB"
        }
      }).statusCode = 500;
      reply({success: true}).type("application/json");
    });

}


var model = function() {
  var registered = false;
  var m;
  try {
    m = mongoose.model("Tags");
    registered = true;
  } catch(e) {
  }

  if (registered) return m;
  var schema = {
    name: String,
    color: String
  }

  var s = new mongoose.Schema(schema);
  m = mongoose.model("Tags", s);
  return m;

}


exports.model = model;

exports.register = function(server, options, next) {
  new Tags(server, options, next);
  next();
};

exports.register.attributes = {
  pkg: require("./package.json")
};


