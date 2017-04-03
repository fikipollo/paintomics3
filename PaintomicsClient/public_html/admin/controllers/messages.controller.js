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
* - MessageListController
* -
*
*/
(function(){
	var app = angular.module('admin.controllers.message-controllers', [
		'ui.bootstrap',
		'ang-dialogs',
		'chart.js',
		'messages.messages.message-list'
	]);

	app.controller('MessageListController', function($rootScope, $scope, $http, $dialogs, $state, $interval, $uibModal, APP_EVENTS, MessageList) {
		//--------------------------------------------------------------------
		// CONTROLLER FUNCTIONS
		//--------------------------------------------------------------------
		this.retrieveMessagesListData = function(force, callback_caller, callback_function){
			$scope.isLoading = true;

			if(MessageList.getOld() > 1 || force){ //Max age for data 5min.
				$http($rootScope.getHttpRequestConfig("GET", "messages", {})).
				then(
					function successCallback(response){
						$scope.isLoading = false;
						$scope.messages = MessageList.setMessages(response.data.messageList).getMessages();

						if(callback_function !== undefined){
							callback_caller[callback_function]();
						}
					},
					function errorCallback(response){
						$scope.isLoading = false;

						debugger;
						var message = "Failed while retrieving the messages list.";
						$dialogs.showErrorDialog(message, {
							logMessage : message + " at MessageListController:retrieveMessagesListData."
						});
						console.error(response.data);
					}
				);
			}else{
				$scope.messages = MessageList.getMessages();
				$scope.isLoading = false;
			}
		};

		/**
		* This function defines the behaviour for the "filterWorkflows" function.
		* Given a item (message) and a set of filters, the function evaluates if
		* the current item contains the set of filters within the different attributes
		* of the model.
		*
		* @returns {Boolean} true if the model passes all the filters.
		*/
		$scope.filterMessages = function(propertyName) {
			$scope.foundMessages = $scope.foundMessages || {};
			$scope.foundMessages[propertyName] = 0;
			return function( item ) {
				var filterAux, item_categories;
				var valid = ($scope.searchFor !== undefined) && ($scope.searchFor.length > $scope.minSearchLength) && (item[propertyName].toLowerCase().indexOf( $scope.searchFor.toLowerCase()) !== -1);
				if(valid){$scope.foundMessages[propertyName]++;}
				return valid;
			};
		};

		//--------------------------------------------------------------------
		// EVENT HANDLERS
		//--------------------------------------------------------------------
		this.editMessageHandler = function(message){
			$scope.model = message;
			this.addNewMessageHandler();
		}

		this.addNewMessageHandler = function(){
			var modalInstance = $uibModal.open({
				controller: 'MessageController',
				controllerAs: 'controller',
				size: 'md',
				scope: $scope,
				templateUrl: "templates/message-details.tpl.html"
			});

			modalInstance.result.then(function (selectedItem) {
				delete $scope.model;
				me.retrieveMessagesListData(true);
			}, function () {
				delete $scope.model;
				me.retrieveMessagesListData(true);
			});
		};

		/**
		* This function applies the filters when the message clicks on "Search"
		*/
		this.applySearchHandler = function() {
			var filters = arrayUnique($scope.filters.concat($scope.searchFor.split(" ")));
			$scope.filters = WorkflowList.setFilters(filters).getFilters();
		};

		this.deleteMessageHandler = function (message){
			var sendRemoveRequest = function(option){
				if(option === "ok"){
					$http($rootScope.getHttpRequestConfig("DELETE", "messages", {
						extra: message.message_type,
						data : {message_type : message.message_type}
					})).then(
						function successCallback(response){
							if(response.data.success){
								me.retrieveMessagesListData(true);
							}
						},
						function errorCallback(response){
							$scope.isLoading = false;

							debugger;
							var message = "Failed while deleting the message.";
							$dialogs.showErrorDialog(message, {
								logMessage : message + " at MessageListController:deleteMessageHandler."
							});
							console.error(response.data);
						}
					);
				}
			}
			$dialogs.showConfirmationDialog("Are you sure?", {title: "Remove the selected message?", callback : sendRemoveRequest});
		};

		//--------------------------------------------------------------------
		// INITIALIZATION
		//--------------------------------------------------------------------
		var me = this;
		$scope.messages = MessageList.getMessages();
		$scope.minSearchLength = 2;
		$scope.filters =  MessageList.getFilters();
		$scope.filteredMessages = $scope.messages.length;

		this.retrieveMessagesListData(true);

	});

	app.controller('MessageController', function($rootScope, $scope, $http, $dialogs, $uibModalInstance, APP_EVENTS, MessageList) {
		//--------------------------------------------------------------------
		// CONTROLLER FUNCTIONS
		//--------------------------------------------------------------------

		//--------------------------------------------------------------------
		// EVENT HANDLERS
		//--------------------------------------------------------------------
		this.saveMessageDetailsHandler = function () {
			$http($rootScope.getHttpRequestConfig("POST", "messages", {
				data : {
					message_type : $scope.model.message_type,
					message_content : $scope.model.message_content
				}
			})).then(
				function successCallback(response){
					$dialogs.showSuccessDialog("File succesfully saved.");
					$uibModalInstance.dismiss('cancel');
				},
				function errorCallback(response){
					$scope.isLoading = false;

					debugger;
					var message = "Failed while saving the message.";
					$dialogs.showErrorDialog(message, {
						logMessage : message + " at MessageController:saveMessageDetailsHandler."
					});
					console.error(response.data);
				}
			);
		};

		this.closeMessageDetailsHandler = function () {
			$uibModalInstance.dismiss('cancel');
		};

		//--------------------------------------------------------------------
		// INITIALIZATION
		//--------------------------------------------------------------------
		var me = this;

		$scope.hideUpload = ($scope.model !== undefined);

		if(!$scope.model){
			$scope.model = {
				dataType : "Reference message",
				otherFields : {}
			};
		}

	});
})();
