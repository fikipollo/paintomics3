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
* - DatabaseListController
* -
*
*/
(function(){
	var app = angular.module('admin.controllers.database-controllers', [
		'ui.bootstrap',
		'common.dialogs',
		'chart.js',
		'databases.databases.database-list',
		'admin.directives.admin-directives'
	]);

	app.controller('DatabaseListController', function($rootScope, $scope, $http, $dialogs, $state, $interval, APP_EVENTS, DatabaseList) {
		//--------------------------------------------------------------------
		// CONTROLLER FUNCTIONS
		//--------------------------------------------------------------------
		this.retrieveDatabasesListData = function(force, callback_caller, callback_function){
			$scope.isLoading = true;

			if(DatabaseList.getOld() > 1 || force){ //Max age for data 5min.
				$http($rootScope.getHttpRequestConfig("GET", "databases", {})).
				then(
					function successCallback(response){
						$scope.isLoading = false;
						$scope.databases = DatabaseList.setDatabases(response.data, 'installed').getDatabases();

						if(callback_function !== undefined){
							callback_caller[callback_function]();
						}
					},
					function errorCallback(response){
						$scope.isLoading = false;

						debugger;
						var message = "Failed while retrieving the databases list.";
						$dialogs.showErrorDialog(message, {
							logMessage : message + " at DatabaseListController:retrieveDatabasesListData."
						});
						console.error(response.data);
					}
				);
			}else{
				$scope.databases = DatabaseList.getDatabases();
				$scope.isLoading = false;
			}
		};

		this.retrieveAvailableDatabases = function(){
			$scope.isLoading = true;

			$http($rootScope.getHttpRequestConfig("GET", "databases", {
				extra: "available"
			})).
			then(
				function successCallback(response){
					$scope.isLoading = false;
					$scope.databases = DatabaseList.updateDatabases(response.data.databaseList, true).getDatabases();
					$scope.categories = DatabaseList.updateCategories().getCategories();
				},
				function errorCallback(response){
					$scope.isLoading = false;

					debugger;
					var message = "Failed while checking the available databases.";
					$dialogs.showErrorDialog(message, {
						logMessage : message + " at DatabaseListController:checkAvailableDatabases."
					});
					console.error(response.data);
				}
			);
		};

		/**
		* This function defines the behaviour for the "filterWorkflows" function.
		* Given a item (database) and a set of filters, the function evaluates if
		* the current item contains the set of filters within the different attributes
		* of the model.
		*
		* @returns {Boolean} true if the model passes all the filters.
		*/
		$scope.filterDatabases = function(propertyName) {
			$scope.filteredDatabases = 0;
			return function( item ) {
				if($scope.show === "installed" && item.status !== "installed"){
					return false;
				}

				var filterAux, item_tags;
				for(var i in $scope.filters){
					filterAux = $scope.filters[i].toLowerCase();
					item_tags = item.categories.join("");
					if(!((item.organism_name.toLowerCase().indexOf(filterAux)) !== -1 || (item.organism_code.toLowerCase().indexOf(filterAux)) !== -1 || (item_tags.toLowerCase().indexOf(filterAux)) !== -1)){
						return false;
					}
				}
				$scope.filteredDatabases++;
				return true;
			};
		};

		this.showMoreDatabasesHandler = function() {
			if(window.innerWidth > 1500){
				$scope.visibleDatabases += 10;
			}else if(window.innerWidth > 1200){
				$scope.visibleDatabases += 6;
			}else{
				$scope.visibleDatabases += 4;
			}
			$scope.visibleDatabases = Math.min($scope.filteredDatabases, $scope.visibleDatabases);
		};


		$scope.formatDate= function(date){
			return (date?date.substring(6,8) + "/" + date.substring(4,6) + "/"  + date.substring(0,4) + " "  + date.substring(9,11) + ":"  + date.substring(11,13):"");
		}
		//--------------------------------------------------------------------
		// EVENT HANDLERS
		//--------------------------------------------------------------------
		/**
		* This function applies the filters when the user clicks on "Search"
		*/
		this.applySearchHandler = function() {
			var filters = arrayUnique($scope.filters.concat($scope.searchFor.split(" ")));
			$scope.filters = DatabaseList.setFilters(filters).getFilters();
		};

		this.launchDatabaseHandler = function(database){
			$rootScope.$broadcast(APP_EVENTS.launchDatabase, database);
		};

		this.deleteDatabaseHandler = function (database){
			var sendRemoveRequest = function(option){
				if(option === "ok"){
					$http($rootScope.getHttpRequestConfig("DELETE", "databases", {
						extra: database.organism_code
					})).then(
						function successCallback(response){
							debugger;
							if(response.data.success){
								me.retrieveDatabasesListData(true, me, "retrieveAvailableDatabases");
							}
						},
						function errorCallback(response){
							$scope.isLoading = false;

							debugger;
							var message = "Failed while deleting the organism.";
							$dialogs.showErrorDialog(message, {
								logMessage : message + " at DatabaseListController:deleteDatabaseHandler."
							});
							console.error(response.data);
						}
					);
				}
			}
			$dialogs.showConfirmationDialog("Are you sure?", {title: "Uninstall the selected organism?", callback : sendRemoveRequest});
		};

		this.updateDatabaseHandler = function (database){
			var sendUpdateRequest = function(option){
				if(option === "ok"){
					$http($rootScope.getHttpRequestConfig("PUT", "databases", {
						extra: database.organism_code
					})).then(
						function successCallback(response){
							debugger;
							if(response.data.success){
								me.retrieveDatabasesListData(true, me, "retrieveAvailableDatabases");
							}
						},
						function errorCallback(response){
							$scope.isLoading = false;

							debugger;
							var message = "Failed while updating the organism.";
							$dialogs.showErrorDialog(message, {
								logMessage : message + " at DatabaseListController:updateDatabaseHandler."
							});
							console.error(response.data);
						}
					);
				}
			}
			$dialogs.showConfirmationDialog("Are you sure?", {title: "Update the selected organism?", callback : sendUpdateRequest});
		};

		this.installDatabaseHandler = function (database){
			var sendInstallRequest = function(option){
				if(option === "ok"){
					$http($rootScope.getHttpRequestConfig("POST", "databases", {
						extra: database.organism_code
					})).then(
						function successCallback(response){
							debugger;
							if(response.data.success){
								me.retrieveDatabasesListData(true, me, "retrieveAvailableDatabases");
							}
						},
						function errorCallback(response){
							$scope.isLoading = false;

							debugger;
							var message = "Failed while installing the organism.";
							$dialogs.showErrorDialog(message, {
								logMessage : message + " at DatabaseListController:installDatabaseHandler."
							});
							console.error(response.data);
						}
					);
				}
			}
			$dialogs.showConfirmationDialog("Are you sure?", {title: "Install the selected organism?", callback : sendInstallRequest});
		};

		//--------------------------------------------------------------------
		// INITIALIZATION
		//--------------------------------------------------------------------
		var me = this;
		$scope.databases = DatabaseList.getDatabases();
		$scope.categories =  DatabaseList.getCategories();
		$scope.filters =  DatabaseList.getFilters();
		$scope.filteredDatabases = $scope.databases.length;
		$scope.minSearchLength = 2;
		$scope.visibleDatabases = 20;

		this.retrieveDatabasesListData(true, this, "retrieveAvailableDatabases");

	});

	app.controller('DatabaseDetailController', function($rootScope, $scope, $http, $dialogs, APP_EVENTS, DatabaseList) {
		//--------------------------------------------------------------------
		// CONTROLLER FUNCTIONS
		//--------------------------------------------------------------------
		this.checkDatabaseStatus = function(database){
			delete database.status;
			delete database.status_msg;
			$scope.current_action = "Checking status";

			$http($rootScope.getHttpRequestConfig("GET", "database-status", {
				extra: database.database
			})).then(
				function successCallback(response){
					database.status = response.data.status;
					database.status_msg = response.data.status_msg;
				},
				function errorCallback(response){
					$scope.isLoading = false;

					debugger;
					var message = "Failed while retrieving the database status.";
					$dialogs.showErrorDialog(message, {
						logMessage : message + " at DatabaseController:checkDatabaseStatus."
					});
					console.error(response.data);
				}
			);
		};

		//--------------------------------------------------------------------
		// EVENT HANDLERS
		//--------------------------------------------------------------------

		this.stopDatabaseHandler = function(database){
			delete database.status;
			delete database.status_msg;
			$scope.current_action = "Stopping database";

			$http($rootScope.getHttpRequestConfig("GET", "database-stop", {
				extra: database.database
			})).then(
				function successCallback(response){
					me.checkDatabaseStatus(database);
				},
				function errorCallback(response){
					$scope.isLoading = false;

					debugger;
					var message = "Failed while stopping the database.";
					$dialogs.showErrorDialog(message, {
						logMessage : message + " at DatabaseController:stopDatabase."
					});
					console.error(response.data);
				}
			);
		};

		this.startDatabaseHandler = function(database){
			delete database.status;
			delete database.status_msg;
			$scope.current_action = "Starting database";

			$http($rootScope.getHttpRequestConfig("GET", "database-start", {
				extra: database.database
			})).then(
				function successCallback(response){
					me.checkDatabaseStatus(database);
				},
				function errorCallback(response){
					$scope.isLoading = false;

					debugger;
					var message = "Failed while starting the database.";
					$dialogs.showErrorDialog(message, {
						logMessage : message + " at DatabaseController:startDatabase."
					});
					console.error(response.data);
				}
			);
		};

		this.restartDatabaseHandler = function(database){
			delete database.status;
			delete database.status_msg;
			$scope.current_action = "Restarting database";

			$http($rootScope.getHttpRequestConfig("GET", "database-restart", {
				extra: database.database
			})).then(
				function successCallback(response){
					me.checkDatabaseStatus(database);
				},
				function errorCallback(response){
					$scope.isLoading = false;

					debugger;
					var message = "Failed while restarting the database.";
					$dialogs.showErrorDialog(message, {
						logMessage : message + " at DatabaseController:restartDatabase."
					});
					console.error(response.data);
				}
			);
		};



		//--------------------------------------------------------------------
		// INITIALIZATION
		//--------------------------------------------------------------------
		var me = this;

		if($scope.database.enabled && $scope.database.status === undefined){
			this.checkDatabaseStatus($scope.database);
		}
	});
})();
