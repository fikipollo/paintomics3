//@ sourceURL=Util.js
/*
* (C) Copyright 2014 The Genomics of Gene Expression Lab, CIPF
* (http://bioinfo.cipf.es/aconesawp) and others.
*
* All rights reserved. This program and the accompanying materials
* are made available under the terms of the GNU Lesser General Public License
* (LGPL) version 3 which accompanies this distribution, and is available at
* http://www.gnu.org/licenses/lgpl.html
*
* This library is distributed in the hope that it will be useful,
* but WITHOUT ANY WARRANTY; without even the implied warranty of
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
* Lesser General Public License for more details.
*
* Contributors:
*     Rafael Hernandez de Diego
*     rhernandez@cipf.es
*     Ana Conesa Cegarra
*     aconesa@cipf.es
*
* THIS FILE CONTAINS THE FOLLOWING COMPONENT DECLARATION
* - Observer
* - Observable
* - View
* - Model
*
* THIS FILE CONTAINS THE FOLLOWING FUNCTION DECLARATION
* - generateForm
* - showMessage
* - showInfoMessage
* - showSuccessMessage
* - showErrorMessage
* - ajaxErrorHandler
* - extJSErrorHandler
* - scaleValue
*
*/
function Observer() {
    this.name = "";
    /**
    * This function set the name for the view
    * @chainable
    * @returns {View}
    */
    this.setName = function (name) {
        this.name = name;
        return this;
    };
    this.getName = function () {
        return this.name;
    };
    /**
    * This function updates the visual representation of the model.
    * @chainable
    * @returns {Observer}
    */
    this.updateObserver = function () {
        console.warn("Observer:updateObserver:"+ this.name +": Not implemented yet");
    };
}

function Observable() {
    this.observers = null;
    this.changed = false;
    this.getObservers = function () {
        if (this.observers === null) {
            this.observers = [];
        }
        return this.observers;
    };
    this.addObserver = function (observer) {
        if (observer.updateObserver !== undefined) {
            //TODO: REMOVE THIS CODE
            if (debugging === true) {
                nObservers += 1;
                console.info("New observer added " + ((observer.name !== undefined) ? observer.name : observer.constructor.name) + " TOTAL OBSERVERS: " + nObservers);
            }
            this.getObservers().push(observer);
        }
    };
    this.clearChanged = function () {
        this.changed = false;
    };
    this.countObservers = function () {
        return this.getObservers().length;
    };
    this.deleteObserver = function (observer) {
        var _observers = this.getObservers();
        for (var i in _observers) {
            if (_observers[i] == observer) {
                //TODO: REMOVE THIS CODE
                if (debugging === true) {
                    nObservers -= 1;
                    console.info("Observer removed " + ((observer.name !== undefined) ? observer.name : observer.constructor.name) + " TOTAL OBSERVERS: " + nObservers);
                }
                this.getObservers().splice([i], 1);
            }
        }
    };
    this.hasChanged = function () {
        return this.changed;
    };
    this.notifyObservers = function () {
        if (this.changed) {
            var _observers = this.getObservers();
            for (var i in _observers) {
                _observers[i].updateObserver();
            }
            this.changed = false;
        }
    };
    this.setChanged = function () {
        this.changed = true;
    };
}

function View() {
    /*********************************************************************
    * ATTRIBUTES
    ***********************************************************************/
    this.component = null;
    this.model = null;
    this.controller = null;
    this.parent = null;
    /*********************************************************************
    * GETTERS AND SETTERS
    ***********************************************************************/
    this.getComponent = function (renderTo) {
        if (this.component === null) {
            this.initComponent(renderTo);
        }

        return this.component;
    };
    this.setComponent = function () {
        return this.component;
    };
    this.initComponent = function () {
        throw ("View:initComponent: Not implemented yet");
    };
    /**
    * This function load of the given model.
    * @chainable
    * @param {Model} model
    * @returns {View}
    */
    this.loadModel = function(model) {
        if (this.getModel() !== null){
            this.model.deleteObserver(this);
        }
        this.model = model;
        this.model.addObserver(this);
        return this;
    };
    this.getModel = function () {
        return this.model;
    };
    /**
    * This function set the controller for the view
    * @chainable
    * @returns {View}
    */
    this.setController = function (controller) {
        this.controller = controller;
        return this;
    };
    this.getController = function () {
        return this.controller;
    };
    /**
    * This function set the parent for the view
    * @chainable
    * @returns {View}
    */
    this.setParent = function (parent) {
        this.parent = parent;
        return this;
    };
    this.getParent = function (parentName) {
        if(parentName !== undefined && this.parent !== null){
            if(this.parent.getName() !== parentName){
                return this.parent.getParent(parentName);
            }
        }
        return this.parent;
    };
    this.isVisible = function () {
        return this.getComponent().isVisible();
    };
}
View.prototype = new Observer();

function Model() {}
Model.prototype = new Observable();

/**
* This function shows a new Message dialog.
* Available options are:
*  - messageType: type of message  {info, warning or error}  [Default: info]
*  - message: the message to show after the title. [Default: Empty string]
*  - logMessage: the message to show at the console. [Default: the title value]
*  - showTimeout: delay in seconds to show the message. [Default: 0]
*  - closeTimeout: dialog will be automatically closed after n seconds. [Default: 0,  not close]
*  - showButton: show/hide the close button [Default: false]
*  - height, width: dimensions for the message. [Default: [70,500]]
*  - callback: call this function after closing the dialog. [Default: null]
*  - showSpin: show/hide the spinner [Default: false]
*
* @param {String} title the title for the dialog.
* @param {Object} data contains all the different options for the dialog configuration
*
*/
function showMessage(title, data) {
    var message = (data.message || "");
    var logMessage = (data.logMessage || title);
    var showTimeout = (data.showTimeout || 0);
    var closeTimeout = (data.closeTimeout || 0);
    var messageType = (data.messageType || "info");
    var showButton = (data.showButton || false);
    var showReportButton = (data.showReportButton || false);
    var height = (data.height || 180 + ((showButton === true) ? 70 : 0));
    var width = (data.width || 500);
    var callback = (data.callback || null);
    var showSpin = (data.showSpin || false);
    var append = (data.append || false);
    var itemId = (data.itemId || "div" + Date.now());

    title = '<i class="fa fa-' + data.icon + '"></i> ' + title;

    var buttonClass, color, icon, dialogClass;
    if (messageType === "error") {
        console.error(Date.logFormat() + logMessage);
        buttonClass = "cancelButton";
        dialogClass = "errorDialog";
    } else if (messageType === "warning") {
        console.warn(Date.logFormat() + logMessage);
        buttonClass = "warningButton";
        dialogClass = "warningDialog";
    } else if (messageType === "info") {
        console.info(Date.logFormat() + logMessage);
        buttonClass = "exampleButton ";
        dialogClass = "infoDialog";
    } else { //success
        console.info(Date.logFormat() + logMessage);
        buttonClass = "exampleButton";
        dialogClass = "successDialog";
    }

    var updateDialog = function (messageDialog) {
        $("#messageDialog").removeClass("errorDialog warningDialog infoDialog successDialog").addClass(dialogClass);
        if (append) {
            if ($("#messageDialogTitle #" + itemId).length > 0) {
                $("#messageDialogTitle #" + itemId).html(title);
            } else {
                $("#messageDialogTitle").append("</br><span id='" + itemId + "'>" + title + "</span>");
                height = messageDialog.getHeight() + 15;
            }
        } else {
            $("#messageDialogTitle").html(title);
        }
        $("#messageDialogBody").html(message.replace(/\n/g, "</br>"));

        if (showSpin) {
            $("#messageDialogSpin").show();
        } else {
            $("#messageDialogSpin").hide();
        }

        if (showButton) {
            $("#messageDialogButton").removeClass("exampleButton acceptButton warningButton cancelButton").addClass(buttonClass);
            $("#messageDialogButton").css({display:"block"});

        } else {
            $("#messageDialogButton").css({display:"none"});
        }

        if (showReportButton) {
            $("#reportErrorButton").css({display:"block"});
        } else {
            $("#reportErrorButton").css({display:"none"});
        }

        messageDialog.setHeight(height);
        messageDialog.setWidth(width);
        messageDialog.center();
    };

    var messageDialog = Ext.getCmp("messageDialog");

    //APPEND ONLY IN CASE THAT DIALOG IS VISIBLE AND THE DIALOG CLASS IS THE SAME THAN THE REQUESTED.
    append = append && messageDialog !== undefined && messageDialog.isVisible() && $("#messageDialog").hasClass(dialogClass);

    //FIRST TIME SHOWN
    if (messageDialog === undefined) {
        messageDialog = Ext.create('Ext.window.Window', {
            id: "messageDialog", header: false, closeAction: "hide",
            modal: true, closable: false,
            html: "<div id='messageDialogPanel'>" +
            " <h4 id='messageDialogTitle'></h4>" +
            ' <div id="messageDialogBody"></div>' +
            ' <p id="messageDialogSpin" ><img src="resources/images/loadingpaintomics2.gif"></img></p>' +
            ' <div style="text-align:center;">' +
            '   <a id="reportErrorButton" class="button cancelButton" id="messageDialogButton"><i class="fa fa-bug"></i> Report error</a>' +
            '   <a id="messageDialogButton" class="button acceptButton" id="messageDialogButton">Close</a>' +
            " </div>"+
            "</div>",
            listeners: {
                boxready: function(){
                    updateDialog(messageDialog);

                    $("#messageDialogButton").click(function () {
                        messageDialog.close();
                    });
                    $("#reportErrorButton").click(function () {
                        var type = "error";
                        var message = $("#messageDialogBody").text();
                        sendReportMessage(type, message);
                    });
                }
            }
        });
    } else {
        updateDialog(messageDialog);
    }

    $.wait(function () {
        messageDialog.show();

        if (closeTimeout !== 0) {
            $.wait(function () {
                messageDialog.hide();
            }, closeTimeout);
        }
        if (callback !== null) {
            callback();
        }
    }, showTimeout);
}

function showInfoMessage(title, data) {
    data = (data == null) ? {} : data;
    data.messageType = "info";
    data.icon = (data.icon || 'info-circle');
    showMessage(title, (data === undefined) ? {} : data);
}
function showSuccessMessage(title, data) {
    data = (data == null) ? {} : data;

    data.messageType = "success";
    data.icon = (data.icon || 'check-circle');
    showMessage(title, (data === undefined) ? {} : data);
}
function showWarningMessage(title, data) {
    data = (data == null) ? {} : data;
    data.messageType = "warning";
    data.icon = (data.icon || 'exclamation-triangle');
    showMessage(title, (data === undefined) ? {} : data);
}
function showErrorMessage(title, data) {
    data = (data == null) ? {} : data;
    data.messageType = "error";
    data.showButton = (data.showButton == null) ? true : data.showButton;
    data.showReportButton = true;
    data.icon = (data.icon || 'exclamation-circle');
    showMessage(title, data);
}

function initializeTooltips(query, options) {
    options = (options || {placement: 's', mouseOnToPopup: true});
    $(query).powerTip(options);
}

function ajaxErrorHandler(responseObj) {
    if (debugging === true)
    debugger

    var err;
    try {
        err = eval("(" + responseObj.responseText + ")");
    } catch (error) {
        err = {message: "Unable to parse the error message."};
    }
    showErrorMessage("Oops..Internal error!", {message: err.message + "</br>Please try again later.</br>If the error persists, please contact the <a href='mailto:paintomics@cipf.es' target='_blank'> administrator</a>.", showButton: true});
}

function extJSErrorHandler(form, responseObj) {
    if (debugging === true)
    debugger

    var err;
    try {
        err = JSON.parse(responseObj.response.responseText);
    } catch (error) {
        err = {message: "Unable to parse the error message."};
    }

    showErrorMessage("Oops..Internal error!", {message: err.message + "</br>Please try again later.</br>If the error persists, please contact your web <a href='mailto:paintomics@cipf.es' target='_blank'> administrator</a>.", showButton: true});
}


function sendReportMessage(type, message, fromEmail, fromName){
    showInfoMessage("Sending message to developers...", {logMessage: "Sending new report...", showSpin: true});
    $.ajax({
        type: "POST", headers: {"Content-Encoding": "gzip"},
        url: SERVER_URL_DM_SEND_REPORT,
        data: {type: type, message: message, fromEmail: fromEmail, fromEmail: fromName},
        success: function (response) {
            if (response.success === false) {
                showErrorMessage(response.errorMessage);
                return;
            }
            showSuccessMessage("Thanks for the report</br>We will contact you soon!", {logMessage: "Sending report... DONE", closeTimeout: 1});
        },
        error: ajaxErrorHandler
    });
}

/**
* This function scales a given value for an intervale min/max
*/
function scaleValue(x, min, max) {
  //SCALE FROM [min, max] TO [a, b]
  //f(x) = (((b - a)*(x - min))/(max - min)) + a
  //SCALE FROM [min, max] TO [-1, 1]
  //f(x) = (((1 + 1)*(x - min))/(max - min)) - 1
  //     = ((2 * (x - min))/(max - min)) - 1
  var a = -1,
  b = 1;
  return ((x === 0) ? 0 : ((((b - a) * (x - min)) / (max - min)) + a));
};


/*********************************************************************************
* COMMON FUNCTION DECLARATION
**********************************************************************************/
/**
*
* @param {type} callback
* @param {type} seconds
* @returns {Number}
*/
$.wait = function (callback, seconds) {
    return window.setTimeout(callback, seconds * 1000);
};

Date.logFormat = function () {
    var date = new Date();
    return date.toUTCString() + " > ";
};
Object.values = function (o) {
    return Object.keys(o).map(function (k) {
        return o[k];
    });
};

Array.min = function (array) {
    return Math.min.apply(Math, array);
};

Array.intersect = function(a, b) {
    var t;
    if (b.length > a.length) t = b, b = a, a = t; // indexOf to loop over shorter
    return a.filter(function (e) {
        if (b.indexOf(e) !== -1) return true;
    });
};


Array.unique= function(array) {
  var a = array.concat();
  for(var i=0; i<a.length; ++i) {
    for(var j=i+1; j<a.length; ++j) {
      if(a[i] === a[j])
        a.splice(j--, 1);
    }
  }
  return a;
};

Array.binaryInsert = function(value, array, startVal, endVal){
	var length = array.length;
	var start = typeof(startVal) != 'undefined' ? startVal : 0;
	var end = typeof(endVal) != 'undefined' ? endVal : length - 1;//!! endVal could be 0 don't use || syntax
	var m = start + Math.floor((end - start)/2);

	if(length === 0){
		array.push(value);
		return 0;
	}

	if(value > array[end]){
		array.splice(end + 1, 0, value);
		return end + 1;
	}

	if(value < array[start]){//!!
		array.splice(start, 0, value);
		return start;
	}

	if(start >= end){
		return;
	}

	if(value < array[m]){
		return Array.binaryInsert(value, array, start, m - 1);
	}

	if(value > array[m]){
		return Array.binaryInsert(value, array, m + 1, end);
	}
};

String.prototype.trunc = String.prototype.trunc ||
      function(n){
          return (this.length > n) ? this.substr(0,n-1)+'&hellip;' : this;
      };
