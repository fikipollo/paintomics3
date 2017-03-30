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
* THIS FILE CONTAINS THE FOLLOWING MODULE DECLARATION
* - messages.messages.message-list
*
*/
(function(){
	var app = angular.module('messages.messages.message-list', []);

	app.factory("MessageList", ['$rootScope', function($rootScope) {
		var messages = [];
		var availableSpace = 0;
		var filters = [];
		var old = new Date(0);
		return {
			getMessages: function() {
				return messages;
			},
			setMessages: function(messageList) {
				messages = this.adaptMessagesInformation(messageList);
				old = new Date();
				return this;
			},
			setAvailableSpace: function(_availableSpace){
				availableSpace = _availableSpace;
			},
			updateMessages: function(newMessages, soft) {
				return this;
			},
			getMessage: function(message_id) {
				for(var i in messages){
					if(messages[i].id === message_id){
						return messages[i];
					}
				}
				return null;
			},
			addMessage: function(message) {
				messages.push(this.adaptMessageInformation(message));
				return this;
			},
			deleteMessage: function(message_id) {
				for(var i in messages){
					if(messages[i].id === message_id){
						messages.splice(i,1);
						return messages;
					}
				}
				return null;
			},
			adaptMessagesInformation: function(messages) {
				for(var i in messages){
					this.adaptMessageInformation(messages[i]);
				}
				return messages;
			},
			adaptMessageInformation: function(message){
				return message;
			},
			getFilters: function() {
				return filters;
			},
			setFilters: function(_filters) {
				filters = _filters;
				return this;
			},
			removeFilter: function(_filter){
				var pos = filters.indexOf(_filter);
				if(pos !== -1){
					filters.splice(pos,1);
				}
				return this;
			},
			getOld: function(){
				return (new Date() - old)/120000;
			}
		};
	}]);
})();
