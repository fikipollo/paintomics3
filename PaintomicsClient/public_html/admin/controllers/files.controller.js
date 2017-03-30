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

		$scope.formatSize= function(bytes){
			if(bytes == 0) return '0 Bytes';
			var decimals = 1, k = 1000,
			dm = decimals + 1 || 3,
			sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'],
			i = Math.floor(Math.log(bytes) / Math.log(k));
			return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
		}
		//--------------------------------------------------------------------
		// EVENT HANDLERS
		//--------------------------------------------------------------------
		this.editFileHandler = function(file){
			$scope.model = file;
			this.addNewFileHandler();
		}

		this.addNewFileHandler = function(){
			var modalInstance = $uibModal.open({
				controller: 'FileController',
				controllerAs: 'controller',
				size: 'md',
				scope: $scope,
				templateUrl: "templates/file-details.tpl.html"
			});

			modalInstance.result.then(function (selectedItem) {
				delete $scope.model;
				me.retrieveFilesListData(true);
			}, function () {
				delete $scope.model;
				me.retrieveFilesListData(true);
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
						extra: file.fileName,
						data : {fileName : file.fileName}
					})).then(
						function successCallback(response){
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

	app.controller('FileController', function($rootScope, $scope, $http, $dialogs, $uibModalInstance, APP_EVENTS, FileList) {
		//--------------------------------------------------------------------
		// CONTROLLER FUNCTIONS
		//--------------------------------------------------------------------

		//--------------------------------------------------------------------
		// EVENT HANDLERS
		//--------------------------------------------------------------------
		this.saveFileDetailsHandler = function () {
			var formData = new FormData();

			if($scope.hideUpload){
				formData.append('fileName', $scope.model.fileName);
			}else{
				formData.append('files', $scope.file);
			}
			formData.append('specie', $scope.model.otherFields.specie);
			formData.append('version', $scope.model.otherFields.version);
			formData.append('source', $scope.model.otherFields.source);
			formData.append('dataType', $scope.model.dataType);
			formData.append('omicType', $scope.model.omicType);
			formData.append('description', $scope.model.description);

			$http.post(
				$rootScope.getRequestPath("files"), formData, {
					transformRequest: angular.identity,
					headers: {'Content-Type': undefined}
				}
			).then(
				function successCallback(response){
					$dialogs.showSuccessDialog("File succesfully saved.");
					$uibModalInstance.dismiss('cancel');
				},
				function errorCallback(response){
					debugger;
					var message = "Failed while saving the file. " + response.data.message;
					$dialogs.showErrorDialog(message, {
						logMessage : message + " at FileController:saveFileDetailsHandler."
					});
				}
			);
		};

		this.closeFileDetailsHandler = function () {
			$uibModalInstance.dismiss('cancel');
		};

		//--------------------------------------------------------------------
		// INITIALIZATION
		//--------------------------------------------------------------------
		var me = this;

		$scope.hideUpload = ($scope.model !== undefined);

		if(!$scope.model){
			$scope.model = {
				dataType : "Reference file",
				otherFields : {}
			};
		}

	});
})();
