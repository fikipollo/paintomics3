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
* - UserListController
* -
*
*/
(function(){
	var app = angular.module('admin.controllers.user-controllers', [
		'ui.bootstrap',
		'ang-dialogs',
		'chart.js',
		'users.users.user-list'
	]);

	app.controller('UserListController', function($rootScope, $scope, $http, $dialogs, $state, $interval, APP_EVENTS, UserList) {
		//--------------------------------------------------------------------
		// CONTROLLER FUNCTIONS
		//--------------------------------------------------------------------
		this.retrieveUsersListData = function(force, callback_caller, callback_function){
			$scope.isLoading = true;

			if(UserList.getOld() > 1 || force){ //Max age for data 5min.
				$http($rootScope.getHttpRequestConfig("GET", "users", {})).
				then(
					function successCallback(response){
						$scope.isLoading = false;
						$scope.users = UserList.setUsers(response.data.userList).getUsers();
						UserList.setAvailableSpace(response.data.availableSpace);
						$scope.max_guest_days = response.data.max_guest_days;
						$scope.max_jobs_days = response.data.max_jobs_days;

						if(callback_function !== undefined){
							callback_caller[callback_function]();
						}
					},
					function errorCallback(response){
						$scope.isLoading = false;

						debugger;
						var message = "Failed while retrieving the users list.";
						$dialogs.showErrorDialog(message, {
							logMessage : message + " at UserListController:retrieveUsersListData."
						});
						console.error(response.data);
					}
				);
			}else{
				$scope.users = UserList.getUsers();
				$scope.isLoading = false;
			}
		};

		/**
		* This function defines the behaviour for the "filterWorkflows" function.
		* Given a item (user) and a set of filters, the function evaluates if
		* the current item contains the set of filters within the different attributes
		* of the model.
		*
		* @returns {Boolean} true if the model passes all the filters.
		*/
		$scope.filterUsers = function(propertyName) {
			$scope.foundUsers = $scope.foundUsers || {};
			$scope.foundUsers[propertyName] = 0;
			return function( item ) {
				var filterAux, item_categories;
				var valid = ($scope.searchFor !== undefined) && ($scope.searchFor.length > $scope.minSearchLength) && (item[propertyName].toLowerCase().indexOf( $scope.searchFor.toLowerCase()) !== -1);
				if(valid){$scope.foundUsers[propertyName]++;}
				return valid;
			};
		};

		$scope.formatDate= function(date){
			return (date?date.substring(6,8) + "/" + date.substring(4,6) + "/"  + date.substring(0,4):"");
		}
		//--------------------------------------------------------------------
		// EVENT HANDLERS
		//--------------------------------------------------------------------
		/**
		* This function applies the filters when the user clicks on "Search"
		*/
		this.applySearchHandler = function() {
			var filters = arrayUnique($scope.filters.concat($scope.searchFor.split(" ")));
			$scope.filters = WorkflowList.setFilters(filters).getFilters();
		};

		this.launchUserHandler = function(user){
			$rootScope.$broadcast(APP_EVENTS.launchUser, user);
		};

		this.deleteUserHandler = function (user){
			var sendRemoveRequest = function(option){
				if(option === "ok"){
					$http($rootScope.getHttpRequestConfig("DELETE", "users", {
						extra: user.userID
					})).then(
						function successCallback(response){
							debugger;
							if(response.data.success){
								me.retrieveUsersListData(true);
							}
						},
						function errorCallback(response){
							$scope.isLoading = false;

							debugger;
							var message = "Failed while deleting the user.";
							$dialogs.showErrorDialog(message, {
								logMessage : message + " at UserListController:deleteUserHandler."
							});
							console.error(response.data);
						}
					);
				}
			}
			$dialogs.showConfirmationDialog("Are you sure?", {title: "Remove the selected user?", callback : sendRemoveRequest});
		};


		this.sendCleanDatabasesRequest = function(){
			$dialogs.showWaitDialog("This process may take few seconds, be patient!");
			$http($rootScope.getHttpRequestConfig("DELETE", "clean-databases", {})).
			then(
				function successCallback(response){
					$dialogs.closeDialog();
					$dialogs.showSuccessDialog("Databases have been succesfully cleaned.");
				},
				function errorCallback(response){
					$dialogs.closeDialog();

					debugger;
					var message = "Failed while cleaning databases.";
					$dialogs.showErrorDialog(message, {
						logMessage : message + " at UserListController:sendCleanDatabasesRequest."
					});
					console.error(response.data);
				}
			);
		};

		//--------------------------------------------------------------------
		// INITIALIZATION
		//--------------------------------------------------------------------
		var me = this;
		$scope.users = UserList.getUsers();
		$scope.minSearchLength = 2;
		$scope.filters =  UserList.getFilters();
		$scope.filteredUsers = $scope.users.length;

		this.retrieveUsersListData(true);

	});

	app.controller('UserController', function($rootScope, $scope, $http, $dialogs, APP_EVENTS, UserList) {
		//--------------------------------------------------------------------
		// CONTROLLER FUNCTIONS
		//--------------------------------------------------------------------
		this.checkUserStatus = function(user){
			delete user.status;
			delete user.status_msg;
			$scope.current_action = "Checking status";


		};

		//--------------------------------------------------------------------
		// EVENT HANDLERS
		//--------------------------------------------------------------------


		//--------------------------------------------------------------------
		// INITIALIZATION
		//--------------------------------------------------------------------
		var me = this;

		if($scope.user.enabled && $scope.user.status === undefined){
			this.checkUserStatus($scope.user);
		}
	});
})();
