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
		var filters = [];
		var old = new Date(0);
		return {
			getDatabases: function() {
				return databases;
			},
			setDatabases: function(_databases) {
				databases = this.adaptDatabasesInformation(_databases);
				old = new Date();
				return this;
			},
			updateDatabases: function(newDatabases, soft) {
				var found, nElems = databases.length;
				for(var i in newDatabases){
					found= false;
					for(var j=0; j < nElems; j++){
						if(newDatabases[i].name === databases[j].name){
							found= true;
							if(soft === true){
								databases[j].last_version = newDatabases[i].version;
								databases[j].secondary_website = newDatabases[i].website;
							}else{
								databases[j] = this.adaptDatabaseInformation(newDatabases[i]);
							}
							break;
						}
					}
					if(!found){
						if(soft === true){
							newDatabases[i].last_version = newDatabases[i].version;
							newDatabases[i].secondary_website = newDatabases[i].website;
							delete newDatabases[i].version;
							delete newDatabases[i].website;
						}
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
			adaptDatabasesInformation: function(databases) {
				for(var i in databases){
					this.adaptDatabaseInformation(databases[i]);
				}
				return databases;
			},
			adaptDatabaseInformation: function(database){
				if(database.website !== undefined && database.website.indexOf("<HOST_NAME>") !== -1){
					database.website = database.website.replace("<HOST_NAME>", window.location.protocol + "//" + window.location.hostname);
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
			getOld: function(){
				return (new Date() - old)/120000;
			}
		};
	}]);
})();
