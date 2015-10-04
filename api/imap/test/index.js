var server = require(__dirname + "/../../../lib/server");
var should = require("should");

var hoodiecrow = require("hoodiecrow"),
    inspect = require('util').inspect;

// Define Hoodiecrow IMAP server
var server = hoodiecrow({
  storage: {
    "INBOX": {
      messages: [{
        raw: "Subject: hello 1\r\n\r\nWorld 1!",
        internaldate: "14-Sep-2013 21:22:28 -0300"
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

// Connect to the server once it is actually listening
server.listen(1143, function(){
  var Imap = require(__dirname + "/../../../api/imap").module;

  // Start unit testing
  describe("IMAP", function() {
    describe("IMAP", function() {
      it("should be able to list the contents of main box ", function(done) {
        var mail = new Imap();
        setTimeout(function(){
          mail.listBox("INBOX")
            .then(function(result){
              should(result.length).equal(6);
              done();
            })
            .catch(function(err){
              should(1).equal(2);
            })
        }, 500);
      });
      it("should be able to list the contents of main box with more parameter ", function(done) {
        var mail = new Imap();
        setTimeout(function(){
          mail.listBox("INBOX", 1, 2, "TEXT")
            .then(function(result){
              console.log(result);
              should(result.length).equal(2);
              done();
            })
            .catch(function(err){
              should(1).equal(2);
            })
        }, 500);
      });
      it("should be able to add new mail box", function(done) {
        var mail = new Imap();
        setTimeout(function(){
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
        }, 500);
      });
      it("should be able to rename a mail box, NEWMAILBOX to NEWBOX", function(done) {
        var mail = new Imap();
        setTimeout(function(){
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
        }, 500);
      });
      it("should be fail to rename unexisting mail box", function(done) {
        var mail = new Imap();
        setTimeout(function(){
          mail.renameBox("NOTEXIST", "NEWBOX")
            .then(function(){
              should(1).equal(2);
            })
            .catch(function(err) {
              console.log(err.message);
              should(err.message).equal("Mailbox does not exist");
              done();
            })
        }, 500);
      });
      it("should be able to delete a mail box", function(done) {
        var mail = new Imap();
        setTimeout(function(){
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
        }, 500);
      });
      it("should be fail to delete a mail box", function(done) {
        var mail = new Imap();
        setTimeout(function(){
          mail.removeBox("NOTEXIST")
            .then(function(){
            })
            .catch(function(err) {
              console.log(err.message);
              should(err.message).equal("Mailbox does not exist");
              done();
            })
        }, 500);
      });
    });
  });
});

