require('events').EventEmitter.prototype._maxListeners = 100;
var server = require(__dirname + "/../../../lib/server");
server.start();
var supertest = require("supertest");
var request = supertest("localhost:3000");
var should = require("should");
var lodash = require("lodash");
var composer = require("mailcomposer");
var hoodiecrow = require("hoodiecrow"),
    inspect = require('util').inspect;
var timeout = 500

if (!process.env.TEST_SMTP_USERNAME || !process.env.TEST_SMTP_PASSWORD) {
  console.log("This unit testing needs a real Gmail account, please set the credential to environment variable TEST_SMTP_USERNAME and TEST_SMTP_PASSWORD");
  process.exit();
}

var randomString = function(){
  return Math.random().toString(36).substring(7);
}

// Define Hoodiecrow IMAP server
var hoodiecrowServer = hoodiecrow({
  plugins: ["SPECIAL-USE"],
  storage: {
    "INBOX": {
      "special-use": "\\Inbox",
      messages: [{
        raw: "From: sender name <sender@example.com>\r\n" +
            "To: Receiver name <receiver@example.com>\r\n" +
            "Subject: hello 1\r\n" +
            "Date: Fri, 13 Sep 2013 15:01:00 +0300\r\n" +
            "\r\n" +
            "World 1!"
      }, {
        raw: "From: sender name <sender@example.com>\r\n" +
            "To: Receiver name <receiver@example.com>\r\n" +
            "Subject: hello 2\r\n" +
            "Date: Fri, 13 Sep 2013 15:01:00 +0300\r\n" +
            "\r\n" +
            "World 2!"
      }, {
        raw: "From: sender name <sender@example.com>\r\n" +
            "To: Receiver name <receiver@example.com>\r\n" +
            "Subject: hello 3\r\n" +
            "Date: Fri, 13 Sep 2013 15:01:00 +0300\r\n" +
            "\r\n" +
            "World 3!"
      }, {
        raw: "From: sender name <sender@example.com>\r\n" +
            "To: Receiver name <receiver@example.com>\r\n" +
            "Subject: hello 4\r\n" +
            "Date: Fri, 13 Sep 2013 15:01:00 +0300\r\n" +
            "\r\n" +
            "World 4!"
      }, {
        raw: "From: sender name <sender@example.com>\r\n" +
            "To: Receiver name <receiver@example.com>\r\n" +
            "Subject: hello 5\r\n" +
            "Date: Fri, 13 Sep 2013 15:01:00 +0300\r\n" +
            "\r\n" +
            "World 5!"
      }, {
        raw: "From: sender name <sender@example.com>\r\n" +
            "To: Receiver name <receiver@example.com>\r\n" +
            "Subject: hello 6\r\n" +
            "Date: Fri, 13 Sep 2013 15:01:00 +0300\r\n" +
            "\r\n" +
            "World 6!"
      }]
    },
    "": {
      "separator": "/",
      "folders": {
        "[Gmail]": {
          "flags": ["\\Noselect"],
          "folders": {
            "All Mail": {
                "special-use": "\\All"
            },
            "Drafts": {
                "special-use": "\\Drafts"
            },
            "Important": {
                "special-use": "\\Important"
            },
            "Sent Mail": {
                "special-use": "\\Sent"
            },
            "Spam": {
                "special-use": "\\Junk"
            },
            "Starred": {
                "special-use": "\\Flagged"
            },
            "Trash": {
              "special-use": "\\Trash",
            }
          }
        }
      }
    }
  }
});


var Imap = require(__dirname + "/../../../api/surelia").module.IMAP;
var credentials = {
  user : "testuser",
  password : "testpass",
  host : "localhost",
  port : 1143,
  tls : false
}
var mail = new Imap(credentials);

var SMTPConnection = require(__dirname + "/../../../api/surelia").module.SMTP;
var smtp, 
  token, 
  newMailBox, 
  newMailBox2, 
  draftsPath,
  trashPath;

var Mailback = require('mailback');
var onMessage = function(err, message) {
  //console.log(arguments, '------------------');
}

var smtpServer = new Mailback.Server({ onMessage: onMessage, port: 25255, host: 'localhost' });
smtpServer.start(function() {
// Connect to the server once it is actually listening
hoodiecrowServer.listen(1143, function(){
  
  // Start unit testing
  describe("SMTP", function() {
    describe("SMTP Initial and Auth", function() {
      it("Should connect to SMTP server @port " + smtpServer.info.port, function(done){
        var options = {
          host : smtpServer.info.host,
          port : smtpServer.info.port,
          tls: {rejectUnauthorized: false} 
        }
        smtp = new SMTPConnection(options);
        should(smtp.isConnected()).equal(false);
        smtp.connect()
          .then(function(){
            should(smtp.isConnected()).equal(true);
            done();
          })
          .catch(function(err){
            done(err);
          })
      })
      it.skip("Should get authenticated to SMTP server", function(done){
        var username = "someemail@example.com";
        var password = "justapassword";
        smtp.auth(username, password)
          .then(function(){
            done();
          })
          .catch(function(err){
            done(err);
          })
      })
      it("Should be able to send mail to SMTP server", function(done){
        var sender = "email1@example.com";
        var recipients = ["email2@example.com"];
        var newMail = composer({
          to : recipients,
          from : sender,
          sender : "Sender",
          subject : "Subject",
          html : "Message content"
        });
        newMail.build(function(err, message){
          if (err) {
            return done(err);
          }
          smtp.send(sender, recipients, message)
            .then(function(info){
              console.log(info);
              done();
            })
            .catch(function(err){
              console.log(err);
              return done(err);
            })
        })
      })
    });
  });
  describe("IMAP", function() {
    before(function(done){
      should(mail.isConnected()).equal(false);
      mail.connect()
        .then(function(){
          should(mail.isConnected()).equal(true);
          // This UT does not work well if the INBOX is empty. Let fill it.
            var data = {
              imapHost : "imap.gmail.com",
              imapPort : "993",
              imapTLS : true,
              smtpHost : "smtp.gmail.com",
              smtpPort : "465",
              smtpTLS : true,
              smtpSecure : true,
              username : process.env.TEST_SMTP_USERNAME,
              password : process.env.TEST_SMTP_PASSWORD,
            }
            server.inject({
              method: "POST",
              url : "/api/1.0/auth",
              payload : data,
            }, function(response){
              token = response.result.token;
              var data = {
                // Envelope
                from : process.env.TEST_SMTP_USERNAME,
                recipients : [process.env.TEST_SMTP_USERNAME],
                sender : "Surelia",
                subject : "Subject of the message",
                html : "Content of the message"
              }
              server.inject({
                method: "POST",
                url : "/api/1.0/send",
                payload : data,
                headers : {
                  token : token,
                  username : process.env.TEST_SMTP_USERNAME
                }
              }, function(response){
                console.log(response.result);
                should(response.result.accepted.length).equal(1);
                done();
              })
            })
        })
        .catch(function(err){
          console.log(err);
          done(err);
        })
    })
    describe("IMAP", function() {
      it("should be able to list special boxes ", function(done) {
        mail.getSpecialBoxes()
          .then(function(result){
            done();
          })
          .catch(function(err){
            return done(err);
          })
      });
      it("should be able to list the contents of main box ", function(done) {
        mail.listBox("INBOX")
          .then(function(result){
            should(result.data.length).equal(6);
            done();
          })
          .catch(function(err){
            return done(err);
          })
      });
      it("should be fail to list the contents of main box that does not exist ", function(done) {
        mail.listBox("SOMETHINGTHATDOESNTEXIST")
          .then(function(result){
            return done('This should not happened');
          })
          .catch(function(err){
            done();
          })
      });
      it("should be able to list the contents of main box with more parameter ", function(done) {
        mail.listBox("INBOX", 2, 1)
          .then(function(result){
            should(result.data.length).equal(2);
            done();
          })
          .catch(function(err){
            return done(err);
          })
      });
      it("should be able to add new mail box", function(done) {
        mail.createBox("NEWMAILBOX")
          .then(function(){
            return mail.getBoxes()
          }).then(function(boxes){
            var shouldBeTrue = lodash.some(boxes, function(box){
              return box.boxName == "NEWMAILBOX";
            })
            should(shouldBeTrue).equal(true);
            done();
          }).catch(function(err) {
            return done(err);
          })
      });
      it("should be able to rename a mail box, NEWMAILBOX to NEWBOX", function(done) {
        mail.renameBox("NEWMAILBOX", "NEWBOX")
          .then(function(){
            return mail.getBoxes()
          }).then(function(boxes){
            var shouldBeTrue = lodash.some(boxes, function(box){
              return box.boxName == "NEWBOX";
            })
            should(shouldBeTrue).equal(true);
            done();
          }).catch(function(err) {
            return done(err);
          })
      });
      it("should be fail to rename unexisting mail box", function(done) {
        mail.renameBox("NOTEXIST", "NEWBOX")
          .then(function(){
            return done('This should not happened');
          })
          .catch(function(err) {
            if (err) {
              should(err.message).equal("Mailbox does not exist");
              done();
            } else {
              done('Error thrown but is not specified. Check code');
            }
          })
      });
      it("should be able to delete a mail box", function(done) {
        mail.removeBox("NEWBOX")
          .then(function(){
            return mail.getBoxes();
          }).then(function(boxes){
            should(boxes.NEWBOX).equal(undefined);
            done();
          }).catch(function(err) {
            if (err) {
            }
          })
      });
      it("should be fail to delete a mail box", function(done) {
        mail.removeBox("NOTEXIST")
          .then(function(){
          })
          .catch(function(err) {
            if (err) {
              should(err.message).equal("Mailbox does not exist");
              done();
            } else{
              done('Error thrown but is not specified. Check code');
            }
          })
      });
      it("should be able to fetch a mail by UID", function(done) {
        mail.retrieveMessage(1, "INBOX")
          .then(function(mail){
            should(mail.attributes.uid).equal(1);
            done();
          })
          .catch(function(err) {
            return done(err);
          })
      });
      it("should be fail to fetch unexisting UID", function(done) {
        mail.retrieveMessage(123456789, "INBOX")
          .then(function(mail){
            return done('This should not happened');
          })
          .catch(function(err) {
            if (err) {
              done();
            } else {
              done('Error thrown but is not specified. Check code');
            }
          })
      });
      it("should be able to move a message to other box", function(done) {
        mail.createBox("SOMEBOX")
          .then(function(){
            return mail.moveMessage(1, "INBOX", "SOMEBOX");
        }).then(function(){
            return mail.retrieveMessage(1, "SOMEBOX");
        }).then(function(mail){
          should(mail.attributes.uid).equal(1);
          done();
        }).catch(function(err) {
          return done(err);
        })
      });
      it("should be able to remove a message to Trash", function(done) {
        mail.removeMessage(1, "INBOX")
          .then(function(){
            return mail.listBox(mail.specials.Trash.path);
          })
          .then(function(result){
            should(result.data[0].header.from).equal("sender name <sender@example.com>");
            done();
          })
          .catch(function(err) {
            return done(err);
          })
      });
      it("should be able to create new email message in draft box", function(done) {
        var newMail = composer({
          to : "someemail@example.com",
          from : "someemail1@example.com",
          sender : "Sender",
          subject : "Subject",
          html : "Content"
        });
        newMail.build(function(err, message){
          if (err) {
            return done(err);
          }
          mail.newMessage(message, mail.specials.Drafts.path)
            .then(function(){
             return mail.listBox(mail.specials.Drafts.path)
            }).then(function(result){
              should(result.data[0].header.from).equal("someemail1@example.com");
              should(result.data[0].attributes.uid).equal(1);
              done();
            }).catch(function(err) {
            return done(err);
          })
        })
      });
      // Quota not yet implemented in hoodiecrow
      it.skip("should be able to get quota information", function(done) {
        mail.quotaInfo()
          .then(function(result){
            result.should.have.property('usage');
            result.should.have.property('limit');
            result.usage.should.be.aboveOrEqual(0);
            result.limit.should.be.aboveOrEqual(0);
            done();
          })
        .catch(function(err){
          return done(err);
        })
      });
    });
  });
  describe("IMAP API Endpoint", function() {
    it("Should be fail to login because of wrong password", function(done){
      var data = {
        imapHost : "imap.gmail.com",
        imapPort : "993",
        imapTLS : true,
        smtpHost : "smtp.gmail.com",
        smtpPort : "465",
        smtpTLS : true,
        smtpSecure : true,
        username : process.env.TEST_SMTP_USERNAME,
        password : "wrongpassword",
      }
      server.inject({
        method: "POST",
        url : "/api/1.0/auth",
        payload : data,
      }, function(response){
        should(response.statusCode).equal(401);
        should(response.result.err).equal("Invalid credentials");
        done();
      })
    })
    it("Should be fail to login because of missing required payload key", function(done){
      var data = {
        imapHost : "imap.gmail.com",
        imapPort : "993",
        imapTLS : true,
        smtpHost : "smtp.gmail.com",
        smtpPort : "465",
        smtpTLS : true,
        smtpSecure : true,
        password : "wrongpassword",
      }
      server.inject({
        method: "POST",
        url : "/api/1.0/auth",
        payload : data,
      }, function(response){
        should(response.statusCode).equal(400);
        should(response.result.validation.source).equal("payload");
        should(response.result.validation.keys[0]).equal("username");
        done();
      })
    })
    it("Should be fail to login because of invalid payload key", function(done){
      var data = {
        imapHost : "imap.gmail.com",
        imapPort : "993",
        imapTLS : true,
        smtpHost : "smtp.gmail.com",
        smtpPort : "465",
        smtpTLS : true,
        smtpSecure : true,
        username : "someusername@domain.com",
        password : "wrongpassword",
        invalid : "invalid",
      }
      server.inject({
        method: "POST",
        url : "/api/1.0/auth",
        payload : data,
      }, function(response){
        should(response.statusCode).equal(400);
        should(response.result.validation.source).equal("payload");
        should(response.result.validation.keys[0]).equal("invalid");
        done();
      })
    })
    it("Should be fail to login because of wrong credentials : the username is not an email address", function(done){
      var data = {
        imapHost : "imap.gmail.com",
        imapPort : "993",
        imapTLS : true,
        smtpHost : "smtp.gmail.com",
        smtpPort : "465",
        smtpTLS : true,
        smtpSecure : true,
        username : "wrongusernamestring",
        password : "wrongpassword",
      }
      server.inject({
        method: "POST",
        url : "/api/1.0/auth",
        payload : data,
      }, function(response){
        should(response.statusCode).equal(400);
        should(response.result.validation.source).equal("payload");
        should(response.result.validation.keys[0]).equal("username");
        done();
      })
    })

    it("Should be able to connect and get token", function(done){
      var data = {
        imapHost : "imap.gmail.com",
        imapPort : "993",
        imapTLS : true,
        smtpHost : "smtp.gmail.com",
        smtpPort : "465",
        smtpTLS : true,
        smtpSecure : true,
        username : process.env.TEST_SMTP_USERNAME,
        password : process.env.TEST_SMTP_PASSWORD,
      }
      server.inject({
        method: "POST",
        url : "/api/1.0/auth",
        payload : data,
      }, function(response){
        token = response.result.token;
        done();
      })
    })
    it("Should be able to get quota info", function(done){
      server.inject({
        method: "GET",
        url : "/api/1.0/quota-info",
        headers : {
          token : token,
          username : process.env.TEST_SMTP_USERNAME
        }
      }, function(response){
        var result = response.result;
        result.should.have.property('usage');
        result.should.have.property('limit');
        result.usage.should.be.aboveOrEqual(0);
        result.limit.should.be.aboveOrEqual(0);

        done();
      })
    })

    it("Should be able to get mail boxes", function(done){
      server.inject({
        method: "GET",
        url : "/api/1.0/boxes",
        headers : {
          token : token,
          username : process.env.TEST_SMTP_USERNAME
        }
      }, function(response){
        var shouldBeTrue = lodash.some(response.result, function(box){
          return box.boxName == "INBOX";
        })
        should(shouldBeTrue).equal(true);
        done();
      })
    })
    it("Should be able to get special boxes", function(done){
      server.inject({
        method: "GET",
        url : "/api/1.0/special-boxes",
        headers : {
          token : token,
          username : process.env.TEST_SMTP_USERNAME
        }
      }, function(response){
        should(response.result.All.path).equal("[Gmail]/All Mail");
        should(response.result.Drafts.path).equal("[Gmail]/Drafts");
        should(response.result.Sent.path).equal("[Gmail]/Sent Mail");
        should(response.result.Junk.path).equal("[Gmail]/Spam");
        should(response.result.Trash.path).equal("[Gmail]/Trash");
        draftsPath = response.result.Drafts.path;
        trashPath = response.result.Trash.path;
        done();
      })
    })
    it("Should be able to get list of a mail box", function(done){
      server.inject({
        method: "GET",
        url : "/api/1.0/list-box?boxName=INBOX",
        headers : {
          token : token,
          username : process.env.TEST_SMTP_USERNAME
        }
      }, function(response){
        should(response.result.data.length).greaterThan(0);
        done();
      })
    })
    it("Should be fail to get list of a mail box that does not exist", function(done){
      server.inject({
        method: "GET",
        url : "/api/1.0/list-box?boxName=SOMETHINGTHATDOESNTEXIST",
        headers : {
          token : token,
          username : process.env.TEST_SMTP_USERNAME
        }
      }, function(response){
        should(response.result.err.substr(0, 15)).equal("Unknown Mailbox");
        done();
      })
    })
    it("Should be able to create new mail box", function(done){
      newMailBox = randomString();
      server.inject({
        method: "POST",
        url : "/api/1.0/box?boxName=" + newMailBox,
        headers : {
          token : token,
          username : process.env.TEST_SMTP_USERNAME
        }
      }, function(response){
        should(response.statusCode).equal(200);
        server.inject({
          method: "GET",
          url : "/api/1.0/boxes",
          headers : {
            token : token,
            username : process.env.TEST_SMTP_USERNAME
          }
        }, function(response){
          var shouldBeTrue = lodash.some(response.result, function(box){
            return box.boxName == newMailBox;
          })
          should(shouldBeTrue).equal(true);
          done();
        })
      })
    })
    it("Should be fail to create new mail box with existing mail box name", function(done){
      server.inject({
        method: "POST",
        url : "/api/1.0/box?boxName=" + newMailBox,
        headers : {
          token : token,
          username : process.env.TEST_SMTP_USERNAME
        }
      }, function(response){
        should(response.result.err.substr(0, 21)).equal("Duplicate folder name");
        done();
      })
    })
    it("Should be able to rename existing mail box", function(done){
      newMailBox2 = randomString();
      server.inject({
        method: "POST",
        url : "/api/1.0/rename-box?boxName=" + newMailBox + "&newBoxName=" + newMailBox2,
        headers : {
          token : token,
          username : process.env.TEST_SMTP_USERNAME
        }
      }, function(response){
        should(response.statusCode).equal(200);
        server.inject({
          method: "GET",
          url : "/api/1.0/boxes",
          headers : {
            token : token,
            username : process.env.TEST_SMTP_USERNAME
          }
        }, function(response){
          var shouldBeFalse = lodash.some(response.result, function(box){
            return box.boxName == newMailBox;
          })
          should(shouldBeFalse).equal(false);
          var shouldBeTrue = lodash.some(response.result, function(box){
            return box.boxName == newMailBox2;
          })
          should(shouldBeTrue).equal(true);
          done();
        })
      })
    })
    it("Should be fail to rename unexisting mail box", function(done){
      server.inject({
        method: "POST",
        url : "/api/1.0/rename-box?boxName=SOMETHINGTHATDOESNTEXIST&newBoxName=" + newMailBox2,
        headers : {
          token : token,
          username : process.env.TEST_SMTP_USERNAME
        }
      }, function(response){
        should(response.result.err.substr(0, 21)).equal("Unknown source folder");
        done();
      })
    })
    it("Should be fail to rename mail box to other existing mail box name", function(done){
      server.inject({
        method: "POST",
        url : "/api/1.0/rename-box?boxName=" + newMailBox2+ "&newBoxName=INBOX",
        headers : {
          token : token,
          username : process.env.TEST_SMTP_USERNAME
        }
      }, function(response){
        should(response.result.err.substr(0, 21)).equal("Duplicate folder name");
        done();
      })
    })
    it("Should be able to create new message as draft", function(done){
      var msg = {
        from : process.env.TEST_SMTP_USERNAME,
        recipients : [process.env.TEST_SMTP_USERNAME],
        sender : "Surelia",
        subject : randomString(),
        html : randomString()
      }
      server.inject({
        method: "POST",
        url : "/api/1.0/draft?draftPath=[Gmail]/Drafts",
        payload : msg,
        headers : {
          token : token,
          username : process.env.TEST_SMTP_USERNAME
        }
      }, function(response){
        should(response.statusCode).equal(200);
        done();
      })
    })
    it("Should be able to move message to another box", function(done){
      server.inject({
        method: "POST",
        url : "/api/1.0/move-message",
        payload : {
          seqs : [1],
          oldBoxName : "INBOX",
          boxName : newMailBox2
        },
        headers : {
          token : token,
          username : process.env.TEST_SMTP_USERNAME
        }
      }, function(response){
        should(response.statusCode).equal(200);
        // Move it back
        server.inject({
          method: "POST",
          url : "/api/1.0/move-message",
          payload : {
            seqs : [1],
            oldBoxName : newMailBox2,
            boxName : "INBOX"
          },
          headers : {
            token : token,
            username : process.env.TEST_SMTP_USERNAME
          }
        }, function(response){
          should(response.statusCode).equal(200);
          done();
        })
      })
    })
    it("Should be able to remove a message to trash, then remove it permanently from trash", function(done){
      var trashTotal;
      server.inject({
        method: "GET",
        url : "/api/1.0/list-box?boxName=" + trashPath,
        headers : {
          token : token,
          username : process.env.TEST_SMTP_USERNAME
        }
      }, function(response){
        console.log(response.result);
        trashTotal = response.result.meta.total;
        should(response.statusCode).equal(200);
        server.inject({
          method: "DELETE",
          url : "/api/1.0/message?seqs=1&boxName=INBOX",
          headers : {
            token : token,
            username : process.env.TEST_SMTP_USERNAME
          }
        }, function(response){
          console.log(response.result);
          should(response.statusCode).equal(200);
          server.inject({
            method: "GET",
            url : "/api/1.0/list-box?boxName=" + trashPath,
            headers : {
              token : token,
              username : process.env.TEST_SMTP_USERNAME
            }
          }, function(response){
            console.log(response.result);
            should(response.result.meta.total).equal(trashTotal + 1);
            trashTotal = response.result.meta.total;
            server.inject({
              method: "DELETE",
              url : "/api/1.0/message?seqs=1&boxName=" + trashPath,
              headers : {
                token : token,
                username : process.env.TEST_SMTP_USERNAME
              }
            }, function(response){
              console.log(response.result);
              should(response.statusCode).equal(200);
              server.inject({
                method: "GET",
                url : "/api/1.0/list-box?boxName=" + trashPath,
                headers : {
                  token : token,
                  username : process.env.TEST_SMTP_USERNAME
                }
              }, function(response){
                console.log(response.result);
                should(response.result.meta.total).equal(trashTotal - 1);
                done();
              })
            })
          })
        })
      })
    })
    it("Should be able to flag a message as unread and read", function(done){
      // Get a list
      server.inject({
        method: "GET",
        url : "/api/1.0/list-box?boxName=INBOX",
        headers : {
          token : token,
          username : process.env.TEST_SMTP_USERNAME
        }
      }, function(response){
        console.log(response.result);
        // Use the latest sequence number
        var seq = response.result.data[0].seq;
        // Retrieve it so it will be flagged as Seen
        server.inject({
          method: "GET",
          url : "/api/1.0/message?boxName=INBOX&id=" + seq,
          headers : {
            token : token,
            username : process.env.TEST_SMTP_USERNAME
          }
        }, function(response){
          should.exist(response.result.parsed);
          should.exist(response.result.attributes);
          // Set it as Unread
          server.inject({
            method: "POST",
            url : "/api/1.0/set-flag",
            payload : {
              seqs : [seq],
              flag : "Unread",
              boxName : "INBOX"
            },
            headers : {
              token : token,
              username : process.env.TEST_SMTP_USERNAME
            }
          }, function(response){
            // Get list again
            console.log(response.result);
            server.inject({
              method: "GET",
              url : "/api/1.0/list-box?boxName=INBOX",
              headers : {
                token : token,
                username : process.env.TEST_SMTP_USERNAME
              }
            }, function(response){
              // Should be have no Seen flag
              console.log(response.result.data[0]);
              should(response.result.data[0].attributes.flags.indexOf("\\Seen") < 0).equal(true);
              // Set it as read without retrieve the message
              server.inject({
                method: "POST",
                url : "/api/1.0/set-flag",
                payload : {
                  seqs : [seq],
                  flag : "Read",
                  boxName : "INBOX"
                },
                headers : {
                  token : token,
                  username : process.env.TEST_SMTP_USERNAME
                }
              }, function(response){
                // Get list again
                console.log(response.result);
                server.inject({
                  method: "GET",
                  url : "/api/1.0/list-box?boxName=INBOX",
                  headers : {
                    token : token,
                    username : process.env.TEST_SMTP_USERNAME
                  }
                }, function(response){
                  // Should be have a Seen flag
                  console.log(response.result.data[0]);
                  should(response.result.data[0].attributes.flags.indexOf("\\Seen") > -1).equal(true);
                  done();
                })
              })
            })
          })
        })
      })
    })
    it("Should be able to remove existing mail box", function(done){
      server.inject({
        method: "DELETE",
        url : "/api/1.0/box?boxName=" + newMailBox2,
        headers : {
          token : token,
          username : process.env.TEST_SMTP_USERNAME
        }
      }, function(response){
        should(response.statusCode).equal(200);
        server.inject({
          method: "GET",
          url : "/api/1.0/boxes",
          headers : {
            token : token,
            username : process.env.TEST_SMTP_USERNAME
          }
        }, function(response){
          should(response.result.indexOf(newMailBox2)).equal(-1);
          done();
        })
      })
    })
    it("Should be fail to remove unexisting mail box", function(done){
      server.inject({
        method: "DELETE",
        url : "/api/1.0/box?boxName=SOMETHINGTHATDOESNTEXIST",
        headers : {
          token : token,
          username : process.env.TEST_SMTP_USERNAME
        }
      }, function(response){
        should(response.result.err.substr(0, 14)).equal("Unknown folder");
        done();
      })
    })
    it("Should be able to fetch a message from INBOX (sequence no 1)", function(done){
      server.inject({
        method: "GET",
        url : "/api/1.0/message?boxName=INBOX&id=1",
        headers : {
          token : token,
          username : process.env.TEST_SMTP_USERNAME
        }
      }, function(response){
        should.exist(response.result.parsed);
        should.exist(response.result.attributes);
        done();
      })
    })
    it("Should be fail to fetch a message from unexisting mail box", function(done){
      server.inject({
        method: "GET",
        url : "/api/1.0/message?boxName=SOMETHINGTHATDOESNOTEXIST&id=1",
        headers : {
          token : token,
          username : process.env.TEST_SMTP_USERNAME
        }
      }, function(response){
        should(response.result.err.substr(0, 15)).equal("Unknown Mailbox");
        done();
      })
    })
    it("Should be fail to fetch a message from INBOX with wrong seq number", function(done){
      server.inject({
        method: "GET",
        url : "/api/1.0/message?boxName=INBOX&id=99999",
        headers : {
          token : token,
          username : process.env.TEST_SMTP_USERNAME
        }
      }, function(response){
        done();
      })
    })
  });
  describe("SMTP API Endpoint", function() {
    it("Should be able to send a message", function(done){
      var data = {
        // Envelope
        from : process.env.TEST_SMTP_USERNAME,
        recipients : [process.env.TEST_SMTP_USERNAME],
        sender : "Surelia",
        subject : "Subject of the message",
        html : "Content of the message"
      }
      server.inject({
        method: "POST",
        url : "/api/1.0/send",
        payload : data,
        headers : {
          token : token,
          username : process.env.TEST_SMTP_USERNAME
        }
      }, function(response){
        should(response.result.accepted.length).equal(1);
        done();
      })
    })
    it("Should be able to send a message to multiple email address", function(done){
      var data = {
        // Envelope
        from : process.env.TEST_SMTP_USERNAME,
        recipients : [process.env.TEST_SMTP_USERNAME, "somethingemailthat@doesntexist.com"],
        sender : "Surelia",
        subject : "Subject of the message",
        html : "Content of the message"
      }
      server.inject({
        method: "POST",
        url : "/api/1.0/send",
        payload : data,
        headers : {
          token : token,
          username : process.env.TEST_SMTP_USERNAME
        }
      }, function(response){
        should(response.result.accepted.length).equal(2);
        done();
      })
    })
    it("Should be fail to send a message because of invalid recipients string is not an email address", function(done){
      var data = {
        // Envelope
        from : process.env.TEST_SMTP_USERNAME,
        recipients : ["invalidemailaddress"],
        sender : "Surelia",
        subject : "Subject of the message",
        html : "Content of the message"
      }
      server.inject({
        method: "POST",
        url : "/api/1.0/send",
        payload : data,
        headers : {
          token : token,
          username : process.env.TEST_SMTP_USERNAME
        }
      }, function(response){
        should(response.statusCode).equal(400);
        should(response.result.validation.source).equal("payload");
        should(response.result.validation.keys[0]).equal("recipients.0");
        done();
      })
    })
    it("Should be able to send a message with cc", function(done){
      var data = {
        // Envelope
        from : process.env.TEST_SMTP_USERNAME,
        recipients : [process.env.TEST_SMTP_USERNAME],
        sender : "Surelia",
        subject : "Subject of the message. Testing CC",
        html : "Content of the message",
        cc : [process.env.TEST_SMTP_USERNAME],
      }
      server.inject({
        method: "POST",
        url : "/api/1.0/send",
        payload : data,
        headers : {
          token : token,
          username : process.env.TEST_SMTP_USERNAME
        }
      }, function(response){
        should(response.result.accepted.length).equal(2);
        done();
      })
    })
    it("Should be able to send a message with bcc", function(done){
      var data = {
        // Envelope
        from : process.env.TEST_SMTP_USERNAME,
        recipients : [process.env.TEST_SMTP_USERNAME],
        sender : "Surelia",
        subject : "Subject of the message. Testing BCC",
        html : "Content of the message",
        bcc : [process.env.TEST_SMTP_USERNAME],
      }
      server.inject({
        method: "POST",
        url : "/api/1.0/send",
        payload : data,
        headers : {
          token : token,
          username : process.env.TEST_SMTP_USERNAME
        }
      }, function(response){
        should(response.result.accepted.length).equal(2);
        done();
      })
    })
    it("Should be fail to save attachment because of invalid key", function(done){
      request.post("/api/1.0/attachment")
        .set("token", token)
        .set("username", process.env.TEST_SMTP_USERNAME)
        .attach("content", __dirname + "/assets/simple_grey.png")
        .attach("invalid", __dirname + "/assets/simple_grey.png")
        .end(function(err, res){
          should(res.statusCode).equal(400);
          should(res.body.validation.source).equal("payload");
          should(res.body.validation.keys[0]).equal("invalid");
          done();
        })
      /* server.inject({ */
      /*   method: "POST", */
      /*   url : "/api/1.0/attachment", */
      /*   payload : { */
      /*     content: "aGVsbG8K", */
      /*     invalid: "aGVsbG8K", */
      /*   }, */
      /*   headers : { */
      /*     token : token, */
      /*     username : process.env.TEST_SMTP_USERNAME */
      /*   } */
      /* }, function(response){ */
      /*   should(response.statusCode).equal(400); */
      /*   should(response.result.validation.source).equal("payload"); */
      /*   should(response.result.validation.keys[0]).equal("invalid"); */
      /*   done(); */
      /* }) */
    })
    it("Should be fail to save attachment because of missing required key", function(done){
      request.post("/api/1.0/attachment")
        .set("token", token)
        .set("username", process.env.TEST_SMTP_USERNAME)
        .end(function(err, res){
          should(res.statusCode).equal(415);
          should(res.body.error).equal("Unsupported Media Type");
          done();
        })
    })
    it("Should be able to send a message with an attachment", function(done){
      var attachmentId;
      request.post("/api/1.0/attachment")
        .set("token", token)
        .set("username", process.env.TEST_SMTP_USERNAME)
        .attach("content", __dirname + "/assets/simple_grey.png")
        .end(function(err, res){
          should(res.statusCode).equal(200);
          console.log("=======================");
          console.log(res.body);
          attachmentId = res.body.attachmentId;
          var data = {
            // Envelope
            from : process.env.TEST_SMTP_USERNAME,
            recipients : [process.env.TEST_SMTP_USERNAME],
            sender : "Surelia",
            subject : "Subject of the message.",
            html : "Content of the message",
            attachments : [
              {
                filename : "hello.txt",
                contentType : "text/plain",
                encoding : "base64",
                attachmentId : attachmentId
              }
            ]
          }
          server.inject({
            method: "POST",
            url : "/api/1.0/send",
            payload : data,
            headers : {
              token : token,
              username : process.env.TEST_SMTP_USERNAME
            }
          }, function(response){
            should(response.result.accepted.length).equal(1);
            // Email with attachment has been sent, wait a bit
            setTimeout(function(){
              server.inject({
                method: "GET",
                url : "/api/1.0/list-box?boxName=INBOX",
                headers : {
                  token : token,
                  username : process.env.TEST_SMTP_USERNAME
                }
              }, function(response){
                var seq = response.result.data[0].seq;
                server.inject({
                  method: "GET",
                  url : "/api/1.0/message?boxName=INBOX&id=" + seq,
                  headers : {
                    token : token,
                    username : process.env.TEST_SMTP_USERNAME
                  }
                }, function(response){
                  server.inject({
                    method: "GET",
                    url : "/api/1.0/attachment?attachmentId=" + attachmentId,
                    headers : {
                      token : token,
                      username : process.env.TEST_SMTP_USERNAME
                    }
                  }, function(response){
                    should(response.result.length).greaterThan(0);
                    done();
                  })
                })
              })
            }, 3000)
          })
      })
    })
    it("Should be able to remove temporary attachment in surelia backend", function(done){
      server.inject({
        method: "POST",
        url : "/api/1.0/attachment",
        payload : {content: "aGVsbG8K"},
        headers : {
          token : token,
          username : process.env.TEST_SMTP_USERNAME
        }
      }, function(response){
        server.inject({
          method: "DELETE",
          url : "/api/1.0/attachment?attachmentId=" + response.result.attachmentId,
          headers : {
            token : token,
            username : process.env.TEST_SMTP_USERNAME
          }
        }, function(response){
          should(response.statusCode).equal(200);
          done();
        })
      })
    })
  });
  describe("Address Book", function() {
    it("Get address book collection for autocomplete", function(done){
      server.inject({
        method: "GET",
        url : "/api/1.0/autocomplete",
        headers : {
          token : token,
          username : process.env.TEST_SMTP_USERNAME
        }
      }, function(response){
        console.log(response.result);
        should(response.result[0].emailAddress.length).greaterThan(0);
        done();
      })
    })
    it("Get address book collection", function(done){
      server.inject({
        method: "GET",
        url : "/api/1.0/address-book",
        headers : {
          token : token,
          username : process.env.TEST_SMTP_USERNAME
        }
      }, function(response){
        console.log(response.result);
        should(response.result.meta.pages).equal(1);
        should(response.result.meta.page).equal(1);
        should(response.result.meta.limit).equal(10);
        should(response.result.data[0].emailAddress.length).greaterThan(0);
        should(response.result.data[0].account.length).greaterThan(0);
        done();
      })
    })
    it("Get address book collection, search for surelia", function(done){
      server.inject({
        method: "GET",
        url : "/api/1.0/address-book?q=surelia",
        headers : {
          token : token,
          username : process.env.TEST_SMTP_USERNAME
        }
      }, function(response){
        console.log(response.result);
        should(response.result.meta.page).equal(1);
        should(response.result.meta.limit).equal(10);
        should(response.result.data[0].emailAddress.length).greaterThan(0);
        should(response.result.data[0].emailAddress).equal(process.env.TEST_SMTP_USERNAME);
        should(response.result.data[0].account.length).greaterThan(0);
        done();
      })
    })
    it("Fail get address book collection because of invalid query", function(done){
      server.inject({
        method: "GET",
        url : "/api/1.0/address-book?something=something",
        headers : {
          token : token,
          username : process.env.TEST_SMTP_USERNAME
        }
      }, function(response){
        console.log(response.result);
        should(response.result.statusCode).equal(400);
        should(response.result.error).equal("Bad Request");
        done();
      })
    })
    it("Create new contact and update it", function(done){
      server.inject({
        method: "POST",
        url : "/api/1.0/contact",
        payload : {
          emailAddress : "someemail@domain.com",
          name : "Just Someone",
          organization : "Org",
          officeAddress : "Somewhere",
          homeAddress : "Here",
          phone : 1234567890
        },
        headers : {
          token : token,
          username : process.env.TEST_SMTP_USERNAME
        }
      }, function(response){
        console.log(response.result);
        should(response.result.emailAddress).equal("someemail@domain.com");
        should(response.result.name).equal("Just Someone");
        should(response.result.organization).equal("Org");
        should(response.result.officeAddress).equal("Somewhere");
        should(response.result.homeAddress).equal("Here");
        should(response.result.phone).equal("1234567890");
        server.inject({
          method: "PUT",
          url : "/api/1.0/contact",
          payload : {
            _id : response.result._id,
            emailAddress : "someemail@domain.com",
            name : "Just Someone",
            organization : "Org",
            officeAddress : "Somewhere",
            homeAddress : "Here",
            phone : 1234567890
          },
          headers : {
            token : token,
            username : process.env.TEST_SMTP_USERNAME
          }
        }, function(response){
          console.log(response.result);
          done();
        })
      })
    })
    it("Create new contact with partial information", function(done){
      server.inject({
        method: "POST",
        url : "/api/1.0/contact",
        payload : {
          emailAddress : "someemail@domain.com",
          name : "Just Someone",
        },
        headers : {
          token : token,
          username : process.env.TEST_SMTP_USERNAME
        }
      }, function(response){
        console.log(response.result);
        should(response.result.emailAddress).equal("someemail@domain.com");
        should(response.result.name).equal("Just Someone");
        done();
      })
    })
    it("Fail to create new contact because of invalid payload key", function(done){
      server.inject({
        method: "POST",
        url : "/api/1.0/contact",
        payload : {
          emailAddress : "someemail@domain.com",
          name : "Just Someone",
          something : "something"
        },
        headers : {
          token : token,
          username : process.env.TEST_SMTP_USERNAME
        }
      }, function(response){
        console.log(response.result);
        should(response.result.statusCode).equal(400);
        should(response.result.error).equal("Bad Request");
        done();
      })
    })
  });
  describe("Logout", function() {
    it("Should logout and lost access", function(done){
      server.inject({
        method: "GET",
        url : "/api/1.0/logout",
        headers : {
          token : token,
          username : process.env.TEST_SMTP_USERNAME
        }
      }, function(response){
        should(response.statusCode).equal(200);
        server.inject({
          method: "GET",
          url : "/api/1.0/boxes",
          headers : {
            token : token,
            username : process.env.TEST_SMTP_USERNAME
          }
        }, function(response){
          should(response.statusCode).equal(401);
          done();
        })
      })
    })
  });
});

});
