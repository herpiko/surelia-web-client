require('events').EventEmitter.prototype._maxListeners = 100;
var server = require(__dirname + "/../../../lib/server");
var should = require("should");
var composer = require("mailcomposer");
var hoodiecrow = require("hoodiecrow"),
    inspect = require('util').inspect;
var timeout = 500

// Define Hoodiecrow IMAP server
var server = hoodiecrow({
  storage: {
    "INBOX": {
      messages: [{
        raw: "Subject: hello 1\r\n\r\nWorld 1!",
        internaldate: "14-Sep-2013 21:22:28 -0300",
      }, {
        raw: "Subject: hello 2\r\n\r\nWorld 2!",
        flags: ["\\Seen"]
      }, {
        raw: "Subject: hello 3\r\n\r\nWorld 3!"
      }, {
        raw: "From: sender name <sender@example.com>\r\n" +
            "To: Receiver name <receiver@example.com>\r\n" +
            "Subject: hello 4\r\n" +
            "Message-Id: <abcde>\r\n" +
            "Date: Fri, 13 Sep 2013 15:01:00 +0300\r\n" +
            "\r\n" +
            "World 4!"
      }, {
        raw: "Subject: hello 5\r\n\r\nWorld 5!"
      }, {
        raw: "Subject: hello 6\r\n\r\nWorld 6!"
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
                "special-use": "\\Trash"
            }
          }
        }
      }
    }
  }
});
var Imap = require(__dirname + "/../../../api/imap").module;
var credentials = {
  user : "testuser",
  password : "testpass",
  host : "localhost",
  port : 1143,
  tls : false
}
var mail = new Imap(credentials);

// Connect to the server once it is actually listening
server.listen(1143, function(){
  
  // Start unit testing
  describe("IMAP", function() {
    before(function(done){
      mail.connect()
        .then(function(){
          done();
        })
    })
    describe("IMAP", function() {
      it("should be able to list the contents of main box ", function(done) {
        mail.listBox("INBOX")
          .then(function(result){
            should(result.length).equal(6);
            done();
          })
          .catch(function(err){
            should(1).equal(2);
          })
      });
      it("should be able to list the contents of main box with more parameter ", function(done) {
        mail.listBox("INBOX", 1, 2, "TEXT")
          .then(function(result){
            console.log(result);
            should(result.length).equal(2);
            done();
          })
          .catch(function(err){
            should(1).equal(2);
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
                console.log(err.message);
                should(1).equal(2);
              })
          })
          .catch(function(err) {
            console.log(err.message);
            should(1).equal(2);
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
                console.log(err.message);
                should(1).equal(2);
              })
          })
          .catch(function(err) {
            should(1).equal(2);
            console.log(err.message);
          })
      });
      it("should be fail to rename unexisting mail box", function(done) {
        mail.renameBox("NOTEXIST", "NEWBOX")
          .then(function(){
            should(1).equal(2);
          })
          .catch(function(err) {
            console.log(err.message);
            should(err.message).equal("Mailbox does not exist");
            done();
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
                console.log(err.message);
              })
          })
          .catch(function(err) {
            console.log(err.message);
          })
      });
      it("should be fail to delete a mail box", function(done) {
        mail.removeBox("NOTEXIST")
          .then(function(){
          })
          .catch(function(err) {
            console.log(err.message);
            should(err.message).equal("Mailbox does not exist");
            done();
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
            console.log(err.message);
            should(1).equal(2);
          })
      });
      it("should be fail to fetch unexisting UID", function(done) {
        mail.retrieveMessage("INBOX", 1)
          .then(function(mail){
            should(1).equal(2);
          })
          .catch(function(err) {
            console.log(err.message);
            done();
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
                    console.log(err.message);
                    should(1).equal(2);
                  })
              })
              .catch(function(err) {
                console.log(err.message);
                should(1).equal(2);
                done();
              })
          })
          .catch(function(err) {
            console.log(err.message);
            should(1).equal(2);
          })
      });
      it("should be able to remove a message to Trash", function(done) {
        mail.removeMessage(1, "INBOX")
          .then(function(){
            mail.listBox("[Gmail]/Trash")
              .then(function(result){
                console.log(result[0].attributes.flags);
                should(result[0].attributes.uid).equal(1);
                should(result[0].buffer).equal("Subject: hello 2\r\n\r\n");
                done();
              })
              .catch(function(err) {
                console.log(err.message);
                should(1).equal(2);
              })
          })
          .catch(function(err) {
            console.log(err.message);
            should(1).equal(2);
            done();
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
            return reject(err)
          }
          mail.newMessage(message)
            .then(function(){
              mail.listBox("[Gmail]/Drafts")
                .then(function(result){
                  console.log(result);
                  
                  should(result[0].buffer.substr(0, 54)).equal("Content-Type: text/plain\r\nFrom: someemail1@example.com");
                  should(result[0].attributes.uid).equal(1);
                  done();
                })
                .catch(function(err) {
                  console.log(err.message);
                  should(1).equal(2);
                })
            })
            .catch(function(err) {
              console.log(err.message);
              should(1).equal(2);
              done();
            })
        })
      });
    });
  });
});

