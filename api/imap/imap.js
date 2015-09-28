var Imap = function() {

}

/**
 * Lists the contents of the mail box
 *
 * @param {String} name - the name of the box
 * @param {Number} start - the offset
 * @param {Number} limit - the expected number of result
 * @param {Object} searchParams - search parameters
 * 
 */
Imap.prototype.listBox = function(name, start, limit, searchParams) {
}

/**
 * Creates a box
 *
 * @param {String} name - the name of the box
 */
Imap.prototype.createBox = function(name) {
}

/**
 * Removes a box
 *
 * @param {String} name - the name of the box
 */
Imap.prototype.removeBox = function(name) {
}

/**
 * Rename box
 *
 * @param {String} oldName - the old name of the box
 * @param {String} newName - the new name of the box
 */
Imap.prototype.renameBox = function(oldName, newName) {
}



/**
 * Retrieves an email message
 *
 * @param {String} id - the id of the message
 */
Imap.prototype.retrieveMessage = function(id) {
}

/**
 * Removes an email message
 *
 * @param {String} id - the id of the message
 */
Imap.prototype.removeMessage = function(id) {
}

/**
 * Moves an email message to another box
 *
 * @param {String} id - the id of the message
 * @param {String} newBox - the name of the box
 */
Imap.prototype.moveMessage = function(id, newBox) {
}

/**
 * Creates an new email message in the Draft box
 *
 * @param {String} messageData - the id of the message
 */
Imap.prototype.retrieveMessage = function(messageData) {
}


