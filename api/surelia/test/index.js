require('events').EventEmitter.prototype._maxListeners = 100;
var server = require(__dirname + "/../../../lib/server");
var should = require("should");
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

  // Gmail configuration
  /* user : "someone@gmail.com", */
  /* password : "justapassword", */
  /* host : "imap.gmail.com", */
  /* port : 993, */
  /* tls : true */
}
var mail = new Imap(credentials);

var SMTPConnection = require(__dirname + "/../../../api/surelia").module.SMTP;
var smtp, 
  token, 
  newMailBox, 
  newMailBox2, 
  draftsPath;

var Mailback = require('mailback');
var onMessage = function(err, message) {
  console.log(arguments, '------------------');
}

var smtpServer = new Mailback.Server({ onMessage: onMessage, port: 25255, host: 'localhost' });
smtpServer.start(function() {
// Connect to the server once it is actually listening
hoodiecrowServer.listen(1143, function(){
  
  // Start unit testing
  describe("SMTP", function() {
    describe("SMTP Initial and Auth", function() {
      it("Should connect to SMTP server", function(done){
        var options = {
          host : smtpServer.host,
          port : smtpServer.port,
        }
        smtp = new SMTPConnection(options);
        should(smtp.isConnected()).equal(false);
        smtp.connect()
          .then(function(){
            should(smtp.isConnected()).equal(true);
            done();
          })
          .catch(function(err){
            if (err) {
              console.log(err);
              should(1).equal(2);
            }
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
            if (err) {
              console.log(err);
              should(1).equal(2);
            }
          })
      })
      it("Should be able to send mail to SMTP server", function(done){
        var sender = "email1@example.com";
        var recipients = "email2@example.com";
        var newMail = composer({
          to : recipients,
          from : sender,
          sender : "Sender",
          subject : "Subject",
          text : "Messagn content"
        });
        newMail.build(function(err, message){
          if (err) {
            console.log(err);
            should(1).equal(2);
          }
          smtp.send(sender, recipients, message)
            .then(function(info){
              console.log(info);
              done();
            })
            .catch(function(err){
              if (err) {
                console.log(err);
                should(1).equal(2);
              }
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
          done();
        })
    })
    describe("IMAP", function() {
      it("should be able to list special boxes ", function(done) {
        mail.getSpecialBoxes()
          .then(function(result){
            console.log(mail.specials);
            done();
          })
          .catch(function(err){
            if (err) {
              should(1).equal(2);
            }
          })
      });
      it("should be able to list the contents of main box ", function(done) {
        mail.listBox("INBOX")
          .then(function(result){
            console.log(result);
            should(result.length).equal(6);
            done();
          })
          .catch(function(err){
            if (err) {
              should(1).equal(2);
            }
          })
      });
      it("should be fail to list the contents of main box that does not exist ", function(done) {
        mail.listBox("SOMETHINGTHATDOESNTEXIST")
          .then(function(result){
            should(1).equal(2);
          })
          .catch(function(err){
            done();
          })
      });
      it("should be able to list the contents of main box with more parameter ", function(done) {
        mail.listBox("INBOX", 1, 2)
          .then(function(result){
            console.log(result);
            should(result.length).equal(2);
            done();
          })
          .catch(function(err){
            if (err) {
              should(1).equal(2);
            }
          })
      });
      it("should be able to add new mail box", function(done) {
        mail.createBox("NEWMAILBOX")
          .then(function(){
            mail.getBoxes()
              .then(function(boxes){
                console.log(boxes);
                should(boxes.NEWMAILBOX.delimiter).equal("/");
                should(boxes.NEWMAILBOX.parent).equal(null);
                should(boxes.NEWMAILBOX.children).equal(null);
                done();
              })
              .catch(function(err) {
                if (err) {
                  console.log(err.message);
                  should(1).equal(2);
                }
              })
          })
          .catch(function(err) {
            if (err) {
              console.log(err.message);
              should(1).equal(2);
            }
          })
      });
      it("should be able to rename a mail box, NEWMAILBOX to NEWBOX", function(done) {
        mail.renameBox("NEWMAILBOX", "NEWBOX")
          .then(function(){
            mail.getBoxes()
              .then(function(boxes){
                console.log(boxes);
                should(boxes.NEWBOX.delimiter).equal("/");
                should(boxes.NEWBOX.parent).equal(null);
                should(boxes.NEWBOX.children).equal(null);
                done();
              })
              .catch(function(err) {
                if (err) {
                  console.log(err.message);
                  should(1).equal(2);
                }
              })
          })
          .catch(function(err) {
            if (err) {
              should(1).equal(2);
              console.log(err.message);
            }
          })
      });
      it("should be fail to rename unexisting mail box", function(done) {
        mail.renameBox("NOTEXIST", "NEWBOX")
          .then(function(){
            should(1).equal(2);
          })
          .catch(function(err) {
            if (err) {
              console.log(err.message);
              should(err.message).equal("Mailbox does not exist");
              done();
            }
          })
      });
      it("should be able to delete a mail box", function(done) {
        mail.removeBox("NEWBOX")
          .then(function(){
            mail.getBoxes()
              .then(function(boxes){
                console.log(boxes);
                should(boxes.NEWBOX).equal(undefined);
                done();
              })
              .catch(function(err) {
                if (err) {
                  console.log(err.message);
                }
              })
          })
          .catch(function(err) {
            if (err) {
              console.log(err.message);
            }
          })
      });
      it("should be fail to delete a mail box", function(done) {
        mail.removeBox("NOTEXIST")
          .then(function(){
          })
          .catch(function(err) {
            if (err) {
              console.log(err.message);
              should(err.message).equal("Mailbox does not exist");
              done();
            }
          })
      });
      it("should be able to fetch a mail by UID", function(done) {
        mail.retrieveMessage(1, "INBOX")
          .then(function(mail){
            console.log(mail);
            should(mail.attributes.uid).equal(1);
            done();
          })
          .catch(function(err) {
            if (err) {
              console.log(err.message);
              should(1).equal(2);
            }
          })
      });
      it("should be fail to fetch unexisting UID", function(done) {
        mail.retrieveMessage(1, "INBOX")
          .then(function(mail){
            should(1).equal(2);
          })
          .catch(function(err) {
            if (err) {
              console.log(err.message);
              done();
            }
          })
      });
      it("should be able to move a message to other box", function(done) {
        mail.createBox("SOMEBOX")
          .then(function(){
            mail.moveMessage(1, "INBOX", "SOMEBOX")
              .then(function(){
                mail.retrieveMessage(1, "SOMEBOX")
                  .then(function(mail){
                    console.log(mail);
                    should(mail.attributes.uid).equal(1);
                    done();
                  })
                  .catch(function(err) {
                    if (err) {
                      console.log(err.message);
                      should(1).equal(2);
                    }
                  })
              })
              .catch(function(err) {
                if (err) {
                  console.log(err.message);
                  should(1).equal(2);
                  done();
                }
              })
          })
          .catch(function(err) {
            if (err) {
              console.log(err.message);
              should(1).equal(2);
            }
          })
      });
      it("should be able to remove a message to Trash", function(done) {
        mail.removeMessage(1, "INBOX")
          .then(function(){
            mail.listBox(mail.specials.Trash.path)
              .then(function(result){
                console.log(result[0].attributes.flags);
                should(result[0].attributes.uid).equal(1);
                should(result[0].header.from[0]).equal("sender name <sender@example.com>");
                done();
              })
              .catch(function(err) {
                if (err) {
                  console.log(err.message);
                  should(1).equal(2);
                }
              })
          })
          .catch(function(err) {
            if (err) {
              console.log(err.message);
              should(1).equal(2);
              done();
            }
          })
      });
      it("should be able to create new email message in draft box", function(done) {
        var newMail = composer({
          to : "someemail@example.com",
          from : "someemail1@example.com",
          sender : "Sender",
        });
        newMail.build(function(err, message){
          if (err) {
            should(1).equal(2);
          }
          mail.newMessage(message)
            .then(function(){
              mail.listBox(mail.specials.Drafts.path)
                .then(function(result){
                  should(result[0].header.from[0]).equal("someemail1@example.com");
                  should(result[0].attributes.uid).equal(1);
                  done();
                })
                .catch(function(err) {
                  if (err) {
                    console.log(err.message);
                    should(1).equal(2);
                  }
                })
            })
            .catch(function(err) {
              if (err) {
                console.log(err.message);
                should(1).equal(2);
                done();
              }
            })
        })
      });
    });
  });
  describe("IMAP API Endpoint", function() {
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
        token = response.result;
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
        console.log(response.result);
        should(response.result.indexOf("[Gmail]")).greaterThan(-1);
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
        console.log(response.result);
        should(response.result.All.path).equal("[Gmail]/All Mail");
        should(response.result.Drafts.path).equal("[Gmail]/Drafts");
        should(response.result.Sent.path).equal("[Gmail]/Sent Mail");
        should(response.result.Junk.path).equal("[Gmail]/Spam");
        should(response.result.Trash.path).equal("[Gmail]/Trash");
        draftsPath = response.result.Drafts.path;
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
        console.log(response.result);
        should(response.result.length).greaterThan(0);
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
        console.log(response.result);
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
        should(response.result.success).equal(true);
        server.inject({
          method: "GET",
          url : "/api/1.0/boxes",
          headers : {
            token : token,
            username : process.env.TEST_SMTP_USERNAME
          }
        }, function(response){
          console.log(response.result);
          should(response.result.indexOf(newMailBox)).greaterThan(-1);
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
        console.log(response.result);
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
        should(response.result.success).equal(true);
        server.inject({
          method: "GET",
          url : "/api/1.0/boxes",
          headers : {
            token : token,
            username : process.env.TEST_SMTP_USERNAME
          }
        }, function(response){
          console.log(response.result);
          should(response.result.indexOf(newMailBox)).equal(-1);
          should(response.result.indexOf(newMailBox2)).greaterThan(-1);
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
        console.log(response.result);
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
        console.log(response.result);
        should(response.result.err.substr(0, 21)).equal("Duplicate folder name");
        done();
      })
    })
    it("Should be able to create new message as draft", function(done){
      var msg = {
        from : process.env.TEST_SMTP_USERNAME,
        recipients : process.env.TEST_SMTP_USERNAME,
        sender : "Surelia",
        subject : randomString(),
        text : randomString()
      }
      server.inject({
        method: "POST",
        url : "/api/1.0/message",
        payload : msg,
        headers : {
          token : token,
          username : process.env.TEST_SMTP_USERNAME
        }
      }, function(response){
        console.log(response.result);
        should(response.result.success).equal(true);
        done();
      })
    })
    it("Should be able to move message to another box", function(done){
      server.inject({
        method: "POST",
        url : "/api/1.0/move-message?id=1&boxName=INBOX&newBoxName=" + newMailBox2,
        headers : {
          token : token,
          username : process.env.TEST_SMTP_USERNAME
        }
      }, function(response){
        console.log(response.result);
        should(response.result.success).equal(true);
        // Move it back
        server.inject({
          method: "POST",
          url : "/api/1.0/move-message?id=1&boxName=" + newMailBox2 + "&newBoxName=INBOX",
          headers : {
            token : token,
            username : process.env.TEST_SMTP_USERNAME
          }
        }, function(response){
          console.log(response.result);
          should(response.result.success).equal(true);
          done();
        })
      })
    })
    it("Should be able to remove a message", function(done){
      server.inject({
        method: "DELETE",
        url : "/api/1.0/message?id=1&boxName=" + draftsPath,
        headers : {
          token : token,
          username : process.env.TEST_SMTP_USERNAME
        }
      }, function(response){
        console.log(response.result);
        should(response.result.success).equal(true);
        done();
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
        should(response.result.success).equal(true);
        server.inject({
          method: "GET",
          url : "/api/1.0/boxes",
          headers : {
            token : token,
            username : process.env.TEST_SMTP_USERNAME
          }
        }, function(response){
          console.log(response.result);
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
        console.log(response.result);
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
        console.log(response.result);
        should.exist(response.result.buffer);
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
        console.log(response.result);
        should(response.result.err.substr(0, 15)).equal("Unknown Mailbox");
        done();
      })
    })
    it.skip("Should be fail to fetch a message from INBOX with wrong seq number", function(done){
      server.inject({
        method: "GET",
        url : "/api/1.0/message?boxName=INBOX&id=99999",
        headers : {
          token : token,
          username : process.env.TEST_SMTP_USERNAME
        }
      }, function(response){
        console.log(response.result);
        done();
      })
    })
  });
  describe("SMTP API Endpoint", function() {
    it("Should be able to send a message", function(done){
      var data = {
        // Envelope
        from : process.env.TEST_SMTP_USERNAME,
        recipients : process.env.TEST_SMTP_USERNAME,
        sender : "Surelia",
        subject : "Subject of the message",
        text : "Content of the message"
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
        console.log(response.result);
        should(response.result.success).equal(true);
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
