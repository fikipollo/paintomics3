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
* - files.files.file-list
*
*/
(function(){
	var app = angular.module('files.files.file-list', []);

	app.factory("FileList", ['$rootScope', function($rootScope) {
		var files = [];
		var availableSpace = 0;
		var filters = [];
		var old = new Date(0);
		return {
			getFiles: function() {
				return files;
			},
			setFiles: function(fileList) {
				files = this.adaptFilesInformation(fileList);
				old = new Date();
				return this;
			},
			setAvailableSpace: function(_availableSpace){
				availableSpace = _availableSpace;
			},
			updateFiles: function(newFiles, soft) {
				return this;
			},
			getFile: function(file_id) {
				for(var i in files){
					if(files[i].id === file_id){
						return files[i];
					}
				}
				return null;
			},
			addFile: function(file) {
				files.push(this.adaptFileInformation(file));
				return this;
			},
			deleteFile: function(file_id) {
				for(var i in files){
					if(files[i].id === file_id){
						files.splice(i,1);
						return files;
					}
				}
				return null;
			},
			adaptFilesInformation: function(files) {
				for(var i in files){
					this.adaptFileInformation(files[i]);
				}
				return files;
			},
			adaptFileInformation: function(file){
				return file;
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
