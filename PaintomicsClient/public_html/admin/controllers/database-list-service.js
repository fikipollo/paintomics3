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
* - databases.databases.database-list
*
*/
(function(){
	var app = angular.module('databases.databases.database-list', []);

	app.factory("DatabaseList", ['$rootScope', function($rootScope) {
		var databases = [];
		var categories = [];
		var commonData = null;
		var filters = [];
		var old = new Date(0);
		return {
			getDatabases: function() {
				return databases;
			},
			setDatabases: function(_databases, status) {
				commonData = _databases.common_info_date;
				databases = this.adaptDatabasesInformation(_databases.databaseList, status);
				old = new Date();
				return this;
			},
			updateDatabases: function(newDatabases, soft) {
				var found, nElems = databases.length;
				for(var i in newDatabases){
					found= false;
					for(var j=0; j < nElems; j++){
						if(newDatabases[i].organism_code === databases[j].organism_code){
							found= true;
							if(soft === true){
								databases[j].categories = newDatabases[i].categories;
							}else{
								databases[j] = this.adaptDatabaseInformation(newDatabases[i]);
							}
							break;
						}
					}
					if(!found){
						databases.push(this.adaptDatabaseInformation(newDatabases[i]));
					}
				}
				return this;
			},
			getDatabase: function(database_id) {
				for(var i in databases){
					if(databases[i].id === database_id){
						return databases[i];
					}
				}
				return null;
			},
			addDatabase: function(database) {
				databases.push(this.adaptDatabaseInformation(database));
				return this;
			},
			deleteDatabase: function(database_id) {
				for(var i in databases){
					if(databases[i].id === database_id){
						databases.splice(i,1);
						return databases;
					}
				}
				return null;
			},
			adaptDatabasesInformation: function(databases, status) {
				for(var i in databases){
					this.adaptDatabaseInformation(databases[i], status);
				}
				return databases;
			},
			adaptDatabaseInformation: function(database, status){
				if (database.status !== "installed"){
					database.status = status;
				}
				return database;
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
			getCategories: function() {
				return categories;
			},
			getCategory: function(_category) {
				for(var i in categories){
					if(categories[i].name === _category){
						return categories[i];
					}
				}
				return null;
			},
			setCategories: function(_categories) {
				categories = _categories;
				return this;
			},
			updateCategories: function() {
				var categoriesAux = {}, _categories;
				var installed = 0, downloaded = 0, downloading = 0;

				for(var i in databases){
					databases[i].categories = (databases[i].categories || []);
					if(databases[i].downloaded === "downloaded"){
						databases[i].categories.push("Locally available");
					}else if (databases[i].downloaded === "downloading"){
						databases[i].categories.push("Downloading");
					}
					if (databases[i].status === "installed"){
						databases[i].categories.push("Installed");
					}

					_categories = databases[i].categories;
					for(var j in _categories){
						categoriesAux[_categories[j]] = {
							name: _categories[j],
							times: ((categoriesAux[_categories[j]] === undefined)?1:categoriesAux[_categories[j]].times + 1)
						}
					}
				}
				categories = Object.keys(categoriesAux).map(function(k) { return categoriesAux[k] });
				categories.push({name: "All", times: databases.length})

				return this;
			},
			getOld: function(){
				return (new Date() - old)/120000;
			}
		};
	}]);
})();
