angular.module("templates", []).run(["$templateCache", function($templateCache) {$templateCache.put("login.html","<div ng-controller=\"LoginCtrl as login\">\n  <h4>Login</h4>\n  <input ng-model=\"credential.username\" placeholder=\"username\"></input>\n  <br><input ng-model=\"credential.password\" placeholder=\"password\"></input>\n  <!--br>IMAP configuration<br>\n  <br><input ng-model=\"credential.imapHost\" placeholder=\"host\"></input>\n  <br><input ng-model=\"credential.imapPort\" placeholder=\"port\"></input>\n  <br><input ng-model=\"credential.imapTLS\" placeholder=\"tls\"></input>\n  <br>SMTP configuration<br>\n  <input ng-model=\"credential.smtpHost\" placeholder=\"host\"></input><br>\n  <input ng-model=\"credential.smtpPort\" placeholder=\"port\"></input><br>\n  <input ng-model=\"credential.smtpTLS\" placeholder=\"tls\"></input><br>\n  <input ng-model=\"credential.smtpSecure\" placeholder=\"secure\"></input><br-->\n  <br><button ng-click=\"login.auth(credential)\">Login</button>\n</div>\n");
$templateCache.put("message.html","<div ng-controller=\"MessageCtrl as msg\">\n  <div style=\"width:100%;background:#ECECEC;padding:10px\">\n    <button ng-click=\"msg.compose()\">compose</button>\n    <button ng-click=\"msg.logout()\">logout</button>\n    <br>\n  </div>\n  <div>\n    <!--Sidebar-->\n    <div style=\"width:300px;display:inline-block;vertical-align:top;padding:10px;background:#ECECEC;\">\n      <ul>\n        <li ng-repeat=\"box in msg.boxes\" ng-click=\"msg.listBox(box)\" style=\"cursor:pointer\">{{box}}</li>\n        <li ng-repeat=\"special in msg.specialBoxes\" ng-click=\"msg.listBox(special.path)\" style=\"cursor:pointer\">{{special.specialName}}</li>\n      </ul> \n    </div>\n    \n    \n    <!--List view-->\n    {{msg.coba}}\n    <div ng-show=\"msg.view==\'list\'\" style=\"width:60%;display:inline-block;vertical-align:top;\">\n      <div ng-repeat=\"message in msg.currentList\" ng-click=\"msg.retrieveMessage(message.seq, message.boxName)\"i style=\"cursor:pointer;margin-top:3px;background:#ECECEC\">\n        <span>{{message.seq}}</span> -\n        <span>{{message.header.from}}</span> -\n        <span>{{message.header.subject}}</span> -\n        <span>{{message.header.date}}</span> -\n        <span ng-show=\"message.hasAttachments\">[attachment]</span>\n      </div>\n    </div>\n    \n    <!--Message view-->\n    <div ng-show=\"msg.view==\'message\'\" style=\"width:60%;display:inline-block;vertical-align:top;background:#ECECEC\">\n            <div><b>{{msg.currentMessage.parsed.subject}}</b></div>\n            <div>{{msg.currentMessage.parsed.from[0].address}}</div>\n            <div>{{msg.currentMessage.parsed.date}}</div>\n            <hr>\n            <div id=\"messageContent\"></div>\n            <hr>\n            <span ng-show=\"msg.currentMessage.hasAttachments\">[attachment]</span>\n            <div>\n              <ul>\n                      <li ng-repeat=\"attachment in msg.currentMessage.parsed.attachments\" class=\"{{attachment.icon}}\">\n                  {{attachment.fileName}} - {{attachment.size}}\n                </li>\n              </ul>\n            </div>\n    </div>\n    \n    <!--Compose view-->\n    <div ng-show=\"msg.view==\'compose\'\" style=\"width:60%;display:inline-block;vertical-align:top;\">\n      <h4>Compose</h4>\n      <input ng-model=\"msg.newMessage.from\" placeholder=\"from\"></input><br>\n      <input ng-model=\"msg.newMessage.recipients\" placeholder=\"to\"></input><br>\n      <input ng-model=\"msg.newMessage.subject\" placeholder=\"subject\"></input><br>\n      <textarea ng-model=\"msg.newMessage.text\" placeholder=\"text\"></textarea><br>\n      <button ng-click=\"msg.newMessage(msg.newMessage)\">Save as draft</button> \n      <button ng-click=\"msg.sendMessage(msg.newMessage)\">Send</button>\n    </div>\n  </div>\n  <input ng-model=\"tobedeleted\"></input><button ng-click=\"msg.deleteBox(tobedeleted)\">hapus</button>\n</div>\n");}]);