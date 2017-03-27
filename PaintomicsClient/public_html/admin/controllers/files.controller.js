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
* - FileListController
* -
*
*/
(function(){
	var app = angular.module('admin.controllers.file-controllers', [
		'ui.bootstrap',
		'ang-dialogs',
		'chart.js',
		'files.files.file-list'
	]);

	app.controller('FileListController', function($rootScope, $scope, $http, $dialogs, $state, $interval, $uibModal, APP_EVENTS, FileList) {
		//--------------------------------------------------------------------
		// CONTROLLER FUNCTIONS
		//--------------------------------------------------------------------
		this.retrieveFilesListData = function(force, callback_caller, callback_function){
			$scope.isLoading = true;

			if(FileList.getOld() > 1 || force){ //Max age for data 5min.
				$http($rootScope.getHttpRequestConfig("GET", "files", {})).
				then(
					function successCallback(response){
						$scope.isLoading = false;
						$scope.files = FileList.setFiles(response.data.fileList).getFiles();

						if(callback_function !== undefined){
							callback_caller[callback_function]();
						}
					},
					function errorCallback(response){
						$scope.isLoading = false;

						debugger;
						var message = "Failed while retrieving the files list.";
						$dialogs.showErrorDialog(message, {
							logMessage : message + " at FileListController:retrieveFilesListData."
						});
						console.error(response.data);
					}
				);
			}else{
				$scope.files = FileList.getFiles();
				$scope.isLoading = false;
			}
		};

		/**
		* This function defines the behaviour for the "filterWorkflows" function.
		* Given a item (file) and a set of filters, the function evaluates if
		* the current item contains the set of filters within the different attributes
		* of the model.
		*
		* @returns {Boolean} true if the model passes all the filters.
		*/
		$scope.filterFiles = function(propertyName) {
			$scope.foundFiles = $scope.foundFiles || {};
			$scope.foundFiles[propertyName] = 0;
			return function( item ) {
				var filterAux, item_categories;
				var valid = ($scope.searchFor !== undefined) && ($scope.searchFor.length > $scope.minSearchLength) && (item[propertyName].toLowerCase().indexOf( $scope.searchFor.toLowerCase()) !== -1);
				if(valid){$scope.foundFiles[propertyName]++;}
				return valid;
			};
		};

		$scope.formatDate= function(date){
			return (date?date.substring(6,8) + "/" + date.substring(4,6) + "/"  + date.substring(0,4):"");
		}
		//--------------------------------------------------------------------
		// EVENT HANDLERS
		//--------------------------------------------------------------------
		this.addNewFileHandler = function(){
			//TODO: AQUIIIIII
			var modalInstance = $uibModal.open({
				ariaLabelledBy: 'modal-title',
				ariaDescribedBy: 'modal-body',
				templateUrl: 'myModalContent.html',
				controller: 'ModalInstanceCtrl',
				controllerAs: '$ctrl',
				size: size,
				appendTo: parentElem,
				resolve: {
					items: function () {
						return $ctrl.items;
					}
				}
			});

			modalInstance.result.then(function (selectedItem) {
				$ctrl.selected = selectedItem;
			}, function () {
				$log.info('Modal dismissed at: ' + new Date());
			});
		};



		/**
		* This function applies the filters when the file clicks on "Search"
		*/
		this.applySearchHandler = function() {
			var filters = arrayUnique($scope.filters.concat($scope.searchFor.split(" ")));
			$scope.filters = WorkflowList.setFilters(filters).getFilters();
		};

		this.deleteFileHandler = function (file){
			var sendRemoveRequest = function(option){
				if(option === "ok"){
					$http($rootScope.getHttpRequestConfig("DELETE", "files", {
						extra: file.fileName
					})).then(
						function successCallback(response){
							debugger;
							if(response.data.success){
								me.retrieveFilesListData(true);
							}
						},
						function errorCallback(response){
							$scope.isLoading = false;

							debugger;
							var message = "Failed while deleting the file.";
							$dialogs.showErrorDialog(message, {
								logMessage : message + " at FileListController:deleteFileHandler."
							});
							console.error(response.data);
						}
					);
				}
			}
			$dialogs.showConfirmationDialog("Are you sure?", {title: "Remove the selected file?", callback : sendRemoveRequest});
		};

		//--------------------------------------------------------------------
		// INITIALIZATION
		//--------------------------------------------------------------------
		var me = this;
		$scope.files = FileList.getFiles();
		$scope.minSearchLength = 2;
		$scope.filters =  FileList.getFilters();
		$scope.filteredFiles = $scope.files.length;

		this.retrieveFilesListData(true);

	});

	app.controller('FileController', function($rootScope, $scope, $http, $dialogs, APP_EVENTS, FileList) {
		//--------------------------------------------------------------------
		// CONTROLLER FUNCTIONS
		//--------------------------------------------------------------------
		this.checkFileStatus = function(file){
			delete file.status;
			delete file.status_msg;
			$scope.current_action = "Checking status";
		};

		//--------------------------------------------------------------------
		// EVENT HANDLERS
		//--------------------------------------------------------------------


		//--------------------------------------------------------------------
		// INITIALIZATION
		//--------------------------------------------------------------------
		var me = this;

		if($scope.file.enabled && $scope.file.status === undefined){
			this.checkFileStatus($scope.file);
		}
	});
})();
