require('events').EventEmitter.prototype._maxListeners = 100;
var server = require(__dirname + "/../../../lib/server");
var should = require("should");
var composer = require("mailcomposer");
var hoodiecrow = require("hoodiecrow"),
    inspect = require('util').inspect;
var timeout = 500;
var credentials = require("./credentials.json");

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


var Imap = require(__dirname + "/../../../api/surelia").module.Imap;
var IMAPCredential = {
  user : credentials.fakeIMAPCredential.username,
  password : credentials.fakeIMAPCredential.password,
  host : "localhost",
  port : 1143,
  tls : false

  // Gmail configuration
  /* user : credentials.realGmailCredential.username, */
  /* password : credentials.realGmailCredential.password, */
  /* host : "imap.gmail.com", */
  /* port : 993, */
  /* tls : true */
}
var mail = new Imap(IMAPCredential);

var SMTPConnection = require(__dirname + "/../../../api/surelia").module.SMTP;
var smtp;

// Connect to the server once it is actually listening
hoodiecrowServer.listen(1143, function(){
  
  // Start unit testing
  describe("SMTP", function() {
    describe("SMTP Initial and Auth", function() {
      it("Should connect to SMTP server", function(done){
        var options = {
          host : "localhost",
          port : 2525,

          // Gmail configuration
          /* host : "smtp.gmail.com", */
          /* port : 465, */
          /* requireTLS : true, */
          /* secure : true */
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
        var username = credentials.fakeSMTPCredential.username;
        var password = credentials.fakeSMTPCredential.password;
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
        var sender = credentials.fakeSMTPCredential.username;
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
        mail.retrieveMessage("INBOX", 1)
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
        mail.retrieveMessage("INBOX", 1)
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
                mail.retrieveMessage("SOMEBOX", 1)
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
    describe("SMTP API Endpoint", function() {
      it("Should be able to send a message", function(done){
        var data = {
          // SMTP Configuration
          host : "smtp.gmail.com",
          port : "465",
          requireTLS : true,
          secure : true,
          // Account
          username : credentials.realGmailCredential.username,
          password : credentials.realGmailCredential.password,
          // Envelope
          from : credentials.realGmailCredential.username,
          recipients : credentials.realGmailCredential.username,
          sender : "Surelia",
          subject : "Subject of the message",
          text : "Content of the message"
        }
        server.inject({
          method: "POST",
          url : "/api/1.0/send",
          payload : data,
        }, function(response){
          console.log(response.result);
          should(response.result.accepted[0]).equal(credentials.realGmailCredential.username);
          done();
        })
      })
    });
  });
});

