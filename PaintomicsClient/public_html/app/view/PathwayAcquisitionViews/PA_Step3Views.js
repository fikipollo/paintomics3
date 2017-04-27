//# sourceURL=PA_Step3Views.js
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
	this.classificationData = null;
	this.indexedPathways = null;

	this.pathwayClassificationView = null;
	this.pathwayNetworkView = null;
	this.pathwayTableView = null;
	this.significativePathways = 0;

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

		/********************************************************/
		/* STEP 2.1.A LOAD VISUAL OPTIONS IF ANY                */
		/********************************************************/
		if (window.sessionStorage && sessionStorage.getItem("visualOptions") !== null) {
			this.visualOptions = JSON.parse(sessionStorage.getItem("visualOptions"));
		}else{
			/********************************************************/
			/* STEP 2.1.B GENERATE DEFAULT VISUAL OPTIONS           */
			/********************************************************/
			this.visualOptions = {
				//GENERAL OPTIONS
				pathwaysVisibility: [],
				//OPTIONS FOR NETWORK
				minFeatures: 0.50,
				minPValue: 0.05,
				minSharedFeatures: 0.9,
				colorBy : "classification",
				backgroundLayout : false,
				showNodeLabels : true,
				//showEdgeLabels : false,
				edgesClass : 'l'
			};

			for (var i in pathways) {
				this.visualOptions.pathwaysVisibility.push(pathways[i].getID());
			}

			this.getController().updateStoredApplicationData("visualOptions", this.visualOptions);
		}
		/********************************************************/
		/* STEP 2.2 GENERATE THE INDEX FOR PATHWAYS             */
		/********************************************************/
		this.indexedPathways = {}; var pathwayInstance;
		for (var i in pathways) {
			pathwayInstance =  pathways[i];
			pathwayInstance.setVisible(this.visualOptions.pathwaysVisibility.indexOf(pathwayInstance.getID()) !== -1);
			this.indexedPathways[pathwayInstance.getID()] = pathwayInstance;
		}
		if(this.visualOptions.pathwaysPositions !== undefined){
			var data;
			for(var i in this.visualOptions.pathwaysPositions){
				data = this.visualOptions.pathwaysPositions[i].split("#");
				this.indexedPathways[data[0]].networkCoordX = Number.parseFloat(data[1]);
				this.indexedPathways[data[0]].networkCoordY = Number.parseFloat(data[2]);
			}
		}


		/************************************************************/
		/* STEP 2.3 GENERATE THE TABLE WITH PATHWAY CLASSIFICATIONS */
		/************************************************************/
		this.classificationData = {};
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
		for (var i in pathways) {
			pathwayInstance =  pathways[i];
			this.significativePathways += ((pathwayInstance.getCombinedSignificanceValues() <= 0.05) ? 1 : 0);

			mainClassificationName = pathwayInstance.getClassification().split(";");
			secClassificationName = mainClassificationName[1];
			mainClassificationName = mainClassificationName[0];
			mainClassificationID = mainClassificationName.toLowerCase().replace(/ /g, "_");
			secClassificationID = secClassificationName.toLowerCase().replace(/ /g, "_");

			if(this.classificationData[mainClassificationID] === undefined){
				this.classificationData[mainClassificationID] = {
					name: mainClassificationName,
					count: 0,
					children: {}
				};
			}
			this.classificationData[mainClassificationID].count++;

			if(this.classificationData[mainClassificationID].children[secClassificationID] === undefined){
				this.classificationData[mainClassificationID].children[secClassificationID] = {
					name: secClassificationName,
					count: 0,
					children: []
				};
			}
			this.classificationData[mainClassificationID].children[secClassificationID].count++;
			this.classificationData[mainClassificationID].children[secClassificationID].children.push(pathwayInstance.getID());
		}

		/************************************************************/
		/* STEP 3 CREATE THE SUBVIEWS                               */
		/************************************************************/
		if(this.pathwayClassificationView === null){
			this.pathwayClassificationView = new PA_Step3PathwayClassificationView();
			this.pathwayClassificationView.setController(this.getController());
			this.pathwayClassificationView.setParent(this);
		}
		this.pathwayClassificationView.loadModel(model);

		if(this.pathwayNetworkView=== null){
			this.pathwayNetworkView = new PA_Step3PathwayNetworkView();
			this.pathwayNetworkView.setController(this.getController());
			this.pathwayNetworkView.setParent(this);
		}
		this.pathwayNetworkView.loadModel(model);

		if(this.pathwayTableView=== null){
			this.pathwayTableView = new PA_Step3PathwayTableView();
			this.pathwayTableView.setController(this.getController());
			this.pathwayTableView.setParent(this);
		}
		this.pathwayTableView.loadModel(model);

		if (this.getModel().isRecoveredJob && this.getModel().getStepNumber() === 3) {
			$(".backButton").hide();
		}

		return this;
	};

	this.getVisualOptions = function(){
		return this.visualOptions;
	};
	this.setVisualOptions = function(propertyName, value) {
		this.visualOptions[propertyName] = value;
	};
	this.getClassificationData = function(){
		return this.classificationData;
	};
	this.getIndexedPathways = function(){
		return this.indexedPathways;
	};

	this.getTotalVisiblePathways = function(){
		var visible = 0;
		var significative = 0;
		var pathways = this.getModel().getPathways();
		for (var i in pathways) {
			visible += (pathways[i].isVisible() ? 1 : 0);
			if(Object.keys(this.model.summary[4]).length > 1){
				significative += ((pathways[i].isVisible() && pathways[i].getCombinedSignificanceValues() <= 0.05) ? 1 : 0);
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
		var colors = ["#007AFF",  "#4CD964", "#FF2D55", "#FFCD02", "#5AC8FB", "#C644FC"];
		var pos = ["cellular_processes", "environmental_information_processing", "genetic_information_processing", "human_diseases", "metabolism", "organismal_systems"].indexOf(classificationID);

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
		/********************************************************/
		/* STEP 2: GENERATE THE PATHWAYS CLASSIFICATION PLOT    */
		/********************************************************/
		this.pathwayClassificationView.updateObserver();
		/********************************************************/
		/* STEP 3: GENERATE THE TABLE						     /
		/********************************************************/
		this.pathwayTableView.updateObserver();
		/********************************************************/
		/* STEP 4: GENERATE THE PATHWAYS NETWORK                */
		/********************************************************/
		this.pathwayNetworkView.updateObserver();
		/********************************************************/
		/* STEP 5: UPDATE THE SUMMARY                           */
		/********************************************************/
		setTimeout(function() {
			var visiblePathways = me.getTotalVisiblePathways();
			$("#foundPathwaysTag").html(visiblePathways.visible);
			$("#significantPathwaysTag").html(visiblePathways.significative);
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
	this.applyVisualSettings = function(caller) {
		var me = this;
		/********************************************************/
		/* STEP 1: DO WHEREVER (include here code if necessary) */
		/********************************************************/

		if(caller === "PA_Step3PathwayClassificationView"){
			/********************************************************/
			/* STEP 2. UPDATE THE TABLE WITH THE SELECTED OPTIONS   */
			/*         (only if updating from categories panel)     */
			/********************************************************/
			this.pathwayTableView.updateVisiblePathways();
		}
		/********************************************************/
		/* STEP 3. UPDATE THE pathwayNetworkView VIEW           */
		/********************************************************/
		this.pathwayNetworkView.updateObserver();

		/********************************************************/
		/* STEP 4. UPDATE THE CACHE
		/********************************************************/
		me.getController().updateStoredVisualOptions(me.getModel().getJobID(), me.visualOptions);

		/********************************************************/
		/* STEP 5: UPDATE THE SUMMARY                           */
		/********************************************************/
		setTimeout(function() {
			var visiblePathways = me.getTotalVisiblePathways();
			$("#foundPathwaysTag").html(visiblePathways.visible);
			$("#significantPathwaysTag").html(visiblePathways.significative);
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
		this.pathwayNetworkView.stopNetworkLayout();
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

		this.component = Ext.widget({
			xtype: "container",
			padding: '10', border: 0, maxWidth: 1300,
			items: [
				{ //THE TOOLBAR
					xtype: "box",cls: "toolbar secondTopToolbar", html:
					'<a href="javascript:void(0)" class="button btn-danger btn-right" id="resetButton"><i class="fa fa-refresh"></i> Reset</a>' +
					'<a href="javascript:void(0)" class="button btn-default btn-right backButton"><i class="fa fa-arrow-left"></i> Go back</a>'
				},{ //THE SUMMARY PANEL
					xtype: 'container', itemId: "pathwaysSummaryPanel",
					layout: 'column', style: "max-width:1300px; margin: 5px 10px; margin-top:50px;", items: [
						{
							xtype: 'box', cls: "contentbox omicSummaryBox", html:
							'<div id="about">' +
							'  <h2>Pathways selection</h2>' +
							'  <p>' +
							'     We found the following Pathways for the provided data.<br>Each Pathway has a set of significance values for each submitted <i>omic data</i>,' +
							'     those values are calculated based on the total number of features (compounds and genes) for each Pathway as well as the number of features from the input involved on that Pathway.<br>' +
							'     Additionally, when the input includes 2 or more different omic types, we provide a Combined Significance Value, which allow us to identify those Pathways that are potentially more relevant.' +
							'  </p>' +
							'  <a id="download_mapping_file"><i class="fa fa-paint-brush-o"></i> Choose the pathways below and  Paint!</a> ' +
							'</div>'
						}, {
							xtype: 'box',
							cls: "contentbox omicSummaryBox",
							html: '<h2>Pathways summary</h2>' +
							'<h3 style="text-align:center;">Your Job ID is <b id="jobIdField">[JOB ID]</b><span class="infoTip" style=" font-size: 12px; ">Use this ID to recover your information in the future (option available at <b>Cloud Drive</b> section).</span></h3>' +
							'<div style="text-align:center;font-size: 25px;line-height: 120px;">' +
							'  <span class="myDataSummaryCount" style=" margin: 0; padding-right: 0; "><i class="fa fa-sitemap"></i> </span>' +
							'  <div id="foundPathwaysTag" class="odometer odometer-theme-default">000</div>  Found Pathways' +
							'  <span class="myDataSummaryCount" style=" margin: 0; padding-right: 0;"><i class="fa fa-star" style="background-color: #F1CC28;"></i> </span>' +
							'  <div id="significantPathwaysTag" class="odometer odometer-theme-default">000</div> Significant' +
							'</div>'
						}
					]
				},
				me.pathwayClassificationView.getComponent(), //THE CLASSIFICATION PANEL
				me.pathwayNetworkView.getComponent(), //THE NETWORK PANEL
				me.pathwayTableView.getComponent(), //THE TABLE PANEL
			],
			listeners: {
				boxready: function() {
					//SOME EVENT HANDLERS
					$(".backButton").click(function() {
						me.backButtonHandler();
					});
					$("#resetButton").click(function() {
						me.resetViewHandler();
					});
					//INITIALIZE THE COUNTERS IN SUMMARY PANEL
					new Odometer({el: $("#foundPathwaysTag")[0],value: 0});
					new Odometer({el: $("#significantPathwaysTag")[0],value: 0});
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

function PA_Step3PathwayClassificationView() {
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
		var OTHER_COLORS = ["#FF9500", "#E0F8D8", "#55EFCB", "#FFD3E0"];
		var classificationData = this.getParent().getClassificationData();
		var indexedPathways = this.getParent().getIndexedPathways();
		var pathways = this.getModel().getPathways();

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

		$('#pathwayDistributionsContainer').highcharts({
			chart: {type: 'pie'},
			title: null, credits: {enabled: false},
			plotOptions: {
				series: {
					animation: false,
					dataLabels: {
						enabled: true,  useHTML:true,
						formatter: function(){
							if(this.point.drilldown !== undefined){
								return '<i class="classificationNameBox" style="line-height: 20px;border-color:' + this.point.color + '; color:' + this.point.color + ';">' + this.point.name.charAt(0).toUpperCase() + '</i>' + this.percentage.toFixed(2) + "%";
							}else{
								return "<b>" + this.point.name + "</b><br>" + this.percentage.toFixed(2) + "%";
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
			$("#pathwayClassificationContainer").html(htmlContent);

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

			$(".step3ClassificationsTitle").click(function(event){
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

			$(".step3ClassificationsPathway > input").change(function(){
				updateStatus(this);
			});

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
		this.applyVisualSettings =  function() {
			var me = this;

			/********************************************************/
			/* STEP 1. UPDATE THE pathways Visibility               */
			/*         (indexedPathways TABLE)                      */
			/********************************************************/
			var pathwaysVisibility = [];
			var indexedPathways = me.getParent().getIndexedPathways();
			$("#pathwayClassificationContainer").find("input").each(function(){
				indexedPathways[this.id].setVisible($(this).is(":checked"));
				if(indexedPathways[this.id].isVisible()){
					pathwaysVisibility.push(this.id);
				}
			});

			// TODO: UPDATE CLASSIFICATION DISTRIBUTION AND HIDE SECTOS AT THE PIE CHART
			//
			// var classificationData = me.getParent().getClassificationData();
			// var indexedPathways = me.getParent().getIndexedPathways();
			// var pathways = me.getModel().getPathways();
			// var mainClassificationID, secClassificationID;
			//
			// //RESET CLASSIFICATION COUNTERS
			// for(var i in classificationData){
			// 	classificationData[i].count=0;
			// 	for(var j in classificationData[i].children){
			// 		classificationData[i].children[j].count=0
			// 	}
			// }
			//
			// for(var i in pathways){
			// 	mainClassificationID = pathways[i].getClassification().split(";")[0].toLowerCase().replace(/ /g,"_")
			// 	secClassificationID = pathways[i].getClassification().split(";")[1].toLowerCase().replace(/ /g,"_")
			// 	if(!pathways[i].visible){
			// 		classificationData[mainClassificationID].count++;
			// 		classificationData[mainClassificationID].children[secClassificationID].count++;
			// 	}
			// }

			me.getParent().setVisualOptions("pathwaysVisibility", pathwaysVisibility);

			/********************************************************/
			/* STEP 2. NOTIFY THE CHANGES TO PARENT                 */
			/********************************************************/
			me.getParent().applyVisualSettings(me.getName());

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
				maxWidth: 1300, html:
				'<h2>Pathways classification</h2>' +
				'<div id="pathwayClassificationPlot1Box" style="padding-left: 10px;overflow:hidden;  min-height:300px; width: 45%; float: left;">'+
				'  <h4>Category Distribution<span class="infoTip">Click on each slice to view the distribution of the subcategories.</span></h4> '+
				'  <div id="pathwayDistributionsContainer" style="height: 240px;"></div>'+
				'</div>' +
				'<div id="pathwayClassificationPlot2Box" style="overflow:hidden;  min-height:300px; width: 55%; display:inline-block; padding: 0px 30px">'+
				'  <h4>Filter by category<span class="infoTip">Use this tool to <b>Show or Hide Pathways</b> based on their classification</span></h4> '+
				'  <div id="pathwayClassificationContainer"></div>'+
				'  <a href="javascript:void(0)" class="button btn-success btn-right helpTip" id="applyClassificationSettingsButton" style="margin: 0px 50px 17px 0px;" title="Apply changes"><i class="fa fa-check"></i> Apply</a>' +
				'</div>',
				listeners: {
					boxready: function() {
						$("#applyClassificationSettingsButton").click(function() {
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

	function PA_Step3PathwayNetworkView() {
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
		this.generateNetwork = function(data) {
			var me = this;
			var visualOptions = this.getParent().getVisualOptions();
			var indexedPathways = this.getParent().getIndexedPathways();
			var CLUSTERS = {};

			/********************************************************/
			/* STEP 0. CLEAN PREVIOUS NETWORK                       */
			/********************************************************/
			$("#pathwayNetworkWaitBox").fadeIn();

			//CLEAN PREVIOUS NETWORK
			if (this.network !== null) {
				sigma.layouts.killForceLink();
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
				/*    the sum of matched features in the pathway,       */
				/********************************************************/
				matchedPathway.setTotalFeatures(matchedPathway.getMatchedGenes().length + matchedPathway.getMatchedCompounds().length);
				if (elem.data.total_features * visualOptions.minFeatures > matchedPathway.getTotalFeatures()){
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
					var pValue = 1;
					try{
						pValue = (visualOptions.colorBy === "classification")? matchedPathway.getCombinedSignificanceValues() : matchedPathway.getSignificanceValues()[visualOptions.colorBy][2];
					}catch(error){
						//pass
						pValue = 1;
					}
					elem.data.size = (pValue <= visualOptions.minPValue)? 20 + 2 * (visualOptions.minPValue - pValue):12;

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
					elem.data.color = "#e2e2e2";
					elem.data.size = similarity;
					edgesAux.push(elem.data);
				}
			}

			/********************************************************/
			/* STEP 3. GENERATE THE NETWORK                         */
			/********************************************************/
			this.network = new sigma({
				graph: {nodes: nodesAux,edges: edgesAux},
				renderers: [{container: $('#pathwayNetworkBox')[0], type: 'canvas' }],
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
					edgeHaloSize: 3
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
					categories = categories.concat((me.getParent().getVisualOptions().colorBy === "classification")?nodes[i].parent:nodes[i].clusters);
				}
				// Remove duplicates:
				categories = Array.unique(categories);
				nodes = me.network.graph.nodes();
				var selection = [];
				for(var i in nodes){
					if(Array.intersect(categories, ((me.getParent().getVisualOptions().colorBy === "classification")?nodes[i].parent:nodes[i].clusters)).length > 0){
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
				if(e.data.current.nodes.length > 0){
					PA_Step3PathwayNetworkTooltipView().timeoutID = setTimeout(function(){
						PA_Step3PathwayNetworkTooltipView().show(e.data.captor.clientX, e.data.captor.clientY, me.getModel().getPathway(e.data.current.nodes[0].id), [visualOptions.colorBy], me.getModel().getDataDistributionSummaries(), visualOptions);
					}, 600);
				}else{
					clearTimeout(PA_Step3PathwayNetworkTooltipView().timeoutID);
				}
			});
			$("canvas.sigma-mouse").mouseleave(function(){
				clearTimeout(PA_Step3PathwayNetworkTooltipView().timeoutID);
				PA_Step3PathwayNetworkTooltipView().hide();
			});

			/********************************************************/
			/* STEP 7. GENERATE THE CLUSTERS DETAILS PANEL          */
			/********************************************************/
			var htmlCode = "";
			$("#networkClustersContainer h4").text("Coloring by " + visualOptions.colorBy);
			$("#networkClustersContainer span.infoTip").toggle(visualOptions.colorBy !== "classification");
			$("#networkClustersContainer h5").toggle(visualOptions.colorBy !== "classification");

			if(visualOptions.colorBy === "classification"){
				var color, classification;
				for (var classificationID in me.getParent().classificationData){
					classification = me.getParent().classificationData[classificationID];
					color = color = this.getParent().getClassificationColor(classificationID, []);
					htmlCode += '<div style="text-align:left;"><i class="classificationNameBox" style="border-color:' + color + '; color:' + color + ';">' + classification.name.charAt(0).toUpperCase() + '</i>' +  classification.name + "</div>";
				}
				$("#networkClustersContainer div").html(htmlCode);
			}else{
				$("#networkClustersContainer h5").text(Object.keys(CLUSTERS).length + " Clusters found.");
				//Generate the images and the containers
				var img_path;
				for(var cluster in CLUSTERS){
					img_path = SERVER_URL_GET_CLUSTER_IMAGE + "/" + this.getModel().getJobID() + "/output/" + visualOptions.colorBy + "_cluster_" + cluster + ".png";
					htmlCode+= '<span class="networkClusterImage" name="'+ cluster + '"><i class="fa fa-eye-slash fa-2x"></i><img src="' + img_path +'"><p><i class="fa fa-square" style="color:' + CLUSTERS[cluster] +'"></i> Cluster ' + cluster + '</p></span>';
				}
				$("#networkClustersContainer div").html(htmlCode);

				//Initialize the events when clicking a cluster images (filter)
				$(".networkClusterImage").click(function(){
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
				$('#resumeLayoutButton').addClass("resumeLayout");
				$('#resumeLayoutButton').html('<i class="fa fa-play"></i> Resume layout');

				//Draw glyps and edges
				me.drawGlyphs = true;
				me.network.renderers[0].glyphs({draw: me.drawGlyphs});
				me.network.settings({
					drawEdges:true,
					//edgeLabelThreshold: ((visualOptions.showEdgeLabels===true?0:8)),
					labelThreshold : ((visualOptions.showNodeLabels===true?1:8))
				});
				me.network.renderers[0].render();

				//Clear timeout, in case that layout stops automatically
				clearTimeout(me.timeoutID);
				me.timeoutID = null;

				$("#pathwayNetworkWaitBox").fadeOut();
			};

			sigma.layouts.configForceLink(this.network, {
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
			}).bind('stop', afterStopEvent);

			/********************************************************/
			/* STEP 9. WAIT 2 SECONDS AND START THE LAYOUT          */
			/********************************************************/
			if(visualOptions.pathwaysPositions !== undefined){
				setTimeout(function() {
					afterStopEvent();
				}, 2000);
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
			$("#pathwayNetworkWaitBox").fadeIn();

			$("#resumeLayoutButton").removeClass("resumeLayout");
			$("#resumeLayoutButton").html('<i class="fa fa-pause"></i> Stop layout');

			//Hide glyps and edges
			this.drawGlyphs = false;
			this.network.renderers[0].glyphs({draw: false});
			this.network.settings({drawEdges:false});
			sigma.layouts.startForceLink(this.network);

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
			this.network.renderers[0].fullScreen();
			return this;
		};


		/**
		* This function shows the detailed view for selected pathway
		* @chainable
		* @param  {Pathway} pathway the instance to show
		* @returns {PA_Step3PathwayNetworkView} the view
		*/
		this.showPathwayDetails = function(pathway){
			if(this.pathwayDetailsView === null){
				this.pathwayDetailsView = new PA_Step3PathwayDetailsView();
				this.pathwayDetailsView.getComponent("patwaysDetailsContainer");
				this.pathwayDetailsView.setParent(this);
			}

			this.pathwayDetailsView.loadModel(pathway);

			var omicNames = [];
			var inputOmics = this.getModel().getGeneBasedInputOmics();
			for(var i in inputOmics){
				omicNames.push(inputOmics[i].omicName);
			}
			this.pathwayDetailsView.updateObserver(omicNames, this.getModel().getDataDistributionSummaries(), this.getParent().getVisualOptions());

			if(!$("#networkDetailsPanel").is(":visible")){
				$("#networkSettingsPanel").hide();
				$("#networkClustersContainer").hide();
				$("#networkDetailsPanel").show(200, function(){
					$("#patwaysDetailsWrapper").show();
				});
			}else{
				$("#networkClustersContainer").slideUp(200,function(){
					$("#patwaysDetailsWrapper").slideDown();
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
			$("#networkClustersContainer").slideDown();
			$("#patwaysDetailsWrapper").slideUp();
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

		this.updateNodePositions = function(updateCache){
			var visualOptions = this.getParent().getVisualOptions();
			var indexedPathways = this.getParent().getIndexedPathways();
			//Invalidate previous position
			for(var pathwayID in indexedPathways){
				delete indexedPathways[pathwayID].networkCoordX;
				delete indexedPathways[pathwayID].networkCoordY;
			}

			//Get new coordinates
			var nodes = this.network.graph.nodes();
			delete visualOptions.pathwaysPositions;
			visualOptions.pathwaysPositions=[];
			for(var i in nodes){
				visualOptions.pathwaysPositions.push(nodes[i].id + "# " + nodes[i].x + "#" + nodes[i].y);
				indexedPathways[nodes[i].id].networkCoordX = nodes[i].x;
				indexedPathways[nodes[i].id].networkCoordY = nodes[i].y;
			}

			if(updateCache){
				this.getController().updateStoredVisualOptions(this.getModel().getJobID(), visualOptions);
			}
			return this;
		};

		this.clearNodePositions = function(){
			var visualOptions = this.getParent().getVisualOptions();
			var indexedPathways = this.getParent().getIndexedPathways();

			//Invalidate previous position
			for(var pathwayID in indexedPathways){
				delete indexedPathways[pathwayID].networkCoordX;
				delete indexedPathways[pathwayID].networkCoordY;
			}

			delete visualOptions.pathwaysPositions;

			return this;
		};

		/**
		* This function selects nodes from the network following different approaches
		* @param  {String} option the selection strategy
		* @return {PA_Step3PathwayNetworkView}        this view
		*/
		this.selectNodes = function(option){
			if(option === "category"){
				this.select.selectByCategory();
			}else if(option === "free"){
				$("#step3-network-toolbar-message").removeClass("successMessage").html("<i class='fa fa-info-circle'></i> Select the region that contains the nodes and drag to move.")
				.fadeIn(
					100,
					function(){
						setTimeout(function(){
							$("#step3-network-toolbar-message").fadeOut(100);
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
				// sigma.plugins.image(me.network, me.network.renderers[0], {
				// 	download:true,
				// 	size: 1000,
				// 	background: 'white',
				// 	labels:true,
				// 	clip: true,
				// 	margin:30,
				// 	filename:'paintomics_network_' + me.getParent("PA_Step3JobView").getModel().getJobID() + '.png'
				// });
				var newCanvas =  $('<canvas/>')[0];
				newCanvas.height = $("#pathwayNetworkBox").height();
				newCanvas.width = $("#pathwayNetworkBox").width();
				var ctx3 = newCanvas.getContext('2d');
				ctx3.drawImage($("canvas.sigma-scene")[0], 0, 0);
				ctx3.drawImage($("canvas.sigma-glyphs")[0], 0, 0);
				$('<a target="_blank" id="downloadNetworkLink" download="paintomics_network_' + this.getParent("PA_Step3JobView").getModel().getJobID() + '.png" style="display:none;"></a>').attr("href", newCanvas.toDataURL('image/png'))[0].click();

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
				size = (size|| $('#reorderOptions h3[name="block"]').attr("value"));

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
				size = (size|| $('#reorderOptions h3[name="ring"]').attr("value"));
				var x=selectedNodes[0].x, y=selectedNodes[0].y;
				for(var i=0; i< selectedNodes.length; i++){
					selectedNodes[i].x = x + Math.cos(2 * i * Math.PI / selectedNodes.length) * selectedNodes.length*size; //RING LAYOUT
					selectedNodes[i].y = y + Math.sin(2 * i * Math.PI / selectedNodes.length)* selectedNodes.length*size;
				}
			}
			$('#reorderOptions h3[name="block"]').toggle(option === "block");
			$('#reorderOptions h3[name="ring"]').toggle(option === "ring");
			$("#reorderOptions").slideDown();

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
			var visualOptions = this.getParent().getVisualOptions();

			$("#pathwayNetworkWaitBox").fadeIn();

			/********************************************************/
			/* STEP 1. UPDATE THE VALUES FOR THE SLIDERS            */
			/********************************************************/
			var updateNeeded = false;
			var newValue, id;

			$("#pathwayNetworkToolsBox div.slider-ui").each(function() {
				newValue = (($(this).attr("id") !== "minPValueSlider") ? $(this).slider("value") / 100 : $(this).slider("value"));
				id = $(this).attr("id").replace("Slider", "");
				updateNeeded = updateNeeded || (visualOptions[id] !== newValue);
				visualOptions[id] = newValue;
			});

			/********************************************************/
			/* STEP 2. UPDATE THE VALUE FOR COLOR BY OPTION         */
			/********************************************************/
			newValue = $("#colorByContainer div.radio input:checked").val();
			updateNeeded = updateNeeded || (visualOptions.colorBy !== newValue);
			visualOptions.colorBy = newValue;

			visualOptions.backgroundLayout =  $("#background-layout-check").is(":checked");
			visualOptions.showNodeLabels =  $("#show-node-labels-check").is(":checked");
			//visualOptions.showEdgeLabels =  $("#show-edge-labels-check").is(":checked");


			/********************************************************/
			/* STEP 3. UPDATE THE VALUE FOR THE EDGES CLASS OPTION
			/********************************************************/
			newValue = $("#edgesClassContainer div.radio input:checked").val();
			updateNeeded = updateNeeded || (visualOptions.edgesClass !== newValue);
			visualOptions.edgesClass = newValue;

			/********************************************************/
			/* STEP 4. SAVE THE POSITION FOR NODES (IF SELECTED)    */
			/********************************************************/
			newValue = $("#save-node-positions-check").is(":checked");

			if(newValue && visualOptions.pathwaysPositions === undefined){
				/***************************************************************/
				/* STEP 4.1 IF SAVE=true AND NO PREVIOUS POSITION DATA -> SAVE */
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
				me.getParent().applyVisualSettings(me.getName());
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
				me.getController().updateStoredVisualOptions(me.getModel().getJobID(), visualOptions);

				$("#pathwayNetworkWaitBox").fadeOut();
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
			var visualOptions = this.getParent().getVisualOptions();

			/********************************************************/
			/* STEP 1. GENERATE THE COLORBY SELECTOR                */
			/********************************************************/
			var htmlContent = '<div class="radio"><input type="radio" ' + ((visualOptions.colorBy === "classification")? "checked": "") + ' id="classification-check"  name="colorByCheckbox" value="classification"><label for="classification-check">Classification</label></div>';
			var inputOmics = this.getModel().getGeneBasedInputOmics();
			for(var i in inputOmics){
				htmlContent +=
				'<div class="radio">' +
				'  <input type="radio" ' + ((visualOptions.colorBy === inputOmics[i].omicName)? "checked": "")+ ' id="' + inputOmics[i].omicName.replace(/ /g, "_").toLowerCase() + '-check" name="colorByCheckbox" value="' + inputOmics[i].omicName + '">' +
				'  <label for="' + inputOmics[i].omicName.replace(/ /g, "_").toLowerCase() + '-check">' + inputOmics[i].omicName + '</label>' +
				'</div>';
			}
			$("#colorByContainer").html(htmlContent);

			/********************************************************/
			/* STEP 2. GENERATE THE REMAINIG SELECTORS              */
			/********************************************************/
			$("#minFeaturesSlider").slider({value: visualOptions.minFeatures * 100});
			$("#minFeaturesValue").html(visualOptions.minFeatures * 100);

			$("#minSharedFeaturesSlider").slider({value: visualOptions.minSharedFeatures * 100});
			$("#minSharedFeaturesValue").html(visualOptions.minSharedFeatures * 100);

			$("#minPValueSlider").slider({value: visualOptions.minPValue});
			$("#minPValueValue").html(visualOptions.minPValue * 100);

			$("#background-layout-check").attr("checked", visualOptions.backgroundLayout===true);
			$("#show-node-labels-check").attr("checked", visualOptions.showNodeLabels===true);
			//$("#show-edge-labels-check").attr("checked", visualOptions.showEdgeLabels===true);
			$("#save-node-positions-check").attr("checked", visualOptions.pathwaysPositions!==undefined);

			/********************************************************/
			/* STEP 3. GENERATE THE NETWORK                         */
			/********************************************************/
			this.getController().step3GetPathwaysNetworkDataHandler(this);

			initializeTooltips(".helpTip");

			return this;
		};

		/**
		* This function generates the component (EXTJS) using the content of the model
		* @returns {Ext.ComponentView} The visual component
		*/
		this.initComponent = function() {
			var me = this;
			var visualOptions = this.getParent().getVisualOptions();

			this.component = Ext.widget({
				xtype: 'container',
				style: "max-width:1300px; margin: 5px 10px; ",
				items: [ {
					xtype: 'box', id: 'networkDetailsPanel', cls: "contentbox lateralOptionsPanel", html:
					//THE PANEL WITH THE CLUSTERS SUMMARY
					'<div class="lateralOptionsPanel-toolbar"><a href="javascript:void(0)" class="toolbarOption helpTip hideOption" id="hideNetworkDetailsPanelButton" title="Hide this panel"><i class="fa fa-times"></i></a></div>'+
					'<h2>Details</h2>' +
					'<div id="networkClustersContainer">' +
					'  <h4>TheName For AnOmic</h4><span class="infoTip">Click on each cluster to hide/show the nodes in the network</span>' +
					'  <h5>N Clusters founds</h5>' +
					'  <div style="text-align: center;"> </div>' +
					'</div>' +
					//THE PANEL WITH THE PATHWAY DETAILS
					'<div id="patwaysDetailsWrapper" style="display:none;">'+
					'  <a href="javascript:void(0)" id="backToClusterDetailsButton" style="margin: 5px 0px;"><i class="fa fa-long-arrow-left"></i> Back to Cluster details</a>'+
					'  <div id="patwaysDetailsContainer"></div>'+
					'</div>'
				},{
					xtype: 'box',  id : 'networkSettingsPanel', cls: "contentbox lateralOptionsPanel", html:
					//THE PANEL WITH THE VISUAL OPTIONS
					'<div class="lateralOptionsPanel-toolbar"><a href="javascript:void(0)" class="toolbarOption helpTip hideOption" id="hideNetworkSettingsPanelButton" title="Hide this panel"><i class="fa fa-times"></i></a></div>'+
					'<h2>Tools<span class="helpTip" title="Some options may affect to the table below."></h2>' +
					'<div id="pathwayNetworkToolsBox" style="overflow:hidden; padding: 2px 10px;">' +
					'  <h4>Visual settings:</h4>' +
					'  <h5>Node coloring: <span class="helpTip" style="float:right;" title="Change the way in which nodes are colored."></span></h5>' +
					'  <div id="colorByContainer"></div>' +
					'  <h5>Choose what edges represents: <span class="helpTip" style="float:right;" title="By default an edge between 2 nodes indicates that both pathways are closely related in biological terms. These relationships are inferred from the pathways maps which usually contains links to other KEGG pathways that indicates the existence of functional elements shared between pathways and processes. Alternatively, edges can be configured to represent the existence of shared genes or compounds between separated biological processes, where thickness of the edge increases with the similarity between both set of biological features (percentage of shared features on total features in both process)."></span></h5>' +
					'  <div id="edgesClassContainer">' +
					'    <div class="radio">' +
					'      <input type="radio" ' + ((visualOptions.edgesClass === "l")? "checked": "")+ ' id="edgesLinkedPathways" name="edgesClassCheckbox-check" value="l">' +
					'      <label for="edgesLinkedPathways">Linked biological processes</label>' +
					'    </div>'+
					'    <div class="radio">' +
					'      <input type="radio" ' + ((visualOptions.edgesClass === "s")? "checked": "")+ ' id="edgesSharedFeatures" name="edgesClassCheckbox-check" value="s">' +
					'      <label for="edgesSharedFeatures">Shared biological features</label>' +
					'    </div>'+
					'  </div>'+
					'  <h5>Other settings:</h5>' +
					'  <div class="checkbox"><input type="checkbox" id="show-node-labels-check" name="showNodeLabelsCheckbox">' +
					'    <label for="show-node-labels-check">Show all node labels <span class="helpTip" style="float:right;" title="Shows labels for nodes (reduces performance). By default labels are visible when zooming the network."</span></label>' +
					'  </div>'+
					// '  <div class="checkbox"><input type="checkbox" id="show-edge-labels-check" name="showEdgeLabelsCheckbox">' +
					// '    <label for="show-edge-labels-check">Show all edge labels <span class="helpTip" style="float:right;" title="Shows labels for edges (reduces performance). Edge labels indicate the percentage of shared features (genes + metabolites) shared between 2 pathways."</span></label>' +
					// '  </div>'+
					'  <h4>Network layout settings</h4>' +
					'  <div class="checkbox"><input type="checkbox" id="save-node-positions-check" name="saveNodePositionsCheckbox">' +
					'    <label for="save-node-positions-check">Save the nodes positions<span class="helpTip" style="float:right;" title="Use this option if you want to save the position for nodes in the network (increases performance)."></span><span class="commentTip" style="padding-left:21px;">Disable the auto-layout for network.</span></label>' +
					'  </div>'+
					'  <div class="checkbox"><input type="checkbox" id="background-layout-check" name="backgroundLayoutCheckbox">' +
					'    <label for="background-layout-check">Calculate layout on background <span class="helpTip" style="float:right;" title="Run the layout on background, apply the new nodes position on stop (increases performance)."></span><span class="commentTip" style="padding-left:21px;">Increases performance.</span></label>' +
					'  </div>'+
					"  <h4>Node filtering options</h4>" +
					'  <h5>Min features in pathway (<span id="minFeaturesValue">50</span>%)<span class="helpTip" style="float:right;" title="Min % of features (genes + compounds) of a pathway found at the input. Pathways with lower values will be excluded from the network. E.g. Using min=50%, if we find 80 features from the input data, at a Pathway that contains 200 features, the pathway will be excluded (80 < 100)."></span></h5>' +
					'  <div class="slider-ui" style="margin:10px;" id="minFeaturesSlider"></div>' +
					'  <h5>Min shared features (<span id="minSharedFeaturesValue">10</span>%)<span class="helpTip" style="float:right;" title="Min. % of features shared between 2 pathways (using the smaller pathway as reference). Edges showing a smaller relationship will be excluded.<br>E.g. Taking min=10%, Pathway A (60 features) and B (90 features), if shared features=5 the edge will be ignored (5 < Min(60,90) * 0.1)"></span></h5>' +
					'  <div class="slider-ui" style="margin:10px;" id="minSharedFeaturesSlider"></div>' +
					'  <h5>Min p-value for the pathway (<span id="minPValue">0.05</span>)<span class="helpTip" style="float:right;" title="Pathways with lower p-value (more significant) will be represented with bigger nodes. Pathways with higher p-value (less significant), will be shown as small nodes."</span></h5>' +
					'  <div class="slider-ui" style="margin:10px;" id="minPValueSlider"></div>' +
					'  <a href="javascript:void(0)" class="button btn-success btn-right helpTip" id="applyNetworkSettingsButton" style="margin-top: 20px;" title="Apply changes"><i class="fa fa-check"></i> Apply</a>' +
					'</div>'
				},{
					xtype: 'box', cls: "contentbox", style: 'overflow: hidden; margin:0;', html:
					//THE PANEL WITH THE NETWORK
					'<div class="lateralOptionsPanel-toolbar">'+
					'  <a href="javascript:void(0)" class="toolbarOption downloadTool helpTip" id="downloadNetworkTool" title="Download the network" style="margin-top: 10px;"><i class="fa fa-download"></i> Download</a>' +
					'</div>'+
					'<h2>Pathways network <span class="helpTip" title="This Network represents the relationships between matched pathways."></h2>' +
					'<div id="step3-network-toolbar">' +
					' <div class="lateralOptionsPanel" id="reorderOptions" style="display:none;">' +
					'  <div class="lateralOptionsPanel-toolbar">' +
					'    <a href="javascript:void(0)" class="toolbarOption helpTip hideOption" title="Hide this panel"><i class="fa fa-times"></i></a>' +
					'  </div>' +
					'  <h3 name="block" value="10">Nodes per row:</h3>' +
					'  <h3 name="ring" style="display: none;" value="2">Ring size:</h3>' +
					'  <span>' +
					'    <i class="fa fa-minus-square fa-2x" name="less" style="margin-right: 22px;padding-top: 5px; color: #DA643D;"></i>' +
					'    <i class="fa fa-plus-square fa-2x"  name="more" style="color: #DA643D;"></i>' +
					'  </span>' +
					' </div>' +
					'  <a href="javascript:void(0)" class="toolbarOption helpTip" id="showNetworkSettingsPanelButton" ><i class="fa fa-cog"></i> Configure</a>' +
					'  <div class="menu">'+
					'    <a href="javascript:void(0)" class="toolbarOption menuOption helpTip"><i class="fa fa-mouse-pointer"></i> Node selection</a>' +
					'    <div class="menuBody">' +
					'      <a href="javascript:void(0)" class="toolbarOption helpTip submenuOption selectNodesOption" name="category" title="Select all nodes based on the categories/clusters for current selection"><i class="fa fa-object-ungroup"></i> Category-based selection</a>' +
					'      <a href="javascript:void(0)" class="toolbarOption helpTip submenuOption selectNodesOption" name="free" title="Select nodes at a hand-drawn region"><i class="fa fa-cut"></i> Free select tool</a>' +
					'      <a href="javascript:void(0)" class="toolbarOption helpTip submenuOption selectNodesOption" name="adjacent" title="Select adjacent nodes for selected nodes"><i class="fa fa-share-alt"></i> Select adjacent nodes</a>' +
					'      <a href="javascript:void(0)" class="toolbarOption helpTip submenuOption selectNodesOption" name="all" title="Select all nodes in the network"><i class="fa fa-object-group"></i> Select all nodes</a>' +
					'    </div>'+
					'  </div>' +
					'  <div class="menu">'+
					'    <a href="javascript:void(0)" class="toolbarOption menuOption helpTip"><i class="fa fa-mouse-pointer"></i> Reorder selected nodes</a>' +
					'    <div class="menuBody">' +
					'      <a href="javascript:void(0)" class="toolbarOption helpTip submenuOption reorderNodesOption" name="block" title="Organize selected nodes in to a block"><i class="fa fa-th"></i> Display as block</a>' +
					'      <a href="javascript:void(0)" class="toolbarOption helpTip submenuOption reorderNodesOption" name="ring" title="Organize selected nodes into a ring"><i class="fa fa-spinner"></i> Display as ring</a>' +
					'      <a href="javascript:void(0)" class="toolbarOption helpTip submenuOption reorderNodesOption" name="random" title="Set random positions for selected nodes"><i class="fa fa-random"></i> Randomize positions</a>' +
					'    </div>'+
					'  </div>' +
					'  <a href="javascript:void(0)" class="toolbarOption helpTip" id="fullscreenSettingsPanelButton" ><i class="fa fa-arrows-alt"></i> Full screen</a>' +
					'  <a href="javascript:void(0)" class="toolbarOption helpTip resumeLayout" id="resumeLayoutButton" style="float:right"><i class="fa fa-play"></i> Resume layout</a>' +
					'  <a href="javascript:void(0)" class="toolbarOption resumeLayout helpTip" id="saveNodePositionsButton"  style="float:right"><i class="fa fa-floppy-o"></i> Save Node Positions</a>' +
					'  <p id="step3-network-toolbar-message"></p>'+
					'</div>' +
					'<div id="pathwayNetworkBox" style="position: relative;overflow:hidden; height:595px; width: 100%;"><div id="pathwayNetworkWaitBox"><i class="fa fa-cog fa-spin"></i> Building network...</div></div>'
				}],
				listeners: {
					boxready: function() {
						//SOME EVENT HANDLERS
						$("#minFeaturesSlider").slider({
							value: 0,min: 0,max: 100,step: 5,
							slide: function(event, ui) {
								$("#minFeaturesValue").html(ui.value);
							}
						});
						$("#minSharedFeaturesSlider").slider({
							value: 0,min: 0,max: 100,step: 5,
							slide: function(event, ui) {
								$("#minSharedFeaturesValue").html(ui.value);
							}
						});
						$("#minPValueSlider").slider({
							value: 0,min: 0.005,max: 0.05,step: 0.005,
							slide: function(event, ui) {
								$("#minPValueSlider").html(ui.value);
							}
						});
						$("#applyNetworkSettingsButton").click(function() {
							me.applyVisualSettings();
						});

						//HANDLERS FOR BUTTONS IN THE NETWORK TOOLBAR
						$("#downloadNetworkTool").click(function() {
							me.stopNetworkLayout();
							me.downloadNetwork("png");
						});
						$("#step3-network-toolbar .selectNodesOption").click(function() {
							me.stopNetworkLayout();
							me.selectNodes($(this).attr("name"));
						});
						$("#step3-network-toolbar .reorderNodesOption").click(function() {
							me.stopNetworkLayout();
							me.reorderNodes($(this).attr("name"));
						});
						$("#resumeLayoutButton").click(function() {
							if ($(this).hasClass("resumeLayout")) {
								var visualOptions = me.getParent().getVisualOptions();
								if(visualOptions.pathwaysPositions !== undefined){
									Ext.MessageBox.confirm('Confirm', 'This option will invalidate current node positions,</br> Are you sure you want resume layout?', function(option){
										if(option==="yes"){
											$("#save-node-positions-check").attr("checked", false);
											$("#save-node-positions-check").prop("checked", false);

											$("#applyNetworkSettingsButton").click();
										}
									});
								}else{
									me.startNetworkLayout();
								}
							} else {
								me.stopNetworkLayout();
							}
						});
						$("#saveNodePositionsButton").click(function() {
							$("#save-node-positions-check").prop("checked", true);
							me.stopNetworkLayout();
							me.updateNodePositions(true);
							$("#step3-network-toolbar-message").addClass("successMessage").html("<i class='fa fa-check'></i> Saved").fadeIn(100, function(){
								setTimeout(function(){
									$("#step3-network-toolbar-message").fadeOut(100);
								}, 1500);
							});
						});
						$("#fullscreenSettingsPanelButton").click(function() {
							me.fullScreenNetwork();
						});
						$("#step3-network-toolbar-message").hover(function(){
							$(this).fadeOut(100);
						});
						$("#step3-network-toolbar .menuOption").click(function() {
							var isVisible = $(this).siblings(".menuBody").first().is(":visible");
							$("#step3-network-toolbar .menuBody").hide();
							$(this).siblings(".menuBody").first().toggle(!isVisible);
						});
						$("#step3-network-toolbar .submenuOption").click(function() {
							$(this).parent(".menuBody").first().toggle();
						});
						$("#showNetworkSettingsPanelButton").click(function() {
							$("#networkSettingsPanel").show();
						});
						$("#reorderOptions span i").click(function() {
							var option = $('#reorderOptions h3:visible');
							var value = Math.max(Number.parseInt(option.attr("value")) + ($(this).attr("name")==="less"?-1:1), 1);
							option.attr("value", value);
							me.reorderNodes(option.attr("name"), value);
						});

						$(".hideOption").click(function() {
							$(this).parents(".lateralOptionsPanel").first().hide();
							me.network.refresh();
						});

						$("#backToClusterDetailsButton").click(function() {
							me.hidePathwayDetails();
						});

						//Add a resizer to network panel
						Ext.create('Ext.resizer.Resizer', {
							target: this,
							handles: 's',
							pinned:true,
							maxWidth:1300,
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
					var renderedValue;
					for (var i in significanceValues) {
						renderedValue = (significanceValues[i][2] > 0.001 || significanceValues[i][2] === 0) ? parseFloat(significanceValues[i][2]).toFixed(6) : parseFloat(significanceValues[i][2]).toExponential(4);
						htmlCode += '<tr><td>' + i + '</td><td>' + significanceValues[i][0] + ' (' + significanceValues[i][1] + ')</td><td>' + renderedValue + '</td></tr>';
					}
					htmlCode+='</tbody>';
					$(componentID + " .pathwaySummaryTable").html('<table style="padding: 10px;text-align: center;">'+ htmlCode + '</table>');
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
						pathwayPlotwrappers.html('<div class="step3ChartWrapper" style="background-image: url(\'' + location.pathname + "kegg_data/" +  this.getModel().getID() + '_thumb\')"></div>');
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
						combinedSignificancePvalue: pathwayModel.getCombinedSignificanceValues(),
						mainCategory: pathwayModel.getClassification().split(";")[0],
						secCategory: pathwayModel.getClassification().split(";")[1],
						visible: pathwayModel.isVisible()
					};

					significanceValues = pathwayModel.getSignificanceValues();
					for (var j in significanceValues) {
						omicName = "-" + j.toLowerCase().replace(/ /g, "-");
						pathwayData['totalMatched' + omicName] = significanceValues[j][0];
						pathwayData['totalRelevantMatched' + omicName] = significanceValues[j][1];
						pathwayData['pValue' + omicName] = significanceValues[j][2];
					}
					this.tableData.push(pathwayData);

					significativePathways += (pathwayModel.getCombinedSignificanceValues() <= 0.05) ? 1 : 0;
				}
			};

			/*********************************************************************
			* OTHER FUNCTIONS
			***********************************************************************/
			//TODO: DOCUMENTAR
			this.updateObserver = function() {
				var me = this;

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
					}, {
						text: 'Pathway name', dataIndex: 'title', filterable: true, flex: 1,
					}, {
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
					combinedSignificancePvalue: {name: "combinedSignificancePvalue", defaultValue: ''},
					mainCategory: {name: "mainCategory",defaultValue: ''},
					secCategory: {name: "secCategory",defaultValue: ''},
					visible: {name: "visible", defaultValue: true}
				};

				//CALL THE PREVIOUS FUNCTION ADDING THE INFORMATION FOR GENE BASED OMIC AND COMPOUND BASED OMICS
				var secondaryColumns = [];
				var hidden = (Object.keys(this.model.getGeneBasedInputOmics()).length  + Object.keys(this.model.getCompoundBasedInputOmics()).length  > 5 || $("#mainViewCenterPanel").hasClass("mobileMode"))  ;

				this.generateColumns(this.model.getGeneBasedInputOmics(), secondaryColumns, rowModel, hidden);
				this.generateColumns(this.model.getCompoundBasedInputOmics(), secondaryColumns, rowModel, hidden);

				//ADD AN ADDITIONAL COLUMN WITH THE COMBINED pValue IF #OMIC > 1
				if (secondaryColumns.length > 1) {
					secondaryColumns.push({
						text: 'Combined </br>pValue', cls:"header-45deg",
						dataIndex: 'combinedSignificancePvalue',
						sortable: true,filter: {type: 'numeric'}, align: "center",
						minWidth: 100, flex:1, height:75,
						renderer: function(value, metadata, record) {
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
						}
					});
				}
				//GROUP ALL COLUMNS INTO A NEW COLUMN 'Significance tests'
				columns.push({text: 'Significance tests',columns: secondaryColumns});

				columns.push({
					xtype: 'customactioncolumn',
					text: "External links", width: 150,
					items: [{
						icon: "fa-external-link",
						text: "KEGG",
						tooltip: 'Find pathway in KEGG Database',
						handler: function(grid, rowIndex, colIndex) {
							var term = grid.getStore().getAt(rowIndex).get('pathwayID');
							window.open("http://www.genome.jp/dbget-bin/www_bget?pathway+" + term, '_blank');
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
						property: ((secondaryColumns.length > 1) ? 'combinedSignificancePvalue' : secondaryColumns[0].dataIndex),
						direction: 'ASC'
					}]
				});

				var gridPanel = this.getComponent().queryById("pathwaysGridPanel");
				gridPanel.reconfigure(tableStore, columns);
				this.updateVisiblePathways();
			};

			//TODO: DOCUMENTAR
			this.updateVisiblePathways = function(){
				var store = this.getComponent().queryById("pathwaysGridPanel").getStore();
				var indexedPathways = this.getParent().getIndexedPathways();
				var filterBy = function(elem){
					return indexedPathways[elem.get("pathwayID")].isVisible();
				};
				store.filterBy(filterBy);
			};

			/**
			* This function generates a new column for the table (pValue column) for a given OMIC, and add the corresponding data to the row model.
			* @chainable
			* @param {Object} omics, list of omics for the current JOBINSTANCE
			* @param {Array} columns, list of Objects defining the columns content
			* @param {Object} rowModel, Object containing a description for the row model for the table
			* @return {PA_Step3PathwayTableView}
			*/
			this.generateColumns = function(omics, columns, rowModel, hidden) {
				//FOR EACH OMIC -> ADD COLUM FOR p-value AND CREATE THE HOVER PANEL WITH SUMMARY
				var omicName;
				var me = this;

				//TODO: REMOVE THIS SPAGETTI CODE :/
				var renderFunction = function(value, metadata, record) {
					var myToolTipText = "<b style='display:block; width:200px'>" + metadata.column.text.replace(/<\/br>/g, " ") + "</b>";
					metadata.style = "height: 33px; font-size:10px;"

					//IF THERE IS NOT DATA FOR THIS PATHWAY, FOR THIS OMIC, PRINT A '-'
					if (value === "-") {
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
						defaultValue: "-"
					};
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
						{xtype: 'box', flex: 1, html: '<h2>Matched Pathways</h2>'},
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
							columns: [{text: 'name', flex: 1, dataIndex: 'name'}]
						}]
					}
				);
				return this.component;
			};

			return this;
		}
		PA_Step3PathwayTableView.prototype = new View();

		/**
		* This function returns the MIN/MAX values that will be used as references
		* for painting (i.e. min and max colors).
		*
		* @param {type} dataDistributionSummaries
		* @param {type} option [absoluteMinMax, riMinMax, localMinMax, p10p90]
		* @returns {Array}
		*/
		var getMinMax = function(dataDistributionSummaries, option) {
			//   0        1       2    3    4    5     6,   7   8      9        10
			//[MAPPED, UNMAPPED, MIN, P10, Q1, MEDIAN, Q3, P90, MAX, MIN_IR, Max_IR]
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
