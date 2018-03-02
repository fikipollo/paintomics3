//# sourceURL=PA_Step3Views.js
/*jshint esversion: 6 */
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
* THIS FILE CONTAINS THE FOLLOWING COMPONENT DECLARATION
* - PA_Step3JobView
* - PA_Step3PathwayClassificationView
* - PA_Step3PathwayNetworkView
* - PA_Step3PathwayNetworkTooltipView
* - PA_Step3PathwayDetailsView
* - PA_Step3PathwayTableView
* - PA_Step3StatsView
*
*/

function PA_Step3JobView() {
	/**
	* About this view: this view (PA_Step3JobView) is used to visualize an instance for a Pathway acquisition
	* job when current step is STEP 3.
	* The view shows different information for the Job instance, in particular:
	*  - First it show a summary panel with the number of matched pathways
	*  - A panel containing a summary for the classifications for the matched pathways (PA_Step3PathwayClassificationView):
	*     · A pie chart with an overview of the distribution of the classifications
	*     · A tree view containing each classification, the corresponding subclassifications
	*       and pathways. This panel allows to show/hide elements in the view (pathways)
	*  - A panel showing a network (PA_Step3PathwayNetworkView) where nodes represents pathways and edges relationships between them.
	*    This view also contains:
	*     · A tooltip showing some information for pathways when hovering the nodes (PA_Step3PathwayNetworkTooltipView)
	*     · A detailed view for each pathway in the network (PA_Step3PathwayDetailsView)
	*  - A table (PA_Step3PathwayTableView) showing a ranking for the matched pathways, ordered by relevance.
	**/
	/*********************************************************************
	* ATTRIBUTES
	***********************************************************************/
	this.name = "PA_Step3JobView";
	this.visualOptions = null;
	this.classificationData = {};
	this.indexedPathways = {};

	this.pathwayClassificationViews = {};
	this.pathwayNetworkViews = {};
	this.pathwayTableView = null;
	this.statsView = null;
	this.significativePathways = 0;
	this.significativePathwaysByDB = {};
	this.isFiltered = {};

	/*********************************************************************
	* GETTERS AND SETTERS
	***********************************************************************/
	/**
	* This function load of the given model.
	* @chainable
	* @param {JobInstance} model
	* @returns {PA_Step3JobView}
	*/
	this.loadModel = function(model) {
		/********************************************************/
		/* STEP 1: SET THE MODEL		                        */
		/********************************************************/
		if (this.model !== null) {
			this.model.deleteObserver(this);
		}
		this.model = model;
		this.model.addObserver(this);

		/********************************************************/
		/* STEP 2: PROCESS DATA AND GENERATE THE TABLES         */
		/********************************************************/
		var pathways = this.getModel().getPathways();
		var databases = this.getModel().getDatabases();

		/********************************************************/
		/* STEP 2.1.A LOAD VISUAL OPTIONS IF ANY                */
		/********************************************************/
		// TODO: KEEP COMPATIBILITY WITH ALREADY SAVED VISUAL OPTIONS
		var defaultVisualOptions = {
			//GENERAL OPTIONS
			pathwaysVisibility: [],
			//OPTIONS FOR NETWORK
			minFeatures: 0.50,
			minPValue: 0.05,
			minSharedFeatures: 0.9,
			colorBy : "classification",
			backgroundLayout : false,
			showNodeLabels : true,
			useCombinedPvalCheckbox: true,
			autoSaveNodePositions: false,
			//showEdgeLabels : false,
			edgesClass : 'l',
			minNodeSize: 1,
			maxNodeSize: 8,
			networkPvalMethod: 'none',
			fontSize: 14
		};
        
        var globalDefaultVisualOptions = {
            selectedCombinedMethod: 'Fisher',
            selectedAdjustedMethod: 'None',
            stoufferWeights: {},
			timestamp: this.model.getTimestamp()
        };

		// Initialize dictionaries with databases used
		databases.map((function(db) {
			this.indexedPathways[db] = {};
			this.classificationData[db] = {};
			this.isFiltered[db] = false;
		}).bind(this));

		// Ensure that the visual options timestamp is on par with the model (could be new due to 'Go back' feature)
		if (window.sessionStorage && sessionStorage.getItem("visualOptions") !== null) {
			this.visualOptions = jQuery.extend(jQuery.extend({}, globalDefaultVisualOptions), 
                                               JSON.parse(sessionStorage.getItem("visualOptions")));
			
			// The visualOptions session info can come from an old job (after 'Go back') or updated
			// by recovering the job. Check that the time stamps match or invalidate this block.
			if (this.visualOptions.timestamp >= this.model.getTimestamp()) {
				// If the visualOptions does not contain at least the key KEGG (mandatory)
				// then it has the old format, convert it to the new one.
				databases.map((function(db) {
					if (!(db in this.visualOptions)) {
						/* Avoid referencing to the same object */
						var defaultDBsettings =  jQuery.extend(true, {}, defaultVisualOptions);
						this.visualOptions[db] = {};

						$.each(Object.keys(defaultVisualOptions), (function(index, option) {
							this.visualOptions[db][option] = this.visualOptions[option] ||  defaultDBsettings[option];
							delete this.visualOptions[option];
						}).bind(this));
					}
				}).bind(this));
			} else {
				this.visualOptions = null;
			}
		}
		/********************************************************/
		/* STEP 2.1.B GENERATE DEFAULT VISUAL OPTIONS           */
		/********************************************************/

		this.visualOptions = jQuery.extend(true, {}, globalDefaultVisualOptions, this.visualOptions);

		databases.map((function(db) {
			// jQuery extend with deep copy will merge the arrays, so if we are creating the 
			// visual options from scratch we assign all the DB pathways and if not, the very
			// same filtered pathways already saved so the merge won t do anything wrong.
			var dbPathways;
			
			if (this.visualOptions[db]) {
				dbPathways = $.isEmptyObject(this.visualOptions[db].pathwaysVisibility) ? 
					this.getModel().getPathwaysByDB(db).map(x => x.getID()) :
					this.visualOptions[db].pathwaysVisibility;
			} else {
				dbPathways = this.getModel().getPathwaysByDB(db).map(x => x.getID());
			}				
			
			this.visualOptions[db] = jQuery.extend(true, {}, defaultVisualOptions, {pathwaysVisibility: dbPathways}, this.visualOptions[db]);
		}).bind(this));

		this.getController().updateStoredApplicationData("visualOptions", this.visualOptions);

		/********************************************************/
		/* STEP 2.2 GENERATE THE INDEX FOR PATHWAYS             */
		/********************************************************/
		this.indexPathways(pathways);

		/************************************************************/
		/* STEP 2.3 GENERATE THE TABLE WITH PATHWAY CLASSIFICATIONS */
		/************************************************************/
		/*	human_diseases : {
		*		name: "Human diseases",
		*		count: 6,
		*		children: {
		*			"colon_..." : {
		*				name: "Colon...",
		*				count: 10,
		*				children: ["mmu10100", "mmu10340", ...]
		*			},
		*			"wherever..." : {
		*				...
		*			},
		*		},
		*	}
		*/

		/* Duplicate this for each source of pathways */
		for (var i in pathways) {
			pathwayInstance =  pathways[i];
			pathwayDB = pathwayInstance.getSource();

			if (pathwayInstance.getCombinedSignificanceValueByMethod(this.visualOptions.selectedCombinedMethod) <= 0.05) {
				this.significativePathways += 1
				this.significativePathwaysByDB[pathwayDB] += 1
			}

			mainClassificationName = pathwayInstance.getClassification().split(";");
			secClassificationName = mainClassificationName[1] || '';
			mainClassificationName = mainClassificationName[0];
			mainClassificationID = mainClassificationName.toLowerCase().replace(/ /g, "_");
			secClassificationID = secClassificationName.toLowerCase().replace(/ /g, "_");

			if(this.classificationData[pathwayDB][mainClassificationID] === undefined){
				this.classificationData[pathwayDB][mainClassificationID] = {
					name: mainClassificationName,
					count: 0,
					children: {}
				};
			}
			this.classificationData[pathwayDB][mainClassificationID].count++;

			if(this.classificationData[pathwayDB][mainClassificationID].children[secClassificationID] === undefined){
				this.classificationData[pathwayDB][mainClassificationID].children[secClassificationID] = {
					name: secClassificationName,
					count: 0,
					children: []
				};
			}
			this.classificationData[pathwayDB][mainClassificationID].children[secClassificationID].count++;
			this.classificationData[pathwayDB][mainClassificationID].children[secClassificationID].children.push(pathwayInstance.getID());
		}

		/************************************************************/
		/* STEP 3 CREATE THE SUBVIEWS                               */
		/************************************************************/
		if(this.pathwayTableView=== null){
			this.pathwayTableView = new PA_Step3PathwayTableView();
			this.pathwayTableView.setController(this.getController());
			this.pathwayTableView.setParent(this);
		}
		this.pathwayTableView.loadModel(model);
		
		this.statsView = new PA_Step3StatsView();
		this.statsView.loadModel(model);
		
		$.each(databases, (function(index, db) {
			if(!(db in this.pathwayClassificationViews)){
				this.pathwayClassificationViews[db] = new PA_Step3PathwayClassificationView(db);
				this.pathwayClassificationViews[db].setController(this.getController());
				this.pathwayClassificationViews[db].setParent(this);
			}
			this.pathwayClassificationViews[db].loadModel(model);

			if(!(db in this.pathwayNetworkViews)){
				this.pathwayNetworkViews[db] = new PA_Step3PathwayNetworkView(db);
				this.pathwayNetworkViews[db].setController(this.getController());
				this.pathwayNetworkViews[db].setParent(this);
			}
			this.pathwayNetworkViews[db].loadModel(model);
			
			// Determine if the table for the DB is filtered or not
			this.isFiltered[db] = (this.model.getPathwaysByDB(db).length != this.getTotalVisiblePathways(db).visible);
		}).bind(this));

		if (this.getModel().isRecoveredJob && this.getModel().getStepNumber() === 3) {
			$(".backButton").hide();
		}


		return this;
	};
	

	this.getVisualOptions = function(db = null){
		return (db == null) ? this.visualOptions : this.visualOptions[db];
	};
	this.setVisualOptions = function(propertyName, value, db = null) {
		if (db == null) {
			this.visualOptions[propertyName] = value;
		} else {
			this.visualOptions[db][propertyName] = value;
		}
	};
	this.getClassificationData = function(db = null){
		return (db == null) ? this.classificationData : this.classificationData[db];
	};
	this.getIndexedPathways = function(db = null){
		return (db == null) ? this.indexedPathways : this.indexedPathways[db];
	};
	
	this.indexPathways = function(pathways) {
		var pathwayInstance;
		for (var i in pathways) {
			pathwayInstance =  pathways[i];
			pathwayInstance.setVisible(this.visualOptions[pathwayInstance.getSource()].pathwaysVisibility.indexOf(pathwayInstance.getID()) !== -1);
			this.indexedPathways[pathwayInstance.getSource()][pathwayInstance.getID()] = pathwayInstance;
		}
		$.each(this.getModel().getDatabases(), (function(index, db) {
			if(this.visualOptions[db].pathwaysPositions !== undefined){
				var data;
				for(var i in this.visualOptions[db].pathwaysPositions){
					data = this.visualOptions[db].pathwaysPositions[i].split("#");
					this.indexedPathways[db][data[0]].networkCoordX = Number.parseFloat(data[1]);
					this.indexedPathways[db][data[0]].networkCoordY = Number.parseFloat(data[2]);
				}
			}
		}).bind(this));		
	};

	this.getTotalVisiblePathways = function(db){
		var visible = 0;
		var significative = 0;
		var pathways = (db == undefined ? this.getModel().getPathways() : this.getModel().getPathwaysByDB(db));
		for (var i in pathways) {
			visible += (pathways[i].isVisible() ? 1 : 0);
			if(Object.keys(this.model.summary[4]).length > 1){
				significative += ((pathways[i].isVisible() && pathways[i].getCombinedSignificanceValueByMethod(this.visualOptions.selectedCombinedMethod) <= 0.05) ? 1 : 0);
			}else{
				significative += ((pathways[i].isVisible() && pathways[i].getSignificanceValues()[Object.keys(pathways[i].getSignificanceValues())[0]][2] <= 0.05) ? 1 : 0);
			}
		}

		var visiblePathways = {
			visible: visible,
			significative : significative
		};
		return visiblePathways;
	};

	/*********************************************************************
	* OTHER FUNCTIONS
	***********************************************************************/
	/**
	* This function returns the corresponding color for the given classification id
	* @param {String} classificationID, the id for the classification
	* @param {String[]} otherColors, list of colors in case that the classification is not found
	* @returns {String} the hexadecimal color code
	**/
	this.getClassificationColor = function(classificationID, otherColors){
		var colors = ["#007AFF",  "#4CD964", "#FF2D55", "#FFCD02", "#5AC8FB", "#C644FC", "#FF9500"];
		var pos = ["cellular_processes", "environmental_information_processing", "genetic_information_processing", "human_diseases", "metabolism", "organismal_systems", "overview"].indexOf(classificationID);

		if(pos !== -1){
			return colors[pos];
		}else if(otherColors.length > 0){
			return otherColors.shift();
		}else{
			return "#333";
		}
	};

	this.backButtonHandler = function() {
		this.controller.backButtonClickHandler(this);
	};
	this.resetViewHandler = function() {
		this.controller.resetButtonClickHandler(this);
	};

	/**
	* This function updates the visual representation of the model.
	* - STEP 1: LOAD SUMMARY
	* - STEP 2: GENERATE THE PATHWAYS CLASSIFICATION PLOT
	* - STEP 3: GENERATE THE TABLE
	* - STEP 4: GENERATE THE PATHWAYS NETWORK
	* - STEP 5: UPDATE THE SUMMARY
	* @returns {PA_Step3JobView}
	*/
	this.updateObserver = function() {
		var me = this;

		/********************************************************/
		/* STEP 1: LOAD SUMMARY      		                    */
		/********************************************************/
		$("#jobIdField").html(this.getModel().getJobID());
		$("#jobURL").html(window.location.href).attr('href', window.location.href);
		
		// Update Job name (description) if available
		if (this.getModel().getName()) {
			$("#jobName").html('[' + this.getModel().getName() + ']').show();
		}
		
		/********************************************************/
		/* STEP 2: GENERATE THE PATHWAYS CLASSIFICATION PLOT    */
		/********************************************************/
		$.each(this.pathwayClassificationViews, function(index, view) {
			view.updateObserver();
		});
		/********************************************************/
		/* STEP 3: GENERATE THE TABLE						     /
		/********************************************************/
		this.pathwayTableView.updateObserver();
		/********************************************************/
		/* STEP 4: GENERATE THE PATHWAYS NETWORK                */
		/********************************************************/
		$.each(this.pathwayNetworkViews, function(index, view) {
			view.updateObserver();
		});
		/********************************************************/
		/* STEP 5: UPDATE THE SUMMARY                           */
		/********************************************************/
		setTimeout(function() {
			var databases = me.model.getDatabases();
			var totalFound = totalSignificative = 0;

			databases.forEach(function(dbname) {
				var visiblePathways = me.getTotalVisiblePathways(dbname);

				$("#foundPathwaysTag_" + dbname).html(visiblePathways.visible);
				$("#significantPathwaysTag_" + dbname).html(visiblePathways.significative);

				totalFound += visiblePathways.visible;
				totalSignificative += visiblePathways.significative;
			});

			$("#foundPathwaysTag").html(totalFound);
			$("#significantPathwaysTag").html(totalSignificative);
		}, 1000);

		initializeTooltips(".helpTip");

		return this;
	};

	/**
	* This function apply the settings that user can change
	* for the visual representation of the model (w/o reload everything).
	* - STEP 1: DO WHEREVER (include here code if necessary)
	* - STEP 2. UPDATE THE TABLE WITH THE SELECTED OPTIONS (only if updating from categories panel)
	* - STEP 3. UPDATE THE pathwayNetworkView VIEW
	* - STEP 4. UPDATE THE CACHE
	* @chainable
	* @param {String} caller, the name of the view that calls this function
	* @returns {PA_Step3JobView}
	*/
	this.applyVisualSettings = function(caller, db = "KEGG") {
		var me = this;
		/********************************************************/
		/* STEP 1: DO WHEREVER (include here code if necessary) */
		/********************************************************/

		if(caller === "PA_Step3PathwayClassificationView"){
			/* Mark databases as filtered or not */
			this.model.databases.forEach(function(db) {
				me.isFiltered[db] = (me.model.getPathwaysByDB(db).length != me.getTotalVisiblePathways(db).visible);
			});
			
			/********************************************************/
			/* STEP 2. UPDATE THE TABLE WITH THE SELECTED OPTIONS   */
			/*         (only if updating from categories panel)     */
			/********************************************************/
			this.pathwayTableView.updateVisiblePathways(true);	
		}
		/********************************************************/
		/* STEP 3. UPDATE THE pathwayNetworkView VIEW           */
		/********************************************************/
		this.pathwayNetworkViews[db].updateObserver();

		/********************************************************/
		/* STEP 4. UPDATE THE CACHE
		/********************************************************/
		me.getController().updateStoredVisualOptions(me.getModel().getJobID(), me.visualOptions);

		/********************************************************/
		/* STEP 5: UPDATE THE SUMMARY                           */
		/********************************************************/
		setTimeout(function() {
			var databases = me.model.getDatabases();
			var totalFound = totalSignificative = 0;

			databases.forEach(function(dbname) {
				var visiblePathways = me.getTotalVisiblePathways(dbname);

				$("#foundPathwaysTag_" + dbname).html(visiblePathways.visible);
				$("#significantPathwaysTag_" + dbname).html(visiblePathways.significative);

				totalFound += visiblePathways.visible;
				totalSignificative += visiblePathways.significative;
			});

			$("#foundPathwaysTag").html(totalFound);
			$("#significantPathwaysTag").html(totalSignificative);
		}, 1000);

		return this;
	};

	/**
	* This function opens a new view (STEP4 VIEW) for the selected pathway.
	* @chainable
	* @param {String} pathwayID, the ID for the selected pathway
	* @returns {PA_Step3JobView}
	*/
	this.paintSelectedPathway = function(pathwayID) {
		$.each(this.pathwayNetworkViews, function(index, network) { network.stopNetworkLayout(); });
		this.getController().step3OnFormSubmitHandler(this, pathwayID);
		return this;
	};

	/**
	* This function generates the component (EXTJS) using the content of the
	* JobInstance model
	* @returns {Ext.ComponentView} The visual component
	*/
	this.initComponent = function() {
		var me = this;

		/* Initialize tab content */
		var tabContent = [];

		/* If there is only one database, use a container instead of tabpanel */
		$.each(this.getModel().getDatabases(), (function(index, db) {
			var tabDB = {
				title: db,
				items: [
					this.pathwayClassificationViews[db].getComponent(),
					this.pathwayNetworkViews[db].getComponent()
				]
			}

			tabContent.push(tabDB)
		}).bind(this));

		this.component = Ext.widget({
			xtype: "container",
			padding: '10', border: 0, maxWidth: 1900,
			items: [
				{ //THE TOOLBAR
					xtype: "box",cls: "toolbar secondTopToolbar", html:
					'<a href="javascript:void(0)" class="button btn-danger btn-right" id="resetButton"><i class="fa fa-refresh"></i> Reset view</a>' +
					//'<a href="javascript:void(0)" class="button btn-default btn-right backButton"><i class="fa fa-arrow-left"></i> Go back</a>'
					'<a href="javascript:void(0)" class="button btn-default btn-right mappingButton"><i class="fa fa-database"></i> Hide mapping info</a>'
				},{ //THE SUMMARY PANEL
					xtype: 'container', itemId: "pathwaysSummaryPanel",
					layout: 'column', style: "max-width:1900px; margin: 5px 10px; margin-top:50px;", items: [
						{
							xtype: 'box', cls: "contentbox omicSummaryBox", html:
							'<div id="about">' +
							'  <h2>Pathways selection</h2>' +
							'  <p>' +
							'     We found the following Pathways for the provided data.<br>Each Pathway has a set of significance values for each submitted <i>omic data</i>,' +
							'     those values are calculated based on the total number of features (compounds and genes) for each Pathway as well as the number of features from the input involved on that Pathway.<br>' +
							'     Additionally, when the input includes 2 or more different omic types, we provide a Combined Significance Value, which allow us to identify those Pathways that are potentially more relevant.' +
							'  </p>' +
							'  <a id="paint_link"><i class="fa fa-paint-brush-o"></i> Choose the pathways below and  Paint!</a> ' +
							'</div>'
						}, {
							xtype: 'box',
							cls: "contentbox omicSummaryBox",
							html: '<h2>Pathways summary</h2>' +
							'<h3 style="text-align:center;">Your Job ID is <b id="jobIdField">[JOB ID]</b><span id="jobName" style="display: none">[JOB NAME]</span><span class="infoTip" style=" font-size: 12px; ">You can access this job using the URL: <a id="jobURL" target="_blank" href="#">[JOBURL]</a></h3>' +
							'<div style="text-align:center;font-size: 25px;line-height: 120px;">' +
							'  <span class="myDataSummaryCount" style=" margin: 0; padding-right: 0; "><i class="fa fa-sitemap"></i> </span>' +
							'  <div id="foundPathwaysTag" class="odometer odometer-theme-default">000</div>  Found Pathways' +
							'  <span class="myDataSummaryCount" style=" margin: 0; padding-right: 0;"><i class="fa fa-star" style="background-color: #F1CC28;"></i> </span>' +
							'  <div id="significantPathwaysTag" class="odometer odometer-theme-default">000</div> Significant' +
							'</div>'
						}
					]
				},
				((me.getModel().getDatabases().length < 2) ? null :
				{
					xtype: 'box', cls: "contentbox", style: "max-width:1900px; margin: 5px 10px; margin-top:20px;", html:
					'<div id="multisource_msg">' +
					'  <h2>Multiple databases used</h2>' +
					'  <p>' +
					'		The selected species has available pathway data from more than one database. In order to view the additional information, a tab panel has been' +
					' added immediately under this message, giving access to different classification and network analysis for each database.<br/><br/>' +
					' By default the pathway selection list from below will show pathways from all databases, but a set of checkboxes have been added' +
					' on the search bar allowing to select which ones should be used. Each pathway row has also a new additional column indicating the' +
					' source. <br/><br />' +
					' The pathways summary splitted by databases is the following one:<div id="multisource_summary"></div>' +
					'  </p>' +
					'</div>'
				}),
				me.statsView.getComponent(),
				{
						xtype: 'tabpanel', id: 'tabcontainer_network', plain: true,
						deferredRender: false, items: tabContent, border: false,
						cls: ((me.getModel().getDatabases().length < 2) ? 'onedatabase' : ''),
						style: "max-width:1900px; margin: 5px 10px; margin-top:20px; height: auto;",
						tabBar: {
							/* Hide tab bar when there is only one database */
							hidden: (me.getModel().getDatabases().length < 2),
							defaults: {
								height: 40
							},
							height: 50,
						},
						listeners: {
							tabchange: function(tabPanel, newCard, oldCard, eOpts) {
								/* Fire event at network element (second position) */
								newCard.items.getAt(1).fireEvent('tabchange');
							}
						}
				},
				me.pathwayTableView.getComponent(), //THE TABLE PANEL
			],
			listeners: {
				boxready: function() {
					//SOME EVENT HANDLERS
//					$(".backButton").click(function() {
//						me.backButtonHandler();
//					});
					$(".mappingButton").click(function() {
						var cmp = Ext.getCmp('statsViewContainer');
						cmp.getEl().toggle();
						
						var buttonHTML = $(this).html();
						
						$(this).html(buttonHTML.includes('Hide') ? buttonHTML.replace(/Hide/g, 'Show') : buttonHTML.replace(/Show/g, 'Hide'));
						
						$('#mainViewCenterPanel').scrollTop(cmp.getEl().dom.offsetTop - 60);
					}).trigger('click');
					
					$("#resetButton").click(function() {
						me.resetViewHandler();
					});
					//INITIALIZE THE COUNTERS IN SUMMARY PANEL
					new Odometer({el: $("#foundPathwaysTag")[0],value: 0});
					new Odometer({el: $("#significantPathwaysTag")[0],value: 0});
					// SUMMARY PANEL PER DATABASE
					if (me.getModel().getDatabases().length > 1) {
						var DB_COLORS = ["#007AFF",  "#4CD964", "#FF2D55", "#FFCD02", "#5AC8FB", "#C644FC"];
						var table_html = "<table><tr><th></th><th>Database</th><th>Found pathways</th><th>Significant</th></tr>";

						for (var i = 0; i < me.getModel().getDatabases().length; i++) {
							var database = me.getModel().getDatabases()[i];
							var db_color = (i < DB_COLORS.length) ? DB_COLORS[i] : "#000000";

							table_html +=
							'<tr>' +
								'<td><i class="classificationNameBox" id="icon_' + database + '" style="border-color: ' + db_color + '; color: ' + db_color + ';">' + database.charAt(0) + '</i></td>' +
								'<td>' + database + '</td>' +
								'<td id="foundPathwaysTag_' + database + '">0</td><td id="significantPathwaysTag_' + database + '">0</td>' +
							'</tr>';
						}

						table_html += "</table>"

						$("#multisource_summary").html(table_html);
					}
				},
				beforedestroy: function() {
					me.getModel().deleteObserver(me);
				}
			}
		});

		return this.component;
	};

	return this;
}
PA_Step3JobView.prototype = new View();

function PA_Step3PathwayClassificationView(db = "KEGG") {
	/**
	* About this view: this view (PA_Step3PathwayClassificationView) is used to visualize
	* a summary for the classifications for the matched pathways.
	* The view shows different information for the Job instance, in particular:
	*  - A pie chart with an overview of the distribution of the classifications
	*  - A tree view containing each classification, the corresponding subclassifications
	*    and pathways. This panel allows to show/hide elements in the view (pathways)
	**/
	/*********************************************************************
	* ATTRIBUTES
	***********************************************************************/
	this.name = "PA_Step3PathwayClassificationView";
	this.database = db;
	this.dbid = this.database.replace(' ', '__');
	this.highcharts = null;
	this.OTHER_COLORS = ["#FF9500", "#E0F8D8", "#55EFCB", "#FFD3E0"];

	/*********************************************************************
	* OTHER FUNCTIONS
	***********************************************************************/
	/**
	* This function updates the visual representation of the model.
	*  - STEP 1. INITIALIZE VARIABLES
	*  - STEP 2. GENERATE THE PIE CHART FOR THE CLASSIFICATIONS
	*  - STEP 3. GENERATE THE CLASSIFICATION SELECTOR PANEL
	* @chainable
	* @returns {PA_Step3PathwayClassificationView}
	*/
	this.updateObserver = function() {
		/********************************************************/
		/* STEP 1. INITIALIZE VARIABLES                         */
		/********************************************************/
		var me = this;
		var OTHER_COLORS = $.extend(true, [], me.OTHER_COLORS);
		var classificationData = this.getParent().getClassificationData(this.database);
		var indexedPathways = this.getParent().getIndexedPathways(this.database);
		var pathways = this.getModel().getPathwaysByDB(this.database);

		/**********************************************************/
		/* STEP 2. GENERATE THE PIE CHART FOR THE CLASSIFICATIONS */
		/**********************************************************/
		var mainClassifications = [], secondClassifications = [], mainClassificationInstance, secClassificationInstance, drilldownAux;
		var classificationID, secondClassificationID;

		// var totalPathways = 0;
		// for(var i in pathways){
		// 	if(pathways[i].visible){totalPathways++;}
		// }

		for (classificationID in classificationData){
			mainClassificationInstance = classificationData[classificationID];

			mainClassifications.push({
				name: mainClassificationInstance.name,
				y: (mainClassificationInstance.count/pathways.length) * 100,
				color: this.getParent().getClassificationColor(classificationID, OTHER_COLORS),
				drilldown: classificationID
			});

			drilldownAux = {
				name: mainClassificationInstance.name,
				id: classificationID,
				data: []
			};

			for (secondClassificationID in mainClassificationInstance.children){
				secClassificationInstance = mainClassificationInstance.children[secondClassificationID];
				drilldownAux.data.push([secClassificationInstance.name, (secClassificationInstance.count/pathways.length) * 100]);
			}
			secondClassifications.push(drilldownAux);
		}

		me.highcharts = Highcharts.chart('pathwayDistributionsContainer_' + me.dbid, {
			chart: {type: 'pie'},
			title: null, credits: {enabled: false},
			plotOptions: {
				series: {
					animation: false,
					dataLabels: {
						enabled: true,  useHTML:true,
						formatter: function(){
							if(this.point.drilldown !== undefined){
								return '<i class="classificationNameBox" style="line-height: 20px;border-color:' + this.point.color + '; color:' + this.point.color + ';">' + this.point.name.charAt(0).toUpperCase() + '</i>' + this.y.toFixed(2) + "%";
							}else{
								return "<b>" + this.point.name + "</b><br>" + this.y.toFixed(2) + "%";
							}
						}
					}
				}
			},
			tooltip: {
				headerFormat: '<span style="font-size:11px">{series.name}</span><br>',
				pointFormat: '<span style="color:{point.color}">{point.name}</span>: <b>{point.y:.2f}%</b> of total<br/>'
			},
			series: [{
				name: "Pathways Classification",
				colorByPoint: true,
				data: mainClassifications
			}],
			drilldown: {
				series: secondClassifications
			}
		});

		/**********************************************************/
		/* STEP 3. GENERATE THE CLASSIFICATION SELECTOR PANEL     */
		/**********************************************************/
		/* STEP 3.1 INITIALIZE VARIABLES                          */
		/**********************************************************/
		OTHER_COLORS = ["#FF9500", "#E0F8D8", "#55EFCB", "#FFD3E0"];
		var htmlContent = "", mainClassificationHTMLcode, secClassificationHTMLcode,
		pathClassificationHTMLcode, color, pathwayID, temporalCodeTable, namesAux, posAux,
		isCustomMainClass, isHiddenMainClass, isCustomSecClass, isHiddenSecClass;

		var mainClassificationIDs = Object.keys(classificationData).sort();
		/***********************************************************/
		/* STEP 3.2 GENERATE THE HTML CODE FOR MAIN CLASSIFICATIONS*/
		/***********************************************************/
		while (mainClassificationIDs.length > 0){
			classificationID = mainClassificationIDs.shift();
			mainClassificationInstance = classificationData[classificationID];

			color = this.getParent().getClassificationColor(classificationID, OTHER_COLORS);
			secClassificationHTMLcode = ""; //HTML code for children (pathways and secondary classifications)
			isCustomMainClass = false; //Determine if visibility for main classification should be Show/Custom/Hide
			isHiddenMainClass = true; //Determine if visibility for main classification should be Show/Custom/Hide

			var secClassificationIDs = Object.keys(mainClassificationInstance.children).sort();
			/******************************************************************/
			/* STEP 3.2.1 GENERATE THE HTML CODE FOR SECONDARY CLASSIFICATIONS*/
			/******************************************************************/
			while (secClassificationIDs.length > 0){
				secondClassificationID  = secClassificationIDs.shift();
				//Initialize variables
				secClassificationInstance = mainClassificationInstance.children[secondClassificationID];
				pathClassificationHTMLcode = "";
				isCustomSecClass = false;
				isHiddenSecClass = true;

				/********************************************************************/
				/* STEP 3.2.1.1 GENERATE THE HTML CODE FOR PATHWAYS                 */
				/********************************************************************/
				temporalCodeTable = [];
				namesAux = [];
				for (var i in secClassificationInstance.children){
					pathwayID = secClassificationInstance.children[i];
					posAux = Array.binaryInsert(indexedPathways[pathwayID].getName(), namesAux);
					temporalCodeTable.splice(posAux, 0,
						'<div class="checkbox step3ClassificationsPathway">'+
						'  <input type="checkbox" '+ (indexedPathways[pathwayID].isVisible()?"checked":"")+' id="' + pathwayID +'">'+
						'  <label for="' + pathwayID +'">'+ indexedPathways[pathwayID].getName() +'</label>'+
						'</div>');
						isCustomSecClass = isCustomSecClass || !indexedPathways[pathwayID].isVisible();
						isHiddenSecClass = isHiddenSecClass && !indexedPathways[pathwayID].isVisible();
					}
					pathClassificationHTMLcode += temporalCodeTable.join("\n");

					/********************************************************************/
					/* STEP 3.2.1.2 GENERATE THE CODE FOR CURRENT SUBCATEGORY           */
					/********************************************************************/
					secClassificationHTMLcode +='<div class="step3ClassificationsWrapper'+ (isHiddenSecClass?" disabled":"") +'">' +
					'  <div class="step3ClassificationsTitle'+ (isHiddenSecClass?" disabled":"") +'">'+
					'   <i class="fa fa-caret-right" style="color: #B1B1B1; margin-right: 5px;"></i>' +  secClassificationInstance.name +
					'   <div class="step3ClassificationsOptions">'+
					'     <a class="hideOption'+ (isHiddenSecClass?" selected":"") +'">Hide</a>'+
					'     <a class="showOption'+ (!(isHiddenSecClass || isCustomSecClass)?" selected":"") +'">Show</a>'+
					'     <a class="customOption'+ (isCustomSecClass && !isHiddenSecClass?" selected":"") +'">Custom</a>'+
					'   </div>'+
					'  </div>' +
					'  <div class="step3ClassificationsChildrenContainer">'+ pathClassificationHTMLcode + '</div>'+
					'</div>';

					/********************************************************************/
					/* STEP 3.2.1.3 CHECK THE VISIBILITY FOR THE SUBCLASSIFICATION         */
					/********************************************************************/
					isCustomMainClass = isCustomMainClass || isCustomSecClass;
					isHiddenMainClass = isHiddenMainClass && isHiddenSecClass;
				}

				/********************************************************************/
				/* STEP 3.2.2 GENERATE THE CODE FOR CURRENT SUBCATEGORY             */
				/********************************************************************/
				htmlContent +='<div class="step3ClassificationsWrapper'+ (isHiddenMainClass?" disabled":"") +'">' +
				'  <div class="step3ClassificationsTitle'+ (isHiddenMainClass?" disabled":"") +'">'+
				'   <i class="classificationNameBox" style="border-color:' + color + '; color:' + color + ';">' + mainClassificationInstance.name.charAt(0).toUpperCase() + '</i>' +
				'   <i class="fa fa-caret-right" style="color: #B1B1B1; margin-right: 5px;"></i>' + mainClassificationInstance.name +
				'   <div class="step3ClassificationsOptions">'+
				'     <a class="hideOption'+ (isHiddenMainClass?" selected":"") +'">Hide</a>'+
				'     <a class="showOption'+ (!(isCustomMainClass || isHiddenMainClass)?" selected":"") +'">Show</a>'+
				'     <a class="customOption'+ (isCustomMainClass && !isHiddenMainClass?" selected":"") +'">Custom</a>'+
				'   </div>'+
				'  </div>' +
				'  <div class="step3ClassificationsChildrenContainer" style="padding-left: 25px;">'+ secClassificationHTMLcode + '</div>'+
				'</div>';
			}

			/********************************************************************/
			/* STEP 3.3 UPDATE THE CONTENT FOR THE DOM                          */
			/********************************************************************/
			$("#pathwayClassificationContainer_" + me.dbid).html(htmlContent);

			/********************************************************************/
			/* STEP 3.4 SET THE BEHAVIOUR WHEN CLIKING THE NODES OF THE TREE    */
			/********************************************************************/
			var updateStatus = function(elem){
				$(elem).parents(".step3ClassificationsWrapper").last().find(".step3ClassificationsWrapper").andSelf().each(function(){
					var totalPathways = $(this).find("input").size();
					var totalCheckedPathways = $(this).find("input:checked").size();
					var className = "";
					if(totalCheckedPathways === 0){
						$(this).children(".step3ClassificationsTitle").addClass("disabled");
						className = ".hideOption";
					}else if(totalCheckedPathways === totalPathways){
						$(this).children(".step3ClassificationsTitle").removeClass("disabled");
						className = ".showOption";
					}else{
						$(this).children(".step3ClassificationsTitle").removeClass("disabled");
						className = ".customOption";
					}

					//* SET TO "CUSTOM" ALL INMEDIATE CHILDREN OPTIONS
					$(this).children(".step3ClassificationsTitle").find("a").removeClass("selected");
					$(this).children(".step3ClassificationsTitle").find("a" + className).addClass("selected");
				});
			};

			$("#pathwayClassificationContainer_" + me.dbid + " .step3ClassificationsTitle").click(function(event){
				if(event.target.nodeName === "A"){
					//IGNORE IF CLIKING ON CURRENT OPTION
					if($(event.target).hasClass("selected")){
						return;
					}

					if(event.target.text === "Show"){
						$(this).next(".step3ClassificationsChildrenContainer").find("input").prop("checked",true);
					}else if(event.target.text === "Hide"){
						$(this).next(".step3ClassificationsChildrenContainer").find("input").removeAttr("checked");
					}

					updateStatus(this);
				}else{
					//EXPAND/COLLAPSE
					$(this).next(".step3ClassificationsChildrenContainer").slideToggle();
					$(this).find("i.fa").each(function(){
						if($(this).hasClass("fa-caret-right")){
							$(this).removeClass("fa-caret-right").addClass("fa-caret-down");
						}else{
							$(this).removeClass("fa-caret-down").addClass("fa-caret-right");
						}
					});
				}
			});

			$("#pathwayClassificationContainer_" + me.dbid + " .step3ClassificationsPathway > input").change(function(){
				updateStatus(this);
			});
		
			this.applyVisualSettings(false);

			return this;
		};

		/**
		* This function apply the settings that user can change
		* for the visual representation of the model (w/o reload everything).
		* - STEP 1. UPDATE THE pathways Visibility
		* - STEP 2. NOTIFY THE CHANGES TO PARENT
		* @chainable
		* @returns {PA_Step3PathwayClassificationView}
		*/
		this.applyVisualSettings =  function(updateSettings=true) {
			var me = this;

			/********************************************************/
			/* STEP 1. UPDATE THE pathways Visibility               */
			/*         (indexedPathways TABLE)                      */
			/********************************************************/
			var pathwaysVisibility = [];
			var indexedPathways = me.getParent().getIndexedPathways(this.database);
			$("#pathwayClassificationContainer_" + me.dbid).find("input").each(function(){
				indexedPathways[this.id].setVisible($(this).is(":checked"));
				if(indexedPathways[this.id].isVisible()){
					pathwaysVisibility.push(this.id);
				}
			});

			var classificationData = me.getParent().getClassificationData(me.database);
			var mainClassificationID, secClassificationID;
			var mainClassifications = [], secondClassifications = [];
			
			// Avoid this when no pathways are visible.
			if (pathwaysVisibility.length) {
				Object.keys(classificationData).forEach(function(classificationID) {
					var mainClassificationInstance = classificationData[classificationID];
					var mainVisiblePathways = 0;

					drilldownAux = {
						name: mainClassificationInstance.name,
						id: classificationID,
						data: []
					};

					for (secondClassificationID in mainClassificationInstance.children){
						var secClassificationInstance = mainClassificationInstance.children[secondClassificationID];
						var secVisiblePathways = secClassificationInstance.children.filter(x => pathwaysVisibility.includes(x));

						// Check if there are visible pathways in this classification
						if (secVisiblePathways.length) {
							mainVisiblePathways += secVisiblePathways.length;
							drilldownAux.data.push([secClassificationInstance.name, (secVisiblePathways.length/pathwaysVisibility.length) * 100]);
						}
					}

					if (mainVisiblePathways) {
						secondClassifications.push(drilldownAux);

						mainClassifications.push({
							name: mainClassificationInstance.name,
							y: (mainVisiblePathways/pathwaysVisibility.length) * 100,
							color: me.getParent().getClassificationColor(classificationID, me.OTHER_COLORS),
							drilldown: classificationID
						});					
					}
				});
				
				me.highcharts.series[0].setData(mainClassifications);
				me.highcharts.options.drilldown.series[0] = secondClassifications;
			} else {
				me.highcharts.series[0].setData([{
						name: 'No pathways',
						y: 100,
						color: "#FF0000"
				}]);					
			}

			if (updateSettings) {
				me.getParent().setVisualOptions("pathwaysVisibility", pathwaysVisibility, me.database);

				/********************************************************/
				/* STEP 2. NOTIFY THE CHANGES TO PARENT                 */
				/********************************************************/
				me.getParent().applyVisualSettings(me.getName(), me.database);
			}

			return this;
		};

		/**
		* This function generates the component (EXTJS) using the content of the model
		* @returns {Ext.ComponentView} The visual component
		*/
		this.initComponent = function() {
			var me = this;

			this.component = Ext.widget({
				xtype: 'box', cls: "contentbox",
				maxWidth: 1900, html:
				'<h2>Pathways classification (' + me.database + ' database)</h2>' +
				'<div id="pathwayClassificationPlot1Box_' + me.dbid + '" style="padding-left: 10px;overflow:hidden;  min-height:300px; width: 45%; float: left;">'+
				'  <h4>Category Distribution<span class="infoTip">Click on each slice to view the distribution of the subcategories.</span></h4> '+
				'  <div id="pathwayDistributionsContainer_' + me.dbid + '" style="height: 240px;"></div>'+
				'</div>' +
				'<div id="pathwayClassificationPlot2Box_' + me.dbid + '" style="overflow:hidden;  min-height:300px; width: 55%; display:inline-block; padding: 0px 30px">'+
				'  <h4>Filter by category<span class="infoTip">Use this tool to <b>Show or Hide Pathways</b> based on their classification</span></h4> '+
				'  <div id="pathwayClassificationContainer_' + me.dbid + '"></div>'+
				'  <a href="javascript:void(0)" class="button btn-success btn-right helpTip" id="applyClassificationSettingsButton_' + me.dbid + '" style="margin: 0px 50px 17px 0px;" title="Apply changes"><i class="fa fa-check"></i> Apply</a>' +
				'</div>',
				listeners: {
					boxready: function() {
						$("#applyClassificationSettingsButton_" + me.dbid).click(function() {
							me.applyVisualSettings();
						});

						initializeTooltips(".helpTip");
					}
				}
			});
			return this.component;
		};
		return this;
	}
	PA_Step3PathwayClassificationView.prototype = new View();

	function PA_Step3PathwayNetworkView(db = "KEGG") {
		/**
		* About this view: this view (PA_Step3PathwayNetworkView) is used to visualize
		* a network where nodes represents pathways and edges relationships between them.
		* This view also contains:
		*  - A tooltip showing some information for pathways when hovering the nodes (PA_Step3PathwayNetworkTooltipView)
		*  - A detailed view for each pathway in the network (PA_Step3PathwayDetailsView)
		**/
		/*********************************************************************
		* ATTRIBUTES
		***********************************************************************/
		this.name = "PA_Step3PathwayNetworkView";
		this.network = null;
		this.tooltips = null;
		this.filters = null;
		this.select = null;
		this.multinodeSelector = null;
		this.pathwayDetailsView = null;
		this.database = db;
		this.dbid = this.database.replace(' ', '__');
		this.showTooltips = true;

		/*********************************************************************
		* OTHER FUNCTIONS
		***********************************************************************/

		/**
		* This function generates the network using the values from visualOptions
		*  - STEP 0. CLEAN PREVIOUS NETWORK
		*  - STEP 1. GENERATE NODES
		*  - STEP 2. GENERATE EDGES
		*  - STEP 3. GENERATE THE NETWORK
		*  - STEP 4. GENERATE THE GLYPS
		*  - STEP 5. START PLUGINS
		*  - STEP 6. INITIALIZE THE TOOLTIPS
		*  - STEP 7. GENERATE THE CLUSTERS DETAILS PANEL
		*  - STEP 8. CONFIGURE THE LAYOUT (ForceAtlas2 algorithm)
		*  - STEP 9. WAIT 2 SECONDS AND START THE LAYOUT
		* @chainable
		* @param {Object} data, an object containing the Network stucture
		* @returns {PA_Step3PathwayNetworkView}
		*/
		this.generateNetwork = function(data, forceStop=false) {
			var me = this;
			var visualOptions = this.getParent().getVisualOptions(this.database);
			var indexedPathways = this.getParent().getIndexedPathways(this.database);
			var CLUSTERS = {};
			var TOTAL_CLUSTERS = this.getModel().getClusterNumber()[this.database];

			/* The old format data does not have keys */
			if (me.database in data) {
				data = data[me.database];
			}

			/********************************************************/
			/* STEP 0. CLEAN PREVIOUS NETWORK                       */
			/********************************************************/
			$("#pathwayNetworkWaitBox_" + me.dbid).fadeIn();

			//FORCE STOPPING OF PLUGIN ALWAYS
			sigma.layouts.killForceLink();

			//CLEAN PREVIOUS NETWORK
			if (this.network !== null) {
				sigma.plugins.killFilter(this.network);
				this.filters = null;
				this.network.kill();
				this.network = null;
			}

			/********************************************************/
			/* STEP 1. GENERATE NODES                               */
			/********************************************************/
			var elem, nodesAux = [], edgesAux = [], matchedPathway=null, ignoredPathways = {};
			var nElems = data.nodes.length;
			for (var i = nElems; i--;) {
				elem = data.nodes[i];
				matchedPathway = indexedPathways[elem.data.id];

				/********************************************************/
				/* STEP 1.A.1 EXCLUDE NODE IF:                           */
				/*  - If elem is not a NODE                             */
				/*  - If node is a classification or is not a pathway   */
				/*  - Is a special case (e.g. mmu01100)                 */
				/*  - If is not visible                                 */
				/********************************************************/
				if ((elem.group !== "nodes") ||
				(elem.data.is_classification !== undefined) ||
				(matchedPathway === undefined) ||
				(elem.data.id === this.getModel().getOrganism() + "01100") ||
				(!matchedPathway.isVisible())){
					ignoredPathways[elem.data.id] = true;
					continue;
				}
				/********************************************************/
				/* STEP 1.A.2 EXCLUDE NODE IF:                           */
				/*  - If number of total features * n% is bigger than   */
				/*    the sum of matched features in the pathway.		*/
				/*  - If the pValue of the pathways is greater than 	*/
				/*	  the maximum allowed.								*/
				/********************************************************/
				var pValue = 1;
				try{
					var selectedCombinedPvalueMethod = me.getParent().visualOptions.selectedCombinedMethod;
					var selectedAdjustingMethod = visualOptions.networkPvalMethod;
					var useCombinedPvalue = visualOptions.useCombinedPvalCheckbox;
					var methodSelected =  (visualOptions.colorBy === "classification" || useCombinedPvalue) ? selectedCombinedPvalueMethod : visualOptions.colorBy;

					/*
						The adjusted p-values are different in the job has been category filtered (number of tests decreases).
						These new "filtered adjusted p-values" are kept on a layer inside visualOptions.
					*/
					if (selectedAdjustingMethod != 'none') {
						var useLayer = visualOptions.adjustedPvalues && visualOptions.adjustedPvalues[methodSelected];
						
						if (useLayer) {
							pValue = visualOptions.adjustedPvalues[methodSelected][selectedAdjustingMethod];
						} else {
							pValue = matchedPathway.getAllAdjustedSignificanceValues()[methodSelected][selectedAdjustingMethod];
						}
					} else {
						pValue = matchedPathway.getAllSignificanceValues()[methodSelected];
					}
				} catch(error) {
					//pass
					pValue = 1;
				}
				
				matchedPathway.setTotalFeatures(matchedPathway.getMatchedGenes().length + matchedPathway.getMatchedCompounds().length);
				if (elem.data.total_features * visualOptions.minFeatures > matchedPathway.getTotalFeatures() || pValue > visualOptions.minPValue){
					ignoredPathways[elem.data.id] = true;
					continue;
				}
				/********************************************************/
				/* STEP 1.B GENERATE NODE                               */
				/********************************************************/
				else {
					// elem.data = {
					//	x, y,  --> The node coordinates
					//  size,  --> Size of the node (depends on p-value)
					//  colors,--> List of colors for the node
					//  parent,--> The classification for the node
					//  clusters, --> The cluster numbers
					//  glyphs --> info for the glyphs (complements the node with classification info)
					//}

					/********************************************************/
					/* STEP 1.B.1 SET NODE POSITION                         */
					/********************************************************/
					if(matchedPathway.networkCoordX !== undefined && matchedPathway.networkCoordY !== undefined){
						elem.data.x = matchedPathway.networkCoordX; //RING LAYOUT
						elem.data.y = matchedPathway.networkCoordY;
					}

					/********************************************************/
					/* STEP 1.B.2 SET NODE SIZE BASED ON PATHWAY RELEVANCE  */
					/********************************************************/
					//elem.data.size = (pValue <= visualOptions.minPValue)? 20 + 2 * (visualOptions.minPValue - pValue):12;
					elem.data.size = 20 + 2 * (visualOptions.minPValue - pValue);

					/********************************************************/
					/* STEP 1.B.3 COLOR THE NODE BASED ON VISUAL OPTIONS    */
					/********************************************************/
					elem.data.colors =  [];
					elem.data.clusters =  [];
					if(visualOptions.colorBy === "classification"){ //Color by classification
						elem.data.colors.push(this.getParent().getClassificationColor(elem.data.parent[0]));
					}else{ //Color by metagenes clusters
						var metagenes = matchedPathway.metagenes[visualOptions.colorBy];
						if(metagenes){
							for(var n in metagenes){
								CLUSTERS[metagenes[n].cluster] = this.getClusterColor(metagenes[n].cluster);
								elem.data.colors.push(this.getClusterColor(metagenes[n].cluster));
								elem.data.clusters.push(metagenes[n].cluster);
							}
						}else{
							elem.data.colors.push("#dfdfdf");
						}
					}

					// Assign "color" attribute for svg renderer
					// TODO: this will only color the first cluster
					elem.data.color = elem.data.colors[0];

					/*********************************************************/
					/* STEP 1.B.4 ADD GLYP INDICATING THE MAIN CLASSIFICATION*/
					/*********************************************************/
					elem.data.glyphs = [{
						position: 'bottom-right',
						textColor: this.getParent().getClassificationColor(elem.data.parent[0]),
						strokeColor: this.getParent().getClassificationColor(elem.data.parent[0]),
						content: elem.data.parent[0].charAt(0).toUpperCase()
					}];

					//NOTE: Other settings are at network initialization

					/*********************************************************/
					/* STEP 1.B.4 ADD THE NODE                               */
					/*********************************************************/
					nodesAux.push(elem.data);
				}
			}
			/********************************************************/
			/* STEP 2. GENERATE EDGES                               */
			/********************************************************/
			nElems = data.edges.length;
			for (var i = nElems; i--;) {
				elem = data.edges[i];

				/********************************************************/
				/* STEP 2.A.1 EXCLUDE ELEM IF:                           */
				/*  - If elem is not an EDGE                            */
				/*  - If source/target were ignored previously          */
				/*  - If source/target are not valid pathways           */
				/*  - If source/target are not visible                  */
				/*  - Is source/target are special cases (e.g. mmu01100)*/
				/********************************************************/
				if ((elem.group !== "edges") || (elem.data.class !== visualOptions.edgesClass) ||
				(ignoredPathways[elem.data.source] || ignoredPathways[elem.data.target]) ||
				(indexedPathways[elem.data.source] === undefined || indexedPathways[elem.data.target] === undefined) ||
				(!indexedPathways[elem.data.source].isVisible() || !indexedPathways[elem.data.target].isVisible()) ||
				(elem.data.source === this.getModel().getOrganism() + "01100" || elem.data.target === this.getModel().getOrganism() + "01100")) {
					continue;
				}

				var similarity = 1;
				if(visualOptions.edgesClass === 's'){
					//CALCULATE THE Sorensen–Dice similarity coefficient (https://en.wikipedia.org/wiki/S%C3%B8rensen%E2%80%93Dice_coefficient)
					var totalIntersection =  Array.intersect(indexedPathways[elem.data.target].getMatchedGenes(),indexedPathways[elem.data.source].getMatchedGenes()).length;
					totalIntersection +=  Array.intersect(indexedPathways[elem.data.target].getMatchedCompounds(),indexedPathways[elem.data.source].getMatchedCompounds()).length;
					//S(A,B) = 2 * |AnB| / |A| + |B|
					//0 <= S(A,B) <= 1
					similarity = 2 * totalIntersection / ((indexedPathways[elem.data.target].getMatchedGenes().length + indexedPathways[elem.data.target].getMatchedCompounds().length) + (indexedPathways[elem.data.source].getMatchedGenes().length + indexedPathways[elem.data.source].getMatchedCompounds().length));
				}
				/********************************************************/
				/* STEP 2.A.2 EXCLUDE ELEM IF:                           */
				/*  - If number of total shared features * N % is bigger than   */
				/*    the sum of matched features in the pathway,       */
				/********************************************************/
				if (visualOptions.minSharedFeatures > similarity){
					continue;
				}
				/********************************************************/
				/* STEP 2.B GENERATE THE EDGE                               */
				/********************************************************/
				else {
					// elem.data.label = '' + similarity;
					elem.data.type = 'dotted';
					elem.data.size = similarity;
					edgesAux.push(elem.data);
				}
			}

			/********************************************************/
			/* STEP 3. GENERATE THE NETWORK                         */
			/********************************************************/
			me.network = new sigma({
				graph: {nodes: nodesAux, edges: edgesAux},
				renderers: [
					{container: $('#pathwayNetworkBox_' + me.dbid)[0], type: 'canvas' },
					//{container: $('#pathwayNetworkBoxSVG_' + me.dbid)[0], type: 'svg' }
				],
				//renderers: [{container: $('#pathwayNetworkBox')[0], type: 'svg' }],
				settings: {
					zoomMin: 0.01,
					zoomMax: 10,
					zoomingRatio:1.2,
					//nodes --------------------------------------------------------
					dragNodeStickiness: 0.01,
					labelThreshold: 10, //Show or hide labels, change using settings
					labelMaxLength : 15,
					//edges --------------------------------------------------------
					drawEdges: false, //show after layout
					batchEdgesDrawing: false,
					hideEdgesOnMove: true,
					defaultEdgeType: 'line',
					defaultEdgeColor: '#A9A9A9',
					edgeColor: 'default',
					//glyph --------------------------------------------------------
					drawGlyphs: false, //show after layout
					glyphScale : 0.4,
					glyphFillColor: '#fff',
					glyphFontStyle : "bold",
					glyphLineWidth: 4,
					glyphTextThreshold: 3,
					glyphThreshold: 2,
					//select --------------------------------------------------------
					borderSize: 2,
					outerBorderSize: 3,
					defaultNodeBorderColor: '#fff',
					defaultNodeOuterBorderColor: 'rgb(236, 81, 72)',
					//halo --------------------------------------------------------
					nodeHaloColor: '#ff8e8e',
					edgeHaloColor: '#ff8e8e',
					nodeHaloSize: 5,
					edgeHaloSize: 3,
					// min/maxNodeSize:
					minNodeSize: visualOptions.minNodeSize,
					maxNodeSize: visualOptions.maxNodeSize,
					defaultLabelSize: visualOptions.fontSize
				}
			});

			/********************************************************/
			/* STEP 4. GENERATE THE GLYPS                           */
			/********************************************************/
			me.drawGlyphs = false; //ONLY RENDERED WHEN LAYOUT IS STOPPED
			me.network.renderers[0].bind('render', function(e) {
				if(me.drawGlyphs){
					me.network.renderers[0].glyphs({draw : me.drawGlyphs});
				}
			});

			/********************************************************/
			/* STEP 5. START PLUGINS                                */
			/********************************************************/
			var activeState = sigma.plugins.activeState(me.network);

			//select plugin
			this.select = sigma.plugins.select(me.network, activeState);
			this.select.selectAllNodes= function() {
				activeState.dropEdges();

				if (activeState.nodes().length === me.network.graph.nodes().length) {
					activeState.dropNodes();
				}
				else {
					activeState.addNodes();
				}
				me.network.refresh({skipIndexation: true});
			};
			this.select.selectAllNeighbors= function() {
				// Select neighbors of selected nodes
				activeState.addNeighbors();
				me.network.refresh({skipIndexation: true});
			};
			this.select.selectByCategory= function() {
				var nodes = activeState.nodes();
				var categories = [];
				for(var i in nodes){
					categories = categories.concat((me.getParent().getVisualOptions(this.database).colorBy === "classification")?nodes[i].parent:nodes[i].clusters);
				}
				// Remove duplicates:
				categories = Array.unique(categories);
				nodes = me.network.graph.nodes();
				var selection = [];
				for(var i in nodes){
					if(Array.intersect(categories, ((me.getParent().getVisualOptions(this.database).colorBy === "classification")?nodes[i].parent:nodes[i].clusters)).length > 0){
						selection.push(nodes[i].id);
					}
				}
				activeState.addNodes(selection);
				// Select neighbors of selected nodes
				me.network.refresh({skipIndexation: true});
			};

			//drag & drop plugin
			var dragListener = sigma.plugins.dragNodes(me.network, me.network.renderers[0], activeState);
			dragListener.bind('startdrag', function(event) {
				$('html,body').css('cursor','move');
			});
			dragListener.bind('dragend', function(event) {
				$('html,body').css('cursor','inherit');
			});
			//Filtering plugin
			this.filters = sigma.plugins.filter(me.network);

			//Multi-node selector plugin
			this.multinodeSelector = new sigma.plugins.lasso(me.network, me.network.renderers[0], {
				'strokeStyle': 'black',
				'lineWidth': 2,
				'fillWhileDrawing': true,
				'fillStyle': 'rgba(41, 41, 41, 0.2)',
				'cursor': 'crosshair'
			});
			this.select.bindLasso(this.multinodeSelector);
			this.multinodeSelector.deactivate();

			// Listen for selectedNodes event
			this.multinodeSelector.bind('selectedNodes', function (event) {
				setTimeout(function() {
					me.multinodeSelector.deactivate();
					me.network.refresh({ skipIdexation: true });
				}, 0);
			});

			//Show halo when hovering a node
			me.network.bind('hovers', function(e) {
				var adjacentNodes = [],
				adjacentEdges = [];

				if (!e.data.enter.nodes.length) return;

				// Get adjacent nodes:
				e.data.enter.nodes.forEach(function(node) {
					adjacentNodes = adjacentNodes.concat(me.network.graph.adjacentNodes(node.id));
				});

				// Add hovered nodes to the array and remove duplicates:
				adjacentNodes = Array.unique(adjacentNodes.concat(e.data.enter.nodes));

				// Get adjacent edges:
				e.data.enter.nodes.forEach(function(node) {
					adjacentEdges = adjacentEdges.concat(me.network.graph.adjacentEdges(node.id));
				});

				// Remove duplicates:
				adjacentEdges = Array.unique(adjacentEdges);

				// Render halo:
				me.network.renderers[0].halo({
					nodes: adjacentNodes,
					edges: adjacentEdges
				});
			});

			/********************************************************/
			/* STEP 6. INITIALIZE THE TOOLTIPS                      */
			/********************************************************/
			this.tooltips = new PA_Step3PathwayNetworkTooltipView().setParent(this);
			this.network.bind('hovers', function(e) {
				if(e.data.current.nodes.length > 0 && me.showTooltips){
					PA_Step3PathwayNetworkTooltipView().timeoutID = setTimeout(function(){
						PA_Step3PathwayNetworkTooltipView().show(e.data.captor.clientX, e.data.captor.clientY, me.getModel().getPathway(e.data.current.nodes[0].id), [visualOptions.colorBy], me.getModel().getDataDistributionSummaries(), visualOptions);
					}, 600);
				}else{
					clearTimeout(PA_Step3PathwayNetworkTooltipView().timeoutID);
				}
			});
			$('#pathwayNetworkBox_' + me.dbid + ' canvas.sigma-mouse').mouseleave(function(){
				clearTimeout(PA_Step3PathwayNetworkTooltipView().timeoutID);
				PA_Step3PathwayNetworkTooltipView().hide();
			});

			/********************************************************/
			/* STEP 7. GENERATE THE CLUSTERS DETAILS PANEL          */
			/********************************************************/
			var htmlCode = "";
			$("#networkClustersContainer_" + me.dbid + " h4").text("Coloring by " + visualOptions.colorBy);
			$("#networkClustersContainer_" + me.dbid + " span.infoTip").toggle(visualOptions.colorBy !== "classification");
			$("#networkClustersContainer_" + me.dbid + " h5").toggle(visualOptions.colorBy !== "classification");

			if(visualOptions.colorBy === "classification"){
				var color, classification;
				for (var classificationID in me.getParent().classificationData[me.database]){
					classification = me.getParent().classificationData[me.database][classificationID];
					color = color = this.getParent().getClassificationColor(classificationID, []);
					htmlCode += '<div style="text-align:left;"><i class="classificationNameBox" style="border-color:' + color + '; color:' + color + ';">' + classification.name.charAt(0).toUpperCase() + '</i>' +  classification.name + "</div>";
				}
				$("#networkClustersContainer_" + me.dbid + " div").html(htmlCode);
				$("#sliderClusterNumberContainer_" + me.dbid).hide();
			}else{
				var clusterNumber = Object.keys(CLUSTERS).length;
				var totalClusters = TOTAL_CLUSTERS[visualOptions.colorBy].size;
				
				// Update the cluster number slider value
				$("#sliderClusterNumberContainer_" + me.dbid).show();
				$("#sliderClusterNumberShow_" + me.dbid).html(totalClusters);
				$("#sliderClusterNumber_" + me.dbid).slider("option", "value", totalClusters);
				
				$("#networkClustersContainer_" + me.dbid + " h5").text(clusterNumber + " Clusters found from " + totalClusters + " in total.");
				//Generate the images and the containers
				var img_path;
				for(var cluster in CLUSTERS){
					img_path = SERVER_URL_GET_CLUSTER_IMAGE + "/" + this.getModel().getJobID() + "/output/" + visualOptions.colorBy + "_cluster_" + cluster + ".png";
					htmlCode+= '<span class="networkClusterImage" name="'+ cluster + '"><i class="fa fa-eye-slash fa-2x"></i><img src="' + img_path +'"><p><i class="fa fa-square" style="color:' + CLUSTERS[cluster] +'"></i> Cluster ' + cluster + '</p></span>';
				}
				$("#networkClustersContainer_" + me.dbid + " div").html(htmlCode);

				//Initialize the events when clicking a cluster images (filter)
				$("#networkClustersContainer_" + me.dbid + " .networkClusterImage").click(function(){
					var cluster = $(this).attr("name");
					if($(this).hasClass("disabled")){
						$(this).removeClass("disabled");
						me.filters.undo('cluster-filter-' + cluster).apply();
					}else{
						$(this).addClass("disabled");
						me.filters.nodesBy(function(node, params) {
							return node.clusters.indexOf(params.cluster) === -1;
						}, {cluster: cluster}, 'cluster-filter-' + cluster).apply();
					}
				});
			}

			/********************************************************/
			/* STEP 8. CONFIGURE THE LAYOUT (ForceAtlas2 algorithm) */
			/********************************************************/
			var afterStopEvent =  function(){
				/********************************************************/
				/* STEP 7.1 SET THE BEHAVIOUR WHEN STOPPING THE LAYOUT  */
				/********************************************************/
				//Change the button for Stop/Resume layout
				$('#resumeLayoutButton_' + me.dbid).addClass("resumeLayout");
				$('#resumeLayoutButton_' + me.dbid).html('<i class="fa fa-play"></i> Resume layout');

				//Draw glyps and edges
				me.drawGlyphs = true;
				me.network.renderers[0].glyphs({draw: me.drawGlyphs});
				me.network.settings({
					drawEdges:true,
					drawEdgeLabels:false,
					//edgeLabelThreshold: ((visualOptions.showEdgeLabels===true?0:8)),
					labelThreshold : ((visualOptions.showNodeLabels===true?1:8))
				});
				me.network.renderers[0].render();

				//Clear timeout, in case that layout stops automatically
				clearTimeout(me.timeoutID);
				me.timeoutID = null;

				$("#pathwayNetworkWaitBox_" + me.dbid).fadeOut();
			};

			var sigmaForceLink = sigma.layouts.configForceLink(me.network, {
				linLogMode: true,       //provides the most readable placement
				//edgeWeightInfluence: 1, //If the edges are weighted, this weight will be taken into consideration in the computation of the attraction force
				// scalingRatio: 3,        //the larger the graph will be
				gravity: 2,           // It attracts nodes to the center of the spatialization space
				// barnesHutOptimize: true, //NOT WORKING
				//Rendering options
				startingIterations: 1,
				iterationsPerRender: 2,
				//Stopping conditions
				maxIterations: 20000,
				avgDistanceThreshold: 0.05,
				autoStop:true,
				//Node sibling alignment
				alignNodeSiblings : true,
				nodeSiblingsAngleMin : 0.55,
				nodeSiblingsScale: 2,
				//Supervisor options
				worker: true,
				easing: 'cubicInOut',
				background:  (visualOptions.backgroundLayout === true), //Calculate in background
				randomize: 'globally'
			});
			
			sigmaForceLink.bind('stop', afterStopEvent);

			/********************************************************/
			/* STEP 9. WAIT 2 SECONDS AND START THE LAYOUT          */
			/********************************************************/
			if(visualOptions.pathwaysPositions !== undefined){
				// If the number of saved pathways is different from the new filtered, we first perform
				// the layout with forceAtlas, then save the positions saving the old ones and redraw.
				var savedPathways = visualOptions.pathwaysPositions.map(x => x.split('#')[0].trim());
				var allSaved = nodesAux.map(x => savedPathways.includes(x.id)).every(x => x);
				
				if (allSaved) {
					setTimeout(function() {
						afterStopEvent();
					}, 2000);
				} else {
					var addNewNodes = function() {
						// Save new node positions keeping the old saved ones
						me.updateNodePositions(false, true);
						
						// Make sure we don t enter in an infinite loop in
						// case some error occur.
						if (! forceStop) {
							me.generateNetwork(data, true);
						} else {
							console.log("WARNING: called generateNetwork with forceStop.")
						}
					};
					
					sigmaForceLink.bind('stop', addNewNodes);
					
					setTimeout(function() {
						me.startNetworkLayout();
					}, 2000);
				}

			}else{
				setTimeout(function() {
					me.startNetworkLayout();
				}, 2000);
			}

			return this;
		};

		/**
		* This function starts/resumes the network layout
		* @chainable
		* @returns {PA_Step3PathwayNetworkView}
		*/
		this.startNetworkLayout = function() {
			var me = this;
			$("#pathwayNetworkWaitBox_" + me.dbid).fadeIn();

			$("#resumeLayoutButton_" + me.dbid).removeClass("resumeLayout");
			$("#resumeLayoutButton_" + me.dbid).html('<i class="fa fa-pause"></i> Stop layout');

			//Hide glyps and edges
			this.drawGlyphs = false;
			this.network.renderers[0].glyphs({draw: false});
			this.network.settings({drawEdges:false});
			sigma.layouts.startForceLink(me.network);

			//Stops automatically in 20seconds, after N iterations or if mean(movement) < 0.01
			this.timeoutID = setTimeout(function() {
				me.stopNetworkLayout();
			}, 20000);

			return this;
		};

		/**
		* This function stops the network layout
		* @chainable
		* @returns {PA_Step3PathwayNetworkView} the view
		*/
		this.stopNetworkLayout = function() {
			sigma.layouts.stopForceLink();
			return this;
		};

		/**
		* This function activate the fullscreen mode for the network
		* @chainable
		* @returns {PA_Step3PathwayNetworkView} the view
		*/
		this.fullScreenNetwork = function() {
			sigma.plugins.fullScreen({
			  container: $("#pathwayNetworkBox_" + this.dbid)[0]
			});
			return this;
		};


		/**
		* This function shows the detailed view for selected pathway
		* @chainable
		* @param  {Pathway} pathway the instance to show
		* @returns {PA_Step3PathwayNetworkView} the view
		*/
		this.showPathwayDetails = function(pathway){
			var me = this;

			if(this.pathwayDetailsView === null){
				this.pathwayDetailsView = new PA_Step3PathwayDetailsView();
				this.pathwayDetailsView.getComponent("patwaysDetailsContainer_" + pathway.getSource());
				this.pathwayDetailsView.setParent(this);
			}

			this.pathwayDetailsView.loadModel(pathway);

			var omicNames = [];
			var inputOmics = this.getModel().getGeneBasedInputOmics();
			for(var i in inputOmics){
				omicNames.push(inputOmics[i].omicName);
			}
			this.pathwayDetailsView.updateObserver(omicNames, this.getModel().getDataDistributionSummaries(), this.getParent().getVisualOptions());

			if(!$("#networkDetailsPanel_" + me.dbid).is(":visible")){
				$("#networkSettingsPanel_" + me.dbid).hide();
				$("#networkClustersContainer_" + me.dbid).hide();
				$("#networkDetailsPanel_" + me.dbid).show(200, function(){
					$("#patwaysDetailsWrapper_" + me.dbid).show();
				});
			}else{
				$("#networkClustersContainer_" + me.dbid).slideUp(200,function(){
					$("#patwaysDetailsWrapper_" + me.dbid).slideDown();
				});
			}

			return this;
		};

		/**
		* This function hides the detailed view
		* @chainable
		* @returns	{PA_Step3PathwayNetworkView} the view
		*/
		this.hidePathwayDetails = function(){
			$("#networkClustersContainer_" + this.dbid).slideDown();
			$("#patwaysDetailsWrapper_" + this.dbid).slideUp();
			return this;
		};

		/**
		* This function handles the event when choosing the option "Paint"
		* @chainable
		* @param  {String} pathwayID the ID for the pathway
		* @returns	{PA_Step3PathwayNetworkView} the view
		*/
		this.paintSelectedPathway = function(pathwayID){
			//Propagate to parent
			this.getParent().paintSelectedPathway(pathwayID);
			return this;
		};

		/**
		* This function returns the corresponding color for a given cluster number
		* @param  {String} cluster the cluster number
		* @returns	{String} the hexadecimal color code
		*/
		this.getClusterColor= function(cluster){
			var COLORS = ["#a6cee3", "#1f78b4", "#b2df8a", "#33a02c", "#fb9a99", "#e31a1c", "#fdbf6f", "#ff7f00", "#cab2d6", "#6a3d9a", "#eded84", "#b15928", "#003b46", "#f5b549", "#B38867"];
			cluster = Number.parseInt(cluster.replace(/[a-z]*/,""));

			if(!Number.isNaN(cluster) && cluster < COLORS.length){
				return COLORS[cluster];
			}

			console.warn("Unable to find a color for cluster " + cluster);
			return "#333";
		};

		this.updateNodePositions = function(updateCache, preserveExisting=false){
			var visualOptions = this.getParent().getVisualOptions(this.database);
			var indexedPathways = this.getParent().getIndexedPathways(this.database);
			//Invalidate previous position
			for(var pathwayID in indexedPathways){
				delete indexedPathways[pathwayID].networkCoordX;
				delete indexedPathways[pathwayID].networkCoordY;
			}

			//Get new coordinates
			var nodes = this.network.graph.nodes();
			// Save the current positions using keys
			var savedPositions = {};
			if (visualOptions.pathwaysPositions) {
				visualOptions.pathwaysPositions.map(x => savedPositions[x.split('#')[0].trim()] = x);
			}
			
			delete visualOptions.pathwaysPositions;
			visualOptions.pathwaysPositions=[];
			
			for(var i in nodes){
				var nodeID = nodes[i].id;
				var existingPosition = preserveExisting && savedPositions[nodeID] ? savedPositions[nodeID].split('#') : null;
				
				visualOptions.pathwaysPositions.push(existingPosition ? savedPositions[nodeID] : nodes[i].id + "# " + nodes[i].x + "#" + nodes[i].y);
				
				indexedPathways[nodeID].networkCoordX = existingPosition ? parseFloat(existingPosition[1]) : nodes[i].x;
				indexedPathways[nodeID].networkCoordY = existingPosition ? parseFloat(existingPosition[2]) : nodes[i].y;
			}

			if(updateCache){
				this.getController().updateStoredVisualOptions(this.getModel().getJobID(), this.getParent().getVisualOptions());
			}
			return this;
		};

		this.clearNodePositions = function(){
			var visualOptions = this.getParent().getVisualOptions(this.database);
			var indexedPathways = this.getParent().getIndexedPathways(this.database);

			//Invalidate previous position
			for(var pathwayID in indexedPathways){
				delete indexedPathways[pathwayID].networkCoordX;
				delete indexedPathways[pathwayID].networkCoordY;
			}

			delete visualOptions.pathwaysPositions;

			return this;
		};
		
				
		this.getNewClusters = function() {
			var me = this;
			var numberClusters = $("#sliderClusterNumberShow_" + me.dbid).html();
			var omicName = me.getParent().visualOptions[me.dbid].colorBy;
			
			if (numberClusters && omicName !== "classification") {
				me.getParent().controller.updateMetagenesSubmitHandler(me, numberClusters, omicName);
			}
		};


		/**
		* This function selects nodes from the network following different approaches
		* @param  {String} option the selection strategy
		* @return {PA_Step3PathwayNetworkView}        this view
		*/
		this.selectNodes = function(option){
			var me = this;

			if(option === "category"){
				this.select.selectByCategory();
			}else if(option === "free"){
				$("#step3-network-toolbar-message_" + me.dbid).removeClass("successMessage").html("<i class='fa fa-info-circle'></i> Select the region that contains the nodes and drag to move.")
				.fadeIn(
					100,
					function(){
						setTimeout(function(){
							$("#step3-network-toolbar-message_" + me.dbid).fadeOut(100);
						}, 1500);
					}
				);
				this.multinodeSelector.activate();
			}else if(option === "adjacent"){
				this.select.selectAllNeighbors();
			}else if(option === "all"){
				this.select.selectAllNodes();
			}
			return this;
		};

		/**
		* This function download the network following different approaches
		* @param  {String} option the download strategy
		* @return {PA_Step3PathwayNetworkView}        this view
		*/
		this.downloadNetwork = function(option){
			if(option === "png"){
				// sigma.plugins.image(this.network, this.network.renderers[0], {
				// 	download:true,
				// 	clip: true,
				// 	labels: true,
				// 	margin: 30,
				// 	// size: 400,
				// 	format: 'png',
				// 	background: 'white',
				// 	zoom: true,
				// 	filename:'paintomics_network_plugin' + this.getParent("PA_Step3JobView").getModel().getJobID() + '.png'
				// });

				var newCanvas =  $('<canvas/>')[0];
				// var scaleFactor = 2;
				newCanvas.height = $("#pathwayNetworkBox_" + this.dbid).height();// * scaleFactor;
				newCanvas.width = $("#pathwayNetworkBox_" + this.dbid).width();// * scaleFactor;
				// newCanvas.style.width = $("#pathwayNetworkBox").width() + "px";
				// newCanvas.style.height = $("#pathwayNetworkBox").height() + "px"

				var ctx3 = newCanvas.getContext('2d');
				// ctx3.scale(scaleFactor, scaleFactor);
				ctx3.drawImage($("#pathwayNetworkBox_" + this.dbid + " canvas.sigma-scene")[0], 0, 0);
				ctx3.drawImage($("#pathwayNetworkBox_" + this.dbid + " canvas.sigma-glyphs")[0], 0, 0);

				// Avoid network error when image is too large
				// function dataURLtoBlob(dataurl) {
				//     var arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)[1],
				//         bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
				//     while(n--){
				//         u8arr[n] = bstr.charCodeAt(n);
				//     }
				//     return new Blob([u8arr], {type:mime});
				// }
				//
				// var imgData = newCanvas.toDataURL('image/png')
				// var strDataURI = imgData.substr(22, imgData.length);
				// var blob = dataURLtoBlob(imgData);
				// URL.createObjectURL(blob)

				$('<a target="_blank" id="downloadNetworkLink_' + this.dbid + '" download="paintomics_network_' + this.dbid + '_' + this.getParent("PA_Step3JobView").getModel().getJobID() + '.png" style="display:none;"></a>').attr("href", newCanvas.toDataURL('image/png'))[0].click();

			}
			else if(option === "svg"){
					// Get sigma instance
					this.network.toSVG({
						download: true,
						labels: true,
						data: true,
						filename: 'paintomics_network_' + this.dbid + '_' + this.getParent("PA_Step3JobView").getModel().getJobID() + '.svg'
					})
			}
			return this;
		};

		/**
		* This function reorder the selected nodes following different approaches
		* @param  {String} option the reorder strategy
		* @return {PA_Step3PathwayNetworkView}        this view
		*/
		this.reorderNodes = function(option, size){
			var selectedNodes = sigma.plugins.activeState(this.network).nodes();
			if(selectedNodes.length === 0){
				return this;
			}

			if(option === "random"){
				var nodes = this.network.graph.nodes();

				var minX=Number.MAX_VALUE, maxX=Number.MIN_VALUE, minY=Number.MAX_VALUE, maxY=Number.MIN_VALUE, node;
				for(var i in nodes){
					node = nodes[i];
					minX=((node.x < minX)?node.x:minX);
					maxX=((node.x > maxX)?node.x:maxX);
					minY=((node.y < minY)?node.y:minY);
					maxY=((node.y > maxY)?node.y:maxY);
				}

				for(var i in selectedNodes){
					selectedNodes[i].x = (Math.random()*maxX) + minX;
					selectedNodes[i].y = (Math.random()*maxY) + minY;
				}
				this.network.refresh();
				return this;
			}else if(option === "block"){
				var initX=selectedNodes[0].x, y=selectedNodes[0].y, x = initX;
				size = (size|| $('#reorderOptions_' + this.dbid + ' h3[name="block"]').attr("value"));

				for(var i=0; i< selectedNodes.length; i++){
					selectedNodes[i].x = x;
					selectedNodes[i].y = y;
					x+= 30;
					if((i+1) % size === 0){
						x=initX;
						y+=30;
					}
				}
			}else if(option === "ring"){
				size = (size|| $('#reorderOptions_' + this.dbid + ' h3[name="ring"]').attr("value"));
				var x=selectedNodes[0].x, y=selectedNodes[0].y;
				for(var i=0; i< selectedNodes.length; i++){
					selectedNodes[i].x = x + Math.cos(2 * i * Math.PI / selectedNodes.length) * selectedNodes.length*size; //RING LAYOUT
					selectedNodes[i].y = y + Math.sin(2 * i * Math.PI / selectedNodes.length)* selectedNodes.length*size;
				}
			}
			$('#reorderOptions_' + this.dbid + ' h3').each(function(index) {
				$(this).toggle($(this).attr("name") === option);
			});
			$("#reorderOptions_" + this.dbid).slideDown();

			this.network.refresh();
			return this;
		};

		/**
		* This function changes different node attributes
		* @param  {String} option the attribute to change
		* @return {PA_Step3PathwayNetworkView}        this view
		*/
		this.configureNodes = function(option, size){
			var selectedNodes = sigma.plugins.activeState(this.network).nodes();
			if(selectedNodes.length === 0){
				return this;
			}

			// Modify the point size
			if(option === "size-conf"){
				var nodes = this.network.graph.nodes();
				size = parseInt((size|| $('#reorderOptions_' + this.dbid + ' h3[name="size-conf"]').attr("value")));

				console.log("Increasing node by size ", size)

				for(var i in selectedNodes){
					console.log(selectedNodes[i].size)
					selectedNodes[i].size = selectedNodes[i].size + size
				}
			}
			$('#reorderOptions_' + this.dbid + ' h3').each(function(index) {
				$(this).toggle($(this).attr("name") === option);
			});
			$("#reorderOptions_" + this.dbid).slideDown();

			this.network.refresh();
			return this;
		};

		/**
		* This function apply the settings that user can change
		* for the visual representation of the model (w/o reload everything).
		* - STEP 1. UPDATE THE VALUES FOR THE SLIDERS
		* - STEP 2. UPDATE THE VALUE FOR COLOR BY OPTION
		* - STEP 3. UPDATE THE VALUE FOR THE EDGES CLASS OPTION
		* - STEP 4. SAVE THE POSITION FOR NODES (IF SELECTED)
		* - STEP 5. 2 ALTERNATIVES
		*    - STEP 5.A NOTIFY THE CHANGES TO PARENT (RECALCULATE NETWORK)
		*    - STEP 5.B.1 HIDE/SHOW LABELS W/O RECALCULATE NETWORK
		* @chainable
		* @returns {PA_Step3PathwayClassificationView}
		*/
		this.applyVisualSettings =  function() {
			var me = this;
			var visualOptions = this.getParent().getVisualOptions(this.database);

			$("#pathwayNetworkWaitBox_" + me.dbid).fadeIn();

			/********************************************************/
			/* STEP 1. UPDATE THE VALUES FOR THE SLIDERS            */
			/********************************************************/
			var updateNeeded = false;
			var newValue, id, autosave;

			$("#pathwayNetworkToolsBox_" + me.dbid + "  div.slider-ui").each(function() {
				/* Remove database name from id */
				id = $(this).attr("id").replace("_" + me.database, "");
				newValue = ($.inArray(id,
				 ["minPValueSlider", "maxNodeSizeSlider", "minNodeSizeSlider", "fontSizeSlider"]) === -1 ?
				 $(this).slider("value") / 100 : $(this).slider("value"));

				id = id.replace("Slider", "");
				updateNeeded = updateNeeded || (visualOptions[id] !== newValue);
				visualOptions[id] = newValue;
			});

			/*******************************************************************/
			/* STEP 2. UPDATE THE VALUE FOR COLOR BY OPTION AND OTHER SETTINGS */
			/*******************************************************************/
			newValue = $("#colorByContainer_" + me.dbid + " div.radio input:checked").val();
			updateNeeded = updateNeeded || (visualOptions.colorBy !== newValue);
			visualOptions.colorBy = newValue;
			
			pvalNewValue = $("#pvaluemethod_" + me.dbid + " div.radio input:checked").val();
			updateNeeded = updateNeeded || (visualOptions.networkPvalMethod !== pvalNewValue);
			visualOptions.networkPvalMethod = pvalNewValue;
			
			visualOptions.backgroundLayout =  $("#background-layout-check_" + me.dbid).is(":checked");
			visualOptions.showNodeLabels =  $("#show-node-labels-check_" + me.dbid).is(":checked");
			visualOptions.useCombinedPvalCheckbox =  $("#use-combined-pval-check_" + me.dbid).is(":checked");
			//visualOptions.showEdgeLabels =  $("#show-edge-labels-check").is(":checked");


			/********************************************************/
			/* STEP 3. UPDATE THE VALUE FOR THE EDGES CLASS OPTION
			/********************************************************/
			newValue = $("#edgesClassContainer_" + me.dbid + " div.radio input:checked").val();
			updateNeeded = updateNeeded || (visualOptions.edgesClass !== newValue);
			visualOptions.edgesClass = newValue;

			/********************************************************/
			/* STEP 4. SAVE THE POSITION FOR NODES (IF SELECTED)    */
			/********************************************************/
			newValue = $("#save-node-positions-check_" + me.dbid).is(":checked");
			autosave = $("#auto-save-node-positions-check_" + me.dbid).is(":checked");

			if(newValue && (autosave || visualOptions.pathwaysPositions === undefined)){
				/***************************************************************/
				/* STEP 4.1 IF SAVE=true AND NO PREVIOUS POSITION DATA -> SAVE */
				/* SAVE ALSO IF AUTO-SAVE DATA IS SET						   */
				/***************************************************************/
				this.updateNodePositions(false);
			}else if(!newValue && visualOptions.pathwaysPositions !== undefined){
				/***************************************************************/
				/* STEP 4.2 IF SAVE=false AND PREVIOUS POSITION DATA -> CLEAN  */
				/***************************************************************/
				this.clearNodePositions();
			}
			updateNeeded=true;

			/********************************************************/
			/* STEP 5. HIDE THE SETTINGS PANEL                      */
			/********************************************************/
			// $("#networkSettingsPanel").hide(200, function(){
			// 	$("#networkDetailsPanel").show();
			// 	$("#patwaysDetailsWrapper").slideUp();
			// 	$("#networkClustersContainer").slideDown();
			// });

			if(updateNeeded){
				/**************************************************************/
				/* STEP 5.A NOTIFY THE CHANGES TO PARENT (RECALCULATE NETWORK)*/
				/**************************************************************/
				me.getParent().applyVisualSettings(me.getName(), me.database);
			}else{
				/********************************************************/
				/* STEP 5.B.1 HIDE/SHOW LABELS W/O RECALCULATE NETWORK    */
				/********************************************************/
				me.network.settings({
					drawEdges:true,
					//edgeLabelThreshold: ((visualOptions.showEdgeLabels===true?0:8)),
					labelThreshold : ((visualOptions.showNodeLabels===true?1:8))
				});
				me.network.renderers[0].render();

				/********************************************************/
				/* STEP 5.B.2 UPDATE THE CACHE
				/********************************************************/
				me.getController().updateStoredVisualOptions(me.getModel().getJobID(), me.getParent().getVisualOptions());

				$("#pathwayNetworkWaitBox_" + me.dbid).fadeOut();
			}
		};

		/**
		* This function updates the visual representation of the model.
		*  - STEP 1. GENERATE THE COLORBY SELECTOR
		*  - STEP 2. GENERATE THE REMAINIG SELECTORS
		*  - STEP 3. GENERATE THE NETWORK
		* @chainable
		* @returns {PA_Step3PathwayNetworkView}
		*/
		this.updateObserver = function() {
			var me = this;
			var visualOptions = this.getParent().getVisualOptions(this.database);

			/********************************************************/
			/* STEP 1. GENERATE THE COLORBY SELECTOR                */
			/********************************************************/
			var htmlContent = '<div class="radio"><input type="radio" ' + ((visualOptions.colorBy === "classification")? "checked": "") + ' id="classification-check_' + this.dbid + '"  name="colorByCheckbox_' + this.dbid + '" value="classification"><label for="classification-check_' + this.dbid + '">Classification</label></div>';
			var inputOmics = this.getModel().getGeneBasedInputOmics();
			for(var i in inputOmics){
				htmlContent +=
				'<div class="radio">' +
				'  <input type="radio" ' + ((visualOptions.colorBy === inputOmics[i].omicName)? "checked": "")+ ' id="' + inputOmics[i].omicName.replace(/ /g, "_").toLowerCase() + '-check_' + this.dbid + '" name="colorByCheckbox_' + this.dbid + '" value="' + inputOmics[i].omicName + '">' +
				'  <label for="' + inputOmics[i].omicName.replace(/ /g, "_").toLowerCase() + '-check_' + this.dbid + '">' + inputOmics[i].omicName + '</label>' +
				'</div>';
			}
			$("#colorByContainer_" + this.dbid).html(htmlContent);

			/********************************************************/
			/* STEP 2. GENERATE THE REMAINIG SELECTORS              */
			/********************************************************/
			$("#minFeaturesSlider_" + this.dbid).slider({value: visualOptions.minFeatures * 100});
			$("#minFeaturesValue_" + this.dbid).html(visualOptions.minFeatures * 100);

			$("#minSharedFeaturesSlider_" + this.dbid).slider({value: visualOptions.minSharedFeatures * 100});
			$("#minSharedFeaturesValue_" + this.dbid).html(visualOptions.minSharedFeatures * 100);

			$("#minPValueSlider_" + this.dbid).slider({value: visualOptions.minPValue});
			$("#minPValue_" + this.dbid).html(visualOptions.minPValue);

			$("#minNodeSizeSlider_" + this.dbid).slider({value: visualOptions.minNodeSize});
			$("#minNodeSizeValue_" + this.dbid).html(visualOptions.minNodeSize);

			$("#maxNodeSizeSlider_" + this.dbid).slider({value: visualOptions.maxNodeSize});
			$("#maxNodeSizeValue_" + this.dbid).html(visualOptions.maxNodeSize);
			
			$("#fontSizeSlider_" + this.dbid).slider({value: visualOptions.fontSize});
			$("#fontSizeValue_" + this.dbid).html(visualOptions.fontSize);

			$("#background-layout-check_" + this.dbid).attr("checked", visualOptions.backgroundLayout===true);
			$("#show-node-labels-check_" + this.dbid).attr("checked", visualOptions.showNodeLabels===true);
			//$("#show-edge-labels-check").attr("checked", visualOptions.showEdgeLabels===true);
			$("#save-node-positions-check_" + this.dbid).attr("checked", visualOptions.pathwaysPositions!==undefined);
			$("#auto-save-node-positions-check_" + this.dbid).attr("checked", visualOptions.autoSaveNodePositions === true);
			$("#pre-auto-save-node-positions-check_" + me.dbid).toggle(visualOptions.pathwaysPositions!==undefined);
			$("#use-combined-pval-check_" + this.dbid).attr("checked", visualOptions.useCombinedPvalCheckbox === true);
			
			var pvalHtmlContent = '<div class="radio"><input type="radio" ' + ((visualOptions.networkPvalMethod === "none")? "checked": "") + ' id="none-pvalcheck_' + this.dbid + '" name="pvaluemethodCheckbox_' + this.dbid + '" value="none">' +
				'  <label for="none-pvalcheck_' + this.dbid + '">None</label>' + 
				'</div>';
			var adjustMethods = this.getModel().getMultiplePvaluesMethods();
			
			adjustMethods.forEach(function(i){
				pvalHtmlContent +=
				'<div class="radio">' +
				'  <input type="radio" ' + ((visualOptions.networkPvalMethod === i)? "checked": "")+ ' id="' + i.replace(/ /g, "_").toLowerCase() + '-pvalcheck_' + me.dbid + '" name="pvaluemethodCheckbox_' + me.dbid + '" value="' + i + '">' +
				'  <label for="' + i.replace(/ /g, "_").toLowerCase() + '-pvalcheck_' + me.dbid + '">' + i + '</label>' +
				'</div>';
			});
			$("#pvaluemethod_" + this.dbid).html(pvalHtmlContent);
			
			// Adjust the height of the other panels
			var currentHeight = this.getComponent().getHeight();
			
			//this.getComponent().items.getAt(0).setHeight(currentHeight);
			this.getComponent().doLayout();

			/********************************************************/
			/* STEP 3. GENERATE THE NETWORK                         */
			/********************************************************/
			/* Delay the drawing of the database if it is not active */
			var active_db = this.getParent().component.down("#tabcontainer_network").getActiveTab().title;

			if (active_db == this.database) {
				this.getController().step3GetPathwaysNetworkDataHandler(this);
			}

			initializeTooltips(".helpTip");

			return this;
		};

		/**
		* This function generates the component (EXTJS) using the content of the model
		* @returns {Ext.ComponentView} The visual component
		*/
		this.initComponent = function() {
			var me = this;
			var visualOptions = this.getParent().getVisualOptions(this.database);

			this.component = Ext.widget({
				xtype: 'container', id: 'networkview_' + me.dbid,
				/*autoHeight: true,
				layout:
				{
				   type: "hbox",
				   align: "stretch"
				},*/
				//style: "max-width:1800px; margin: 5px 10px; ",
				items: [ {
					xtype: 'box', id: 'networkDetailsPanel_' + me.dbid, 
					//autoHeight: true, flex: 1,
					cls: "contentbox lateralOptionsPanel", html:
					//THE PANEL WITH THE CLUSTERS SUMMARY
					'<div class="lateralOptionsPanel-toolbar"><a href="javascript:void(0)" class="toolbarOption helpTip hideOption" id="hideNetworkDetailsPanelButton_' + me.dbid + '" title="Hide this panel"><i class="fa fa-times"></i></a></div>'+
					'<h2>Details</h2>' +
					'<div id="networkClustersContainer_' + me.dbid + '">' +
					'  <h4>TheName For AnOmic</h4><span class="infoTip">Click on each cluster to hide/show the nodes in the network</span>' +
					'  <h5>N Clusters founds</h5>' +
					'  <div style="text-align: center;"> </div>' +
					'  <hr/>' +
					'</div>' +
					'<div style="padding: 10px;" id="sliderClusterNumberContainer_' + me.dbid + '" style="display: none;">' +
					'  <h5>Modify number of clusters</h5>' +
					'  <span class="infoTip">Change the number of the desired clusters and apply the results. Be aware that this is an <b>intensive</b> process that will use the queue system so the results may take some time to be retrieved.</span>' + 
					'  <p style="margin:10px;">Generate <span id="sliderClusterNumberShow_' + me.dbid + '"></span> clusters.</p>' +
					'  <div class="slider-ui" style="margin:10px;" id="sliderClusterNumber_' + me.dbid + '"></div>' +
					'  <a href="javascript:void(0)" class="button btn-success btn-right helpTip" id="applyClusterNumber_' + me.dbid + '" style="margin: 20px auto;"><i class="fa fa-check"></i> Apply</a>' + 
					'</div>' +
					//THE PANEL WITH THE PATHWAY DETAILS
					'<div id="patwaysDetailsWrapper_' + me.dbid + '" style="display:none;">'+
					'  <a href="javascript:void(0)" id="backToClusterDetailsButton_' + me.dbid + '" style="margin: 5px 0px;"><i class="fa fa-long-arrow-left"></i> Back to Cluster details</a>'+
					'  <div id="patwaysDetailsContainer_' + me.dbid + '"></div>'+
					'</div>'
				},{
					xtype: 'box',  id : 'networkSettingsPanel_' + me.dbid, 
					//autoHeight: true, flex: 1,
					cls: "contentbox lateralOptionsPanel", html:
					//THE PANEL WITH THE VISUAL OPTIONS
					'<div class="lateralOptionsPanel-toolbar"><a href="javascript:void(0)" class="toolbarOption helpTip hideOption" id="hideNetworkSettingsPanelButton_' + me.dbid + '" title="Hide this panel"><i class="fa fa-times"></i></a></div>'+
					'<h2>Tools<span class="helpTip" title="Some options may affect to the table below."></h2>' +
					'<div id="pathwayNetworkToolsBox_' + me.dbid + '" style="overflow:hidden; padding: 2px 10px;">' +
					'  <h4>Visual settings:</h4>' +
					'  <h5>Node coloring: <span class="helpTip" style="float:right;" title="Change the way in which nodes are colored."></span></h5>' +
					'  <div id="colorByContainer_' + me.dbid + '"></div>' +
					'  <h5>Choose what edges represents: <span class="helpTip" style="float:right;" title="By default an edge between 2 nodes indicates that both pathways are closely related in biological terms. These relationships are inferred from the pathways maps which usually contains links to other KEGG pathways that indicates the existence of functional elements shared between pathways and processes. Alternatively, edges can be configured to represent the existence of shared genes or compounds between separated biological processes, where thickness of the edge increases with the similarity between both set of biological features (percentage of shared features on total features in both process)."></span></h5>' +
					'  <div id="edgesClassContainer_' + me.dbid + '">' +
					'    <div class="radio">' +
					'      <input type="radio" ' + ((visualOptions.edgesClass === "l")? "checked": "")+ ' id="edgesLinkedPathways_' + me.dbid + '" name="edgesClassCheckbox-check_' + me.dbid + '" value="l">' +
					'      <label for="edgesLinkedPathways_' + me.dbid + '">Linked biological processes</label>' +
					'    </div>'+
					'    <div class="radio">' +
					'      <input type="radio" ' + ((visualOptions.edgesClass === "s")? "checked": "")+ ' id="edgesSharedFeatures_' + me.dbid + '" name="edgesClassCheckbox-check_' + me.dbid + '" value="s">' +
					'      <label for="edgesSharedFeatures_' + me.dbid + '">Shared biological features</label>' +
					'    </div>'+
					'  </div>'+
					'  <h5>Other settings:</h5>' +
					'  <div class="checkbox"><input type="checkbox" id="show-node-labels-check_' + me.dbid + '" name="showNodeLabelsCheckbox">' +
					'    <label for="show-node-labels-check_' + me.dbid + '">Show all node labels <span class="helpTip" style="float:right;" title="Shows labels for nodes (reduces performance). By default labels are visible when zooming the network."</span></label>' +
					'  </div>'+
					'  <h5>Label font size (<span id="fontSizeValue_' + me.dbid + '">14</span>)<span class="helpTip" style="float:right;" title="Font size of the labels."></span></h5>' +
					'  <div class="slider-ui" style="margin:10px;" id="fontSizeSlider_' + me.dbid + '"></div>' +
					'  <div style="display: none;">' +
					'  <h5>Max node size (<span id="maxNodeSizeValue_' + me.dbid + '">8</span>)<span class="helpTip" style="float:right;" title="Determines the maximum size that a node can have, scaling the others to maintain the correct ratio."</span></h5>' +
					'  <div class="slider-ui" style="margin:10px;" id="maxNodeSizeSlider_' + me.dbid + '"></div>' +
					'  <h5>Min node size (<span id="minNodeSizeValue_' + me.dbid + '">1</span>)<span class="helpTip" style="float:right;" title="Determines the minimum size that a node can have, scaling the others to maintain the correct ratio."</span></h5>' +
					'  <div class="slider-ui" style="margin:10px;" id="minNodeSizeSlider_' + me.dbid + '"></div>' +
					' </div>' +
					// '  <div class="checkbox"><input type="checkbox" id="show-edge-labels-check" name="showEdgeLabelsCheckbox">' +
					// '    <label for="show-edge-labels-check">Show all edge labels <span class="helpTip" style="float:right;" title="Shows labels for edges (reduces performance). Edge labels indicate the percentage of shared features (genes + metabolites) shared between 2 pathways."</span></label>' +
					// '  </div>'+
					'  <h4>Network layout settings</h4>' +
					'  <div class="checkbox"><input type="checkbox" id="save-node-positions-check_' + me.dbid + '" name="saveNodePositionsCheckbox">' +
					'    <label for="save-node-positions-check_' + me.dbid + '">Save the nodes positions<span class="helpTip" style="float:right;" title="Use this option if you want to save the position for nodes in the network (increases performance)."></span><span class="commentTip" style="padding-left:21px;">Disable the auto-layout for network.</span></label>' +
					'  </div>'+
					'  <div class="checkbox" id="pre-auto-save-node-positions-check_' + me.dbid + '"><input type="checkbox" id="auto-save-node-positions-check_' + me.dbid + '" name="autoSaveNodePositionsCheckbox">' +
					'    <label for="auto-save-node-positions-check_' + me.dbid + '">Auto-save positions<span class="helpTip" style="float:right;" title="Use this option if you want to save the position for nodes in the network when clicking the \'Apply\' button, instead of having to click \'Save node positions\' before."></span><span class="commentTip" style="padding-left:21px;">Save positions after clicking "Apply".</span></label>' +
					'  </div>'+
					'  <div class="checkbox"><input type="checkbox" id="background-layout-check_' + me.dbid + '" name="backgroundLayoutCheckbox">' +
					'    <label for="background-layout-check_' + me.dbid + '">Calculate layout on background <span class="helpTip" style="float:right;" title="Run the layout on background, apply the new nodes position on stop (increases performance)."></span><span class="commentTip" style="padding-left:21px;">Increases performance.</span></label>' +
					'  </div>'+
					"  <h4>Node filtering options</h4>" +
					'  <h5>Min features in pathway (<span id="minFeaturesValue_' + me.dbid + '">50</span>%)<span class="helpTip" style="float:right;" title="Min % of features (genes + compounds) of a pathway found at the input. Pathways with lower values will be excluded from the network. E.g. Using min=50%, if we find 80 features from the input data, at a Pathway that contains 200 features, the pathway will be excluded (80 < 100)."></span></h5>' +
					'  <div class="slider-ui" style="margin:10px;" id="minFeaturesSlider_' + me.dbid + '"></div>' +
					'  <h5>Min shared features (<span id="minSharedFeaturesValue_' + me.dbid + '">10</span>%)<span class="helpTip" style="float:right;" title="Min. % of features shared between 2 pathways (using the smaller pathway as reference). Edges showing a smaller relationship will be excluded.<br>E.g. Taking min=10%, Pathway A (60 features) and B (90 features), if shared features=5 the edge will be ignored (5 < Min(60,90) * 0.1)"></span></h5>' +
					'  <div class="slider-ui" style="margin:10px;" id="minSharedFeaturesSlider_' + me.dbid + '"></div>' +
					'  <h5>Min p-value for the pathway (<span id="minPValue_' + me.dbid + '">0.05</span>)<span class="helpTip" style="float:right;" title="Pathways with lower p-value (more significant) will be represented with bigger nodes. Pathways with higher p-value (less significant), will be shown as small nodes."</span></h5>' +
					'  <div class="slider-ui" style="margin:10px;" id="minPValueSlider_' + me.dbid + '"></div>' +
					'  <div class="checkbox"><input type="checkbox" id="use-combined-pval-check_' + me.dbid + '" name="useCombinedPvalCheckbox">' +
					'    <label for="use-combined-pval-check_' + me.dbid + '">Always use combined p-value <span class="helpTip" style="float:right;" title="When coloring for one omic, use always the combined p-value for filtering if enabled, otherwise rely on the omic p-value."</span></label>' +
					'  </div>'+
					'  <h5>P-value selection criteria: <span class="helpTip" style="float:right;" title="Select which adjust method to choose the p-values from."></span></h5>' +
					'  <div id="pvaluemethod_' + me.dbid + '"></div>' +
					'  <a href="javascript:void(0)" class="button btn-success btn-right helpTip" id="applyNetworkSettingsButton_' + me.dbid + '" style="margin-top: 20px;" title="Apply changes"><i class="fa fa-check"></i> Apply</a>' +
					'</div>'
				},{
					xtype: 'box', cls: "contentbox", 
					//autoHeight: true, flex: 4,
					style: 'overflow: hidden; margin:0;', html:
					//THE PANEL WITH THE NETWORK
					'<div class="lateralOptionsPanel-toolbar">'+
					'  <a href="javascript:void(0)" class="toolbarOption downloadTool helpTip" id="downloadNetworkToolSVG_' + me.dbid + '" title="Download the network (SVG)" style="margin-top: 10px;"><i class="fa fa-download"></i> Download (SVG)</a>' +
					'  <a href="javascript:void(0)" class="toolbarOption downloadTool helpTip" id="downloadNetworkTool_' + me.dbid + '" title="Download the network (PNG)" style="margin-top: 10px;"><i class="fa fa-download"></i> Download (PNG)</a>' +
					'</div>'+
					'<h2>Pathways network (' + me.database + ' database)<span class="helpTip" title="This Network represents the relationships between matched pathways."></h2>' +
					'<div id="step3-network-toolbar_' + me.dbid + '">' +
					' <div class="lateralOptionsPanel" id="reorderOptions_' + me.dbid + '" style="display:none;">' +
					'  <div class="lateralOptionsPanel-toolbar">' +
					'    <a href="javascript:void(0)" class="toolbarOption helpTip hideOption" title="Hide this panel"><i class="fa fa-times"></i></a>' +
					'  </div>' +
					'  <h3 name="block" value="10">Nodes per row:</h3>' +
					'  <h3 name="ring" style="display: none;" value="2">Ring size:</h3>' +
					'  <h3 name="size-conf" style="display: none;" value="0">Node size:</h3>' +
					'  <span>' +
					'    <i class="fa fa-minus-square fa-2x" name="less" style="margin-right: 22px;padding-top: 5px; color: #DA643D;"></i>' +
					'    <i class="fa fa-plus-square fa-2x"  name="more" style="color: #DA643D;"></i>' +
					'  </span>' +
					' </div>' +
					'  <a href="javascript:void(0)" class="toolbarOption helpTip" id="showNetworkSettingsPanelButton_' + me.dbid + '" ><i class="fa fa-cog"></i> Configure</a>' +
					'  <div class="menu">'+
					'    <a href="javascript:void(0)" class="toolbarOption menuOption helpTip" style="display: none"><i class="fa fa-mouse-pointer"></i> Node selection</a>' +
					'    <div class="menuBody">' +
					'      <a href="javascript:void(0)" class="toolbarOption helpTip submenuOption selectNodesOption" name="category" title="Select all nodes based on the categories/clusters for current selection"><i class="fa fa-object-ungroup"></i> Category-based selection</a>' +
					'      <a href="javascript:void(0)" class="toolbarOption helpTip submenuOption selectNodesOption" name="free" title="Select nodes at a hand-drawn region"><i class="fa fa-cut"></i> Free select tool</a>' +
					'      <a href="javascript:void(0)" class="toolbarOption helpTip submenuOption selectNodesOption" name="adjacent" title="Select adjacent nodes for selected nodes"><i class="fa fa-share-alt"></i> Select adjacent nodes</a>' +
					'      <a href="javascript:void(0)" class="toolbarOption helpTip submenuOption selectNodesOption" name="all" title="Select all nodes in the network"><i class="fa fa-object-group"></i> Select all nodes</a>' +
					'    </div>'+
					'  </div>' +
					'  <div class="menu">'+
					'    <a href="javascript:void(0)" class="toolbarOption menuOption helpTip"  style="display: none"><i class="fa fa-mouse-pointer"></i> Reorder selected nodes</a>' +
					'    <div class="menuBody">' +
					'      <a href="javascript:void(0)" class="toolbarOption helpTip submenuOption reorderNodesOption" name="block" title="Organize selected nodes in to a block"><i class="fa fa-th"></i> Display as block</a>' +
					'      <a href="javascript:void(0)" class="toolbarOption helpTip submenuOption reorderNodesOption" name="ring" title="Organize selected nodes into a ring"><i class="fa fa-spinner"></i> Display as ring</a>' +
					'      <a href="javascript:void(0)" class="toolbarOption helpTip submenuOption reorderNodesOption" name="random" title="Set random positions for selected nodes"><i class="fa fa-random"></i> Randomize positions</a>' +
					'    </div>'+
					'  </div>' +
					'  <div class="menu">'+
					'    <a href="javascript:void(0)" class="toolbarOption menuOption helpTip"  style="display: none"><i class="fa fa-cog"></i> Node attributes</a>' +
					'    <div class="menuBody">' +
					'      <a href="javascript:void(0)" class="toolbarOption helpTip submenuOption configureNodesOption" name="size-conf" title="Increase or decrease point size"><i class="fa fa-th"></i> Change point size</a>' +
					'    </div>'+
					'  </div>' +
					'  <a href="javascript:void(0)" class="toolbarOption helpTip" id="fullscreenSettingsPanelButton_' + me.dbid + '" ><i class="fa fa-arrows-alt"></i> Full screen</a>' +
					'  <a href="javascript:void(0)" class="toolbarOption helpTip resumeLayout" id="resumeLayoutButton_' + me.dbid + '" style="float:right"><i class="fa fa-play"></i> Resume layout</a>' +
					'  <a href="javascript:void(0)" class="toolbarOption resumeLayout helpTip" id="saveNodePositionsButton_' + me.dbid + '"  style="float:right"><i class="fa fa-floppy-o"></i> Save Node Positions</a>' +
					'  <a href="javascript:void(0)" class="toolbarOption resumeLayout helpTip" id="toggleTooltipsButton_' + me.dbid + '"  style="float:right"><i class="fa fa-comment"></i> Toggle tooltips</a>' +
					'  <p id="step3-network-toolbar-message_' + me.dbid + '"></p>'+
					'</div>' +
					'<div id="pathwayNetworkBox_' + me.dbid + '" style="position: relative;overflow:hidden; height:775px; width: 100%;"><div id="pathwayNetworkWaitBox_' + me.dbid + '"><i class="fa fa-cog fa-spin"></i> Building network...</div></div>' +
					'<div id="pathwayNetworkBoxSVG_' + me.dbid + '" style="display: none;">'
				}],
				listeners: {
					tabchange: function() {
						/* When the tab becomes activated, force the network drawing */
						if (me.network === null) {
								me.getController().step3GetPathwaysNetworkDataHandler(me);
						}
					},
					afterrender: function() {
						//SOME EVENT HANDLERS
						$("#minFeaturesSlider_" + me.dbid).slider({
							value: 0,min: 0,max: 100,step: 5,
							slide: function(event, ui) {
								$("#minFeaturesValue_" + me.dbid).html(ui.value);
							}
						});
						$("#minSharedFeaturesSlider_" + me.dbid).slider({
							value: 0,min: 0,max: 100,step: 5,
							slide: function(event, ui) {
								$("#minSharedFeaturesValue_" + me.dbid).html(ui.value);
							}
						});
						$("#minPValueSlider_" + me.dbid).slider({
							value: 0,min: 0.005,max: 1,step: 0.005,
							slide: function(event, ui) {
								$("#minPValue_" + me.dbid).html(ui.value);
							}
						});
						$("#maxNodeSizeSlider_" + me.dbid).slider({
							value: 0,min: 1,max: 50,step: 1,
							slide: function(event, ui) {
								$("#maxNodeSizeValue_" + me.dbid).html(ui.value);
							}
						});
						$("#minNodeSizeSlider_" + me.dbid).slider({
							value: 0,min: 1,max: 50,step: 1,
							slide: function(event, ui) {
								$("#minNodeSizeValue_" + me.dbid).html(ui.value);
							}
						});
						$("#fontSizeSlider_" + me.dbid).slider({
							value: 0,min: 1,max: 50,step: 1,
							slide: function(event, ui) {
								$("#fontSizeValue_" + me.dbid).html(ui.value);
							}
						});
						$("#sliderClusterNumber_" + me.dbid).slider({
							value: 0,min: 1,max: 20,step: 1,
							slide: function(event, ui) {
								$("#sliderClusterNumberShow_" + me.dbid).html(ui.value);
							}
						});
						$("#applyNetworkSettingsButton_" + me.dbid).click(function() {
							me.applyVisualSettings();
						});
						$("#applyClusterNumber_" + me.dbid).click(function() {
							me.getNewClusters();
						});

						//HANDLERS FOR BUTTONS IN THE NETWORK TOOLBAR
						$("#downloadNetworkTool_" + me.dbid).click(function() {
							me.stopNetworkLayout();
							me.downloadNetwork("png");
						});
						$("#downloadNetworkToolSVG_" + me.dbid).click(function() {
							me.stopNetworkLayout();
							me.downloadNetwork("svg");
						});
						$("#step3-network-toolbar_" + me.dbid + " .selectNodesOption").click(function() {
							me.stopNetworkLayout();
							me.selectNodes($(this).attr("name"));
						});
						$("#step3-network-toolbar_" + me.dbid + " .reorderNodesOption").click(function() {
							me.stopNetworkLayout();
							me.reorderNodes($(this).attr("name"));
						});
						$("#step3-network-toolbar_" + me.dbid + " .configureNodesOption").click(function() {
							me.stopNetworkLayout();
							me.configureNodes($(this).attr("name"));
						});
						$("#resumeLayoutButton_" + me.dbid).click(function() {
							if ($(this).hasClass("resumeLayout")) {
								var visualOptions = me.getParent().getVisualOptions(this.database);
								if(visualOptions.pathwaysPositions !== undefined){
									Ext.MessageBox.confirm('Confirm', 'This option will invalidate current node positions,</br> Are you sure you want resume layout?', function(option){
										if(option==="yes"){
											$("#save-node-positions-check_" + me.dbid).attr("checked", false);
											$("#save-node-positions-check_" + me.dbid).prop("checked", false);
											$("#pre-auto-save-node-positions-check_" + me.dbid).fadeOut();

											$("#applyNetworkSettingsButton_" + me.dbid).click();
										}
									});
								}else{
									me.startNetworkLayout();
								}
							} else {
								me.stopNetworkLayout();
							}
						});
						$("#saveNodePositionsButton_" + me.dbid).click(function() {
							$("#save-node-positions-check_" + me.dbid).prop("checked", true);
							$("#pre-auto-save-node-positions-check_" + me.dbid).fadeIn();
							me.stopNetworkLayout();
							me.updateNodePositions(true);
							$("#step3-network-toolbar-message_" + me.dbid).addClass("successMessage").html("<i class='fa fa-check'></i> Saved").fadeIn(100, function(){
								setTimeout(function(){
									$("#step3-network-toolbar-message_" + me.dbid).fadeOut(100);
								}, 1500);
							});
						});
						$("#save-node-positions-check_" + me.dbid).click(function() {
							$("#pre-auto-save-node-positions-check_" + me.dbid).toggle($(this).is(":checked"));
						});
						$("#toggleTooltipsButton_" + me.dbid).click(function() {
							me.showTooltips = ! me.showTooltips;
							
							var message = 'Tooltips ' + (me.showTooltips ? ' enabled' : 'disabled');
							
							$("#step3-network-toolbar-message_" + me.dbid).addClass("successMessage").html("<i class='fa fa-check'></i> " + message).fadeIn(100, function(){
								setTimeout(function(){
									$("#step3-network-toolbar-message_" + me.dbid).fadeOut(100);
								}, 1500);
							});
						});
						$("#fullscreenSettingsPanelButton_" + me.dbid).click(function() {
							me.fullScreenNetwork();
						});
						$("#step3-network-toolbar-message_" + me.dbid).hover(function(){
							$(this).fadeOut(100);
						});
						$("#step3-network-toolbar_" + me.dbid + " .menuOption").click(function() {
							var isVisible = $(this).siblings(".menuBody").first().is(":visible");
							$("#step3-network-toolbar_" + me.dbid + " .menuBody").hide();
							$(this).siblings(".menuBody").first().toggle(!isVisible);
						});
						$("#step3-network-toolbar_" + me.dbid + " .submenuOption").click(function() {
							$(this).parent(".menuBody").first().toggle();
						});
						$("#showNetworkSettingsPanelButton_" + me.dbid).click(function() {
							$("#networkSettingsPanel_" + me.dbid).show();
						});
						$("#reorderOptions_" + me.dbid + " span i").click(function() {
							var option = $("#reorderOptions_" + me.dbid + " h3:visible");

							if (option.attr("name").indexOf("-conf") === -1) {
								var value = Math.max(Number.parseInt(option.attr("value")) + ($(this).attr("name")==="less"?-1:1), 1);
								option.attr("value", value);

								me.reorderNodes(option.attr("name"), value);
							} else {
								// Keep the value in the range [-1, +1]
								var value = $(this).attr("name")==="less"?-1:1;
								option.attr("value", value);

								me.configureNodes(option.attr("name"), value);
							}
						});

						$("#networkview_" + me.dbid + " .hideOption").click(function() {
							$(this).parents(".lateralOptionsPanel").first().hide();
							me.network.refresh();
						});

						$("#backToClusterDetailsButton_" + me.dbid).click(function() {
							me.hidePathwayDetails();
						});

						//Add a resizer to network panel
						Ext.create('Ext.resizer.Resizer', {
							target: this,
							handles: 's',
							pinned:true,
							maxWidth:1900,
							minHeight: 700,
							dynamic: true,
							transparent:true,
							listeners: {
								beforeresize: function(resizer, width, height){
									resizer.prevHeight= height;
								},
								resize: function(resizer, width, height){
									var diff = height - resizer.prevHeight;
									var panels = ['pathwayNetworkBox', 'networkDetailsPanel', 'networkSettingsPanel', 'patwaysDetailsContainer'];

									for(var i in panels){
										var elem = $('#' + panels[i]);
										elem.height(elem.height() + diff);
									}
								}
							}
						});

						initializeTooltips(".helpTip");
					}
				}

			});
			return this.component;
		};

		return this;
	}
	PA_Step3PathwayNetworkView.prototype = new View();

	function PA_Step3PathwayNetworkTooltipView() {
		/**
		* About this view: this view (PA_Step3PathwayNetworkTooltipView) is used to visualize
		* a tooltip showing some information for pathways when hovering the nodes in the
		* pathways network
		* @implements Singleton
		**/
		if (arguments.callee._singletonInstance) {
			return arguments.callee._singletonInstance;
		}
		arguments.callee._singletonInstance = this;

		/*********************************************************************
		* ATTRIBUTES
		***********************************************************************/
		this.name = "PA_Step3PathwayNetworkTooltipView";
		this.featureView = null;

		/***********************************************************************
		* OTHER FUNCTIONS
		***********************************************************************/
		//TODO: DOCUMENTAR
		this.show = function(x,y, model, omicDataType, dataDistributionSummaries, visualOptions) {
			this.getComponent().showAtPos(x,y);
			if (this.featureView.getModel() !== model) {
				this.featureView.loadModel(model);
				this.featureView.updateObserver(omicDataType, dataDistributionSummaries, visualOptions);
			}
			return this;
		};

		//TODO: DOCUMENTAR
		this.hide = function(){
			this.getComponent().hide();
		};

		//TODO: DOCUMENTAR
		this.showPathwayDetails = function(){
			this.getParent().showPathwayDetails(this.featureView.getModel());
		};

		//TODO: DOCUMENTAR
		this.hidePathwayDetails = function(){
			this.getParent().hidePathwayDetails();
		};

		/**
		* This function generates the component (EXTJS) using the content of the model
		* @returns {Ext.ComponentView} The visual component
		*/
		this.initComponent = function() {
			var me = this;
			this.featureView = new PA_Step3PathwayDetailsView();
			this.featureView.setParent(me);

			this.component = Ext.create('Ext.tip.ToolTip', {
				target: "", id: "sigmaTooltip",
				style: "background:#fff; padding:2px 5px;",
				dismissDelay: 0, trackMouse: false,
				autoHeight: true, width: 270,
				items: [
					this.featureView.getComponent(),{
						xtype: "box", html:
						"  <div style='text-align: center;margin: 10px 0px;'>" +
						'     <a href="javascript:void(0)" class="button" id="step3TooltipMoreButton" style="float: none;"><i class="fa fa-search-plus"></i> Show details</a>'+
						'     <a href="javascript:void(0)" class="button" id="step3TooltipPaintButton" style="float: none; background-color:#0076E2;"><i class="fa fa-paint-brush"></i> Paint</a>'+
						"  </div>"
					}
				],
				showAtPos: function(x, y) {
					if (this.el == null) {
						this.show();
					}
					this.showAt([x,y + 10]);
				},
				listeners: {
					boxready: function() {
						$("#otherFeaturesLabel").click(function() {
							me.getComponent().hide();
						});
						$("#sigmaTooltip").mouseleave(function(){
							me.getComponent().hide();
						});

						$("#step3TooltipMoreButton").click(function(){
							me.showPathwayDetails();
						});
						$("#step3TooltipPaintButton").click(function(){
							me.getParent().paintSelectedPathway(me.featureView.getModel().getID());
						});
					},
					beforehide: function() {
						var me = this;
						if ($("#sigmaTooltip") .length > 0 && $("#sigmaTooltip").is(":hover")) {
							return false;
						}
					}
				}
			});

			return this.component;
		};

		return this;
	}
	PA_Step3PathwayNetworkTooltipView.prototype = new View();

	function PA_Step3PathwayDetailsView() {
		/**
		* About this view: this view shows the details for a given pathway.
		* Some examples of details are: a table showing the # of matched features
		* for each omics type and the computed p-value, the main and secondary
		* classification and the line charts showing the trend for each omics type.
		* This view is used both in Step 3 and in Step 4
		**/
		/*********************************************************************
		* ATTRIBUTES
		***********************************************************************/
		this.name = "PA_Step3PathwayDetailsView";

		/***********************************************************************
		* GETTER AND SETTERS
		***********************************************************************/

		/***********************************************************************
		* OTHER FUNCTIONS
		***********************************************************************/
		/**
		* This function apply the settings that user can change
		* for the visual representation of the model (w/o reloading everything).
		* - STEP 1. Update the name of the pathway and the classification
		* - STEP 2. Fill the information about metagenes, 3 ALTERNATIVES
		*    - STEP 2.A IF WE ARE COLORING BY CLASSIFICATION JUST IGNORE
		*    - STEP 2.B IF WE DO NOT HAVE DATA FOR CURRENT PATHWAY
		*    - STEP 2.C UPDATE THE HEATMAP AND THE PLOT
		* - STEP 3. ENABLE SOME EVENT HANDLERS
		* @chainable
		* @returns {PA_Step3PathwayDetailsView}
		*/
		this.updateObserver = function(omicDataType, dataDistributionSummaries, visualOptions) {
			var me = this;
			var componentID = "#" + this.getComponent().getId();

			/****************************************************************/
			/* STEP 1. Update the name of the pathway and the classificatio */
			/****************************************************************/
			$(componentID + " .pathwayNameLabel h4").text(this.getModel().getName());
			$(componentID + " .pathwayClassificationLabel").html(
				"<b>Classification:</b>"+
				"<ul style='margin: 0;'>" +
				"  <li>" + this.getModel().getClassification().replace(";","</li><li>") + "</li>" +
				"</ul>");

				/*******************************************************************/
				/* STEP 2. Fill the information about matched features and p-values*/
				/*******************************************************************/
				if(this.getParent().getName() !== "PA_Step3PathwayNetworkTooltipView"){
					var htmlCode = '<tbody><tr><th></th><th>Matched<br>features</th><th>p-value</th></tr>';
					var significanceValues = this.getModel().getSignificanceValues();
					var foundFeatures = this.getParent("PA_Step4PathwayView").getMatchedFeatures();
					var renderedValue;
					for (var i in significanceValues) {
						renderedValue = (significanceValues[i][2] > 0.001 || significanceValues[i][2] === 0) ? parseFloat(significanceValues[i][2]).toFixed(6) : parseFloat(significanceValues[i][2]).toExponential(4);
						htmlCode += '<tr><td>' + i + '</td><td>' + significanceValues[i][0] + ' (' + significanceValues[i][1] + ')</td><td>' + renderedValue + '</td><td class="whiteBackground">' + (! Ext.Object.isEmpty(foundFeatures[i]) ? '<i class="fa fa-plus-square-o expandMatched" data-id="' + i.replace(/ /g, "_") + '"></i>' : '') + '</td></tr>';
					}
					htmlCode+='</tbody>';
					$(componentID + " .pathwaySummaryTable").html('<table style="padding: 10px;text-align: center;">'+ htmlCode + '</table>');
										
					var detailedHTMLcode = '';
					Object.keys(foundFeatures).forEach(function(omicName) {
						detailedHTMLcode += '<div id="matchedlist_' + omicName.replace(/ /g, "_") + '" style="display: none;"><h5>Matched features: ' + omicName + '</h5>';
						
						if (! Ext.Object.isEmpty(foundFeatures[omicName])) {					
							// Sort alphabetically
							var omicFeatures = foundFeatures[omicName];
							var sortKeys = Object.keys(omicFeatures);
							sortKeys.sort();
							
							detailedHTMLcode += '<ul>';
							
							sortKeys.forEach(function(feature) {
								detailedHTMLcode += '<li>' + feature + ' (' + Array.from(new Set(omicFeatures[feature].inputNames)).join(', ') + ')' +
									(omicFeatures[feature].isRelevant ? '<i class="featureNameLabelRelevant relevantFeature" title="Relevant feature"></i>' : '') +
									'</li>';
							});
							
							detailedHTMLcode += '</ul></div>';
						}
					});
					
					$(componentID + " .pathwaySummaryTable").append(detailedHTMLcode);
					
					
					$('i.expandMatched').click(function() {
						var el = $(this);
						var dataID = el.attr('data-id');
						
						el.toggleClass('fa-plus-square-o fa-minus-square-o');
						$('#matchedlist_' + dataID).toggle();
					});
				}

				/****************************************************************/
				/* STEP 3. Fill the information about metagenes                 */
				/****************************************************************/
				var pathwayPlotwrappers = $(componentID + " .pathwayPlotwrappers");
				pathwayPlotwrappers.empty();

				//For each omics type
				for(var i in omicDataType){
					var metagenes = this.getModel().metagenes[omicDataType[i]];
					if(omicDataType[i] === "classification"){
						/****************************************************************/
						/* STEP 3.A IF WE ARE COLORING BY CLASSIFICAITON JUST IGNORE    */
						/****************************************************************/
						var pathwaySource = this.getModel().getSource();
						var thumbnail_suffix = (pathwaySource == undefined || pathwaySource == 'KEGG') ? '_thumb' : '_' + pathwaySource + '_thumb'
						pathwayPlotwrappers.html('<div class="step3ChartWrapper" style="background-image: url(\'' + location.pathname + "kegg_data/" +  this.getModel().getID() + thumbnail_suffix + '\')"></div>');
						this.getComponent().setHeight(200);
						break;
					}else if (metagenes === undefined){
						/****************************************************************/
						/* STEP 3.B IF WE DO NOT HAVE DATA FOR CURRENT PATHWAY          */
						/****************************************************************/
						pathwayPlotwrappers.append(
							"<h4 style='color: #D16949;font-size: 13px;margin: 0;'>" + omicDataType[i] + "</h4>"+
							"<b>No data for this pathway.</b>"
						);
						this.getComponent().setHeight(120);
					}else{
						/****************************************************************/
						/* STEP 3.C UPDATE THE HEATMAP AND THE PLOT                     */
						/****************************************************************/
						var divName = this.getComponent().getId() + "_" + omicDataType[i].replace(/ /g, "_").toLowerCase();
						pathwayPlotwrappers.append(
							"<div>"+
							"  <h4>" + omicDataType[i] + "</h4>"+
							"  <span class='tooltipDetailsSpan'><i class='fa fa-info-circle'></i> " + metagenes.length + " major trends in this pathway.</span></br>"+
							"  <div class='twoOptionsButtonWrapper'>" +
							'      <a href="javascript:void(0)" class="button twoOptionsButton" name="heatmap-chart">Heatmap</a>'+
							'      <a href="javascript:void(0)" class="button twoOptionsButton selected" name="line-chart">Line chart</a>'+
							"  </div>" +
							"  <div class='step3-tooltip-plot-container' name='heatmap-chart'  style='display:none;'>" +
							"    <div id='" + divName + "_heatmapcontainer' name='heatmap-chart' style='height:"+ (metagenes.length * 35 + 10 )+ "px;width: 230px;'></div>" +
							"  </div>" +
							"  <div class='step3-tooltip-plot-container selected' name='line-chart'>" +
							"    <div id='" + divName + "_plotcontainer' style='height:100px;width: 230px;'></div>" +
							"  </div>"+
							"</div>"
						);

						var heatmap = this.generateHeatmap(divName +  "_heatmapcontainer", omicDataType[i], metagenes, dataDistributionSummaries);
						this.generatePlot(divName + "_plotcontainer", omicDataType[i], metagenes, dataDistributionSummaries, heatmap);
					}
				}
				/****************************************************************/
				/* STEP 4. ENABLE SOME EVENT HANDLERS                           */
				/****************************************************************/
				$("#" + me.getComponent().getId() + " a.twoOptionsButton").click( function(){
					var parent = $(this).parent(".twoOptionsButtonWrapper");
					var target = $(this).attr("name").replace("show", "");
					$(this).siblings("a.twoOptionsButton.selected").removeClass("selected");
					$(this).addClass("selected");
					parent.siblings("div.step3-tooltip-plot-container.selected").removeClass("selected").toggle();
					parent.siblings("div.step3-tooltip-plot-container[name="+ target + "]").addClass("selected").toggle();
				});

				this.getComponent().setHeight(230);

				return this;
			};

			//TODO: DOCUMENTAR
			this.generateHeatmap = function (targetID, omicName, metagenes, dataDistributionSummaries) {
				var featureValues, x = 0, y = 0, maxX = -1, series = [], yAxisCat = [], serie;
				for (var i in metagenes) {
					//restart the x coordinate
					x = 0;
					//Get the values and the name for the new serie
					featureValues = metagenes[i].values.map(Number);
					serie = {name: "Trend " + (i + 1), data: []};
					//Add the name for the row (e.g. MagoHb or "miRNA my_mirnaid_1")
					yAxisCat.push("Trend " + (i + 1) + "#Cluster " + metagenes[i].cluster);

					var limits = getMinMax(dataDistributionSummaries[omicName], "p10p90");

					for (var j in featureValues) {
						serie.data.push({
							x: x, y: y,
							value: featureValues[j],
							color: getColor(limits, featureValues[j], "bwr")
						});
						x++;
						maxX = Math.max(maxX, x);
					}
					series.push(serie);
					y++;
				}

				var xAxisCat = [];
				for (var i = 0; i < maxX; i++) {
					xAxisCat.push("Timepoint " + (i + 1));
				}

				var heatmap = new Highcharts.Chart({
					chart: {type: 'heatmap', renderTo: targetID},
					title: null, legend: {enabled: false}, credits: {enabled: false},
					tooltip: {
						borderColor: "#333",
						formatter: function () {
							var title = this.point.series.name.split("#");
							title[1] = (title.length > 1) ? title[1] : "";
							return "<b>" + title[0].replace("*", '<i class="relevantFeature"></i>') + "</b><br/>" + "<i class='tooltipInputName'>" + title[1] + "</i>" + (this.point.value === null ? "No data" : this.point.value);
						},
						useHTML: true
					},
					xAxis: {categories: xAxisCat, labels: {enabled: false}},
					yAxis: {
						categories: yAxisCat, title: null, width: 100,
						labels: {
							formatter: function () {
								var title = this.value.split("#");
								title[1] = (title.length > 1) ? title[1] : "No data";
								return '<span style="width: 55px;display: block;   text-align: right;">' + ((title[0].length > 14) ? title[0].substring(0, 14) + "..." : title[0]).replace("*", '<i class="relevantFeature"></i>') +
								'</br><i class="tooltipInputName yAxisLabel">' + ((title[1].length > 14) ? title[1].substring(0, 14) + "..." : title[1]) + '</i></span>';
							},
							style: {fontSize: "9px"}, useHTML: true
						}
					},
					series: series,
					plotOptions: {
						heatmap: {borderColor: "#000000",borderWidth: 0.5},
						series: {
							point: {
								events: {
									mouseOver: function() {
										var plot = $("#" + this.series.chart.renderTo.id.replace("heatmap", "plot")).highcharts();
										for (var i in plot.series) {
											plot.series[i].setVisible(this.series.name.split("#")[0] === plot.series[i].name);
										}
									},
									mouseOut: function() {
										var plot = $("#" + this.series.chart.renderTo.id.replace("heatmap", "plot")).highcharts();
										for (var i in plot.series) {
											plot.series[i].setVisible(true);
										}
									}
								}
							}
						}
					}
				});

				return heatmap;
			};

			//TODO: DOCUMENTAR
			this.generatePlot = function (targetID, omicName, metagenes, dataDistributionSummaries, heatmap) {
				var series = [],
				scaledValues, min, max,
				maxVal = -100000000,
				minVal = 100000000,
				tmpValue,
				yAxis = [],
				yAxisItem;


				//1.FILL THE STORE DATA [{name:"timepoint 1", "Gene Expression": -0.8, "Proteomics":-1.2,... },{name:"timepoint2", ...}]
				for (var i in metagenes) {
					scaledValues = [];
					featureValues = metagenes[i].values.map(Number);

					var limits = getMinMax(dataDistributionSummaries[omicName], 'p10p90');
					for (var j in featureValues) {
						//SCALE THE VALUE
						tmpValue = scaleValue(featureValues[j], limits.min, limits.max);
						tmpValue = featureValues[j];
						//UPDATE MIN MAX (TO ADJUST THE AXIS)
						maxVal = Math.max(tmpValue, maxVal);
						minVal = Math.min(tmpValue, minVal);
						//ADD THE VALUE (CUSTOM MARKER IF OUTLIER)
						scaledValues.push({
							y: tmpValue,
							marker: ((tmpValue > 1 || tmpValue < -1) ? {
								fillColor: '#ff6e00'
							} : null)
						});
					}

					var parentAux = this.getParent("PA_Step3PathwayNetworkView");
					if(parentAux === null){
						parentAux = this.getParent();
					}

					series.push({
						name: "Cluster " + metagenes[i].cluster,
						type: 'spline',
						color: parentAux.getClusterColor(metagenes[i].cluster),
						startOnTick: false,
						endOnTick: false,
						data: scaledValues,
						yAxis: 0
					});
				}

				maxVal = Math.ceil(Math.max(maxVal, 1));
				minVal = Math.floor(Math.min(minVal, -1));

				var plot = new Highcharts.Chart({
					chart: {renderTo: targetID},
					title: null,
					credits: {enabled: false},
					xAxis: [{labels: {enabled: false}}],
					yAxis: {
						title: null,
						min: minVal,
						max: maxVal,
						plotLines: [
							{label: {text: '-1',align: 'right', style: {color: 'gray'}},color: '#dedede',value: -1,width: 1},
							{label: {text: '0',align: 'right', style: {color: 'gray'}},color: '#dedede',value: 0,width: 1},
							{label: {text: '1',align: 'right', style: {color: 'gray'}},color: '#dedede',value: 1,width: 1}
						]},
						series: series,
						legend: {
							itemStyle: {fontSize: "9px",fontWeight: 'lighter'},
							margin: 5,
							padding: 5
						},
						tooltip: {enabled: false},
						plotOptions: {
							series: {
								point: {
									events: {
										mouseOver: function() {
											heatmap.tooltip.refresh(heatmap.series[heatmap.series.length - this.series.index - 1].data[this.x]);
										}
									}
								}
							}
						}
					}
				);

				plot.yAxis[0].setExtremes(minVal, maxVal);

				return plot;
			};

			/**
			* This function generates the component (EXTJS) using the content of the model
			* @param {String}  renderTo  the ID for the DOM element where this component should be rendered
			* @returns {Ext.ComponentView} The visual component
			*/
			this.initComponent = function(renderTo) {
				var me = this;
				this.component = Ext.widget({
					xtype: "box", renderTo: renderTo, html:
					"<div class='mainInfoPanel' >" +
					"  <div class='pathwayNameLabel' style='padding:2px 0px'><h4 style='font-size: 13px;margin: 0;'></h4></div>" +
					"  <div class='pathwayClassificationLabel' style='padding:2px 0px'></div>" +
					"  <div class='pathwaySummaryTable'></div>" +
					"  <div class='pathwayPlotwrappers'></div>" +
					"</div>",
					listeners: {
						beforedestroy: function() {
							me.getModel().deleteObserver(me);
						}
					}
				});

				return this.component;
			};

			return this;
		}
		PA_Step3PathwayDetailsView.prototype = new View();

		function PA_Step3PathwayTableView() {
			/**
			* About this view: TODO: DOCUMENTAR
			**/
			/*********************************************************************
			* ATTRIBUTES
			***********************************************************************/
			this.name = "PA_Step3PathwayTableView";
			this.tableData = null;

			/***********************************************************************
			* GETTER AND SETTERS
			***********************************************************************/
			//TODO: DOCUMENTAR
			this.loadModel= function(model){
				var me = this;

				/********************************************************/
				/* STEP 1. LOAD THE MODEL                               */
				/********************************************************/
				if (this.model !== null) {
					this.model.deleteObserver(this);
				}
				this.model = model;
				this.model.addObserver(this);

				/********************************************************/
				/* STEP 2. GENERATE THE ROWS CONTENT                    */
				/********************************************************/
				this.tableData = [];

				var pathways = this.model.getPathways();
				var pathwayData, pathwayModel, omicName, significanceValues;
				var defaultCombinedPvaluesMethod = me.getParent().visualOptions.selectedCombinedMethod;

				var significativePathways = 0;

				for (var i in pathways) {
					pathwayModel = pathways[i];

					//NOTE: IGNORE Metabolic pathways (HUGE PATHWAY)
					if (pathwayModel.getID() === this.getModel().getOrganism() + "01100") {
						continue;
					}
					pathwayData = {
						// selected: pathwayModel.isSelected(),
						pathwayID: pathwayModel.getID(),
						title: pathwayModel.getName(),
						matchedGenes: pathwayModel.getMatchedGenes().length,
						matchedCompounds: pathwayModel.getMatchedCompounds().length,
						// combinedSignificancePvalues: pathwayModel.getCombinedSignificanceValues(),
						mainCategory: pathwayModel.getClassification().split(";")[0],
						secCategory: pathwayModel.getClassification().split(";")[1],
						visible: pathwayModel.isVisible(),
						source: pathwayModel.getSource()
					};

					significanceValues = pathwayModel.getSignificanceValues();
					for (var j in significanceValues) {
						omicName = "-" + j.toLowerCase().replace(/ /g, "-");
						pathwayData['totalMatched' + omicName] = significanceValues[j][0];
						pathwayData['totalRelevantMatched' + omicName] = significanceValues[j][1];
						pathwayData['pValue' + omicName] = significanceValues[j][2];
					}

					adjustedSignificanceValues = pathwayModel.getAdjustedSignificanceValues();
					for (var j in adjustedSignificanceValues) {
						omicName = "-" + j.toLowerCase().replace(/ /g, "-");

						for (var k in adjustedSignificanceValues[j]) {
							pathwayData["adjpval" + k + omicName] = adjustedSignificanceValues[j][k];
						}
					}

					combinedSignificanceValues = pathwayModel.getCombinedSignificanceValues();
					for (var m in combinedSignificanceValues) {
						pathwayData["combinedSignificancePvalue" + m] = combinedSignificanceValues[m];
					}

					adjustedCombinedSignificanceValues = pathwayModel.getAdjustedCombinedSignificanceValues();
					for (var m in adjustedCombinedSignificanceValues) {
						for (var k in adjustedCombinedSignificanceValues[m]) {
							pathwayData["adjustedCombinedSignificancePvalue" + m + k] = adjustedCombinedSignificanceValues[m][k];
						}
					}
					this.tableData.push(pathwayData);

					significativePathways += (combinedSignificanceValues[defaultCombinedPvaluesMethod] <= 0.05) ? 1 : 0;
				}
			};

			/*********************************************************************
			* OTHER FUNCTIONS
			***********************************************************************/
			//TODO: DOCUMENTAR
			this.updateObserver = function() {
				var me = this;
				var defaultCombinedPvaluesMethod = me.getParent().visualOptions.selectedCombinedMethod;
				var selectedAdjustedMethod = me.getParent().getVisualOptions().selectedAdjustedMethod;

				/*STEP 3.1 GENERATE THE COLUMNS AND THE ROW MODEL*/
				var columns = [ //DEFINE FIXED COLUMNS
					{
						xtype: 'customactioncolumn',
						text: "Paint",
						menuDisabled: true,
						width: 55,
						items: [{
							icon: "fa-paint-brush-o",
							text: "",
							tooltip: 'Paint this pathway',
							style: "font-size: 20px;",
							handler: function(grid, rowIndex, colIndex) {
								me.getParent().paintSelectedPathway(grid.getStore().getAt(rowIndex).get('pathwayID'));
							}
						}]
						// }, {
						// 	xtype: 'customcheckcolumn',
						// 	header: 'Select',
						// 	dataIndex: 'selected',
						// 	width: 55,
						// 	menuDisabled: true,
						// 	listeners: {
						// 		checkchange: {
						// 			scope: gridPanel,
						// 			fn: function(elem, rowIndex) {
						// 				var record = this.getStore().getAt(rowIndex);
						//
						// 				var model = me.getModel().getPathway(record.get("pathwayID"));
						// 				model.setSelected(!model.isSelected());
						//
						// 				this.getView().select(rowIndex);
						// 				this.getStore().sort();
						// 			}
						// 		}
						// 	}
					}, {
						text: 'ID',
						dataIndex: 'pathwayID',
						hidden: true
					},
					((me.model.getDatabases().length < 2) ? {text: '', width: 0} : {
						text: '', dataIndex: 'sourcedb',
						filterable: true, width:30, resizable: false,
						renderer: function(value, metadata, record) {
							var sourcedb = record.get("source");
							metadata.style = "height: 33px; padding: 5px 3px;width: 40px;";
							metadata.tdAttr = 'data-qtip="' + "<b>Database</b><br>" + sourcedb + '"';
							return '<i class="classificationNameBox" style="' + $('#icon_' + sourcedb).attr('style') + ';line-height: 21px;">' + sourcedb.charAt(0) + '</i>';
						}
					}),
					{
						text: 'Pathway name', dataIndex: 'title', filterable: true, flex: 1,
					},{
						text: '', dataIndex: 'classification',
						filterable: true, width:10, resizable: false,
						renderer: function(value, metadata, record) {
							metadata.style = "height: 33px; padding: 0; width: 10px; background-color:"+me.getParent().getClassificationColor(record.get("mainCategory").toLowerCase().replace(/ /g, "_"), [])+";";
							metadata.tdAttr = 'data-qtip="' + "<b>Classification</b><br>" + record.get("mainCategory") + "<br>" + record.get("secCategory") + '"';
							return '';
						}
					}, {
						text: 'Features',
						columns: [{
							text: 'Unique</br>genes', cls:"header-90deg",
							sortable: true,
							align: "center", width: 50,
							filter: {type: 'numeric'},
							dataIndex: 'matchedGenes'
						}, {
							text: 'Unique</br>metabol.', cls:"header-90deg",
							sortable: true,
							align: "center", width: 50,
							filter: {type: 'numeric'},
							dataIndex: 'matchedCompounds'
						}]
					}
				];
				//DEFINE FIXED FIELDS FOR THE MODEL
				var rowModel = {
					// selected: {name: "selected", defaultValue: false},
					pathwayID: {name: "pathwayID"},
					title: {name: "title", defaultValue: ''},
					matchedGenes: {name: "matchedGenes", defaultValue: '0'},
					matchedCompounds: {name: "matchedCompounds", defaultValue: '0'},
					// combinedSignificancePvalues: {name: "combinedSignificancePvalues", defaultValue: ''},
					mainCategory: {name: "mainCategory",defaultValue: ''},
					secCategory: {name: "secCategory",defaultValue: ''},
					visible: {name: "visible", defaultValue: true},
					source: {name: "source", defaultValue: "KEGG"}
				};

				//CALL THE PREVIOUS FUNCTION ADDING THE INFORMATION FOR GENE BASED OMIC AND COMPOUND BASED OMICS
				var secondaryColumns = [];
				var modelPathways = this.model.getPathways();
				var hidden = (Object.keys(this.model.getGeneBasedInputOmics()).length  + Object.keys(this.model.getCompoundBasedInputOmics()).length  > 5 || $("#mainViewCenterPanel").hasClass("mobileMode"))  ;

				var adjustedPvalueMethods = this.model.getMultiplePvaluesMethods();
				var combinedPvaluesMethods = this.model.getCombinedPvaluesMethods();

				this.generateColumns(this.model.getGeneBasedInputOmics(), secondaryColumns, rowModel, hidden, adjustedPvalueMethods, combinedPvaluesMethods);
				this.generateColumns(this.model.getCompoundBasedInputOmics(), secondaryColumns, rowModel, hidden, adjustedPvalueMethods, combinedPvaluesMethods);

				//ADD AN ADDITIONAL COLUMN WITH THE COMBINED pValue IF #OMIC > 1
				if (secondaryColumns.length > 1) {

					var rendererMethod = function(value, metadata, record) {
						var myToolTipText = "<b style='display:block; width:200px'>" + metadata.column.text + "</b>";
						metadata.style = "height: 33px; font-size:10px;"
						if (value === '') {
							myToolTipText = myToolTipText + "<i>No data for this pathway</i>";
							metadata.tdAttr = 'data-qtip="' + myToolTipText + '"';
							metadata.style += " background-color:#D4D4D4;";
							return "-";
						}

						if(value <= 0.065){
							var color = Math.round(161 * (value/0.065));
							metadata.style += "background-color:rgb(255, " + color +"," + color + ");";
						}

						//RENDER THE VALUE -> IF LESS THAN 0.05, USE SCIENTIFIC NOTATION
						return (value > 0.001 || value === 0) ? parseFloat(value).toFixed(5) : parseFloat(value).toExponential(4);
					};

					combinedPvaluesMethods.forEach(function(m) {

						rowModel['combinedSignificancePvalue' + m] = {
							name: 'combinedSignificancePvalue' + m,
							defaultValue: "-"
						};
                        
                        secondaryColumns.push({
							text: 'Combined </br>pValue</br>(' + m + ')', cls:"header-45deg",
							dataIndex: 'combinedSignificancePvalue' + m,
							sortable: true, filter: {type: 'numeric'}, align: "center",
							minWidth: 100, flex:1, height:75, hidden: (m != defaultCombinedPvaluesMethod),
							renderer: rendererMethod
						});

						// The adjusted combined values should have the same methods
						adjustedPvalueMethods.forEach(function(fdr) {
							rowModel['adjustedCombinedSignificancePvalue' + m + fdr] = {
								name: 'adjustedCombinedSignificancePvalue' + m + fdr,
								defaultValue: "-"
							};

							secondaryColumns.push({
								text: 'Combined </br>pValue</br>(' + m + ')</br>[' + fdr + ']', cls:"header-45deg",
								dataIndex: 'adjustedCombinedSignificancePvalue' + m + fdr,
								sortable: true, filter: {type: 'numeric'}, align: "center",
								minWidth: 100, flex:1, height:75, hidden: (selectedAdjustedMethod != m),
								renderer: rendererMethod
							});
						});
					});
				}
				//GROUP ALL COLUMNS INTO A NEW COLUMN 'Significance tests'
				columns.push({text: 'Significance tests', columns: secondaryColumns});

				columns.push({
					xtype: 'customactioncolumn',
					text: "External links", width: 150,
					items: [{
						icon: "fa-external-link",
						text: function(v, meta, record, rowIdx, colIdx, store, view) {
							return store.getAt(rowIdx).get('source');
						},
						tooltip: function(v, meta, record, rowIdx, colIdx, store, view) {
							return 'Find pathway in ' + store.getAt(rowIdx).get('source') + ' Database';
						},
						handler: function(grid, rowIndex, colIndex) {
							var term = grid.getStore().getAt(rowIndex).get('pathwayID');
							var db = grid.getStore().getAt(rowIndex).get('source');
							var db_link = {
								"KEGG": "http://www.genome.jp/dbget-bin/www_bget?pathway+%term%",
								"MapMan": "http://www.gomapman.org/search/gmm/%term%?entity=pathway"
							};

							window.open(db_link[db].replace("%term%", term), '_blank');
						}
					}, {
						icon: "fa-search", text: "PubMed",
						tooltip: 'Find related publications',
						handler: function(grid, rowIndex, colIndex) {
							var term = grid.getStore().getAt(rowIndex).get('title');
							window.open("http://www.ncbi.nlm.nih.gov/pubmed/?term=" + term.replace(" ", "%20"), '_blank');
						}
					}]
				});

				var tableStore = Ext.create('Ext.data.Store', {
					fields: Object.values(rowModel),
					data: this.tableData,
					sorters: [{
						property: ((secondaryColumns.length > 1) ? 'combinedSignificancePvalue' + defaultCombinedPvaluesMethod : secondaryColumns[0].dataIndex),
						direction: 'ASC'
					}]
				});

				var gridPanel = this.getComponent().queryById("pathwaysGridPanel");
                
                gridPanel.initialConfig.columns = columns;
				gridPanel.reconfigure(tableStore, columns);
				
				// Make sure that the updated adjusted p-values layer exists 
				// when at least one database is filtered.
				
				
				this.updateVisiblePathways();
			};
			
			this.getAssociatedPathways = function(onlyVisible = false) {
				var associatedPathways = {};
				
				/* Flatten the dictionary */
				$.each(this.getParent().getIndexedPathways(), function(db, pathways) {
					associatedPathways = $.extend(associatedPathways, pathways);
				});
				
				/* Filter by visibility */
				if (onlyVisible) {
					var visiblePathways = {};
					
					for (var pathwayID in associatedPathways) {
						if (associatedPathways[pathwayID].visible == true) {
							visiblePathways[pathwayID] = associatedPathways[pathwayID];
						}
					}
					
					associatedPathways = visiblePathways;
				}
				
				return(associatedPathways);
			};

			//TODO: DOCUMENTAR
			this.updateVisiblePathways = function(loadRemote=false){
				var store = this.getComponent().queryById("pathwaysGridPanel").getStore();
				var indexedPathways = this.getAssociatedPathways();
				var parent = this.getParent();
				var visualOptions = parent.getVisualOptions();
				var adjustedPvalueMethods = this.model.getMultiplePvaluesMethods();
				
				var filterBy = function(elem){
					return indexedPathways[elem.get("pathwayID")].isVisible();
				};
				
				store.filterBy(filterBy);
				
				// First load: update the grid contained p-values
				this.updatePvaluesFromStore();
				
				if (adjustedPvalueMethods !== null) {
					/*
						Check if any database is filtered. It that is the case we retrieve the new
						p-values from server. 
						
						If not filtered (or no longer filtered) remove the layer of "false" adjusted
						p-values to restore the original, unless there are custom Stouffer weights
						in which case we retrieve the new ones.
					*/
					var isFiltered = Object.values(parent.isFiltered).includes(true);
					var customStouffer = ! Ext.Object.isEmpty(visualOptions.stoufferWeights);
					var retrieveNewValues = false;
					
					if (loadRemote) {
						if (isFiltered) {
							retrieveNewValues = true;
						} else {
							/*
								Unfiltered data: remove options and update grid.
							*/	
							this.model.getDatabases().forEach(function(db) {
								delete visualOptions[db].adjustedPvalues;
							});

							this.updatePvaluesFromStore();

							if (customStouffer) {
								var visiblePathways = Object.keys(this.getAssociatedPathways(true));

								console.log("Unfiltered pathways and custom Stouffer: removing old visualOptions and retrieving adjusted Stouffer.");

								parent.getController().step3GetUpdatedPvalues(this, this.getPvaluesFromStore(), visualOptions.stoufferWeights, visiblePathways);
							} else {
								console.log("Unfiltered pathways: removing old visualOptions and updating the table.");

								parent.getController().updateStoredApplicationData("visualOptions", visualOptions);
							}
						}
					} else {
						/*
							If we are first loading from session, make sure that if filtered the layer exists
							in the visual options or retrieve it.
						*/
						var layerAdjusted = ! Ext.Object.isEmpty(visualOptions[this.model.getDatabases()[0]].adjustedPvalues);
						var layerStouffer = ! Ext.Object.isEmpty(visualOptions[this.model.getDatabases()[0]].Stouffer);

						if ((isFiltered && ! layerAdjusted) || (customStouffer && ! layerStouffer)) {
							retrieveNewValues = true;
						}
					}
				
					if (retrieveNewValues) {
						parent.getController().step3GetUpdatedPvalues(this, this.getPvaluesFromStore());
					}
				}
			};
			
			this.updatePvaluesFromStore = function(){
				var me = this;
				var gridView = me.getComponent().queryById("pathwaysGridPanel");
				var store = gridView.getStore();
				var visualOptions = me.getParent().getVisualOptions();
				
				var databases = me.model.getDatabases();
				
				/* Suspend events */
				store.suspendEvents();
				
				databases.forEach(function(db) {
					
					/* If new Stouffer values are available, update ALL records in store, else
					   set the default data. */
					var allRecords = store.snapshot || store.data;
					var restoreRawStouffer = (visualOptions[db].Stouffer == undefined);
						
					allRecords.each(function(storeRecord) {
						var pathwayID = storeRecord.raw.pathwayID;

						storeRecord.set("combinedSignificancePvalueStouffer", restoreRawStouffer ? storeRecord.raw.combinedSignificancePvalueStouffer : visualOptions[db].Stouffer[pathwayID]);
					});
					
					/* New adjusted p-values: iterate over filtered records */
					var filteredRecords = store.data;
					var adjustedPvalueMethods = me.model.getMultiplePvaluesMethods();
					var combinedPvaluesMethods = me.model.getCombinedPvaluesMethods();
					var omicNames = me.model.getOmicNames();
					var restoreRawAdjusted = (visualOptions[db].adjustedPvalues == undefined);

					if (adjustedPvalueMethods !== null) {
						filteredRecords.each(function(storeRecord) {
							var pathwayID = storeRecord.raw.pathwayID;

							/* Iterate over all adjusted columns (omics and combined p-values methods) */
							omicNames.concat(combinedPvaluesMethods).forEach(function(adjustedColumn) {
								var keyField;

								/* Set the correct name for the rowModel */
								if (combinedPvaluesMethods.indexOf(adjustedColumn) != -1) {
									keyField = "adjustedCombinedSignificancePvalue" + adjustedColumn + "%fdrterm%";
								} else {
									keyField = "adjpval%fdrterm%-" + adjustedColumn.toLowerCase().replace(/ /g, "-");
								}

								/* Iterate over multiple test adjustment methods */
								adjustedPvalueMethods.forEach(function(fdrMethod) {
									var rowModelKey = keyField.replace("%fdrterm%", fdrMethod);
									var newPvalue;

									/* 	If the column is present, it must contain all the adjustment methods but not necessarily
										all the pathways, as not all omics match in all pathways. */
									if ( ! restoreRawAdjusted && visualOptions[db].adjustedPvalues[adjustedColumn]) {
										newPvalue = visualOptions[db].adjustedPvalues[adjustedColumn][fdrMethod][pathwayID] || "-";
									} else {
										newPvalue = storeRecord.raw[rowModelKey];
									}

									storeRecord.set(rowModelKey, newPvalue);
								});
							});
						});
					}
				});
				
				/* Resume events */
				store.resumeEvents();
				
				gridView.down("gridview").refresh();
			};
			
			this.getPvaluesFromStore = function(includeHidden = false){
				var store = this.getComponent().queryById("pathwaysGridPanel").getStore();
				var selectedRecords = (includeHidden ? store.snapshot || store.data : store.data);
				
				var omicNames = this.getParent().getModel().getOmicNames();
				var combinedPvaluesMethods = this.model.getCombinedPvaluesMethods();
				
				var visiblePvalues = {};
				
				this.model.getDatabases().forEach(function(db) {
					visiblePvalues[db] = {};
				});

				selectedRecords.each(function(rowRecord) {
					var rowData = rowRecord.data;
					
					visiblePvalues[rowData.source][rowData.pathwayID] = {};
					
					omicNames.forEach(function(omic) {
						visiblePvalues[rowData.source][rowData.pathwayID][omic] = rowData["pValue-" + omic.toLowerCase().replace(/ /g, "-")];
					});
					
					combinedPvaluesMethods.forEach(function(combMethod) {
						visiblePvalues[rowData.source][rowData.pathwayID][combMethod] = rowData["combinedSignificancePvalue" + combMethod];
					});
				});
				
				return(visiblePvalues);
			};

			/**
			* This function generates a new column for the table (pValue column) for a given OMIC, and add the corresponding data to the row model.
			* @chainable
			* @param {Object} omics, list of omics for the current JOBINSTANCE
			* @param {Array} columns, list of Objects defining the columns content
			* @param {Object} rowModel, Object containing a description for the row model for the table
			* @return {PA_Step3PathwayTableView}
			*/
			this.generateColumns = function(omics, columns, rowModel, hidden, adjustedPvaluesMethods, combinedPvaluesMethods) {
				//FOR EACH OMIC -> ADD COLUM FOR p-value AND CREATE THE HOVER PANEL WITH SUMMARY
				var omicName;
				var me = this;
                
                var selectedAdjustedMethod = me.getParent().getVisualOptions().selectedAdjustedMethod;

				//TODO: REMOVE THIS SPAGETTI CODE :/
				var renderFunction = function(value, metadata, record) {
					var myToolTipText = "<b style='display:block; width:200px'>" + metadata.column.text.replace(/<\/br>/g, " ") + "</b>";
					metadata.style = "height: 33px; font-size:10px;"

					//IF THERE IS NOT DATA FOR THIS PATHWAY, FOR THIS OMIC, PRINT A '-'
					if (value === "-" || value == undefined || isNaN(value)) {
						myToolTipText = myToolTipText + "<i>No data for this pathway</i>";
						metadata.tdAttr = 'data-qtip="' + myToolTipText + '"';
						metadata.style += "background-color:#D4D4D4;";
						return "-";
					}
					//ELSE, GENERATE SUMMARY TIP

					//RENDER THE VALUE -> IF LESS THAN 0.05, USE SCIENTIFIC NOTATION
					var renderedValue = (value > 0.001 || value === 0) ? parseFloat(value).toFixed(5) : parseFloat(value).toExponential(4);
					var omicName = "-" + metadata.column.text.toLowerCase().replace(/ /g, "-").replace(/<\/br>/g, "-");

					if(value <= 0.065){
						var color = Math.round(225 * (value/0.065));
						metadata.style += "background-color:rgb(255, " + color +"," + color + ");";
					}

					try {
						var totalFeatures = me.model.summary[4][metadata.column.text.replace(/<\/br>/g, " ")] || 0;
						var totalRelevant = me.model.summary[5][metadata.column.text.replace(/<\/br>/g, " ")] || 0;
						var foundFeatures = record.get('totalMatched' + omicName);
						var foundRelevant = record.get('totalRelevantMatched' + omicName);

						var foundNotRelevant = foundFeatures - foundRelevant;
						var notFoundRelevant = totalRelevant - foundRelevant;
						var notFoundNotRelev = (totalFeatures - foundFeatures) - notFoundRelevant;

						if (foundRelevant !== undefined) {
							myToolTipText +=
							'<b>p-value:</b>'  + (value === -1 ? "-" : renderedValue) + "</br>" +
							"<table class='contingencyTable'>" +
							' <thead><th></th><th>Relevant</th><th>Not Relevant</th><th></th></thead>' +
							'  <tr><td>Found</td><td>' + foundRelevant + '</td><td>' + foundNotRelevant + '</td><td>' + foundFeatures + '</td></tr>' +
							'  <tr><td>Not found</td><td>' + notFoundRelevant + '</td><td>' + notFoundNotRelev + '</td><td>' + (totalFeatures - foundFeatures) + '</td></tr>' +
							'  <tr><td></td><td>' + totalRelevant + '</td><td>' + (totalFeatures - totalRelevant) + '</td><td>' + (totalFeatures) + '</td></tr>' +
							'</table>';
							// myToolTipText = myToolTipText + "Features matched: " + ) + "</br>";
							// myToolTipText = myToolTipText + "Relevant features matched: " +  + "</br>";
							metadata.tdAttr = 'data-qtip="' + myToolTipText + '"';
						}

					} catch (e) {
						debugger;
						console.error("Error while creating tooltip");
					} finally {

					}

					return renderedValue;
				};

				for (var i in omics) {
					omicName = "-" + omics[i].omicName.toLowerCase().replace(/ /g, "-");
					columns.push({
						text: omics[i].omicName.replace(" ","</br>"), cls:"header-45deg",
						dataIndex: 'pValue' + omicName, width:90,
						flex: 1, hidden : hidden, sortable: true, align: "center",
						filter: {type: 'numeric'},
						renderer: renderFunction
					});

					//ADD THE CUSTOM FIELD TO ROW MODEL
					rowModel['totalMatched' + omicName] = {
						name: 'totalMatched' + omicName,
						defaultValue: 0
					};
					rowModel['totalRelevantMatched' + omicName] = {
						name: 'totalRelevantMatched' + omicName,
						defaultValue: 0
					};
					rowModel['pValue' + omicName] = {
						name: 'pValue' + omicName,
						defaultValue: "-",
						type: 'floatOrString'
					};

					//Apply only when there are adjusted p-values
					adjustedPvaluesMethods.forEach(function(m) {
						columns.push({
							text: omics[i].omicName.replace(" ","</br>") + '</br>(' + m + ')', cls:"header-45deg",
							dataIndex: 'adjpval' + m + omicName, width:90,
							flex: 1, hidden: (hidden || selectedAdjustedMethod != m),
                            sortable: true, align: "center",
							filter: {type: 'numeric'},
							renderer: renderFunction
						});

						rowModel['adjpval' + m + omicName] = {
							name: 'adjpval' + m + omicName,
							defaultValue: "-",
							type: 'floatOrString'
						};
					});
				}
				return this;
			};

			//TODO: DOCUMENTAR
			this.getSelectedPathways = function() {
				var selectedPathways = [];
				this.getComponent().queryById("pathwaysGridPanel").getStore().query("selected", true).each(function(item) {
					selectedPathways.push(item.get("pathwayID"));
				});
				return selectedPathways;
			};

			/**
			* This function generates the component (EXTJS) using the content of the model
			* @param {String}  renderTo  the ID for the DOM element where this component should be rendered
			* @returns {Ext.ComponentView} The visual component
			*/
			this.initComponent = function() {
				var me = this;
				this.component = Ext.widget({
					xtype: 'container', cls: "contentbox", items: [
						{xtype: 'box', flex: 1, html: '<h2>Pathway enrichment</h2>'},
						{
							xtype: "livesearchgrid", itemId: 'pathwaysGridPanel',
							searchFor: "title",
							defaults: {border: false}, columnLines: true, stripeRows:false,
							download: {
								title: 'Paintomics pathways ' + me.getModel().getJobID(),
								ignoreColums: [1]
							},
							store: Ext.create('Ext.data.Store', {
								fields: ['name', 'email', 'phone']
							}),
							columns: [{text: 'name', flex: 1, dataIndex: 'name'}],
							databases: me.model.getDatabases(),
							adjustedPvaluesMethods: me.model.getMultiplePvaluesMethods(),
							combinedPvaluesMethods: me.model.getCombinedPvaluesMethods(),
                            selectedAdjustedMethod: me.getParent().visualOptions.selectedAdjustedMethod,
                            selectedCombinedMethod: me.getParent().visualOptions.selectedCombinedMethod,
							enableConfigure: (me.getParent().visualOptions.selectedCombinedMethod == 'Stouffer'),
							listeners: {
                                'adjustedMethodChanged': function(records) {
                                        me.getParent().setVisualOptions("selectedAdjustedMethod", records[0].raw[0]);
                                        me.getParent().getController().updateStoredVisualOptions(me.getParent().getModel().getJobID(), me.getParent().getVisualOptions());
								},
								'combinedMethodChanged': function(records) {
                                        me.getParent().setVisualOptions("selectedCombinedMethod", records[0].raw[0]);
                                        me.getParent().applyVisualSettings();
									
										// Disable configure element for not Stouffer values
										var isStouffer = (records[0].raw[0] == "Stouffer");
									
										me.component.query("[id=configureButton]")[0].setDisabled(! isStouffer);
								},
                                'clickConfigure': function(iconLink) {                            
                                    // Retrieve the default weights used (mapped ratio)
									var mappingInfo = me.getModel().getMappingSummary();
									var defaultValues = {};
									
									// Calculate the original mapping ratio used as Stouffer weight.  
									Object.keys(mappingInfo).map(function(omic) {
										defaultValues[omic] = parseFloat((mappingInfo[omic].mapped / (mappingInfo[omic].mapped + mappingInfo[omic].unmapped)).toFixed(1)) * 10
									});
                                    
									// Create an slider for each omic
                                    var omicSliders = me.getModel().getOmicNames().map(function(omic) {    										
                                        return({
                                            xtype: 'slider',
                                            fieldLabel: omic,
                                            minValue: 0,
                                            maxValue: 10,
                                            increment: 1,
                                            value: me.getParent().getVisualOptions().stoufferWeights[omic] || defaultValues[omic],
                                            width: '100%'
                                        })
                                    });
                                    
                                    Ext.create('Ext.tip.Tip', {
                                        closable: true,
                                        //padding: '0 0 0 0',
                                        maxWidth: 200,
                                        width: 200,
                                        itemId: 'stoufferTip',
                                        renderTo: "mainViewCenterPanel",
                                        items: [
                                            {
                                                xtype: 'container',
                                                layout: 'vbox',
                                                align: 'center',
                                                flex: 1,
	                                            items: omicSliders.concat({
													xtype: 'container',
													layout: {
														type: 'hbox',
														align: 'middle'
													},
													flex: 1,
													items: [
														{
															xtype: 'button',
															text: 'Apply',
															margin: '10 5 10 10',
															width: 80,
															//cls: 'button btn-success btn-right',
															handler: function() {
																var tip = Ext.ComponentQuery.query("[itemId=stoufferTip]")[0];
																var sliders = tip.query("slider");
																var stoufferWeigths = {};
																var currentPValues = me.getPvaluesFromStore(true);
																var visiblePathways = Object.keys(me.getAssociatedPathways(true));

																sliders.forEach(function(omicSlider) {
																	stoufferWeigths[omicSlider.getFieldLabel()] = parseFloat(omicSlider.getValue());
																});

																me.getParent().setVisualOptions("stoufferWeights", stoufferWeigths);
																
																me.getParent().getController().updateStoredApplicationData("visualOptions", me.getParent().getVisualOptions());
																/*me.getParent().getController().updateStoredVisualOptions(me.getParent().getModel().getJobID(), 
																														 me.getParent().getVisualOptions());*/
																
																me.getParent().getController().step3GetUpdatedPvalues(me, currentPValues, stoufferWeigths, visiblePathways); 
																
																tip.close();
															}
														},
														{
															xtype: 'button',
															text: 'Defaults',
															width: 80,
															margin: '10 10 10 5',
															handler: function() {
																var sliders = Ext.ComponentQuery.query("[itemId=stoufferTip]")[0].query("slider");
																
																sliders.forEach(function(omicSlider) {
																	omicSlider.setValue(defaultValues[omicSlider.getFieldLabel()]);
																});
															}
														}
													]
												})
                                            }
                                        ]
                                    }).showBy(iconLink, "b-t", [0, 20]);
                                }
							}
						}]
					}
				);
				return this.component;
			};

			return this;
		}
		PA_Step3PathwayTableView.prototype = new View();

	function PA_Step3StatsView() {
		/*********************************************************************
		* ATTRIBUTES
		***********************************************************************/
		this.name = "PA_Step3StatsView";

		/***********************************************************************
		* GETTER AND SETTERS
		***********************************************************************/
		//TODO: DOCUMENTAR
		this.loadModel= function(model){
			var me = this;

			me.model = model;
		};
		
		/**
		* This function generates the component (EXTJS) using the content of the model
		* @param {String}  renderTo  the ID for the DOM element where this component should be rendered
		* @returns {Ext.ComponentView} The visual component
		*/
		this.initComponent = function() {
			var me = this;
			
			var omicSummaryPanelComponents = [];
			var dataDistribution = me.getModel().getDataDistributionSummaries();
			
			for (var omicName in dataDistribution) {
				omicSummaryPanelComponents.push(new PA_OmicSummaryPanel(omicName, dataDistribution[omicName], false).getComponent());
			}
			
			this.component = Ext.widget({					
				xtype: 'container', cls: "contentbox", id: 'statsViewContainer', hidden: false, items: [
					{xtype: 'box', flex: 1, 
					 html: '<h2>Mapping and data statistics</h2>' + (omicSummaryPanelComponents.length ? '<a href="javascript:void(0)" id="download_mapping_file"><i class="fa fa-download"></i> Download ID/Name mapping results.</a>' : "")},
					{
							xtype: 'container', itemId: "omicSummaryPanelStep3",
							cls: "omicSummaryContainer",
							layout: 'column',  style: "margin-top:20px;width: 100%;",
							items: omicSummaryPanelComponents
					}
				],
				listeners: {
						boxready: function() {
							$('#download_mapping_file').click(function() {
								application.getController("DataManagementController").downloadFilesHandler(me, "mapping_results_" + me.getModel().getJobID() + ".zip", "job_result", me.getModel().getJobID());
							});
						}
					}
			});
			
			return this.component;
		};
		
		return this;
	}
	PA_Step3StatsView.prototype = new View();

		/**
		* This function returns the MIN/MAX values that will be used as references
		* for painting (i.e. min and max colors).
		*
		* @param {type} dataDistributionSummaries
		* @param {type} option [absoluteMinMax, riMinMax, localMinMax, p10p90]
		* @returns {Array}
		*/
		var getMinMax = function(dataDistributionSummaries, option) {
			// The two last positions are not always present, and are added when restoring
			// visual settings options on some views. Thus, they are not saved in the omicSummary
			// property, but on visual settings table.
			//
			//   0        1       2    3    4    5     6,   7   8      9        10      11          12
			//[MAPPED, UNMAPPED, MIN, P10, Q1, MEDIAN, Q3, P90, MAX, MIN_IR, Max_IR, MIN_CUSTOM, MAX_CUSTOM]]
			var min, max, absMin, absMax;

			absMax = ((dataDistributionSummaries[8] < 0) ? 0 : Math.max(Math.abs(dataDistributionSummaries[2]), Math.abs(dataDistributionSummaries[8])));
			absMin = ((dataDistributionSummaries[2] > 0) ? 0 : -absMax);

			if (option === "absoluteMinMax") { //IF USE MIN MAX FOR ORIGINAL DATA (INCLUDE OUTLIERS)
				max = ((dataDistributionSummaries[8] < 0) ? 0 : Math.max(Math.abs(dataDistributionSummaries[2]), Math.abs(dataDistributionSummaries[8])));
				min = ((dataDistributionSummaries[2] > 0) ? 0 : -max);
			} else if (option === "riMinMax") { //IF USE MIN MAX FOR INTERQUARTIL RANGE (OMIT OUTLIERS)
				max = ((dataDistributionSummaries[10] < 0) ? 0 : Math.max(Math.abs(dataDistributionSummaries[9]), Math.abs(dataDistributionSummaries[10])));
				min = ((dataDistributionSummaries[9] > 0) ? 0 : -max);

				//    } else if (option === "localMinMax") {//IF USE MIN MAX FOR INTERQUARTIL RANGE (OMIT OUTLIERS)
				//        //TODO: IMPLEMENT
			} else if (option === "p10p90") { //IF USE PERCENTILES 10 AND 90
				max = ((dataDistributionSummaries[7] < 0) ? 0 : Math.max(Math.abs(dataDistributionSummaries[3]), Math.abs(dataDistributionSummaries[7])));
				min = ((dataDistributionSummaries[3] > 0) ? 0 : -max);

				absMax = ((dataDistributionSummaries[8] < 0) ? 0 : Math.max(Math.abs(dataDistributionSummaries[2]), Math.abs(dataDistributionSummaries[8])));
				absMin = ((dataDistributionSummaries[2] > 0) ? 0 : -absMax);
			} else if (option == "custom") { //USE SLIDER CUSTOM VALUES
				if (dataDistributionSummaries.length < 12) {
					console.error("No custom range provided: using absolute min/max");

					max = absMax;
					min = absMin;
				} else {
					max = ((dataDistributionSummaries[12] < 0) ? 0 : Math.max(Math.abs(dataDistributionSummaries[11]), Math.abs(dataDistributionSummaries[12])));
					min = ((dataDistributionSummaries[11] > 0) ? 0 : -max);
				}
			} else {
				console.error("getMinMax:" + option + "Not implemented!!");
				debugger;
			}
			//KEEP RANGE SIMETRY
			return {
				min: min,
				max: max,
				absMin: absMin,
				absMax: absMax
			};

		};

		/**
		* This function returns the corresponding RGB color (for heatmap) for
		* a given value, based on a min/max values.
		*
		* @param {type} min
		* @param {type} max
		* @param {type} value
		* @param {String} colorScale the color scale (RED-BLACK-GREEN -> "rbg", BLUE-WHITE-RED -> "bwr")
		* @returns {String}
		*/
		var getColor = function(limits, value, colorScale) {
			var red, blue, green;
			//RED-BLACK-GREEN
			if (colorScale === "rbg") {
				var percentage = Math.abs((value > 0) ? (value / limits.max) : (value / limits.min));
				green = (value > 0) ? 0 : 255 * percentage;
				red = (value > 0) ? 255 * percentage : 0;
				blue = 0;
			} else if (colorScale === "bwr") {
				//BLUE-WHITE-RED
				var percentage = Math.max(0, 1 - Math.abs((value > 0) ? (value / limits.max) : (value / limits.min)));

				var outlierPercentage = Math.max(0, Math.abs((value > 0) ? ((value - limits.max) / (limits.absMax - limits.max)) : ((value - limits.min) / (limits.absMin - limits.min))));
				green = percentage * 255;
				red = (value > 0) ? ((value > limits.max) ? 255 - (outlierPercentage * 128) : 255) : (percentage * 255);
				blue = (value < 0) ? ((value < limits.min) ? 255 - (outlierPercentage * 128) : 255) : (percentage * 255);

			} else if (colorScale === "bwr2") {
				//BLUE-WHITE-RED
				var percentage = Math.max(0, 1 - Math.abs((value > 0) ? (value / limits.max) : (value / limits.min)));
				var outlierPercentage = Math.max(0, Math.abs((value > 0) ? ((value - limits.max) / (limits.absMax - limits.max)) : ((value - limits.min) / (limits.absMin - limits.min))));

				green = (value > limits.max || value < limits.min) ? (outlierPercentage * 128) : (percentage * 255);
				red = (value > 0) ? 255 : (percentage * 255);
				blue = (value > 0) ? (percentage * 255) : 255;
			} else {
				console.error("Color scale " + colorScale + "Not implemented!!");
				debugger;
			}
			return "rgb(" + Math.round(red) + ", " + Math.round(green) + "," + Math.round(blue) + ")";
		};
