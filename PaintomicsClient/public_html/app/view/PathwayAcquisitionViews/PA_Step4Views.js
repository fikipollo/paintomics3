//# sourceURL=PA_Step4Views.js
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
* - PA_Step4JobView
* - PA_Step4PathwayView
* - PA_Step4KeggDiagramView
* - PA_Step4KeggDiagramFeatureSetView
* - PA_Step4KeggDiagramFeatureSetTooltip
* - PA_Step4KeggDiagramFeatureView
* - PA_Step4KeggDiagramFeatureSetSVGBox
* - PA_Step4VisualOptionsView
* - PA_Step4FindFeaturesView
* - PA_Step4GlobalHeatmapView
* - PA_Step4DetailsView
* - PA_Step4DetailsFeatureSetView
* - PA_Step4DetailsOmicValueView
*
*/

function PA_Step4JobView() {
	/**
	* About this view: This view (PA_Step4JobView) shows the content for a Job in STEP 4 (Pathway Exploration)
	* The view contains multiple PA_Step4PathwayView, which are added when the user explores the pathways.
	* Those views are stored into a cache memory (max MAX_PATHWAYS_OPENED) so users can switch quickly between pathways.
	* Finally, the variable currentView indicates which is the currently opened pathway.
	* The view shows different information for the Job instance, in particular:
	*  - A secodary toolbar showing different options for the pathways
	*  - A panel (PA_Step4PathwayView) containing 3 subpanes that represents the current pathway
	*     · The interactive KEGG diagram (PA_Step4KeggDiagramView)
	*     · The secondary panel containing heatmaps or pathway details (PA_Step4GlobalHeatmapView or PA_Step4DetailsView)
	*     · The auxiliary panel containing tools for searching or customizing the view (PA_Step4FindFeaturesView or PA_Step4VisualOptionsView)
	**/
	/*********************************************************************
	* ATTRIBUTES
	***********************************************************************/
	this.name = "PA_Step4JobView";
	this.items = [];
	this.pathwayViews = []; //QUEUE MAX 5 LAST PATHWAYS [MAX_PATHWAYS_OPENED]
	this.currentView = null;
	this.speciesInfo = null;

	/*********************************************************************
	* GETTERS AND SETTERS
	***********************************************************************/

	/*********************************************************************
	* OTHER FUNCTIONS
	***********************************************************************/
	// /**
	// * This function download the corresponding information for selected pathway
	// * @chainable
	// * @param  {String} format the desired format for downloading (png, svg,...)
	// * @return {PA_Step4JobView}
	// */
	// this.downloadPathway = function(format) {
	// 	if (this.currentView !== null) {
	// 		this.currentView.controller.downloadPathwayHandler(this.currentView, this.getModel().getJobID(), format);
	// 	}
	// 	return this;
	// };
	
	/**
	* This function retrieves species data from the server and saves the info in the controller to avoid
	* asking the same more than once per session.
	*/
	this.downloadSpeciesInfo = function(callback) {
		var me = this;
		
		if (this.speciesInfo == null) {
			$.getJSON(SERVER_URL_GET_AVAILABLE_SPECIES, function(data) {
				me.speciesInfo = data;
				callback(data);
			});
			
		} else {
			callback(this.speciesInfo);
		}
	}

	/**
	* This function handles the event fired when the user clicks on the "view" button
	* for a pathway thumb panel. If the pathway was no already opened, a new panel is
	* created and added to the tab panel
	* @param    {String}    pathwayID
	* @returns  {PA_Step4PathwayView} the pathway view
	*/
	this.showPathwayView = function(pathwayID) {
		var pathwaysPanelsContainer = this.getComponent().queryById("pathwaysPanelsContainer");
		if (this.currentView !== null) {
			pathwaysPanelsContainer.remove(this.currentView.getComponent(), false);  //remove from panel but do not destroy the component.
		}
		this.currentView = (this.getPathwayView(pathwayID) || this.addPathwayView(pathwayID));
		pathwaysPanelsContainer.add(this.currentView.getComponent());
		return this.currentView;
	};

	/**
	* This function finds a pathway by a given pathwayID at the cache of pathways views.
	* @param    {String} pathwayID
	* @returns  {PA_Step4PathwayView} the pathway view
	**/
	this.getPathwayView = function(pathwayID) {
		for (var i in this.pathwayViews) {
			if (this.pathwayViews[i].getModel().getID() === pathwayID) {
				return this.pathwayViews[i];
			}
		}
		return null;
	};

	/**
	* This function creates and add a new pathwayView by a given pathwayID.
	* @param    {String} pathwayID
	* @returns  {PA_Step4PathwayView} the new pathway view
	**/
	this.addPathwayView = function(pathwayID) {
		var me = this;

		/********************************************************/
		/* STEP 1: Shows the pathway instance                   */
		/********************************************************/
		var pathwayModel = this.getModel().getPathway(pathwayID);
		var pathwayView = new PA_Step4PathwayView();
		pathwayView.setParent(this);
		pathwayView.setController(application.getController("PathwayController"));
		pathwayView.loadModel(pathwayModel);

		/********************************************************/
		/* STEP 2: Update the cache for visited pathways        */
		/********************************************************/
		this.pathwayViews.push(pathwayView);
		if (this.pathwayViews.length > MAX_PATHWAYS_OPENED) {
			console.info("Removing a pathway");
			var previous_view = this.pathwayViews.shift();
			previous_view.getComponent().destroy();
		}

		/********************************************************/
		/* STEP 3: Update the History panel content             */
		/********************************************************/
		$("#pathwayHistoryContainer > div").prepend(this.createThumbnail(pathwayID, pathwayView.getModel().getName(), pathwayView.getModel().getSource()))
		.children("#" + pathwayID.replace(' ', '__') + '_thumb').click(function() {
			$(this).prependTo($("#pathwayHistoryContainer > div"));
			me.showPathwayView($(this).attr("id").replace("_thumb", "").replace('__', ' '));
			me.toogleHistoryPanel(true);
		});

		if ($("#pathwayHistoryContainer .step4ThumbContainer").length > 8) {
			$('#pathwayHistoryContainer .step4ThumbContainer:gt(7)').remove();
		}

		return pathwayView;
	};

	/**
	* This function returns the HTML code for the thumbnail for a given pathway.
	* This is necessary to create the Pathway thumbnails at the History panel.
	* @param    {String} pathwayID
	* @param    {String} pathwayName
	* @returns  {String} HTML code for the thumbnail
	**/
	this.createThumbnail = function(pathwayID, pathwayName, pathwaySource) {
		thumbnail_suffix = (pathwaySource == 'undefined' || pathwaySource == 'KEGG') ? '_thumb' : '_' + pathwaySource + '_thumb'

		return '<div class="step4ThumbContainer" id="' + pathwayID.replace(' ', '__') + '_thumb">' +
		'    <div class="step4PathwayThumbnailHover">Open</div>' +
		'    <div class="step4ThumbTitleContainer">' + pathwayName + '</div>' +
		'    <div class="step4ThumbWrapper" style="background-image: url(\'' + location.pathname + "kegg_data/" + pathwayID + thumbnail_suffix + '\')"></div>' +
		'   </div>';
	};

	/**
	* This function shows//hide the History panel (last visited pathways)
	* @chainable
	* @param  {boolean} forceHide force or not the visibility of the panel
	* @return {PA_Step4JobView}
	*/
	this.toogleHistoryPanel = function(forceHide) {
		forceHide = (forceHide || false);
		var currentLeft = $("#pathwayHistoryContainer").css("left");
		$("#pathwayHistoryContainer").css({
			"left": ((currentLeft === "0px" || forceHide) ? "-405px" : "0px")
		});
		return this;
	};

	/**
	* This function controls the event when clicking the Back button.
	* @chainable
	* @return {PA_Step4JobView}
	*/
	this.backButtonHandler = function() {
		//HIDE THE HISTORY PANEL
		this.toogleHistoryPanel(true);
		this.controller.showJobInstance(this.getModel(), {doUpdate: false});
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
			id: "pathwaysPanelsWrapper",
			flex:1,
			layout: {type: 'vbox',pack: 'start', align: 'stretch'},
			items: [{ //THE SECONDARY TOOLBAR
				xtype: "container", cls: "toolbar secondTopToolbar",
				items: [{
					xtype: "box", html:
					'<a href="javascript:void(0)" class="button btn-danger helpTip" id="visualSettingsButton"><i class="fa fa-wrench"></i> Settings</a>' +
					'<a href="javascript:void(0)" class="button btn-info helpTip" id="searchButton"><i class="fa fa-search"></i> Search</a>' +
					'<a href="javascript:void(0)" class="button btn-secondary helpTip" id="globalHeatmapButton"><i class="fa fa-th"></i> Show Heatmap</a>' +
					'<a href="javascript:void(0)" class="button btn-primary helpTip" id="showPathwayButton"><i class="fa fa-sitemap"></i>  Show Pathway</a></div>' +
					'<a href="javascript:void(0)" class="button btn-default backButton"><i class="fa fa-arrow-left"></i> Go back</a>' +
					'<a href="javascript:void(0)" class="button helpTip" style=" float: left; background-color: #D66379; color: #fff;" id="showHistoryButton"><i class="fa fa-history"></i> History</a>' +
					'<div id="pathwayHistoryContainer" class="step4HistoryBox"><h2>History</h2><div></div></div>'
				}]
			}, { //THE CONTAINER FOR THE PATHWAY VIEWS
				xtype: "container", flex:1,
				style: "padding: 5px 10px;",
				itemId: "pathwaysPanelsContainer",
				layout: 'fit',
				items: []
			}],
			listeners: {
				boxready: function() {
					//SOME EVENT HANDLERS DECLARATION
					$(".backButton").click(function() {
						me.backButtonHandler();
					});

					$("#showPathwayButton").click(function() {
						me.currentView.showDiagramPanel();
					});

					$("#globalHeatmapButton").click(function() {
						me.currentView.showGlobalHeatmap();
					});

					// $("#downloadButton").click(function() {
					// 	me.downloadPathway("png");
					// });

					$("#searchButton").click(function() {
						me.currentView.showFindFeaturesPanel();
					});

					$("#visualSettingsButton").click(function() {
						me.currentView.showVisualOptionsPanel();
					});

					$("#showHistoryButton").click(function() {
						me.toogleHistoryPanel();
					});

					initializeTooltips(".helpTip");
				},
				beforedestroy: function() {
					//DESTROY ALL PA_Step4PathwayView AND SUBCOMPONENTS
					for (var i in this.pathwayViews) {
						this.pathwayViews[i].getComponent().destroy();
						delete this.pathwayViews[i];
					}
					me.getModel().deleteObserver(me);
				}
			}
		});

		return this.component;
	};

	return this;
}
PA_Step4JobView.prototype = new View();


function PA_Step4PathwayView() {
	/**
	* About this view: this view (PA_Step4PathwayView) represents a Pathway instance.
	* For each view, we store the omic data values, the list of features based on genes,
	* the list of features based on compounds and the information about data distribution (min, max, q10,...)
	* Other variables are:
	*  - visualOptions: contains the visual options defined by the user for current view.
	*  - searchFeatureIndex: this dict contains the index of features in the pathway for a quick search
	* Variables for visual subcomponents:
	*  - diagramPanel: this panel contains the KEGG diagram (PA_Step4KeggDiagramView)
	*  - globalHeatmapView: this panel contains the Heatmaps diagrams (PA_Step4GlobalHeatmapView)
	*  - featureSetDetailsPanel: this panel contains the detailed views for feature sets (PA_Step4DetailsView)
	*  - findFeaturesPanel: this panel contains the tools for search features (PA_Step4VisualOptionsView)
	*  - visualOptionsPanel: this panel contains the tools for search features (PA_Step4VisualOptionsView)
	**/
	/*********************************************************************
	* ATTRIBUTES
	***********************************************************************/
	this.name = "PA_Step4PathwayView";

	this.visualOptions = null;
	this.dataDistributionSummaries = null;

	this.searchFeatureIndex = null;

	//Variables for visual subcomponents:
	this.diagramPanel = null;
	this.globalHeatmapView = null;
	this.featureSetDetailsPanel = null;
	this.findFeaturesPanel = null;
	this.visualOptionsPanel = null;

	/***********************************************************************
	* GETTERS AND SETTERS
	***********************************************************************/
	/**
	* Load the pathway information
	*  STEP 1: SET THE MODEL
	*  STEP 2. LOAD VISUAL OPTIONS IF ANY
	*  STEP 3 CREATE THE SUBVIEWS
	* @chainable
	* @param {Pathway} model
	* @returns {PA_Step4PathwayView}
	*/
	this.loadModel = function(model) {
		/********************************************************/
		/* STEP 1: SET THE MODEL		                        */
		/********************************************************/
		if (this.model != null) {
			this.model.deleteObserver(this);
		}
		this.model = model;
		this.model.addObserver(this);
		/********************************************************/
		/* STEP 2. LOAD VISUAL OPTIONS IF ANY                   */
		/********************************************************/
		if (window.sessionStorage && sessionStorage.getItem("visualOptions") !== null) {
			this.visualOptions = JSON.parse(sessionStorage.getItem("visualOptions"));
		}else{
			this.visualOptions = {};
		}

		var update=false;
		var me = this;
		if(!this.visualOptions.colorReferences){
			/* Initialize new set of color references using the default colour */
			this.visualOptions.colorReferences = {};
			var defaultColorReference = this.model.getGraphicalOptions().getColorReferences();

			$.each(me.getGeneBasedInputOmics().concat(me.getCompoundBasedInputOmics()), function(index, value) {
				me.visualOptions.colorReferences[value.omicName] = defaultColorReference;
				update=true;
			});
		}
		if(this.visualOptions.customValues) {
			/* If there are custom values set, update the data distribution summaries */
			$.each(me.visualOptions.customValues, function(omicName, omicCustomValues) {
					var omicDataDistribution = me.getDataDistributionSummaries(omicName);

					omicDataDistribution.splice(11, 2, ...omicCustomValues);

					/* TODO: remove this as the reference is the same? */
					me.setDataDistributionSummaries(omicDataDistribution, omicName);
			});
		}
		if(!this.visualOptions.visibleOmics){
			this.visualOptions.visibleOmics = this.model.getGraphicalOptions().getVisibleOmics();
			update=true;
		}
		if(!this.visualOptions.colorScale){
			this.visualOptions.colorScale = this.model.getGraphicalOptions().getColorScale();
			update=true;
		}
		if(update){
			this.getParent().getController().updateStoredVisualOptions(this.getParent().getModel().getJobID(), this.visualOptions);
		}
		/************************************************************/
		/* STEP 3 CREATE THE SUBVIEWS                               */
		/************************************************************/
		this.showDiagramPanel();
		this.showFindFeaturesPanel();

		return this;
	};

	//TODO: DOCUMENTAR
	this.getDataDistributionSummaries = function(propertyName) {
		if (this.dataDistributionSummaries === null) {
			this.dataDistributionSummaries = this.getParent().getModel().getDataDistributionSummaries();
		}

		if (this.dataDistributionSummaries !== null && propertyName !== undefined) {
			return this.dataDistributionSummaries[propertyName];
		}

		return this.dataDistributionSummaries;
	};

	this.setDataDistributionSummaries = (function(dataDistributionSummaries, omicName) {
		this.getParent().getModel().setDataDistributionSummaries(dataDistributionSummaries, omicName);

		this.dataDistributionSummaries[omicName] = dataDistributionSummaries;
	}).bind(this);

	//TODO: DOCUMENTAR
	this.getVisualOptions = function(propertyName) {
		if (this.visualOptions !== null && propertyName !== undefined) {
			return this.visualOptions[propertyName];
		}
		return this.visualOptions;
	};

	this.setVisualOptions = function(propertyName, value) {
		this.visualOptions[propertyName] = value;
	};

	this.getOmicsValues = function() {
		return this.getParent().getModel().getOmicsValues();
	};
	this.getGeneBasedInputOmics = function() {
		return this.getParent().getModel().getGeneBasedInputOmics();
	};
	this.getCompoundBasedInputOmics = function() {
		return this.getParent().getModel().getCompoundBasedInputOmics();
	};

	/*********************************************************************
	* OTHER FUNCTIONS
	***********************************************************************/
	//TODO: DOCUMENTAR
	this.showDiagramPanel = function() {
		if (this.diagramPanel === null) {
			this.diagramPanel = new PA_Step4KeggDiagramView();
			this.diagramPanel.setParent(this);
			this.searchFeatureIndex = this.diagramPanel.loadModel(this.getModel());
			this.getComponent().add(this.diagramPanel.getComponent());
		}

		this.diagramPanel.toggle(true);
	};

	//TODO: DOCUMENTAR
	this.hideDiagramPanel = function(destroy) {
		if (this.diagramPanel !== null) {
			this.diagramPanel.toggle(false);

			if (destroy === true) {
				this.diagramPanel.getComponent().destroy();
				this.diagramPanel = null;
			}
		}
	};

	//TODO: DOCUMENTAR
	this.showFindFeaturesPanel = function() {
		this.hideVisualOptionsPanel();

		if (this.findFeaturesPanel === null) {
			this.findFeaturesPanel = new PA_Step4FindFeaturesView();
			this.findFeaturesPanel.setParent(this);
			this.findFeaturesPanel.loadModel(this.getModel());
			this.getComponent().add(this.findFeaturesPanel.getComponent());
		}
		this.findFeaturesPanel.toggle(true);

		this.adjustChildrenWidth();
	};

	//TODO: DOCUMENTAR
	this.hideFindFeaturesPanel = function(destroy) {
		if (this.findFeaturesPanel !== null) {
			this.findFeaturesPanel.toggle(false);

			if (destroy === true) {
				this.findFeaturesPanel.getComponent().destroy();
				this.findFeaturesPanel = null;
			}
		}
	};

	//TODO: DOCUMENTAR
	this.showVisualOptionsPanel = function() {
		this.hideFindFeaturesPanel();

		if (this.visualOptionsPanel === null) {
			this.visualOptionsPanel = new PA_Step4VisualOptionsView();
			this.visualOptionsPanel.setParent(this);
			this.visualOptionsPanel.loadModel(this.getModel());
			this.getComponent().add(this.visualOptionsPanel.getComponent());
		}
		this.visualOptionsPanel.toggle(true);
		this.adjustChildrenWidth();
	};

	//TODO: DOCUMENTAR
	this.hideVisualOptionsPanel = function(destroy) {
		if (this.visualOptionsPanel !== null) {
			this.visualOptionsPanel.toggle(false);

			if (destroy === true) {
				this.visualOptionsPanel.getComponent().destroy();
				this.visualOptionsPanel = null;
			}
		}
	};

	//TODO: DOCUMENTAR
	this.showGlobalHeatmap = function() {
		this.hideFeatureSetDetails();

		if (this.globalHeatmapView === null) {
			this.globalHeatmapView = new PA_Step4GlobalHeatmapView();
			this.globalHeatmapView.setParent(this);
			this.globalHeatmapView.loadModel(this.getModel());
			this.getComponent().insert(1, this.globalHeatmapView.getComponent());
		}
		this.globalHeatmapView.toggle(true);
	};

	//TODO: DOCUMENTAR
	this.hideGlobalHeatmapPanel = function(destroy) {
		if (this.globalHeatmapView !== null) {
			this.globalHeatmapView.toggle(false);

			if (destroy === true) {
				this.globalHeatmapView.getComponent().destroy();
				this.globalHeatmapView = null;
			}
		}
	};

	//TODO: DOCUMENTAR
	this.showFeatureSetDetails = function(targetID, targetModel) {
		this.hideGlobalHeatmapPanel();

		var addComponent = false;
		if (this.featureSetDetailsPanel === null) {
			this.featureSetDetailsPanel = new PA_Step4DetailsView();
			this.featureSetDetailsPanel.setParent(this);
			addComponent = true;
		}

		if (this.featureSetDetailsPanel.getTargetID() !== targetID) {
			this.featureSetDetailsPanel.loadModel(targetModel, this.dataDistributionSummaries, this.visualOptions);
		}

		if (addComponent) {
			this.getComponent().insert(1, this.featureSetDetailsPanel.getComponent());
		} else {
			this.featureSetDetailsPanel.toggle(true);
		}

		this.featureSetDetailsPanel.updateObserver();
	};

	//TODO: DOCUMENTAR
	this.hideFeatureSetDetails = function(destroy) {
		if (this.featureSetDetailsPanel !== null) {
			this.featureSetDetailsPanel.toggle(false);

			if (destroy === true) {
				this.featureSetDetailsPanel.getComponent().destroy();
				this.featureSetDetailsPanel = null;
			}
		}
	};

	//TODO: DOCUMENTAR
	this.setHeight = function(height) {
		// this.getComponent().setHeight(height);
		//TODO: ajustar el contenido de los lateralOptionsPanel
	};

	//TODO: DOCUMENTAR
	this.adjustChildrenWidth = function() {
		var savedSpace = 450; //min width for pathway view
		var parentSize = $("#pathwaysPanelsWrapper").width();

		if ((this.findFeaturesPanel && this.findFeaturesPanel.isVisible()) ||
		this.visualOptionsPanel && this.visualOptionsPanel.isVisible()) {
			savedSpace += 350;
		}

		if (this.globalHeatmapView) {
			this.globalHeatmapView.getComponent().setWidth(Math.min(parentSize - savedSpace, this.globalHeatmapView.getComponent().getWidth()));
		}

		if (this.featureSetDetailsPanel) {
			this.featureSetDetailsPanel.getComponent().setWidth(Math.min(parentSize - savedSpace, this.featureSetDetailsPanel.getComponent().getWidth()));
		}

	};

	//TODO: DOCUMENTAR
	this.updateObserver = function() {
		debugger;
		/********************************************************/
		/* STEP 1: UPDATE DIAGRAM PANEL		                    */
		/********************************************************/
		this.diagramPanel.updateObserver();
		/********************************************************/
		/* STEP 2: UPDATE HEATMAP PANEL		                    */
		/********************************************************/
		this.globalHeatmapView.updateObserver();
	};

	//TODO: DOCUMENTAR
	this.applyVisualSettings = function() {
		var me = this;

		/********************************************************/
		/* STEP 1: UPDATE DATA DISTRIBUTION	SUMMARIES           */
		/********************************************************/
		$('input[type=radio][name^=colorByCheckbox]:checked').each(function() {
			if (this.value == "custom") {
				var omicName = this.name.split(/_(.+)/)[1];
				var omicDataDistribution = me.getDataDistributionSummaries(omicName);
				var omicCustomValues = Ext.ComponentQuery.query('[name="customslider_' + omicName + '"]')[0].getValues();
				var visualOptionsCustomValues = (me.visualOptions.customValues || {});

				omicDataDistribution.splice(11, 2, ...omicCustomValues);

				visualOptionsCustomValues[omicName] = omicCustomValues;

				me.setVisualOptions("customValues", visualOptionsCustomValues)
 				me.setDataDistributionSummaries(omicDataDistribution, omicName);
			}
		});
		/********************************************************/
		/* STEP 2: UPDATE DIAGRAM PANEL		                    */
		/********************************************************/
		this.diagramPanel.updateObserver();
		/********************************************************/
		/* STEP 3: UPDATE HEATMAP  & FEATURE SET PANELS         */
		/********************************************************/
		(this.globalHeatmapView !== null && this.globalHeatmapView.updateObserver());
		(this.featureSetDetailsPanel !== null && this.featureSetDetailsPanel.updateObserver());
		/********************************************************/
		/* STEP 4. UPDATE THE CACHE
		/********************************************************/
		this.getParent().getController().updateStoredVisualOptions(this.getParent().getModel().getJobID(), this.visualOptions);

		return this;
	};

	/**
	* This function generates the component (EXTJS) using the content of the model
	* @returns {Ext.ComponentView} The visual component
	*/
	this.initComponent = function() {
		var me = this;

		this.component = Ext.widget({
			xtype: "container", flex:1, defaults: {border: false},
			layout: {type: 'hbox', pack: 'start', align: 'stretch'},
			// maxHeight: (graphicalOptions.getImageHeight() * adjustFactor) + 200,
			items: [],
			listeners: {
				beforedestroy: function() {
					if (me.globalHeatmapView !== null) {
						Ext.destroy(me.globalHeatmapView.getComponent());
						me.globalHeatmapView = null;
					}

					if (me.diagramPanel !== null) {
						Ext.destroy(me.diagramPanel.getComponent());
						me.diagramPanel = null;
					}

					if (me.searchTool !== null) {
						Ext.destroy(me.searchTool);
						me.searchTool = null;
					}

					me.getModel().deleteObserver(me);
				}
			}
		});
		return this.component;
	};

	return this;
}
PA_Step4PathwayView.prototype = new View();

//------------------------------------------------------------------------------------------------

function PA_Step4KeggDiagramView() {
	/**
	* About this view: This view displays the pathway model as a KEGG diagram combined with
	* the data submitted by the user.
	**/
	/*********************************************************************
	* ATTRIBUTES
	***********************************************************************/
	this.name = "PA_Step4KeggDiagramView";
	this.items = [];

	/***********************************************************************
	* GETTERS AND SETTERS
	***********************************************************************/
	/**
	* TODO: DOCUMENTAR
	* Load the pathway information
	*  1. For each feature id
	*      a. Get the omicValues for the feature
	*      b. Create a FeatureSetElem (association of Feature + FeatureGraphicalData)
	*      c. Add the FeatureSetElem to the table indexed by coordinates (controlling overrided elements).
	*  2. For each set of FeatureSetElems, generate a PA_Step4KeggDiagramFeatureSetView and add to the view.
	*
	* @param {type} pathway
	* @returns {undefined}
	*/
	this.loadModel = function(pathway) {
		if (this.model !== null) {
			this.model.deleteObserver(this);
		}
		this.model = pathway;
		this.model.addObserver(this);

		var xyTable = {}; //TABLE CONTAINING ALL FEATURES ORDERED BY X,Y POSITION
		var searchFeatureIndex = {}; //TABLE CONTAINING AN INDEX USED FOR FEATURE SEARCHING

		//Generates the feature views.
		searchFeatureIndex = this.generateFeaturesViews(this.getModel().getMatchedGenes(), xyTable, searchFeatureIndex);
		searchFeatureIndex = this.generateFeaturesViews(this.getModel().getMatchedCompounds(), xyTable, searchFeatureIndex);

		//FOR EACH FEATURE FAMILY, ADD A NEW FEATURESET VIEW
		var featureSets = Object.values(xyTable);
		var view = null;
		for (var i in featureSets) {
			view = new PA_Step4KeggDiagramFeatureSetView().loadModel(featureSets[i], this.getModel().getID()).setParent(this.getParent());
			featureSets[i].addObserver(view);
			this.items.push(view);
		}

		return searchFeatureIndex;
	};

	/*********************************************************************
	* OTHER FUNCTIONS
	***********************************************************************/
	/**
	* This function changes the visibility for the component.
	* @chainable
	* @param {boolean} visible, forces the component visibility
	* @return {PA_Step4KeggDiagramView} the view
	*/
	this.toggle = function(visible) {
		visible = ((visible===undefined)? ! this.getComponent().isVisible():visible);
		this.getComponent().setVisible(visible);
		return this;
	};

	//TODO: DOCUMENTAR
	this.expand = function() {
		this.isExpanded = true;

		$("#expandDiagramPanelButton").hide();
		$("#shrinkDiagramPanelButton").show();
		this.getComponent().flex = 1;
		this.getParent().getComponent().doLayout();
	};

	//TODO: DOCUMENTAR
	this.shrink = function() {
		this.isExpanded = false;
		$("#expandDiagramPanelButton").show();
		$("#shrinkDiagramPanelButton").hide();

		this.getComponent().flex = 0;
		this.getParent().getComponent().doLayout();
	};

	/**
	* This function download the corresponding information for selected pathway
	* @chainable
	* @param  {String} format the desired format for downloading (png, svg,...)
	* @return {PA_Step4KeggDiagramView}
	*/
	this.download = function() {
		//TODO:format
		this.getParent().getController().downloadPathwayHandler(this.getParent(), this.getParent("PA_Step4JobView").getModel().getJobID(), "png");
		return this;
	};

	/**
	* TODO: DOCUMENTAR
	* This function generates the feature shapes by a given feature data and the feature graphical
	* information and add each feature to a matrix indexes by the coordinates.
	* This last step detects those features that share position in the diagram.
	*/
	this.generateFeaturesViews = function(featuresIDs, xyTable, searchFeatureIndex) {
		var featureSetElem, pos;
		var graphicalOptions = this.getModel().getGraphicalOptions();
		var omicsValues = this.getParent().getOmicsValues();

		for (var i in featuresIDs) {
			//Get the coordinates etc. for each box for current feature
			var data = graphicalOptions.findFeatureGraphicalData(featuresIDs[i]);

			//TODO: this code should be removed in future versions, now fixes the problems with not updated species
			if (!(data instanceof Array)){
				data = [data];
			}

			for(var k in data){
				featureSetElem = new FeatureSetElem(omicsValues[featuresIDs[i]], data[k]);

				//TODO: AQUI ESTA EL PROBLEMA!!
				//ADD THE ENTRY TO THE SEARCH TABLE (KEGG NAME -> featureSetElem)
				searchFeatureIndex[omicsValues[featuresIDs[i]].name] = featureSetElem;
				//ADD THE ENTRY TO THE SEARCH TABLE (INPUT NAME -> featureSetElem)
				for (var j in omicsValues[featuresIDs[i]].omicsValues) {
					searchFeatureIndex[omicsValues[featuresIDs[i]].omicsValues[j].inputName] = featureSetElem;
				}

				pos = data[k].getX() + "#" + data[k].getY();
				if (xyTable[pos] === undefined) {
					xyTable[pos] = new FeatureSet(data[k].getX(), data[k].getY());
				}
				xyTable[pos].addFeature(featureSetElem);
				featureSetElem.setParent(xyTable[pos]);
			}
		}

		return searchFeatureIndex;
	};

	/**
	* TODO: DOCUMENTAR
	* This function updates the content of the pathway
	* @chainable
	* @returns {PA_Step4KeggDiagramView}
	*/
	this.updateObserver = function() {
		//FOR EACH ITEM IN THE PATHWAY VIEW (potentially PA_Step4KeggDiagramFeatureSetView items)
		for (var i in this.items) {
			this.items[i].updateObserver();
		}
		return this;
	};


	/**
	* This function apply the settings that user can change
	* for the visual representation of the model (w/o reload everything).
	* @chainable
	* @returns {PA_Step4KeggDiagramView}
	*/
	this.applyVisualSettings = function() {
		debugger;
		this.updateObserver();
		return this;
	};

	/**
	* This function generates the component (EXTJS) using the content of the model
	* @returns {Ext.ComponentView} The visual component
	*/
	this.initComponent = function() {
		var me = this;

		//CREATE THE COMPONENT THAT CONTAINS THE SVG IMAGE, THE SPRITES WILL BE CREATED AFTER RENDERING
		this.component = Ext.widget({
			xtype: "box",
			cls: "lateralOptionsPanel",
			defaults: {border: false},
			flex: 1, minWidth: 400, previousWidth: 400, width: 400,  height: ($("#mainViewCenterPanel").height() - 100),
			html:
			'<div class="lateralOptionsPanel-header" style="background: #337ab7;">' +
			'   <div class="lateralOptionsPanel-toolbar">' +
			'    <a href="javascript:void(0)" class="toolbarOption btn-primary helpTip" id="hideDiagramPanelButton" title="Hide this panel"><i class="fa fa-times"></i></a>' +
			'    <a href="javascript:void(0)" class="toolbarOption btn-primary helpTip" id="expandDiagramPanelButton" style="display:none;"  title="Expand this panel"><i class="fa fa-expand"></i></a>' +
			'    <a href="javascript:void(0)" class="toolbarOption btn-primary helpTip" id="shrinkDiagramPanelButton" title="Shrink this panel"><i class="fa fa-compress"></i></a>' +
			'    <a href="javascript:void(0)" class="toolbarOption btn-default downloadTool helpTip" id="downloadDiagramPanelButton" title="Download the diagram"><i class="fa fa-download"></i> Download</a>' +
			'   </div>' +
			'   <h2>' + this.model.getName() + '</h2>' +
			'</div>' +
			'<div class="lateralOptionsPanel-body">' +
			'  <svg xmlns="http://www.w3.org/2000/svg" class="keggPathwaySVG" version="1.1" ></svg>' +
			"</div>",
			listeners: {
				boxready: function() {
					var graphicalOptions = me.getModel().getGraphicalOptions();
					var dataDistributionSummaries = me.getParent().getDataDistributionSummaries();
					var visualOptions = me.getParent().getVisualOptions();

					//GET THE VIEW PORT AND IF THE IMAGE IS BIGGER, CALCULATE THE ADJUST FACTOR
					var viewportWidth = $(this.el.dom).width();
					var headerHeight = $(this.el.dom).find(".lateralOptionsPanel-header").outerHeight();
					var viewportHeight = $("#mainViewCenterPanel").height() - headerHeight - 90;
					// var viewportHeight = $(this.el.dom).height();
					var imageWidth = graphicalOptions.getImageWidth();
					var imageHeight = graphicalOptions.getImageHeight();
					var imageProportion = imageHeight / imageWidth;
					var adjustFactor = 1;

					if (viewportWidth < imageWidth) {
						imageWidth = viewportWidth * 0.98; /*UN 95% del espacio disponible*/
						imageHeight = imageWidth * imageProportion;
						adjustFactor = imageWidth / graphicalOptions.getImageWidth();
					}

					if (viewportHeight < imageHeight) {
						imageHeight = viewportHeight * 0.98; /*UN 95% del espacio disponible*/
						imageWidth = imageHeight / imageProportion;
						adjustFactor = imageHeight / graphicalOptions.getImageHeight();
					}
					//TODO REMOVE adjustFactor
					me.getParent().setVisualOptions("adjustFactor", adjustFactor);
					me.getParent().setHeight(imageHeight + 200);

					//USING SVG.JS library
					canvas = SVG($(this.el.dom).find(".keggPathwaySVG")[0]);
					canvas.size("100%", imageHeight);
					canvas.viewbox({
						x: 0,
						y: 0,
						width: imageWidth,
						height: imageHeight
					});

					// Background image
					// For KEGG we only need to pass the digit code, but for MapMan
					// the full ID is required.
					var is_kegg = (me.model.getSource() == undefined || me.model.getSource() == "KEGG");
					var canvas_dir = is_kegg ? me.model.getID().replace(/\D/g, '') : me.model.getID() + '_' + me.model.getSource();

					canvas.image(location.pathname + "kegg_data/" + canvas_dir, imageWidth, imageHeight).addClass("keggImageBack");

					//GENERATE THE SUBCOMPONETS VIEWS
					try {
						featureSetViews = {};
						var featuresAux = null, featureShape;

						for (var i in me.items) {
							featureShape = me.items[i].drawComponent(canvas, dataDistributionSummaries, visualOptions);

							//GET THE NAMES FOR ALL THE FEATURES IN THE FEATURE SET
							featuresAux = me.items[i].getModel().getFeatures();
							for (var j in featuresAux) {
								featureSetViews[featuresAux[j].getFeature().getName()] = featureShape;
							}
						}
					} catch (error) {
						showErrorMessage(error.message, {
							message: error.stack
						});
					}

					//SOME EVENT HANDLERS
					$("#hideDiagramPanelButton").click(function() {
						me.getParent().hideDiagramPanel();
					});
					$("#expandDiagramPanelButton").click(function() {
						me.expand();
					});
					$("#shrinkDiagramPanelButton").click(function() {
						me.shrink();
					});
					$("#downloadDiagramPanelButton").click(function() {
						me.download();
					});
					//START PAN/ZOOM
					me.zoomTool = $(this.el.dom).find(".keggPathwaySVG").svgPanZoom({zoomFactor: 0.10, "initialViewBox" : {width:imageWidth, height:imageHeight}});
					$(this.el.dom).append(
						'<div class="zoomTool">' +
						'  <a href="javascript:void(0)" class="zoomIn" title="Zoom-in (110%)"><i class="fa fa-plus"></i></a>' +
						'  <a href="javascript:void(0)" class="zoomOut" title="Zoom-out (90%)"><i class="fa fa-minus"></i></a>' +
						'</div>'
					);

					$("a.zoomIn").click(function() {
						me.zoomTool.zoomIn();
					});
					$("a.zoomOut").click(function() {
						me.zoomTool.zoomOut();
					});
				},
				beforedestroy: function() {
					//REMOVE ALL PA_Step4KeggDiagramFeatureSetView
					for (var i in me.items) {
						me.items[i].getModel().deleteObserver(me.items[i]);
						Ext.destroy(me.items[i].getComponent());
						delete me.items[i];
					}

					me.getModel().deleteObserver(me);
				}
			}
		});

		return this.component;
	};

	return this;
}
PA_Step4KeggDiagramView.prototype = new View();

function PA_Step4KeggDiagramFeatureSetView() {
	/**
	* About this view: TODO: DOCUMENTAR
	**/
	/*********************************************************************
	* ATTRIBUTES
	***********************************************************************/
	this.name = "PA_Step4KeggDiagramFeatureSetView";
	this.featureView = null;
	this.adjustFactor = 1;
	this.tooltipComponent = null;

	/***********************************************************************
	* GETTERS AND SETTERS
	***********************************************************************/
	//TODO: DOCUMENTAR
	this.loadModel = function(featureSet, pathwayID) {
		this.model = featureSet;
		var pos = 0;
		var features = this.model.getFeatures();

		for(var i in features){
			if(features[i].getFeature().isRelevant()){
				pos = i;
				break;
			}
		}
		this.model.setMainFeature(features[pos]);

		this.featureView = new PA_Step4KeggDiagramFeatureSetSVGBox().setParent(this).loadModel(this.model.getMainFeature()).setComponentID(pathwayID + "_" + this.model.getX() + "_" + this.model.getY()).setIsUnique((this.model.getFeatures().length === 1));
		return this;
	};

	/*********************************************************************
	* OTHER FUNCTIONS
	***********************************************************************/
	//TODO: DOCUMENTAR
	this.showTooltip = function(dataDistributionSummaries, visualOptions) {
		/* Create only when there is no instance */
		if (this.tooltipComponent == null) {
			this.tooltipComponent = new PA_Step4KeggDiagramFeatureSetTooltip();
			this.tooltipComponent.loadModel(this.getModel());
			this.tooltipComponent.setParent(this);
		}
		
		this.tooltipComponent.show(this.component.id, dataDistributionSummaries, visualOptions);
	};
	
	this.hideTooltip = function() {
		// TODO: destroy this component when switching tooltips?
		if (this.tooltipComponent != null) {
			this.tooltipComponent.hide(false);
		}
	};
	
	this.resetTooltip = function() {
		this.tooltipComponent = null;
	};

	//TODO: DOCUMENTAR
	this.drawComponent = function(canvas, dataDistributionSummaries, visualOptions) {
		var me = this;
		this.adjustFactor = visualOptions.adjustFactor;
		var featureAux = this.initComponent(dataDistributionSummaries, visualOptions);

		var featureShape = canvas.image(featureAux.src, featureAux.width, featureAux.height).move(featureAux.x, featureAux.y).attr("id", featureAux.id);

		var displayTooltip = function() {
			/* If in the process of closing the tooltip, remove the timer */
			if (me.hideTimer) {
				clearTimeout(me.hideTimer);
			}
			
			me.timer = setTimeout(function() {
				me.timer = null;
				me.showTooltip(dataDistributionSummaries, visualOptions);
			}, 500)
		};
		
		var removeTooltip = function() {
			clearTimeout(me.timer);
			
			me.hideTimer = setTimeout(function() {
				me.hideTimer = null;
				me.hideTooltip();
			}, 500);	
		};

		featureShape.on("mouseover", displayTooltip).on("click", displayTooltip).on("mouseleave", removeTooltip);

		return featureShape;
	};

	//TODO: DOCUMENTAR
	this.updateObserver = function() {
		//Update ONLY the visible item (mainItem)
		this.featureView.loadModel(this.getModel().getMainFeature()).updateObserver();
		
		if (this.tooltipComponent) {
			this.tooltipComponent.updateObserver();
		}
	};

	/**
	* This function generates the component (EXTJS) using the content of the model
	* @returns {Ext.ComponentView} The visual component
	*/
	this.initComponent = function(dataDistributionSummaries, visualOptions) {
		var me = this;
		visualOptions.adjustFactor = this.adjustFactor;
		this.component = this.featureView.initComponent(dataDistributionSummaries, visualOptions);
		return this.component;
	};

	return this;
}
PA_Step4KeggDiagramFeatureSetView.prototype = new View();

function PA_Step4KeggDiagramFeatureSetTooltip() {
	/**
	* About this view: This class creates a new view for a given FeatureSet
	* This view is a panel containing a HEATMAP and a LINE PLOT showing an overview of
	* the feature information
	* This view is a tooltip for a PA_Step4KeggDiagramFeatureSetView item, e.g. a box in the
	* pathway SVG, so it will turn visible when the situate the mouse over the parent item.
	* @implements Singleton
	*/

	/*********************************************************************
	* ATTRIBUTES
	***********************************************************************/
	this.name = "PA_Step4KeggDiagramFeatureSetTooltip";
	this.targetID = null;
	this.featureView = null;
	this.isPinned = false;
	this.hideTimer = null;

	/***********************************************************************
	* GETTER AND SETTERS
	***********************************************************************/

	/***********************************************************************
	* OTHER FUNCTIONS
	***********************************************************************/
	//TODO: DOCUMENTAR
	this.show = function(targetID) {
		if ( ! this.isPinned) {
			this.getComponent().showBy(targetID);
			this.targetID = targetID;
			this.updateObserver();	
		}
	};

	this.hide = function(force) {
		if (! this.isPinned) {
			this.forceHide = force;
			this.getComponent().close();		
		}
	};
	
	this.pin = function() {
		this.getComponent().tools[0].setType('unpin');
		this.isPinned = true;
	};
	
	this.unpin = function() {
		this.getComponent().tools[0].setType('pin');
		this.isPinned = false;
	};
	
	this.plus = function() {
		this.getComponent().tools[1].setType('minus');
		this.featureView.showExpandedInfo();
	};
	
	this.minus = function() {
		this.getComponent().tools[1].setType('plus');
		this.featureView.hideExpandedInfo();
	};
	
	//TODO: DOCUMENTAR
	this.showFeatureSetDetails = function(targetID, feature) {
		this.getParent().getParent().showFeatureSetDetails(targetID, this.getModel(), feature);
	};

	/**
	* This function changes the main feature to show in the featureSetViews
	* @param  {Integer} sense indicates the direction to change (+1 next, -1 prev.)
	* @return {PA_Step4KeggDiagramFeatureSetTooltip} the view
	*/
	this.changeVisibleFeature = function(sense){
		var currentFeaturePos = this.getModel().features.indexOf(this.getModel().getMainFeature());
		currentFeaturePos = ((currentFeaturePos + sense) + this.getModel().features.length) % this.getModel().features.length;
		this.getModel().setMainFeature(this.getModel().features[currentFeaturePos]);
		this.getModel().setChanged();
		this.getModel().notifyObservers();
		return this;
	};

	/**
	* This function updates the visual representation of the model.
	*  - STEP 1. INITIALIZE VARIABLES
	*  - STEP 2. CHECK IF THERE ARE OTHER FEATURES AT THE SAME POSITION
	*  - STEP 3. UPDATE SUBCOMPONENTS
	* @chainable
	* @returns {PA_Step4KeggDiagramFeatureSetTooltip}
	*/
	this.updateObserver = function() {
		var me = this;

		/********************************************************/
		/* STEP 1. INITIALIZE VARIABLES                         */
		/********************************************************/
		var mainFeatureSetItem = this.getModel().getMainFeature();
		var featureType = mainFeatureSetItem.getFeature().getFeatureType();
		var message = "";

		/********************************************************/
		/* STEP 2. CHECK IF THERE ARE OTHER FEATURES AT THE     */
		/*         SAME POSITION                                */
		/********************************************************/
		var nOtherItems = this.model.getFeatures().length-1;
		var domEl = me.getComponent().el.dom;
		
		if (nOtherItems > 0) {
			$(domEl).find(".otherFeaturesMessage").html(nOtherItems + " more " + featureType + (nOtherItems > 1 ? "s" : "") + " at this position.");
			$(domEl).find(".otherFeaturesLabel").show();
		} else {
			$(domEl).find(".otherFeaturesLabel").hide();
		}
		/********************************************************/
		/* STEP 3. UPDATE SUBCOMPONENTS                         */
		/********************************************************/
		this.featureView.loadModel(mainFeatureSetItem);
		this.featureView.updateObserver(true);//HIDE LINKS
		this.getComponent().updateLayout();
		
		// Set title
		var htmlTitle = "<span class='featureNameLabel'>" + mainFeatureSetItem.getFeature().getName().split(",")[0] + "</span>";
		
		if (mainFeatureSetItem.getFeature().isRelevant()) {
			htmlTitle += "<i class='featureNameLabelRelevant relevantFeature'></i>";
		}
		
		this.getComponent().setTitle(htmlTitle);

		return this;
	};

	/**
	* This function generates the component (EXTJS) using the content of the model
	* @returns {Ext.ComponentView} The visual component
	*/
	this.initComponent = function() {
		var me = this;
		this.featureView = new PA_Step4KeggDiagramFeatureView();
		this.featureView.setParent(me);
		this.featureView.setCollapsible(false);
		this.featureView.setClosable(true);

		this.component = Ext.create('Ext.window.Window', {
			target: "", 
			layout: "auto",
			style: "background: #fff; border: solid 2px #B7C7CF; border-radius : 2px; margin:0; padding:0;",
			resizable: false, bodyPadding:0,
			autoHeight: true, width: 260, minHeight:240,
			closable: false,
			tools: [
				{
					type: 'pin',
					tooltip: 'Keep or not this window open',
					callback: function(panel, tool, event) {
						me[tool.type]();
					}
				},
				{
					type: 'plus',
					tooltip: 'Show or hide more information',
					callback: function(panel, tool, event) {
						me[tool.type]();
					}
				},
				{
					type: 'close',
					tooltip: 'Close this window',
					callback: function(panel, tool, event) {
						me.forceHide = true;
						me.getComponent().close();
					}
				}
			],
			items: [
				{
					xtype: "box", html:
					'<div class="otherFeaturesLabel" style="text-align: center; display: block;">' +
					'  <span class="step4TooltipPrevButton tooltipDetailsSpan" style="display: inline;">' +
					'    <i class="fa fa-caret-left" style="padding-right: 3px;"></i><a href="javascript:void(0)" style="display:inline-block"> Prev.</a>' +
					'  </span>' +
					'  <span class="otherFeaturesMessage tooltipDetailsSpan" > N more Genes at this position.</span>' +
					'  <span class="step4TooltipNextButton tooltipDetailsSpan" style="display: inline;">' +
					'    <a href="javascript:void(0)" style="display:inline-block">Next</a><i class="fa fa-caret-right" style="padding-left: 3px;"></i>' +
					'  </span>' +
					'</div>'
				},
				this.featureView.getComponent(),
				{
					xtype: "box", html:
					'<div style="text-align: center;margin: 10px 0px;">'+
					'  <a href="javascript:void(0)" class="step4TooltipMoreButton" class="button btn-primary btn-no-float"><i class="fa fa-search-plus"></i> Show details</a>'+
					'</div>'
				}
			],
			showBy: function(el, pos) {
				if (this.el == null) {
					this.show();
				}
				this.showAt(this.el.getAlignToXY(el, pos || this.defaultAlign, [20, 20]));
			},
			listeners: {
				boxready: function() {
					//SOME EVENT HANDLERS
					var domEl = me.getComponent().el.dom;
					
					$(domEl).find(".step4TooltipMoreButton").click(function() {
						me.getComponent().hide();
						me.showFeatureSetDetails(me.targetID, me.getModel());
					});
					$(domEl).find(".step4TooltipPrevButton").click(function() {
						me.changeVisibleFeature(-1);
					});
					$(domEl).find(".step4TooltipNextButton").click(function() {
						me.changeVisibleFeature(1);
					});
				},
				beforehide: function() {
					if ($(me.getComponent().el.dom).is(":hover") && me.forceHide !== true) {
						return false;
					}
					delete me.forceHide;
				},
				beforedestroy: function() {
					me.featureView.getComponent().destroy();
					me.getParent().resetTooltip();
				},
				dragstart: function() {					
					if (me.hideTimer) {
						clearTimeout(me.hideTimer)
					}
					
					me.pin();
				},
				afterrender : function(win) {
					var windowEl  = win.el;
					
					var hideTimeout = function() {
						if (me.hideTimer) {
							clearTimeout(me.hideTimer)
						}
						
						if (! me.isPinned) {
							me.hideTimer = setTimeout(function() {
								me.hideTimer = null;
								me.hide(true);
							}, 500);
						}
					};
					
					var clearHiderTimeout = function() {
						if (me.hideTimer) {
							clearTimeout(me.hideTimer)
						}
					};
					
					$(windowEl.dom).hover(clearHiderTimeout, hideTimeout);
				}
			}
		});

		return this.component;
	};
	return this;
}
PA_Step4KeggDiagramFeatureSetTooltip.prototype = new View();

function PA_Step4KeggDiagramFeatureView(showButtons) {
	/**
	* About this view: this class creates a new view for a given Feature, view is a panel
	* containing a HEATMAP and a LINE PLOT showing an overview of the feature information
	* This view is the content for a a tooltip for a PA_Step4KeggDiagramFeatureSetTooltip
	* and for an overview of feature at a PA_Step4DetailsFeatureSetView
	**/
	/*********************************************************************
	* ATTRIBUTES
	***********************************************************************/
	this.name = "PA_Step4KeggDiagramFeatureView";
	this.collapsible = true;
	this.closable = false;
	this.showButtons = (showButtons === true);

	/***********************************************************************
	* GETTER AND SETTERS
	***********************************************************************/
	this.setCollapsible = function(collapsible){
		this.collapsible = collapsible;
	};
	this.setClosable = function(closable){
		this.closable = closable;
	};

	/***********************************************************************
	* OTHER FUNCTIONS
	***********************************************************************/
	/**
	* This function updates the content of the panel
	* TODO: DOCUMENTAR
	* @param {type} dataDistributionSummaries
	* @param {type} visualOptions
	* @param {type} hideLinks
	* @returns {undefined}
	*/
	this.updateObserver = function(hideLinks) {
		var me = this;

		var dataDistributionSummaries = this.getParent("PA_Step4PathwayView").getDataDistributionSummaries();
		var visualOptions = this.getParent("PA_Step4PathwayView").getVisualOptions();
		var componentID = "#" + this.getComponent().getId();

		//UPDATE THE NAME OF THE FEATURE
		var componentNames = this.getModel().getFeature().getName().split(",");
		$(componentID + " .featureNameLabel").text(" " + componentNames[0]);
		$(componentID + " .featureNameLabelRelevant").toggle(this.getModel().getFeature().isRelevant());

		//Do not render if the component was never expanded (lazy rendering)
		if($(componentID).hasClass("neverExpanded")){
			if(me.collapsible){
				return;
			}
			$(componentID).find(".geneInfoContainer").show(); //if it is not collapsible but is first call, expand
		}

		var featureType = this.getModel().getFeature().getFeatureType();
		var omicsValues = this.getModel().getFeature().getOmicsValues();
		var specie = application.getMainView().currentView.getModel().getOrganism();

		if (this.getModel().getFeature().isRelevant()) {
			$(componentID + " .relevantFeatureField").show();
		} else {
			$(componentID + " .relevantFeatureField").hide();
		}

		/*UPDATE THE HEATMAP AND THE PLOT*/
		var visibleOmics =[];
		var allOmics = null;
		if(featureType.toLowerCase() === "gene"){
			allOmics = this.getParent("PA_Step4PathwayView").getGeneBasedInputOmics();
		}else{
			allOmics = this.getParent("PA_Step4PathwayView").getCompoundBasedInputOmics();
		}

		for(var i in allOmics){
			visibleOmics.push(allOmics[i].omicName);
		}

		var divHeight = Math.max(visibleOmics.length * 40, 120);
		$(componentID + " .step4_plotwrappers").html(
			"  <div class='twoOptionsButtonWrapper'>" +
			'      <a href="javascript:void(0)" class="button twoOptionsButton selected" name="heatmap-chart">Heatmap</a>'+
			'      <a href="javascript:void(0)" class="button twoOptionsButton" name="line-chart">Line chart</a>'+
			"  </div>" +
			"  <div class='step4-tooltip-plot-container selected' name='heatmap-chart'>" +
			"    <div id='" + this.getComponent().getId() + "_heatmapcontainer' name='heatmap-chart' style='height:"+ divHeight+ "px;width: 230px;'></div>" +
			"  </div>" +
			"  <div class='step4-tooltip-plot-container' name='line-chart' style='display:none;'>" +
			"    <div id='" + this.getComponent().getId() + "_plotcontainer' style='height:"+ divHeight+ "px;width: 230px;'></div>" +
			"  </div>"
		);

		this.generateHeatmap(this.getComponent().getId() + "_heatmapcontainer", visibleOmics, dataDistributionSummaries, visualOptions);
		this.generatePlot(this.getComponent().getId() + "_plotcontainer", visibleOmics, dataDistributionSummaries, visualOptions);

		$("#" + me.getComponent().getId() + " a.twoOptionsButton").click( function(){
			var parent = $(this).parent(".twoOptionsButtonWrapper");
			var target = $(this).attr("name").replace("show", "");
			$(this).siblings("a.twoOptionsButton.selected").removeClass("selected");
			$(this).addClass("selected");
			parent.siblings("div.step4-tooltip-plot-container.selected").removeClass("selected").toggle();
			parent.siblings("div.step4-tooltip-plot-container[name="+ target + "]").addClass("selected").toggle();
		});

		if (hideLinks === true) {
			$(componentID + " .extraInfoPanel").hide();
		}else{
			this.generateExtraInfoPanelContent(componentID + " .extraInfoPanel", specie, componentNames, this.getModel().getFeature().getID(), featureType);
		}
	};
	
	this.showExpandedInfo = function() {
		// doLayout moved at the getJSON callback.
		this.updateObserver(false);
	};
	
	this.hideExpandedInfo = function() {
		this.updateObserver(true);
		this.parent.getComponent().doLayout();
	};

	//TODO: DOCUMENTAR
	this.generateExtraInfoPanelContent = function(target, specie, componentNames, featureID, featureType) {
		var me = this;
		var renderFunction = function(data){
			var htmlCode = "";

			var featureName = componentNames.shift();
			if(componentNames.length > 0){
				htmlCode +=
				'<p><b>Other names:</b> ' + componentNames.join(", ") + '</p>';
			}

			htmlCode+=
			"<div class='externalLinksContainer'>" +
			"<b>External links</b>" +
			"  <ul style='list-style-type: none;'>";

			var species = data.species;
			var specieName = "";
			for (var i in species) {
				if (species[i].value === specie) {
					specieName = species[i].name;
					break;
				}
			}

			var alternativeName = specieName.split("(")[1];
			alternativeName = alternativeName.substring(0,1).toUpperCase() +  alternativeName.substring(1,alternativeName.length-1);
			// specieName = encodeURIComponent(featureName + " " + specieName);

			if(featureType.toLowerCase() === "gene"){
				htmlCode +=
				"    <li><a href='http://www.kegg.jp/dbget-bin/www_bget?" + specie + ":" + featureID + "' target='_blank'><i class='fa fa-external-link'></i> Search at KEGG Database</a></li>" +
				"    <li><a class='ensemblGenomesSearch' href='http://ensemblgenomes.org/search/eg/" + featureName + "' target='_blank'><i class='fa fa-external-link'></i> Search at Ensembl Genomes</a></li>" +
				"    <li><a class='ensemblSearch' href='http://www.ensembl.org/Multi/Search/Results?q=" + encodeURIComponent(featureName) + ";facet_species="+ encodeURIComponent(alternativeName) + "' target='_blank'><i class='fa fa-external-link'></i> Search at Ensembl (vertebrates)</a></li>" +
				((specie === "hsa") ? "<li><a href='http://www.genecards.org/cgi-bin/carddisp.pl?gene=" + featureName + "' target='_blank'><i class='fa fa-external-link'></i> Search at GeneCards Database</a></li>" : "") +
				"    <li><a href='http://www.ncbi.nlm.nih.gov/pubmed/?term=" + specieName + "' target='_blank'><i class='fa fa-external-link'></i> Find related publications (PubMed)</a></li>" +
				"    <li><a href='http://www.ncbi.nlm.nih.gov/gene/?term=" + encodeURIComponent("(" + featureName + "[Gene Name]) AND ()"+ alternativeName + "[Organism])") + "' target='_blank'><i class='fa fa-external-link'></i> Search at NCBI Gene</a></li>" +
				"    <li><a href='http://www.ncbi.nlm.nih.gov/gquery/?term=" + encodeURIComponent(featureName + " "+ specieName) + "' target='_blank'><i class='fa fa-external-link'></i> Search at all NCBI Databases</a></li>";
			}else{
				htmlCode +=
				"    <li><a href='http://www.kegg.jp/dbget-bin/www_bget?" + featureID + "' target='_blank'><i class='fa fa-external-link'></i>Search at KEGG Database</a></li>" +
				"    <li><a href='http://www.ncbi.nlm.nih.gov/pccompound?term=" + featureID + "' target='_blank'><i class='fa fa-external-link'></i>Search at PubChem Compound</a></li>" +
				"    <li><a href='https://www.ebi.ac.uk/chebi/advancedSearchFT.do?searchString=" + featureID + "' target='_blank'><i class='fa fa-external-link'></i>Search at ChEBI Database</a></li>";
			}

			htmlCode+= "  </ul></div>";

			if(me.showButtons === true){
				htmlCode+=
				'<div style=" text-align: center; margin: 15px 0px; ">'+
				'  <a class="button btn-info btn-sm btn-no-float findInMapButton"><i class="fa fa-map-marker"></i> Find in Pathway</a>'+
				'  <a class="button btn-default btn-sm btn-no-float moreDetailsButton"><i class="fa fa-search-plus"></i> Show details</a>'+
				'</div>';
			}

			$(target).html(htmlCode).css({"display" : "inline-block"});

			$(target).find(".findInMapButton").click( function(){
				//Reset the zoom to have a complete view of the diagram
				me.parent.diagramPanel.zoomTool.reset();
				//Iterate through all the featureSets and find those that contain the target feature
				//Note that a feature can be drawn many times in the same diagram
				var matches = [], featureSetView, featureSetElem;
				for(var i in me.parent.diagramPanel.items){
					featureSetView = me.parent.diagramPanel.items[i];
					for(var j in featureSetView.model.features){
						featureSetElem = featureSetView.model.features[j];
						if(featureSetElem.getFeature().getID() === me.model.feature.ID){
							featureSetView.model.setMainFeature(featureSetElem);
							featureSetView.updateObserver();
							matches.push($("#" + featureSetView.getComponent().id)[0]);
						}
					}
				}
				//For each found feature, show a popup indicating the location of the feature
				$(matches).data('powertip', me.model.feature.name.split(",")[0]);
				$(matches).powerTip({
					smartPlacement: true,
					placement: 's',
				});
				//For the tooltips sequencially
				var showAllPositions = function(){
					if(matches.length > 0){
						var elem = $(matches.shift());
						$.powerTip.show(elem);
						$.powerTip.destroy(elem);
						setTimeout(showAllPositions, 1700);
					}else{
						$.powerTip.hide();
					}
				};
				showAllPositions();
			});

			$(target).find(".moreDetailsButton").click( function(){
				me.parent.showFeatureSetDetails("", me.model.parent);
			});
			
			me.parent.getComponent().doLayout();
		};
		
		this.getParent("PA_Step4JobView").downloadSpeciesInfo(renderFunction);

		return this;
	};

	/**
	* This function generates a HIGHCHART HEATMAP using the given data
	* TODO: DOCUMENTAR
	* @param {type} mainFeatureSetItem
	* @param {type} dataDistributionSummaries
	* @returns {PA_Step4KeggDiagramFeatureSetTooltip.generateHeatmap.heatmap}
	*/
	this.generateHeatmap = function(divID, visibleOmics, dataDistributionSummaries, visualOptions) {
		var feature = this.getModel().getFeature();
		var omicName, omicValues, position;
		var x = 0, y = 0, maxX = -1;
		var series = [], yAxisCat = [], serie, later = [], values, scaledValues, min, max;

		for (var i = visibleOmics.length - 1; i >= 0; i--) {
			x = 0;
			omicName = visibleOmics[i].split("#")[0];

			omicValues = feature.getOmicValues(omicName);
			if (omicValues !== null) {
				shownameValue = omicValues.inputName != omicValues.originalName && omicValues.originalName !== undefined ?
					omicValues.originalName + ": " + omicValues.inputName :
					omicValues.inputName

				serie = {name: (omicValues.isRelevant() === true ? "* " : "") + omicName + "#" + shownameValue};
				yAxisCat.push((omicValues.isRelevant() === true ? "* " : "") + omicName + "#" + shownameValue);

				values = omicValues.getValues();
				serie.data = [];
				scaledValues = [];

				var limits = getMinMax(dataDistributionSummaries[omicName], visualOptions.colorReferences[omicName]);

				for (var j in values) {
					serie.data.push({
						x: x, y: y,
						value: values[j],
						color: getColor(limits, values[j], visualOptions.colorScale)
					});
					x++;
					maxX = Math.max(maxX, x);
				}
				series.push(serie);
			} else {
				/* IF THERE IS NOT DATA FOR THIS OMIC FOR THIS FEATURE, WE WILL ADD
				* A GRAY ROW, BUT FIRST WE NEED SOME INFORMATION (MAX X), SO WE WILL ADD
				* LATER, NOW JUST ADD A NULL, AND REPLACE LATER*/
				later.push({
					omicName: omicName,
					position: y
				});
				yAxisCat.push(omicName);
				series.push(null);
			}
			y++;
		}

		for (var i in later) {
			x = 0;
			omicName = later[i].omicName;
			position = later[i].position;

			serie = {
				name: omicName
			};
			serie.data = [];
			for (var j = 0; j < maxX; j++) {
				serie.data.push([x, position, null]);
				x++;
			}
			series[position] = serie;
		}

		var xAxisCat = [];
		for (var i = 0; i < maxX; i++) {
			xAxisCat.push("Timepoint " + (i + 1));
		}

		var heatmap = new Highcharts.Chart({
			chart: {type: 'heatmap',renderTo: divID},
			title: null,
			credits: {enabled: false},
			legend: {enabled: false},
			tooltip: {
				borderColor: "#333",
				formatter: function() {
					var title = this.point.series.name.split("#");
					title[1] = (title.length > 1) ? title[1] : "";
					return "<b>" + title[0].replace("*", '<i class="relevantFeature"></i>') + "</b><br/>" + "<i class='tooltipInputName'>" + title[1] + "</i>" + (this.point.value === null ? "No data" : this.point.value);
				},
				useHTML: true
			},
			xAxis: {
				categories: xAxisCat,
				labels: {enabled: false}
			},
			yAxis: {
				categories: yAxisCat,
				title: null,
				labels: {
					formatter: function() {
						var title = this.value.split("#");
						title[1] = (title.length > 1) ? title[1] : "No data";
						return ((title[0].length > 10) ? title[0].substring(0, 10) + "..." : title[0]).replace("*", '<i class="relevantFeature"></i>') +
						'</br><i class="tooltipInputName yAxisLabel">' + ((title[1].length > 10) ? title[1].substring(0, 10) + "..." : title[1]) + '</i>';
					},
					style: {fontSize: "9px"},
					useHTML: true
				}
			},
			series: series,
			plotOptions: {
				//TODO: border color if color scale = green-black-red?
				heatmap: {borderColor: "#000000",borderWidth: 0.5}
			}
		});

		return heatmap;
	};

	/**
	* This function generates a HIGHCHART PLOT using the given data
	* TODO: DOCUMENTAR
	* @param {type} divID
	* @param {type} dataDistributionSummaries
	* @param {type} visualOptions
	* @returns {PA_Step4KeggDiagramFeatureSetTooltip.generatePlot.plot}
	*/
	this.generatePlot = function(divID, visibleOmics, dataDistributionSummaries, visualOptions) {
		var feature = this.getModel().getFeature();
		var omicName,
		omicValues = null,
		values = null;
		var series = [],
		scaledValues, min, max,
		maxVal = -100000000,
		minVal = 100000000,
		tmpValue,
		yAxis = [],
		yAxisItem;

		//1.FILL THE STORE DATA [{name:"timepoint 1", "Gene Expression": -0.8, "Proteomics":-1.2,... },{name:"timepoint2", ...}]
		for (var i in visibleOmics) {
			omicName = visibleOmics[i].split("#")[0];
			omicValues = feature.getOmicValues(omicName);
			if (omicValues !== null) {
				scaledValues = [];

				var limits = getMinMax(dataDistributionSummaries[omicName], visualOptions.colorReferences[omicName]);

				values = omicValues.getValues();
				for (var j in values) {
					//SCALE THE VALUE
					tmpValue = scaleValue(values[j], limits.min, limits.max);
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

				series.push({
					name: omicName,
					type: 'spline',
					startOnTick: false,
					endOnTick: false,
					data: scaledValues,
					yAxis: 0
				});
			}
		}

		maxVal = Math.ceil(Math.max(maxVal, 1));
		minVal = Math.floor(Math.min(minVal, -1));

		//TODO: SHOW ORINAL VALUES WHEN HOVERING
		var plot = new Highcharts.Chart({
			chart: {renderTo: divID},
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

			}
		);

		plot.yAxis[0].setExtremes(minVal, maxVal);

		return plot;
	};

	/**
	* This function generates the component (EXTJS) using the content of the model
	* @returns {Ext.ComponentView} The visual component
	*/
	this.initComponent = function() {
		var me = this;
		this.component = Ext.widget({
			xtype: "box",
			cls: "contentbox mainInfoPanel neverExpanded",
			style:"margin:0;",
			html:	
			((this.collapsible)?"<h3 class='geneInfoTitle'><i class='fa fa-chevron-circle-right'></i>" +
			"  <span class='featureNameLabel'></span><i class='featureNameLabelRelevant relevantFeature'></i>"+
			"</h3>": "") +
			"<div class='geneInfoContainer' style='display:none;'>" +
			"  <div class='otherOmicsLabel' style='padding:2px 0px'></div>" +
			"  <div class='step4_plotwrappers'></div>" +
			"  <span><p class='relevantFeatureField' style='padding: 0px; margin: 0px; font-size: 10px;float: right;'><i class='relevantFeature'></i>  Relevant for this omic</p></span>" +
			"  <div class='extraInfoPanel'></div>"+
			"</div>",
			listeners: {
				boxready: function () {
					//ADD THE EVENT WHEN CLICK ON THE EXPAND LINK
					$(this.el.dom).find(".geneInfoTitle").click(function () {
						var elem = $(this);
						if(elem.parents(".mainInfoPanel").first().hasClass("neverExpanded")){
							elem.parents(".mainInfoPanel").first().removeClass("neverExpanded");
							me.updateObserver();
						}
						if (elem.hasClass("expanded")) {
							elem.removeClass("expanded");
							elem.find("i").removeClass("fa-chevron-circle-down").addClass("fa-chevron-circle-right");
						} else {
							elem.addClass("expanded");
							elem.find("i").removeClass("fa-chevron-circle-right").addClass("fa-chevron-circle-down");
						}
						$(this).siblings(".geneInfoContainer").toggle();
					});
					$(this.el.dom).find(".hideOption").click(function () {
						if(me.parent.hide !== undefined){
							me.parent.hide(true);
						}
					});
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
PA_Step4KeggDiagramFeatureView.prototype = new View();

function PA_Step4KeggDiagramFeatureSetSVGBox() {
	/**
	* About this view: This view creates a new box (heatmap) for a given FeatureSet
	* The new box will be drawn at the Pathway diagram.
	*/
	/*********************************************************************
	* ATTRIBUTES
	***********************************************************************/
	this.name = "PA_Step4KeggDiagramFeatureSetSVGBox";
	this.imageCode = null;
	this.componentID = null;
	this.isUnique = true;
	/***********************************************************************
	* GETTERS AND SETTERS
	***********************************************************************/
	//TODO: DOCUMENTAR
	this.getID = function() {
		console.warn("Calling to deprecated getID method");
		return this.getComponentID();
	};
	//TODO: DOCUMENTAR
	this.getComponentID = function() {
		return this.componentID;
	};
	//TODO: DOCUMENTAR
	this.setComponentID = function(componentID) {
		this.componentID = componentID + "_" + this.model.getFeature().getID();
		return this;
	};
	this.setIsUnique= function(isUnique) {
		this.isUnique = isUnique;
		return this;
	};

	/***********************************************************************
	* OTHER FUNCTIONS
	***********************************************************************/
	//TODO: DOCUMENTAR
	this.updateObserver = function() {
		var dataDistributionSummaries = this.getParent("PA_Step4PathwayView").getDataDistributionSummaries();
		var visualOptions = this.getParent("PA_Step4PathwayView").getVisualOptions();
		$("#" + this.getComponentID()).attr("href", this.generateBox(dataDistributionSummaries, visualOptions));
		// var newID = this.componentID.split("_");
		// newID[newID.length-1] = this.model.getFeature().getID();
		// $("#" + this.getComponentID()).attr("id", newID.join("_"));
		return this;
	};

	//TODO: DOCUMENTAR
	this.drawComponent = function(dataDistributionSummaries, visualOptions) {
		return this.initComponent(dataDistributionSummaries, visualOptions);
	};

	this.generatePoint = function(dataDistributionSummaries, visualOptions, pointSize) {
		var canvas = $('<canvas>');
		canvas.attr({width: pointSize,height: pointSize});

		var context = canvas[0].getContext("2d");
		var centerX = canvas[0].width / 2;
		var centerY = canvas[0].height / 2;
		var radius = pointSize/2;

		var isRelevant = this.getModel().getFeature().isRelevant();

		context.beginPath();
		context.arc(centerX, centerY, radius, 0, 2 * Math.PI, false);
		context.fillStyle = '#337ab7';
		context.fill();
		context.lineWidth = 1;
		context.strokeStyle = '#bcbcbc';
		context.stroke();

		if (isRelevant === true) {
			context.beginPath();
			context.arc(centerX, centerY, 6, 0, 2 * Math.PI, false);
			context.fillStyle = 'red';
			context.fill();
			context.lineWidth = 5;
			context.strokeStyle = '#003300';
			context.stroke();
			context.font = "normal " + pointSize/4 + "px FontAwesome";
			context.fillStyle = '#FFFFFF';
			context.fillText('\uf005', centerX - (pointSize/8), centerY - (pointSize/8));
		}

		this.imageCode = canvas[0].toDataURL("image/png");
		return this.imageCode;
	};

	//TODO: DOCUMENTAR
	this.generateBox = function(dataDistributionSummaries, visualOptions) {
		var scaleFactor = 10;
		var boxPadding = 1;
		var boxProportion = 1.0;

		var feature = this.getModel().getFeature();
		var featureGraphicalData = this.getModel().getFeatureGraphicalData();
		var isRelevant = feature.isRelevant();

		/*FILTER THE LIST OF OMICS TO GET ONLY THE "GENE" BASED OMICS OR THE COMPOUND BASED OMICS*/
		var visibleOmics = visualOptions.visibleOmics.filter(function(elem) {
			return elem.indexOf(feature.getFeatureType().toLowerCase() + "based") > -1;
		});

		//   if (isRelevant === true) {
		boxPadding = 18;
		//   }

		//GET THE WIDTH AND THE HEIGHT
		var width = (featureGraphicalData.getBoxWidth()  || 10 ) * scaleFactor;
		var height = (featureGraphicalData.getBoxHeight() || 10 ) * scaleFactor;

		var boxHeigth = (((height - boxPadding * 2) / visibleOmics.length) * boxProportion);
		var boxWidth = width - boxPadding * 2;
		var xPos = boxPadding,
		yPos = boxPadding;
		var canvas = $('<canvas>');

		//ADD 1 TO AVOID HIDDE WHEN OVERFLOW
		canvas.attr({width: width,height: height});
		var context = canvas[0].getContext("2d");

		var omicName,
		omicValues = null,
		values = null;

		//FOR EACH SELECTED OMIC
		for (var i in visibleOmics) {
			boxWidth = width - boxPadding * 2;
			omicName = visibleOmics[i].split("#")[0];
			omicValues = feature.getOmicValues(omicName);
			//IF THE FEATURE CONTAINS VALUES FOR THE OMIC
			if (omicValues !== null) {
				values = omicValues.getValues();
				boxWidth = boxWidth / values.length;

				var limits = getMinMax(dataDistributionSummaries[omicName], visualOptions.colorReferences[omicName]);

				for (var j in values) {
					context.beginPath();
					context.rect(xPos, yPos, boxWidth, boxHeigth);
					context.fillStyle = getColor(limits, values[j], visualOptions.colorScale);
					context.fill();
					context.lineWidth = 1;
					context.strokeStyle = '#bcbcbc';
					context.stroke();
					xPos += boxWidth;
				}
				//IF THE FEATURE DOES NOT CONTAIN VALUES, DRAW A GRAY BOX
			} else {
				context.beginPath();
				context.rect(xPos, yPos, width, boxHeigth);
				context.fillStyle = "#f9f9f9";
				context.fill();
			}
			yPos += boxHeigth;
			xPos = boxPadding;
		}
		//ADD THE BOX WITH THE TEXT
		var fontSize = 13;
		if (feature.getName().length > 6) {
			fontSize = 10;
		}

		context.beginPath();
		context.rect(boxPadding / 2, boxPadding / 2, width - boxPadding, height - boxPadding);
		context.lineWidth = boxPadding;
		context.strokeStyle = '#e8e8e8';

		if (visibleOmics.length === 0) {
			context.fillStyle = "#f9f9f9";
			context.fill();
		}

		if (isRelevant === true) {
			context.strokeStyle = '#000';
		}

		if(width > 80){
			context.stroke();
			context.font = "normal " + (fontSize * scaleFactor) + "px serif";
			context.fillStyle = 'black';
			context.fillText(feature.getName(), 0, fontSize * scaleFactor);
		}

		//Add start glyph if relevant
		if (isRelevant === true) {
			context.beginPath();
			context.arc(xPos + width - 40, 25, 25, 0, 2 * Math.PI, false);
			context.fillStyle = 'red';
			context.fill();
			context.lineWidth = 5;
			context.strokeStyle = '#003300';
			context.stroke();
			context.font = "normal 35px FontAwesome";
			context.fillStyle = '#FFFFFF';
			context.fillText('\uf005', xPos + width - 57, 40);
		}
		//Add "more" glyph if not unique
		if (!this.isUnique) {
			context.beginPath();
			context.arc(xPos + width - 40, yPos-10, 25, 0, 2 * Math.PI, false);
			context.fillStyle = 'green';
			context.fill();
			context.lineWidth = 5;
			context.strokeStyle = '#003300';
			context.stroke();
			context.font = "normal 35px FontAwesome";
			context.fillStyle = '#FFFFFF';
			context.fillText('\uf067', xPos + width - 52, yPos+5);

		}
		this.imageCode = canvas[0].toDataURL("image/png");
		return this.imageCode;
	};

	//TODO: DOCUMENTAR
	this.getPopUpInformation = function(visualOptions) {
		var omicsValues = {};
		var feature = this.getModel().getFeature();
		var featureGraphicalData = this.getModel().getFeatureGraphicalData();
		var visibleOmics = visualOptions.visibleOmics.filter(function(elem) {
			return elem.indexOf(feature.getFeatureType().toLowerCase() + "based") > -1;
		});

		var omicName, omicValues;
		for (var i in visibleOmics) {
			omicName = visibleOmics[i].split("#")[0];
			omicValues = feature.getOmicValues(omicName);

			if (omicValues == null) {
				omicValues = "No data";
			} else {
				omicValues = omicValues.getValues();
			}
			omicsValues[omicName] = omicValues;
		}
		var width = this.getModel().getFeatureGraphicalData().getBoxWidth() * visualOptions.adjustFactor;
		var height = this.getModel().getFeatureGraphicalData().getBoxHeight() * visualOptions.adjustFactor;

		return {
			name: feature.getName(),
			values: omicsValues,
			x: featureGraphicalData.getX() * visualOptions.adjustFactor + width / 2,
			y: featureGraphicalData.getY() * visualOptions.adjustFactor + height / 2
		};

	};

	/**
	* This function generates the component (JavaScript Object) using the content of the model
	* @returns {Object} The visual component
	*/
	this.initComponent = function(dataDistributionSummaries, visualOptions) {
		var me = this;

		//TODO: DELETE OBSERVER
		//me.getModel().deleteObserver(me);
		//TODO: SOME FEATURES HAS NaN FOR WIDTH AND POS
		var width = (this.getModel().getFeatureGraphicalData().getBoxWidth() * visualOptions.adjustFactor || 50);
		var height = (this.getModel().getFeatureGraphicalData().getBoxHeight() * visualOptions.adjustFactor || 15);
		// DEPRECATED: MapMan pathways do not have width or height set. For that, and those rare KEGG cases in which it isn't set,
		// draw a circle instead
		// var width = (this.getModel().getFeatureGraphicalData().getBoxWidth() * visualOptions.adjustFactor);
		// var height = (this.getModel().getFeatureGraphicalData().getBoxHeight() * visualOptions.adjustFactor);
		this.getModel().getFeatureGraphicalData().setBoxWidth(width);
		this.getModel().getFeatureGraphicalData().setBoxHeight(height);

		/* LEGACY CODE IN CASE WE WANT TO RESTORE POINT "BOXES" FOR OTHER DBS */
		if (width == 0 || height == 0) {
			var pointSize = 15;

			this.component = {
				id: me.componentID,
				type: "image",
				src: this.generatePoint(dataDistributionSummaries, visualOptions, pointSize),
				width: pointSize,
				height: pointSize,
				x: ((this.getModel().getFeatureGraphicalData().getX() * visualOptions.adjustFactor - pointSize / 2) || 0),
				y: ((this.getModel().getFeatureGraphicalData().getY() * visualOptions.adjustFactor - pointSize / 2)  || 0),
			};
		} else {
			this.component = {
				id: me.componentID,
				type: "image",
				src: this.generateBox(dataDistributionSummaries, visualOptions),
				width: width,
				height: height,
				x: ((this.getModel().getFeatureGraphicalData().getX() * visualOptions.adjustFactor - width / 2) || 0),
				y: ((this.getModel().getFeatureGraphicalData().getY() * visualOptions.adjustFactor - height / 2)  || 0),
			};
		}

		return this.component;
	};
	return this;
}
PA_Step4KeggDiagramFeatureSetSVGBox.prototype = new View();

//------------------------------------------------------------------------------------------------

function PA_Step4VisualOptionsView() {
	/**
	* About this view: this view (PA_Step4VisualOptionsView) is used to change
	* the visual options that affect  to STEP4 Views (color scale,
	* color references, etc.)
	*/
	/*********************************************************************
	* ATTRIBUTES
	***********************************************************************/
	this.name = "PA_Step4VisualOptionsView";

	/***********************************************************************
	* GETTERS AND SETTERS
	***********************************************************************/

	/*********************************************************************
	* OTHER FUNCTIONS
	***********************************************************************/
	/**
	* This function changes the visibility for the component.
	* @chainable
	* @param {boolean} visible, forces the component visibility
	* @return {PA_Step4VisualOptionsView} the view
	*/
	this.toggle = function(visible) {
		visible = ((visible===undefined)? ! this.getComponent().isVisible():visible);
		this.getComponent().setVisible(visible);
		return this;
	};

	/**
	* This function apply the settings that user can change
	* for the visual representation of the model (w/o reload everything).
	* - STEP 1. UPDATE THE visibleOmics OPTION
	* - STEP 2. UPDATE THE colorReferences OPTION
	* - STEP 3. UPDATE THE colorReferences OPTION
	* - STEP 4. NOTIFY THE CHANGES TO PARENT
	* @chainable
	* @returns {PA_Step4VisualOptionsView}
	*/
	this.applyVisualSettings = function() {
		/********************************************************/
		/* STEP 1. UPDATE THE visibleOmics OPTION               */
		/********************************************************/
		var selectedOptions = [];
		$("div.lateralOptionsSelector.omicSelector input:checked").each(function () {
			selectedOptions.push($(this).attr("id"));
		});
		this.getParent().setVisualOptions("visibleOmics" , selectedOptions);

		/********************************************************/
		/* STEP 2. UPDATE THE colorReferences OPTION               */
		/********************************************************/
		selectedOptions = {};
		$("div.lateralOptionsSelector input[name^=colorByCheckbox]:checked").each(function(index) {
			var omicName = $(this).attr("name").split(/_(.+)/)[1];

			selectedOptions[omicName] = $(this).val()
		});
		this.getParent().setVisualOptions("colorReferences" , selectedOptions);

		/********************************************************/
		/* STEP 3. UPDATE THE colorScale OPTION            */
		/********************************************************/
		selectedOptions = $("div.lateralOptionsSelector input[name=colorScaleCheckbox]:checked").first().val();
		this.getParent().setVisualOptions("colorScale" , selectedOptions);

		/********************************************************/
		/* STEP 4. NOTIFY THE CHANGES TO PARENT                 */
		/********************************************************/
		this.getParent().applyVisualSettings();

		return this;
	};

	/**
	* This function generates the component (EXTJS) using the content of the model
	* @returns {Ext.ComponentView} The visual component
	*/
	this.initComponent = function() {
		var me = this;
		var visualOptions = this.getParent().getVisualOptions();

		/********************************************************/
		/* STEP 1. GENERATE THE "CHOOSE OMICS TO DRAW" SECTION  */
		/********************************************************/
		var windowContent =
		'<h4>Choose the omics to draw</h4>'+
		'<div class="lateralOptionsSelector omicSelector">'+
		'  <h5>Gene based omics</h5>';

		var omicsAux = me.getParent().getGeneBasedInputOmics();
		for (var i in omicsAux) {
			windowContent +=
			' <div class="checkbox">'+
			'   <input ' + ((visualOptions.visibleOmics.indexOf(omicsAux[i].omicName + "#genebased") > -1) ? "checked" : "") + ' type="checkbox" id="' + omicsAux[i].omicName + '#genebased">'+
			'   <label for="' + omicsAux[i].omicName + '#genebased">' + omicsAux[i].omicName + '</label>'+
			' </div>';
		}

		var omicsCompounds = me.getParent().getCompoundBasedInputOmics();
		windowContent += '<h5>Compound based omics</h5>';
		for (var i in omicsCompounds) {
			windowContent +=
			' <div class="checkbox">'+
			'  <input ' + ((visualOptions.visibleOmics.indexOf(omicsCompounds[i].omicName + "#compoundbased") > -1) ? "checked" : "") + ' type="checkbox" id="' + omicsCompounds[i].omicName + '#compoundbased' + '">'+
			'  <label for="' + omicsCompounds[i].omicName + '#compoundbased">' + omicsCompounds[i].omicName + '</label>'+
			' </div>';
		}

		/********************************************************/
		/* STEP 1. GENERATE THE "COLOR BY" SECTION  */
		/********************************************************/
		windowContent +=
		'</div>' + //CLOSE "CHOOSE OMICS TO DRAW" SECTION
		'<div class="lateralOptionsSelector">' +
		'  <h4>Coloring options</h4>' +
		'  <h5>Reference values</h5>' +
		'  <div>';

		/* Add a fieldset for each omic */
		 $.each(omicsAux.concat(omicsCompounds), function(index, omicObject) {
			 var omic = omicObject.omicName;

			 windowContent +=
			 '<fieldset>' +
			 '		<legend>' + omic + '</legend>' +
			 '    <div class="radio"><input '+ ((visualOptions.colorReferences[omic] ==="p10p90")?"checked ":"") +'type="radio" id="colorByCheckbox1_' + omic + '" name="colorByCheckbox_' + omic + '" value="p10p90"><label for="colorByCheckbox1_' + omic + '">Percentiles 10 and 90</label></div>' +
			 '    <div class="radio"><input '+ ((visualOptions.colorReferences[omic] ==="absoluteMinMax")?"checked ":"") +'type="radio" id="colorByCheckbox2_' + omic + '" name="colorByCheckbox_' + omic + '" value="absoluteMinMax"><label for="colorByCheckbox2_' + omic + '">Global Min/Max (including outliers).</label></div>' +
			 '    <div class="radio"><input '+ ((visualOptions.colorReferences[omic] ==="riMinMax")?"checked ":"") +'type="radio" id="colorByCheckbox3_' + omic + '" name="colorByCheckbox_' + omic + '" value="riMinMax"><label for="colorByCheckbox3_' + omic + '">Global Min/Max (without outliers).</label></div>' +
			 '    <div class="radio"><input '+ ((visualOptions.colorReferences[omic] ==="custom")?"checked ":"") +'type="radio" id="colorByCheckbox4_' + omic + '" name="colorByCheckbox_' + omic + '" value="custom"><label for="colorByCheckbox4_' + omic + '">Custom values</label></div>' +
			 '	  <div class="radio" id="colorByCheckbox5_' + omic + '"></div>' +
			 '</fieldset>';
		 });

		//'    <div class="radio"><input type="radio" id="colorByCheckbox4" name="colorByCheckbox" value="localMinMax"><label for="colorByCheckbox4">Local Min/Max (for current pathway).</label></div>' +
		windowContent +=
		'  </div>' +
		'  <h5>Color scale</h5>' +
		'  <div>' +
		'    <div class="radio"><img class="colorScaleThumb" src="resources/images/bwrscale_120x18.jpg"><input '+ ((visualOptions.colorScale ==="bwr")?"checked ":"") +'type="radio" id="colorScaleCheckbox1" name="colorScaleCheckbox" value="bwr"><label for="colorScaleCheckbox1">Blue-White-Red</label></div>' +
		'    <div class="radio"><img class="colorScaleThumb" src="resources/images/gbrscale_120x18.jpg"><input '+ ((visualOptions.colorScale ==="rbg")?"checked ":"") +'type="radio" id="colorScaleCheckbox3" name="colorScaleCheckbox" value="rbg"><label for="colorScaleCheckbox3">Green-Black-Red</label></div>' +
		//'    <div class="radio"><input type="radio" id="colorScaleCheckbox2" name="colorScaleCheckbox" value="bwr2"><label for="colorScaleCheckbox2">Blue-White-Red (alt.)<img class="colorScaleThumb" src="resources/images/bwr2scale_120x18.jpg"></label></div>' +
		'  </div>' +
		'</div>'; //advanceOptionsPanel

		this.component = Ext.widget({
			xtype: "container", cls: "lateralOptionsPanel",  width: 300, height: ($("#mainViewCenterPanel").height() - 100),
			items:[{
				xtype: "box",
				html:
				"<div class='lateralOptionsPanel-header' style='background: #d9534f;'>" +
				'  <div class="lateralOptionsPanel-toolbar">' +
				'    <a href="javascript:void(0)" class="toolbarOption btn-danger helpTip" id="hideVisualSettingsPanelButton" title="Close this panel"><i class="fa fa-times"></i></a>' +
				'  </div>' +
				"  <h2>Visual settings</h2>" +
				"</div>" +
				"<div class='lateralOptionsPanel-body'>" +
				windowContent + '    <a href="javascript:void(0)" class="button btn-success helpTip" id="applyVisualSettingsButton" style="margin-top: 20px;margin-bottom: 20px;" title="Apply changes"><i class="fa fa-check"></i> Apply</a>' +
				"</div>",
				listeners: {
					boxready: function() {
						//SOME EVENT HANDLERS
						$("#hideVisualSettingsPanelButton").click(function() {
							me.toggle(false);
						});
						$("#applyVisualSettingsButton").click(function() {
							me.applyVisualSettings();
						});

						// CREATE CUSTOM SLIDERS FOR EACH OMIC
						var PA4View = me.getParent("PA_Step4PathwayView");
						var omicDistributions = PA4View.getDataDistributionSummaries();

						$.each(omicsAux.concat(omicsCompounds), function(index, omicObject) {
							 var omic = omicObject.omicName;
							 var omicValues = getMinMax(omicDistributions[omic], "absoluteMinMax");
							 var defaultOmicValues = [omicValues.min, omicValues.max];
							 var customOmicValues = (PA4View.visualOptions.hasOwnProperty("customValues") ?
							 (PA4View.visualOptions.customValues[omic] || defaultOmicValues) : defaultOmicValues );

							 var customSlider = Ext.create('Ext.slider.MultiCustom', {
						        renderTo: "colorByCheckbox5_" + omic,
										name: "customslider_" + omic,
						        //hideLabel: false,
						        width: 240,
						        minValue: omicValues.min,
						        maxValue: omicValues.max,
										customValues: [customOmicValues[0], customOmicValues[1]],
										disabled: ($('input[type=radio][name="colorByCheckbox_' + omic + '"]:checked').val() !== "custom"),
						   	});

								$('input[type=radio][name="colorByCheckbox_' + omic + '"]').change(function() {
									 if (this.value !== "custom") {
										 customSlider.disable();
									 }	else {
										 customSlider.enable();
									 }
								 });
							});
					},
					resize: function( view, width, height, oldWidth, oldHeight, eOpts ){
						var componentHeight = $(view.getEl().dom).outerHeight();
						var headerHeight = $(view.getEl().dom).find(".lateralOptionsPanel-header").outerHeight() + 10;
						$(view.getEl().dom).find(".lateralOptionsPanel-body").height($("#mainViewCenterPanel").height() - headerHeight - 100);
					},
					beforedestroy: function() {
						me.getModel().deleteObserver(me);
					}
				}
			}]
		});
		return this.component;
	};

	return this;
}
PA_Step4VisualOptionsView.prototype = new View();

function PA_Step4FindFeaturesView() {
	/**
	* About this view: This view displays a summary for the the current pathway
	* and a search bar. When users search for a certain text, the view is updated
	* showing the results for the search.
	*/
	/*********************************************************************
	* ATTRIBUTES
	***********************************************************************/
	this.name = "PA_Step4FindFeaturesView";
	this.items = null;
	this.pathwayDetailsView =null;
	this.searchResultsView =null;

	/***********************************************************************
	* GETTERS AND SETTERS
	***********************************************************************/

	/*********************************************************************
	* OTHER FUNCTIONS
	***********************************************************************/
	/**
	* This function changes the visibility for the component.
	* @chainable
	* @param {boolean} visible, forces the component visibility
	* @return {PA_Step4FindFeaturesView} the view
	*/
	this.toggle = function(visible) {
		visible = ((visible===undefined)? ! this.getComponent().isVisible():visible);
		this.getComponent().setVisible(visible);
		return this;
	};

	/**
	* This function finds all the features whose name matches to a given string
	* @chainable
	* @param {String} searchValue, the query text
	* @return {PA_Step4FindFeaturesView} the view
	*/
	this.searchFeatures = function(searchValue) {
		var availableTags = this.getParent().searchFeatureIndex;

		var results = {}, elemAux;
		for (var i in availableTags) {
			if (i.toLowerCase().indexOf(searchValue.toLowerCase()) !== -1) {
				elemAux = this.getParent().searchFeatureIndex[i];
				results[elemAux.getFeature().getName()] = elemAux;
			}
		}

		availableTags = Object.keys(results).sort();

		this.items = [];
		var itemAux;
		for (i in availableTags) {
			this.items.push(new PA_Step4KeggDiagramFeatureView(true).loadModel(results[availableTags[i]]).setParent(this.getParent()));
		}

		this.updateObserver();

		return this;
	};

	/**
	* TODO
	*/
	this.updateObserver = function(){
		if(this.searchResultsView === null){
			this.searchResultsView = Ext.widget({xtype: 'container', renderTo: "resultsContainer", items: []});
		}

		$("#resultsCounter").text("Found " + this.items.length + " features.");
		$("#searchResultsWrapper").show();

		this.searchResultsView.removeAll();
		var components = [];
		for(var i in this.items){
			components.push(this.items[i].getComponent());
		}
		this.searchResultsView.add(components);

		this.searchResultsView.setVisible(true);

		for(i in this.items){
			this.items[i].updateObserver();
		}

	};

	/**
	* This function shows the detailed view for selected pathway.
	* First, creates a new view of the type PA_Step3PathwayDetailsViews and
	* then load the model.
	* @chainable
	* @return {PA_Step4FindFeaturesView} the view
	*/
	this.showPathwayDetails = function(){
		//TODO: MOVER ESTO AL LOAD MODEL DE ESTA VISTA
		if(this.pathwayDetailsView === null){
			this.pathwayDetailsView = new PA_Step3PathwayDetailsView();
			this.pathwayDetailsView.getComponent("patwaysDetailsContainer");
			this.pathwayDetailsView.setParent(this);
		}

		this.pathwayDetailsView.loadModel(this.getParent().getModel());

		var omicNames = [];
		var inputOmics = this.getParent().getParent().getModel().getGeneBasedInputOmics();
		for(var i in inputOmics){
			omicNames.push(inputOmics[i].omicName);
		}
		this.pathwayDetailsView.updateObserver(omicNames, this.getParent().getParent().getModel().getDataDistributionSummaries(), this.getParent().getVisualOptions());

		return this;
	};


	/**
	* TODO: MOVER A OTRO LADO??
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

	/**
	* This function generates the component (EXTJS) using the content of the model
	* @returns {Ext.ComponentView} The visual component
	*/
	this.initComponent = function() {
		var me = this, selected, omicsAux;

		this.component = Ext.widget({
			xtype: "container", cls: "lateralOptionsPanel",  width: 300, height: ($("#mainViewCenterPanel").height() - 100),
			items:[{
				xtype: "box", html:
				"<div class='lateralOptionsPanel-header' style='background: #5bc0de;'>" +
				'  <div class="lateralOptionsPanel-toolbar">' +
				'    <a href="javascript:void(0)" class="toolbarOption btn-info helpTip" id="hideFindFeaturePanelButton" title="Close this panel"><i class="fa fa-times"></i></a>' +
				'  </div>' +
				"  <h2>Pathway information</h2>" +
				"</div>" +
				"<div class='lateralOptionsPanel-body findFeaturesContainer'>" +
				'  <div>'+
				'    <h4>Search in this pathway</h4>' +
				'    <div id="findFeaturesInput" class="input" style="width:170px; display:inline-block;"><input type="text" style="width:160px;"></div>'+
				'    <a class="button btn-info helpTip" id="findFeatureButton" style="margin: 20px 5px" title="Find features"><i class="fa fa-search"></i> Search</a>' +
				'    <div class="applyWaitMessage" style="color:#4c4c4c; margin: 10px;"> Searching...<i class="fa fa-cog fa-spin" style=" float: left; margin-right: 10px; "></i></div>' +
				'  </div>'+
				'  <div id="patwaysDetailsContainer"></div>'+
				'  <div id="searchResultsWrapper" style="display:none;">'+
				'    <a href="javascript:void(0)" id="backToPathwayDetailsButton" style="margin: 5px 0px;"><i class="fa fa-long-arrow-left"></i> Back to Pathway details</a>' +
				'    <h3 id="resultsCounter">Found N features.</h3>' +
				'    <div id="resultsContainer" style="width:245px; margin-left: 10px; padding-bottom:20px;"></div>'+
				'  </div>'+
				"</div>"
			}
		],
		listeners: {
			boxready: function() {
				me.showPathwayDetails();

				var availableTags = Object.keys(me.getParent().searchFeatureIndex).sort();
				//SOME EVENT HANDLERS
				$("#hideFindFeaturePanelButton").click(function() {
					me.toggle(false);
				});
				$("#findFeatureButton").click(function() {
					$(this).next(".applyWaitMessage").fadeIn(400, function() {
						$("#patwaysDetailsContainer").hide();
						me.searchFeatures($("#findFeaturesInput > input").val());
						$(this).hide();
					});
				});
				$("#findFeaturesInput > input").autocomplete({
					source: availableTags,
					minLength: 2
				});

				$("#backToPathwayDetailsButton").click(function() {
					// me.searchResultsView.setVisible(false);
					$("#patwaysDetailsContainer").show();
					$("#searchResultsWrapper").hide();
				});

				initializeTooltips(".helpTip");
			},
			resize: function( view, width, height, oldWidth, oldHeight, eOpts ){
				var componentHeight = $(view.getEl().dom).outerHeight();
				var headerHeight = $(view.getEl().dom).find(".lateralOptionsPanel-header").outerHeight() + 10;
				$(view.getEl().dom).find(".lateralOptionsPanel-body").height($("#mainViewCenterPanel").height() - headerHeight - 100);
			},
			beforedestroy: function() {
				if (me.items !== null) {
					for(var i in me.items){
						Ext.destroy(me.items[i].getComponent());
					}
				}
				me.getModel().deleteObserver(me);
			}
		}
	});

	return this.component;
};

return this;
}
PA_Step4FindFeaturesView.prototype = new View();

function PA_Step4GlobalHeatmapView() {
	/**
	* About this view: TODO: DOCUMENTAR
	*/

	/*********************************************************************
	* ATTRIBUTES
	***********************************************************************/
	this.name = "PA_Step4GlobalHeatmapView";
	this.showConfigurator = false;
	this.automaticUpdate = true;

	/***********************************************************************
	* GETTERS AND SETTERS
	***********************************************************************/

	/*********************************************************************
	* OTHER FUNCTIONS
	***********************************************************************/

	/**
	* This function changes the visibility for the component.
	* @chainable
	* @param {boolean} visible, forces the component visibility
	* @return {PA_Step4GlobalHeatmapView} the view
	*/
	this.toggle = function(visible) {
		visible = ((visible===undefined)? ! this.getComponent().isVisible():visible);
		this.getComponent().setVisible(visible);
		return this;
	};

	//TODO: DOCUMENTAR
	this.expand = function() {
		this.isExpanded = true;

		$("#expandHeatmapButton").hide();
		$("#shrinkHeatmapButton").show();
		this.getComponent().flex = 1;
		this.getParent().getComponent().doLayout();
	};

	//TODO: DOCUMENTAR
	this.shrink = function() {
		this.isExpanded = false;
		$("#expandHeatmapButton").show();
		$("#shrinkHeatmapButton").hide();

		this.getComponent().flex = 0;
		this.getParent().getComponent().doLayout();
	};

	//TODO: DOCUMENTAR
	this.download = function() {
		throw "Not implemented"
	};

	//TODO: DOCUMENTAR
	this.updateObserver = function() {
		var start = new Date();

		//*********************************************************************************
		//STEP 0. READ THE SETTINGS
		// - READ SELECTED OMICS
		//AUXILIAR VARIABLES
		var divName, referenceOmics, featureOmicValues, omicValue,
		dataMatrix = {},
		otherDataMatrix = {},
		selectedOmics = {},
		kValues = [];

		//GET USER SELECTION FROM globalHeatmapConfigurator
		$("div.globalHeatmapConfigurator div.omicSelection input[type=checkbox]:checked").each(function() {
			var omicName = $(this).val();
			var option = this.id.replace("-check", "-radio");
			option = $("input[name=" + option + "]:checked").val();
			selectedOmics[omicName] = option;
		});

		// - CHECK IF CLUSTERIZE WAS SELECTED
		var clusterize = $("#clusterize-check").is(":checked");
		if (clusterize) {
			clusterize = $("input[name=clusterize-radio]:checked").val();
			$(".kSelection input").each(function() {
				kValues.push(this.value);
			});
		}

		// - CHECK IF FORCE ORDER WAS SELECTED
		var forceOrder = $("#order-check").is(":checked");

		//*********************************************************************************
		// STEP 2. CONFIGURE CLUSTERIZE OPTIONS
		if (clusterize) {
			clusterize = {
				algorithm: clusterize,
				distance: "euclidean",
				linkage: "complete",
				dendogram: ((clusterize === "hierarchical") ? {
					width: 80,
					reorder: true,
					color: "#333"
				} : false)
			};
		}

		//*********************************************************************************
		//STEP 3. INITIALIZE THE DIV CONTENT AND THE DATA MATRIX
		//CLEAR PREVIOUS CONTENT (IF ANY)
		var globalHeatmapContainer = $("#globalHeatmapContainer");
		globalHeatmapContainer.empty();
		//GENERATE ALL CONTAINERS
		for (var omicName in selectedOmics) {
			divName = "globalHeatmapContainer-" + omicName.toLowerCase().replace(/ /g, "-");
			globalHeatmapContainer.append("<div class='omicHeatmapsContainer'>" + "<h3>" + omicName + "</h3>" + "<div id='" + divName + "'></div></div>");
			dataMatrix[omicName] = {};
			otherDataMatrix[omicName] = {};
		}

		//GENERATE THE MATRIX OF DATA GROUPED BY OMIC NAME
		var matchedGenes = this.getModel().getMatchedGenes();
		var omicsValues = this.getParent().getOmicsValues();

		for (var i = matchedGenes.length; i--;) {
			//GET THE VALUES FOR CURRENT GENE
			featureOmicValues = omicsValues[matchedGenes[i]].getOmicsValues();

			for (var j = featureOmicValues.length; j--;) {
				omicValue = featureOmicValues[j];

				//SKIP OMIC IF NOT SELECTED
				if (selectedOmics[omicValue.omicName] === undefined) {
					continue;
				}

				//PUSH IF USER CHOOSE all OR IF FEATURE IS RELEVANT
				if (selectedOmics[omicValue.omicName] === "all" || omicValue.isRelevant()) {
					referenceOmics = dataMatrix;
				} else {
					referenceOmics = otherDataMatrix;
				}
				referenceOmics[omicValue.omicName][omicsValues[matchedGenes[i]].getName()] = {
					keggName: omicsValues[matchedGenes[i]].getName(),
					inputName: omicValue.getInputName(),
					isRelevant: omicValue.isRelevant(),
					values: omicValue.getValues()
				};
			}
		}

		if (forceOrder) {
			referenceOmics = Object.keys(selectedOmics);
			if (clusterize) {
				clusterize.k = kValues[0];
			}

			this.generateContent(referenceOmics, dataMatrix, otherDataMatrix, clusterize, 0);
		} else {
			var k = 0;
			for (var omicName in selectedOmics) {
				var aux = {};
				aux[omicName] = dataMatrix[omicName];

				if (clusterize) {
					clusterize.k = kValues[k];
				}
				k++;

				this.generateContent([omicName], aux, null, clusterize, 0);
			}
		}

		//CLEAR PREVIOUS CONTENT (IF ANY)
		$(".updateMessageContainer").hide();

		start = (new Date() - start);
		this.automaticUpdate = (start < 10000);
		console.log('Rendered in ' + start + ' ms');
	};

	//TODO: DOCUMENTAR
	this.generateContent = function(referenceOmics, dataMatrix, otherDataMatrix, clusterize, level) {
		var referenceOmic = referenceOmics.shift();

		if (referenceOmic === undefined) {
			return;
		}
		//*********************************************************************************
		//STEP 1. GENERATE THE HEATMAP FOR REFERENCE OMIC
		var omicValues = Object.values(dataMatrix[referenceOmic]);
		var showLabels = true;
		var divName = "globalHeatmapContainer-" + referenceOmic.toLowerCase().replace(/ /g, "-");
		var divWidth = 200;

		if (omicValues.length === 0) {
			$("#" + divName).append("<h4 style='width:" + divWidth + "px;'>No data</h4>");
			return;
		}

		divWidth += (showLabels) ? 50 : 0;
		divWidth += (clusterize && clusterize.dendogram) ? 80 : 0;

		var divHeight = (omicValues.length + 1) * 30;

		$("#" + divName).append("<div id='" + divName + "-" + level + "' class='heatmapContainer' style='width:" + divWidth + "px; height:" + divHeight + "px'></div>");
		var referenceHeatmap = this.generateHeatmap(divName + "-" + level, referenceOmic, omicValues, this.getParent().getDataDistributionSummaries(), this.getParent().getVisualOptions(), showLabels, clusterize);

		//*********************************************************************************
		//STEP 2. FOR EACH GENE IN THE REFERENCE HEATMAP, GENERATE AN AUXILIAR MATRIX
		//        FOLLOWING THE ORDER IN THE HEATMAP
		var orderedGenes = referenceHeatmap.yAxis[0].categories;
		var featureName;
		for (var omicName in referenceOmics) {
			omicName = referenceOmics[omicName];
			omicValues = [];
			//EXTRACT GENES FOR EACH REMAINING OMIC
			for (var i = orderedGenes.length; i--;) {
				featureName = orderedGenes[i].split("#")[0].replace("* ", "");

				if (dataMatrix[omicName][featureName] !== undefined) {
					omicValues.push(dataMatrix[omicName][featureName]);
					delete dataMatrix[omicName][featureName]
					;
				} else if (otherDataMatrix && otherDataMatrix[omicName][featureName] !== undefined) {
					omicValues.push(otherDataMatrix[omicName][featureName]);
				} else {
					omicValues.push({
						keggName: featureName,
						inputName: "NO DATA",
						isRelevant: false,
						values: null
					});
				}
			}

			divName = "globalHeatmapContainer-" + omicName.toLowerCase().replace(/ /g, "-");
			divWidth = 200;
			divWidth += (showLabels) ? 50 : 0;
			$("#" + divName).append("<div id='" + divName + "-" + level + "' class='heatmapContainer' style='width:" + divWidth + "px; height:" + divHeight + "px;'></div>");
			this.generateHeatmap(divName + "-" + level, omicName, omicValues, this.getParent().getDataDistributionSummaries(), this.getParent().getVisualOptions(), true, false, referenceHeatmap.xAxis[0].categories.length);
		}
		// STEP 3. RECURSIVE CALL
		this.generateContent(referenceOmics, dataMatrix, otherDataMatrix, clusterize, level + 1);
	};

	//TODO: DOCUMENTAR
	this.generateHeatmap = function(targetID, omicName, omicsValues, dataDistributionSummaries, visualOptions, showLabels, clusterize, maxX) {
		var featureValues,
		x = 0,
		y = 0,
		series = [],
		yAxisCat = [],
		serie,
		later = [],
		position;
		maxX = (maxX || -1);

		showLabels = (showLabels === undefined) ? true : showLabels;

		//STEP 1. GENERATE THE DATA MATRIX
		for (var i = omicsValues.length - 1; i >= 0; i--) {
			//restart the x coordinate
			x = 0;
			var limits = getMinMax(dataDistributionSummaries[omicName], visualOptions.colorReferences[omicName]);

			//Get the values and the name for the new serie
			featureValues = omicsValues[i].values;

			shownameValue = omicsValues[i].inputName != omicsValues[i].originalName && omicsValues[i].originalName !== undefined ?
				omicsValues[i].originalName + ": " + omicsValues[i].inputName :
				omicsValues[i].inputName

			serie = {
				name: (omicsValues[i].isRelevant === true ? "* " : "") + omicsValues[i].keggName + "#" + shownameValue,
				data: [],
				turboThreshold: Number.MAX_VALUE
			};
			//Add the name for the row (e.g. MagoHb or "miRNA my_mirnaid_1")
			yAxisCat.push((omicsValues[i].isRelevant === true ? "* " : "") + omicsValues[i].keggName + "#" + shownameValue);

			if (featureValues !== null) {
				for (var j in featureValues) {
					serie.data.push({
						x: x,
						y: y,
						value: featureValues[j],
						color: getColor(limits, featureValues[j], visualOptions.colorScale)
					});
					x++;
					maxX = Math.max(maxX, x);
				}
				series.push(serie);
			} else {
				/* IF THERE IS NOT DATA FOR THIS FEATURE, WE WILL ADD
				* A GRAY ROW, BUT FIRST WE NEED SOME INFORMATION (MAX X), SO WE WILL ADD
				* LATER, NOW JUST ADD A NULL, AND REPLACE LATER*/
				later.push({
					serie: serie,
					position: y
				});
				series.push(null);
			}
			y++;
		}

		for (var i in later) {
			x = 0;
			serie = later[i].serie;
			position = later[i].position;

			for (var j = 0; j < maxX; j++) {
				serie.data.push([x, position, null]);
				x++;
			}
			series[position] = serie;
		}

		var xAxisCat = [];
		for (var i = 0; i < maxX; i++) {
			xAxisCat.push("Timepoint " + (i + 1));
		}

		//STEP 2. DRAW THE HEATMAP
		var heatmap = new Highcharts.Chart({
			chart: {
				type: 'heatmap',
				renderTo: targetID
			},
			title: null,
			legend: {enabled: false},
			credits: {enabled: false},
			heatmapSelector: {
				color: '#000',
				lineWidth: 3
			},
			clusterize: clusterize,
			tooltip: {
				borderColor: "#333",
				formatter: function() {
					var title = this.point.series.name.split("#");
					title[1] = (title.length > 1) ? title[1] : "";
					return "<b>" + title[0].replace("*", '<i class="relevantFeature"></i>') + "</b><br/>" + "<i class='tooltipInputName'>" + title[1] + "</i>" + (this.point.value === null ? "No data" : this.point.value);
				},
				useHTML: true
			},
			xAxis: {
				categories: xAxisCat,
				labels: {enabled: false}
			},
			yAxis: {
				categories: yAxisCat,
				title: null,
				width: 50,
				labels: {
					formatter: function() {
						if (this.value.split !== undefined) {
							var title = this.value.split("#");
							title[1] = (title.length > 1) ? title[1] : "No data";
							return '<span style="width: 50px;display: block; text-align: right;">' + ((title[0].length > 10) ? title[0].substring(0, 5) + "..." + title[0].substring(title[0].length - 4, title[0].length) : title[0]).replace("*", '<i class="relevantFeature"></i>') + '</br><i class="tooltipInputName yAxisLabel">' + ((title[1].length > 10) ? title[1].substring(0, 5) + "..." + title[1].substring(title[1].length - 4, title[1].length) : title[1]) + '</i></span>';
						}
					},
					style: {fontSize: "9px"},
					useHTML: true,
					enabled: showLabels
				}
			},
			series: series,
			plotOptions: {
				heatmap: {borderColor: "#000000",borderWidth: 0.5},
				series: {
					point: {
						events: {
							mouseOver: function() {
								var me = this;
								//FOR EACH HEATMAPS
								$("div.heatmapContainer").each(function() {
									var heatmap = $(this).highcharts();
									var serie = heatmap.series[me.series.index];
									var keggName = me.series.name.split("#")[0].replace("* ", "");

									if (serie !== undefined && serie.name.split("#")[0].replace("* ", "") === keggName) {
										serie.showHeatmapSelector(undefined, me.y);
										return true;
									} else {
										for (var i in heatmap.series) {
											if (heatmap.series[i].name.split("#")[0].replace("* ", "") === keggName) {
												heatmap.series[i].showHeatmapSelector();
												return true;
											}
										}
									}
									heatmap.series[0].hideHeatmapSelector();
								});
							}
						}
					}
				}
			}
		});

		return heatmap;
	};

	/**
	* This function apply the settings that user can change
	* for the visual representation of the model (w/o reload everything).
	* - TODO: DOCUMENTAR
	* @chainable
	* @returns {PA_Step4GlobalHeatmapView}
	*/
	this.applyVisualSettings = function() {
		var me = this;
		debugger;
		if (this.automaticUpdate === false) {
			$(".updateMessageContainer").fadeIn();
			return;
		}
		$(".applyWaitMessage").fadeIn(400, function() {
			me.updateObserver();
			$(".applyWaitMessage").fadeOut();
		});

		return this;
	};

	/**
	* This function generates the component (EXTJS) using the content of the model
	* @returns {Ext.ComponentView} The visual component
	*/
	this.initComponent = function() {
		var me = this, divName;

		var htmlCode =
		"<h4>Choose the omics to draw</h4>" +
		'<span class="infoTip"><span style=" color: rgb(158, 58, 179); font-weight: bold; ">Drag and drop</span> to change the order in which heatmaps will be drawn.</span>' +
		'<div id="omicSelectionWrapper">';

		var omicNames = Object.keys(this.model.getSignificanceValues());
		//1. GENERATE THE OMIC SELECTORS (WHICH OMIC SHOULD BE PAINTED)
		for (var i in omicNames) {
			//CHECK IF WE HAVE VALUES FOR THIS OMIC IN CURRENT PATHWAY
			//TODO: allow metabolomics in the heatmap
			if (omicNames[i].toLowerCase() !== "metabolomics" && this.getModel().getSignificanceValues()[omicNames[i]][0] !== 0) {
				divName = "lateralOptionsSelector-" + omicNames[i].toLowerCase().replace(/ /g, "-");
				htmlCode +=
				'<div class="lateralOptionsSelector omicSelection">' +
				' <div class="omicPosition">' + (parseInt(i) + 1) + '</div>'+
				' <div>'+
				'   <div class="checkbox"><input checked type="checkbox" id="' + divName + '-check" value="' + omicNames[i] + '"><label for="' + divName + '-check">' + omicNames[i] + '</label></div>' +
				'   <div class="radio"><input type="radio" id="' + divName + '-radio1" name="' + divName + '-radio" value="all"><label for="' + divName + '-radio1">All features (Genes or compounds)</label></div>' +
				'   <div class="radio"><input checked type="radio" id="' + divName + '-radio2" name="' + divName + '-radio" value="relevant"><label for="' + divName + '-radio2">Only relevant features</label></div>' +
				' </div>' +
				'</div>';
			}
		}

		htmlCode +=
		'</div>' +
		"<h4>Advanced options</h4>" + //2. GENERATE ADVANCED OPTIONS
		'<span class="infoTip">Depending on the selected settings, heatmap generation can take up to 10 seconds.</span>' +
		' <div class="checkbox"><input type="checkbox" id="order-check"><label for="order-check"> Force order for features.</label></div>' + // 2.1 ENABLE / DISABLE ORDERING
		' <div class="checkbox"><input checked type="checkbox" id="clusterize-check"><label for="clusterize-check"> Clusterize data</label></div>' + // 2.2 ENABLE / DISABLE CLUSTERING
		' <div class="lateralOptionsSelector clusterSelection">' +
		'    <div class="radio"><input checked type="radio" id="clusterize-hcluster" name="clusterize-radio" value="hierarchical"><label for="clusterize-hcluster">Hierarchical clustering </label></div>' +
		'    <div class="radio"><input  type="radio" id="clusterize-kcluster" name="clusterize-radio" value="kmeans"><label for="clusterize-kcluster">K-means clustering </label></div>' +
		'    <div id="kMeansSelectors" style="display:none; margin-left:50px;">' + // 2.3 SET VALUES FOR K FOR EACH OMIC
		'    <span class="infoTip">Choose the number of clusters (k) for each omic.</span>';
		for (var i in omicNames) {
			//CHECK IF WE HAVE VALUES FOR THIS OMIC IN CURRENT PATHWAY
			var k = this.getModel().getSignificanceValues()[omicNames[i]][0];
			if (k !== 0) {
				//DEFAULT OPTION k = SQRT(N/2), rounded upwards
				k = Math.ceil(Math.sqrt(k / 2));

				divName = "kMeansSelector-" + omicNames[i].toLowerCase().replace(/ /g, "-");
				htmlCode +=
				'      <div id="' + divName + '" class="lateralOptionsSelector kSelection">' +
				'        <label>' + omicNames[i] + ': </label> <input type="number" min="1" step="1" value="' + k + '" SIZE="6">' +
				'      </div>';
			}
		}
		htmlCode +=
		'     </div>' + //kMeansSelectors
		'</div>'; //clusterSelection

		this.component = Ext.widget({
			xtype: "box", cls: "lateralOptionsPanel", flex: 0,  height: ($("#mainViewCenterPanel").height() - 100),
			resizable: {
				handles: 'w',
				listeners: {
					beforeresize: function() {
						return !me.isExpanded;
					},
					resize: function(resizer, width, height) {
						me.getParent().adjustChildrenWidth();
					}
				}
			},
			previousWidth: 400, width: 400, minWidth: 400, html:
			'<div class="lateralOptionsPanel-header" style="background: #55c9a6;">' +
			'  <div class="lateralOptionsPanel-toolbar">' +
			'    <a href="javascript:void(0)" class="toolbarOption btn-secondary helpTip" id="hideHeatmapPanelButton" title="Hide this panel"><i class="fa fa-times"></i></a>' +
			'    <a href="javascript:void(0)" class="toolbarOption btn-secondary helpTip" id="configureHeatmapButton" title="Configure heatmap"><i class="fa fa-cogs"></i></a>' +
			'    <a href="javascript:void(0)" class="toolbarOption btn-secondary helpTip" id="expandHeatmapButton" title="Expand this panel"><i class="fa fa-expand"></i></a>' +
			'    <a href="javascript:void(0)" class="toolbarOption btn-secondary helpTip" id="shrinkHeatmapButton" style="display:none;"  title="Shrink this panel"><i class="fa fa-compress"></i></a>' +
			// '    <a href="javascript:void(0)" class="toolbarOption helpTip" id="downloadHeatmapButton"><i class="fa fa-download"></i></a>' +
			'  </div>' +
			"  <h2>Global heatmap</h2>" +
			"</div>" +
			"<div class='lateralOptionsPanel-body globalHeatmapView-body'>" +
			'  <p>This panel contains the heatmap for all the features involved on this pathway. <br>Choose the visible omics features will be visible using the <i class="fa fa-cogs"></i> Settings button.</p>' +
			'  <div class="updateMessageContainer"> <h3>Visual changes detected! </h3> <p>Some visual settings changed recently but the Heatmap content did not change.<br>Click <a id="refreshHeatmap" href="javascript:void(0)">here</a> if you want to refresh the Heatmap content. </p> </div>' +
			'  <div class="globalHeatmapConfigurator" ' + (this.showConfigurator ? 'style="display:none"' : '') + '>' +
			htmlCode +
			'    <a href="javascript:void(0)" class="button btn-success helpTip" id="updateHeatmapButton" title="Apply changes"><i class="fa fa-check"></i> Apply</a>' +
			'    <div class="applyWaitMessage"><i class="fa fa-cog fa-spin"></i> Drawing heatmap...</div>' +
			'  </div>' +
			"  <div id='globalHeatmapContainer'></div>" +
			"</div>",
			listeners: {
				boxready: function() {
					//SOME EVENT HANDLERS
					$("#configureHeatmapButton").click(function() {
						$(".globalHeatmapConfigurator").slideToggle(400, function() {
							if ($(this).css("display") === "block") {
								$('.globalHeatmapView-body').animate({
									scrollTop: ($(".globalHeatmapConfigurator").offset().top)
								}, 500);
							}
						});
					});
					$("#hideHeatmapPanelButton").click(function() {
						me.getParent().hideGlobalHeatmapPanel();
					});
					$("#updateHeatmapButton").click(function() {
						$(this).next(".applyWaitMessage").fadeIn(400, function() {
							me.updateObserver();
							$(".globalHeatmapConfigurator").slideUp();
							$(this).hide();
						});
					});
					$("#refreshHeatmap").click(function() {
						me.updateObserver();
					});
					$("#expandHeatmapButton").click(function() {
						me.expand();
					});
					$("#shrinkHeatmapButton").click(function() {
						me.shrink();
					});
					$("#downloadHeatmapButton").click(function() {
						me.download();
					});
					$("#clusterize-check").click(function() {
						$(".clusterSelection").slideToggle();
					});

					$("input[name='clusterize-radio']").change(function() {
						if ($(this).val() !== "kmeans") {
							$("#kMeansSelectors").slideUp();
						} else {
							$("#kMeansSelectors").slideDown();
						}
					});

					//INITIALIZE THE DRAG AND DROP
					dragula($("#omicSelectionWrapper")[0], {
						moves: function(el, container, handle) {
							if (handle.tagName === "LABEL") {
								return false;
							}
							return true;
						},
					}).on("drop", function(el, container, source) {
						$(".omicPosition").each(function(index) {
							$(this).text(index + 1);
						});
					});

					initializeTooltips(".helpTip");
				},
				resize: function( view, width, height, oldWidth, oldHeight, eOpts ){
					var componentHeight = $(view.getEl().dom).outerHeight();
					var headerHeight = $(view.getEl().dom).find(".lateralOptionsPanel-header").outerHeight() + 10;
					$(view.getEl().dom).find(".lateralOptionsPanel-body").height($("#mainViewCenterPanel").height() - headerHeight - 100);
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
PA_Step4GlobalHeatmapView.prototype = new View();

//------------------------------------------------------------------------------------------------

function PA_Step4DetailsView() {
	/*********************************************************************
	* ATTRIBUTES
	***********************************************************************/
	this.name = "PA_Step4DetailsView";
	this.items = null;
	this.targetID = null;

	/***********************************************************************
	* GETTERS AND SETTERS
	***********************************************************************/
	this.loadModel = function (model) {
		//UNLINK THE PREVIOUS MODEL (IF ANY)
		// if (this.model !== null) {
		// 	this.model.deleteObserver(this);
		// }
		this.model = model;
		//model.addObserver(this);

		var features = this.getModel().getFeatures();

		this.items = [];
		for (var i in features) {
			this.items.push(new PA_Step4KeggDiagramFeatureView().loadModel(features[i]).setParent(this));
		}
		return this;
	};

	/***********************************************************************
	* GETTERS AND SETTERS
	***********************************************************************/
	this.getTargetID = function () {
		return this.targetID;
	};

	/***********************************************************************
	* OTHER FUNCTIONS
	***********************************************************************/
	/**
	* This function changes the visibility for the component.
	* @chainable
	* @param {boolean} visible, forces the component visibility
	* @return {PA_Step4DetailsView} the view
	*/
	this.toggle = function(visible) {
		visible = ((visible===undefined)? ! this.getComponent().isVisible():visible);
		this.getComponent().setVisible(visible);
		return this;
	};

	this.expand = function () {
		this.isExpanded = true;

		$("#expandFeatureSetButton").hide();
		$("#shrinkFeatureSetButton").show();

		this.getComponent().flex = 1;
		this.getParent().getComponent().doLayout();
	};

	this.shrink = function () {
		this.isExpanded = false;
		$("#expandFeatureSetButton").show();
		$("#shrinkFeatureSetButton").hide();

		this.getComponent().flex = 0;
		this.getParent().getComponent().doLayout();
	};

	this.updateObserver = function () {
		var featureSetElems = this.getModel().getFeatures();
		var featureType = featureSetElems[0].getFeature().getFeatureType();
		var entriesTable = {};

		/**
		* This function fills recursively a table ordering by omicType
		*/
		var addTableEntrie = function (omicValue, featureName, entrieName) {
			if (omicValue.isCompoundOmicsValue()) {
				var omicValues = omicValue.getValues();
				for (var i in omicValues) {
					addTableEntrie(omicValues[i], featureName, entrieName + omicValue.getName() + "#");
				}
			} else if (omicValue.isVisibleAtFeatureFamilyDetails()) {
				if (entrieName === "") {
					entrieName = omicValue.getOmicName();
				}
				if (entriesTable[entrieName] == null) {
					entriesTable[entrieName] = [];
				}
				entriesTable[entrieName].push({
					keggName: featureName + ((entrieName === omicValue.getOmicName()) ? "" : " " + omicValue.getOmicName()),
					inputName: omicValue.inputName,
					originalName: omicValue.originalName,
					isRelevant: omicValue.isRelevant(),
					values: omicValue.getValues()
				});
			}
		};

		var omicValues, featureName;
		for (var i in featureSetElems) {
			featureName = featureSetElems[i].getFeature().getName();
			omicValues = featureSetElems[i].getFeature().getOmicsValues();
			for (var j in omicValues) {
				addTableEntrie(omicValues[j], featureName, "");
			}
		}

		var omicNames = Object.keys(entriesTable).sort();
		var elem = $("#featureFamilyOverviewContainer");
		elem.empty();

		var divWidth = elem.width() - 400;

		var heatmap, plot, divId, htmlCode;
		for (var i in omicNames) {
			divId = omicNames[i].replace(" ", "_");
			htmlCode =
			"<div class='contentbox'>" +
			"  <h3>" + omicNames[i].replace("#", " ") + "</h3>" +
			"  <div class='PA_step5_heatmapContainer' id='" + divId + "_heatmapContainer'  style='height: " + ((entriesTable[omicNames[i]].length * 30) + 100) + "px'><i class='fa fa-cog fa-spin'></i> Loading..</div>" +
			"  <div class='PA_step5_plotContainer' id='" + divId + "_plotContainer'  style='width:" + divWidth + "px;height: " + ((entriesTable[omicNames[i]].length * 30) + 100) + "px'><i class='fa fa-cog fa-spin'></i> Loading..</div>" +
			"</div>";
			elem.append(htmlCode);

			//CREATE THE HEATMAP CONTAINER AND THE HEATMAP CHART
			heatmap = this.generateHeatmap(divId + "_heatmapContainer", omicNames[i].split("#")[0], entriesTable[omicNames[i]], this.getParent("PA_Step4PathwayView").getDataDistributionSummaries(), this.getParent("PA_Step4PathwayView").getVisualOptions());
			plot = this.generatePlot(divId + "_plotContainer", omicNames[i].split("#")[0], entriesTable[omicNames[i]], this.getParent("PA_Step4PathwayView").getDataDistributionSummaries(), divId + "_plotlegendContainer", this.getParent("PA_Step4PathwayView").getVisualOptions());
		}

		$(".featureSetOptionsToolbar").next("h2").html(featureType + " family overview");

		var components = [];
		for (var i in this.items) {
			components.push(this.items[i].getComponent());
		}

		this.getComponent().queryById("itemsContainer").removeAll(false);
		this.getComponent().queryById("itemsContainer").add(components);

		for(i in this.items){
			this.items[i].updateObserver();
		}
	};

	this.generateHeatmap = function (targetID, omicName, omicsValues, dataDistributionSummaries, visualOptions) {
		var featureValues, x = 0, y = 0, maxX = -1, series = [], yAxisCat = [], serie;

		for (var i in omicsValues) {
			//restart the x coordinate
			x = 0;
			//Get the values and the name for the new serie
			featureValues = omicsValues[i].values;
			shownameValue = omicsValues[i].inputName != omicsValues[i].originalName && omicsValues[i].originalName !== undefined ?
				omicsValues[i].originalName + ": " + omicsValues[i].inputName :
				omicsValues[i].inputName

			serie = {name: (omicsValues[i].isRelevant === true ? "* " : "") + omicsValues[i].keggName + "#" + shownameValue, data: []};
			//Add the name for the row (e.g. MagoHb or "miRNA my_mirnaid_1")
			yAxisCat.push((omicsValues[i].isRelevant === true ? "* " : "") + omicsValues[i].keggName + "#" + shownameValue);

			var limits = getMinMax(dataDistributionSummaries[omicName], visualOptions.colorReferences[omicName]);

			for (var j in featureValues) {
				serie.data.push({
					x: x,
					y: y,
					value: featureValues[j],
					color: getColor(limits, featureValues[j], visualOptions.colorScale)
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
			heatmapSelector: {color: '#000', lineWidth: 3},
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
						return '<span style="width: 100px;display: block;   text-align: right;">' + ((title[0].length > 14) ? title[0].substring(0, 14) + "..." : title[0]).replace("*", '<i class="relevantFeature"></i>') +
						'</br><i class="tooltipInputName yAxisLabel">' + ((title[1].length > 14) ? title[1].substring(0, 14) + "..." : title[1]) + '</i></span>';
					},
					style: {fontSize: "9px"}, useHTML: true
				}
			},
			series: series,
			plotOptions: {
				heatmap: {
					borderColor: "#000000",
					borderWidth: 0.5,
				},
				series: {
					point: {
						events: {
							mouseOver: function () {
								var plot = $(this.series.chart.container).parent().next().highcharts();
								for (var i in plot.series) {
									if (plot.series[i].name !== this.series.name) {
										plot.series[i].graph && plot.series[i].graph.attr("stroke", "#E2E2E2");
										plot.series[i].markerGroup && plot.series[i].markerGroup.attr("visibility", "hidden");
									}
								}
							},
							mouseOut: function () {
								var plot = $(this.series.chart.container).parent().next().highcharts();
								for (var i in plot.series) {
									plot.series[i].graph && plot.series[i].graph.attr("stroke", plot.series[i].color);
									plot.series[i].markerGroup && plot.series[i].markerGroup.attr("visibility", "visible");
								}
							}
						}
					}
				}
			}
		});

		return heatmap;
	};

	this.generatePlot = function (targetID, omicName, omicsValues, dataDistributionSummaries, legendContainerId, visualOptions) {
		var series = [], maxX = -1;
		var yAxisItem = {title: null}, omicsValue, auxValues;

		var limits = getMinMax(dataDistributionSummaries[omicName], visualOptions.colorReferences[omicName]);


		for (var i in omicsValues) {
			auxValues = [];
			omicsValue = omicsValues[i];
			maxX = Math.max(maxX, omicsValue.values.length);

			for (var j in omicsValue.values) {
				auxValues.push({y: omicsValue.values[j], marker: ((omicsValue.values[j] > limits.max || omicsValue.values[j] < limits.min) ? {fillColor: '#ff6e00'} : null)});
			}

			series.push({
				name: (omicsValue.isRelevant === true ? "* " : "") + omicsValue.keggName + "#" + omicsValue.inputName,
				type: 'spline',
				data: auxValues
			});
		}

		if (limits.max !== limits.absMax && limits.min !== limits.absMin) {
			yAxisItem.plotLines = [
				{label: {text: 'min', align: 'right', style: {color: 'gray'}}, color: '#dedede', value: limits.min, width: 1},
				{label: {text: 'max', align: 'right', style: {color: 'gray'}}, color: '#dedede', value: limits.max, width: 1}
			];
		}

		var xAxisCat = [];
		for (var i = 0; i < maxX; i++) {
			xAxisCat.push("Timepoint " + (i + 1));
		}
		var plot = new Highcharts.Chart({
			chart: {renderTo: targetID},
			title: null, legend: {enabled: false}, credits: {enabled: false},
			tooltip: {
				borderColor: "#333",
				formatter: function () {
					var title = this.point.series.name.split("#");
					title[1] = (title.length > 1) ? title[1] : "";
					return "<b>" + title[0].replace("*", '<i class="relevantFeature"></i>') + "</b><br/>" + "<i class='tooltipInputName'>" + title[1] + "</i>" + (this.point.y === null ? "No data" : this.point.y);
				},
				useHTML: true
			},
			xAxis: [{categories: xAxisCat, labels: {enabled: false}}],
			yAxis: yAxisItem,
			series: series
		});

		return plot;
	};

	this.initComponent = function () {
		var me = this;

		this.component = Ext.widget({
			xtype: "container", cls: "lateralOptionsPanel", flex: 0, width: 400, minWidth: 400,  height: ($("#mainViewCenterPanel").height() - 100),
			resizable: {
				handles: 'w',
				listeners: {
					beforeresize: function () {
						return !me.isExpanded;
					},
					resize: function (resizer, width, height) {
						me.getParent().adjustChildrenWidth();
					}
				}
			},
			items: [{
				xtype: 'box', html:
				'<div class="lateralOptionsPanel-header" style="background: #55c9a6;">' +
				'  <div class="lateralOptionsPanel-toolbar">' +
				'    <a class="toolbarOption btn-secondary helpTip" id="hideFeatureSetButton" title="Hide this panel"><i class="fa fa-times"></i></a>' +
				'    <a class="toolbarOption btn-secondary helpTip" id="expandFeatureSetButton" title="Expand this panel"><i class="fa fa-expand"></i></a>' +
				'    <a class="toolbarOption btn-secondary helpTip" id="shrinkFeatureSetButton" style="display:none;"  title="Shrink this panel"><i class="fa fa-compress"></i></a>' +
				'  </div>' +
				"  <h2>Feature set overview</h2>" +
				"</div>"
			},{
				xtype: "container", cls: "lateralOptionsPanel-body",
				items: [
					{xtype: "box", html: '<h2> Features in this set </h2>'},
					{xtype: "container", itemId: "itemsContainer", style:"padding:10px;", items: []},
					{xtype: "box", html: '<h2> Values by omic type</h2>'},
					{xtype: 'box', html: "<div id='featureFamilyOverviewContainer'></div>"}
				]
			}],
			listeners: {
				boxready: function () {
					$("#hideFeatureSetButton").click(function () {
						me.getParent().hideFeatureSetDetails();
					});
					$("#expandFeatureSetButton").click(function () {
						me.expand();
					});
					$("#shrinkFeatureSetButton").click(function () {
						me.shrink();
					});
					initializeTooltips(".helpTip");
				},
				beforedestroy: function () {
					me.getModel().deleteObserver(me);
				},
				resize: function (view, width) {
					var componentHeight = $(view.getEl().dom).outerHeight();
					var headerHeight = $(view.getEl().dom).find(".lateralOptionsPanel-header").outerHeight() + 10;
					$(view.getEl().dom).find(".lateralOptionsPanel-body").height($("#mainViewCenterPanel").height() - headerHeight - 100);

					$(".PA_step5_plotContainer").width(Math.max(300, width - 400));
					$(".PA_step5_plotContainer .highcharts-container").width(Math.max(300, width - 400));
					$(".PA_step5_plotContainer").each(function () {
						$(this).highcharts().reflow();
					});
				}
			}
		});

		return this.component;
	};

	return this;

}
PA_Step4DetailsView.prototype = new View();
