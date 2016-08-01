//# sourceURL=PA_Step2Views.js
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
 * - PA_Step2JobView
 * - PA_Step2CompoundSetView
 * - PA_Step2CompoundView
 *
 */
//Ext.require('Ext.chart.*');

function PA_Step2JobView() {
	/*********************************************************************
	 * ATTRIBUTES
	 ***********************************************************************/
	this.name = "PA_Step2JobView";
	this.items = [];

	/*********************************************************************
	 * GETTERS AND SETTERS
	 ***********************************************************************/
	this.loadModel = function(jobModel) {
		if (this.model !== null) {
			this.model.deleteObserver(this);
		}

		this.model = jobModel;
		var foundCompounds = this.model.getFoundCompounds();
		var compoundSetView = null;
		for (var i in foundCompounds) {
			compoundSetView = new PA_Step2CompoundSetView();
			compoundSetView.loadModel(foundCompounds[i]);
			foundCompounds[i].addObserver(compoundSetView);
			this.items.push(compoundSetView);
		}
	};

	/*********************************************************************
	 * OTHER FUNCTIONS
	 ***********************************************************************/
	this.initComponent = function() {
		var me = this;

		var dataDistribution = me.getModel().getDataDistributionSummaries(), aux = null;

		var omicSummaryPanelComponents = [{
			xtype: 'box',
			cls: "contentbox omicSummaryBox", minHeight: 230,
			html: '<div id="about">' +
				'  <h2 >Feature ID/name translation summary <span class="helpTip" title="For example, for Gene Expression data, the diagram indicated the percentage of the input genes (names or identifiers) which were successfully mapped to a Kegg Gene Identifier."></h2>' +
				'  <p>' +
				'    Below you will find an overview of the results after matching the input files against Paintomics Databases.<br>' +
				'    As general rule, the bigger the percentage of mapped features, the better results will be obtained in later steps.<br>' +
				'    Check the results and review your input data in case of low level of mapping.<br>' +
				((Object.keys(dataDistribution).length > 0) ? '  <a href="javascript:void(0)" id="download_mapping_file"><i class="fa fa-download"></i> Download ID/Name mapping results.</a>' : "") +
				'</div>'
		}];

		for (var omicName in dataDistribution) {
			omicSummaryPanelComponents.push(new PA_OmicSummaryPanel(omicName, dataDistribution[omicName]).getComponent());
		}

		var compoundsComponents = [];
		if (me.items.length > 0) {
			compoundsComponents.push({
				xtype: 'box', cls: "contentbox omicSummaryBox",
				html: '<div id="about">' +
					'  <h2>Compounds disambiguation</h2>' +
					'  <p>Some compounds names need to be disambiguated.</p>' +
					'  <p>Please check the list below and choose the compounds in which you are interested.</p> ' +
					'</div>'
			});

			for (var i in me.items) {
				compoundsComponents.push(me.items[i].getComponent());
			}
		}

		this.component = Ext.widget({
			xtype: "container",
			minHeight: 800,
			padding: '10',
			items: [{
				xtype: "box",
				cls: "toolbar secondTopToolbar",
				html: '<a href="javascript:void(0)" class="button acceptButton" id="runButton"><i class="fa fa-play"></i> Next step</a>' +
					'<a href="javascript:void(0)" class="button backButton" ><i class="fa fa-arrow-left"></i> Go back</a>' +
					'<a href="javascript:void(0)" class="button cancelButton" id="resetButton"><i class="fa fa-refresh"></i> Reset</a>'
			}, {
				xtype: 'container', itemId: "omicSummaryPanel",
				cls: "omicSummaryContainer",
				layout: 'column',  style: "margin-top:50px;",
				items: omicSummaryPanelComponents
			}, {
				xtype: 'form', cls: "omicSummaryContainer",
				border: 0, style: "margin-top:30px;", defaults: {labelAlign: "right",border: 0},
				items: [{
					xtype: "textfield", itemId: "jobIDField",
					name: "jobID",
					hidden: true,
					value: this.model.getJobID()
				}, {
					xtype: "container", itemId: "compoundsPanelsContainer",
					cls: "compoundsPanelsContainer",
					layout: 'column',
					items: compoundsComponents
				}]
			}],
			listeners: {
				boxready: function() {
					$("#runButton").click(function() {
						me.submitFormHandler();
					});
					$(".backButton").click(function() {
						me.backButtonHandler();
					});
					$("#resetButton").click(function() {
						me.resetViewHandler();
					});
					$('#download_mapping_file').click(function() {
						application.getController("DataManagementController").downloadFilesHandler(me, "mapping_results_" + me.getModel().getJobID() + ".zip", "job_result", me.getModel().getJobID());
					});
					initializeTooltips(".helpTip");
				},
				beforedestroy: function() {
					me.getModel().deleteObserver(me);
				}
			}
		});

		return this.component;
	};
	this.submitFormHandler = function() {
		this.controller.step2OnFormSubmitHandler(this);
	};
	this.backButtonHandler = function() {
		this.controller.backButtonClickHandler(this);
	};
	this.resetViewHandler = function() {
		this.controller.resetButtonClickHandler(this);
	};
	this.checkForm = function() {
		return ($(".compoundsPanelsContainer input[type=checkbox]").length === 0 || $(".compoundsPanelsContainer  :checked").length > 0);
	};

	this.getSelectedCompounds = function() {
		var checkedCompounds = $(".compoundsPanelsContainer input[type=checkbox]:checked");
		var checkedCompoundsIDs = [];
		for (var i in checkedCompounds) {
			checkedCompoundsIDs.push(checkedCompounds[i].value);
		}
		return checkedCompoundsIDs;
	};

	return this;
}
PA_Step2JobView.prototype = new View();

function PA_Step2CompoundSetView() {
	/***********************************************************************
	 * ATTRIBUTES
	 ***********************************************************************/
	this.mainCompoundsPanelItems = [];
	this.otherCompoundsPanelItems = [];

	/***********************************************************************
	 * GETTERS AND SETTERS
	 ***********************************************************************/
	this.loadModel = function(model) {
		this.model = model;

		var panelAux;
		var compounds = this.model.getMainCompounds();
		for (var i in compounds) {
			panelAux = new PA_Step2CompoundView(25, 200);
			panelAux.loadModel(compounds[i]);
			compounds[i].addObserver(panelAux);
			this.mainCompoundsPanelItems.push(panelAux);
		}
		compounds = this.model.getOtherCompounds();
		for (var i in compounds) {
			panelAux = new PA_Step2CompoundView(30, 250);
			panelAux.loadModel(compounds[i]);
			this.otherCompoundsPanelItems.push(panelAux);
		}
	};
	/***********************************************************************
	 * OTHER FUNCTIONS
	 ***********************************************************************/
	this.initComponent = function() {
		var me = this;

		var mainCompoundsPanelComponents = [];
		for (var i in this.mainCompoundsPanelItems) {
			mainCompoundsPanelComponents.push(this.mainCompoundsPanelItems[i].getComponent());
		}

		this.component = Ext.widget({
			xtype: "container", cls: "contentbox metaboliteBox",
			items: [{
				xtype: "label", itemId: "titleBox",
				html: '<h3 class="metaboliteTitle">' + this.getModel().getTitle() + '</h3>' + '<h4 style="padding-left: 10px;">' + mainCompoundsPanelComponents.length + ' compounds founds</h4>'
			}, {
				xtype: 'container', itemId: "mainCompoundsPanel",
				style: "padding: 3px 15px;", layout: 'column',
				items: mainCompoundsPanelComponents
			}, {
				xtype: "label",
				html: '<h4 style="padding-left: 10px;">' + this.otherCompoundsPanelItems.length + ' alternative compounds founds <a class="showOtherCompoundsButton" href="javascript:void(0)"><i class="fa fa-eye"></i> Show</a></h4> '
			}, {
				xtype: 'container', itemId: "otherCompoundsPanel",
				style: "padding: 3px 15px;", layout: 'column', hidden: true,
				items: []
			}],
			listeners: {
				boxready: function() {
					var container = this.queryById("otherCompoundsPanel");
					$(this.el.dom).find(".showOtherCompoundsButton").click(function() {
						var isVisible = $(this).hasClass("visible");
						if (!isVisible) {
							if (container.items.length === 0) {
								var otherCompoundsPanelComponents = [];
								for (var i in me.otherCompoundsPanelItems) {
									otherCompoundsPanelComponents.push(me.otherCompoundsPanelItems[i].getComponent());
								}
								container.add(otherCompoundsPanelComponents);
							}
							$(this).parents(".metaboliteBox").addClass("expandedBox");
							$(this).addClass("visible");
							$(this).html('<i class="fa fa-eye-slash"></i> Hide');
						} else {
							$(this).parents(".metaboliteBox").removeClass("expandedBox");
							$(this).removeClass("visible");
							$(this).html('<i class="fa fa-eye"></i> Show');
						}
						container.setVisible(!isVisible);
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
PA_Step2CompoundSetView.prototype = new View();

function PA_Step2CompoundView(maxLength, columnWidth) {
	/***********************************************************************
	 * ATTRIBUTES
	 ***********************************************************************/
	this.title = "";
	this.columnWidth = columnWidth;
	this.maxLength = maxLength;
	/***********************************************************************
	 * GETTERS AND SETTERS
	 ***********************************************************************/
	this.loadModel = function(model) {
		this.model = model;
		this.title = this.model.getName();
	};
	/***********************************************************************
	 * OTHER FUNCTIONS
	 ***********************************************************************/
	this.initComponent = function() {
		var me = this;
		var titleAux = this.title;
		if (this.title.length > this.maxLength) {
			titleAux = this.title.substr(0, this.maxLength) + "[...]";
		}
		this.component = Ext.widget({
			xtype: "box",
			html: '<input type="checkbox"' + (this.model.isSelected() ? "checked" : "") + ' name="metabolite" value="' + this.model.getID() + '">' + titleAux,
			style: {
				marginTop: "5px",
				width: this.columnWidth + "px",
				display: "inline-box"
			},
			listeners: {
				beforedestroy: function() {
					me.getModel().deleteObserver(me);
				}
			}
		});
		if (this.title.length > this.maxLength) {
			this.component.tip = this.title;
			this.component.addListener("afterrender", function(c) {
				Ext.create('Ext.tip.ToolTip', {
					target: c.getEl(),
					html: c.tip
				});
			});
		}
		return this.component;
	};
	return this;
}
PA_Step2CompoundView.prototype = new View();

function PA_OmicSummaryPanel(omicName, dataDistribution) {
	/***********************************************************************
	 * ATTRIBUTES
	 ***********************************************************************/
	this.omicName = omicName;
	//   0        1       2    3    4    5     6,   7   8      9        10
	//[MAPPED, UNMAPPED, MIN, P10, Q1, MEDIAN, Q3, P90, MAX, MIN_IR, Max_IR]
	this.dataDistribution = dataDistribution;

	/***********************************************************************
	 * OTHER FUNCTIONS
	 ***********************************************************************/
	this.initComponent = function() {
		var me = this;

		var divName = this.omicName.replace(" ", "_").toLowerCase() + "_";

		this.component = Ext.widget({
			xtype: "box",
			cls: "contentbox omicSummaryBox",
			html: '<h3 class = "metaboliteTitle" style="display:inline-block;margin-right: 20px;">' + this.omicName + '</h3>' +
				'<div>' +
				'  <div style="height:195px; overflow:hidden; width:50%; float: right;" id="' + divName + 'data_dstribution_plot"></div>' +
				'  <div style="height:195px; overflow:hidden; width:50%; " id="' + divName + 'mapping_summary_plot"></div>' +
				'</div>',
			listeners: {
				boxready: function() {
					if (me.dataDistribution[1] !== -1 && me.dataDistribution[0] !== -1) {
						//WHEN THE BOX IS READY, CALL HIGHCHARTS AND CREATE THE PIE WITH MAPPING SUMMARY AND THE BOXPLOT FOR DATA DISTRIBUTION
						$('#' + divName + 'mapping_summary_plot').highcharts({
							chart: {type: 'pie',height: 195},
							title: {
								text: "Mapped/Unmapped features",
								style: {"fontSize": "13px"}
							},
							credits: {enabled: false},
							plotOptions: {
								pie: {
									dataLabels: {
										useHTML: true,
										enabled: true,
										distance: 10,
										formatter: function() {
											return "<p style='text-align:center'>" + this.y + "</br>" + this.point.name.replace(" ", "</br>") + '</p>';
										}
									},
									center: ['50%', '30%']
								}
							},
							series: [{
								type: 'pie',
								name: me.omicName,
								size: 100,
								innerSize: '30%',
								data: [{
									name: 'Unmapped features',
									y: Number.parseFloat(me.dataDistribution[1]),
									color: "rgb(250, 112, 112)"
								}, {
									name: 'Mapped features',
									y: Number.parseFloat(me.dataDistribution[0]),
									color: "rgb(106, 208, 150)"
								}]
							}]
						});
					} else {
						$('#' + divName + 'mapping_summary_plot').html("<b>See Compounds disambiguation</b>");
					}

					//   0        1       2    3    4    5     6,   7   8      9        10
					//[MAPPED, UNMAPPED, MIN, P10, Q1, MEDIAN, Q3, P90, MAX, MIN_IR, Max_IR]
					//TODO REVISAR...
					//                    var yAxisMin = Math.floor(me.dataDistribution[9]) ;
					//                    var yAxisMax = Math.floor(me.dataDistribution[10]) + 0.5;
					//                    debugger;

					$('#' + divName + 'data_dstribution_plot').highcharts({
						chart: {
							type: 'boxplot',
							height: 195,
							inverted: true
						},
						credits: {enabled: false},
						title: {
							text: "Data distribution",
							style: {
								"fontSize": "13px"
							}
						},
						legend: {enabled: false},
						plotOptions: {
							boxplot: {
								medianColor: "#ff0000"
							}
						},
						xAxis: {
							labels: {
								enabled: false
							},
							title: null
						},
						tooltip: {
							formatter: function() {
								var text = '<span style="font-size:9px; text-align: right;"><em>' + me.omicName + '</em><br/>';
								text += "<b>Min (outliers inc.): </b>" + (me.dataDistribution[2]).toFixed(4) + '<br/>';
								text += "<b>Min value    : </b>" + (this.point.low / 10).toFixed(4) + '<br/>';
								text += "<b>Percentile 10: </b>" + (me.dataDistribution[3]).toFixed(4) + '<br/>';
								text += "<b>Q1           : </b>" + (this.point.q1 / 10).toFixed(4) + '<br/>';
								text += "<b>Median       : </b>" + (this.point.median / 10).toFixed(4) + '<br/>';
								text += "<b>Q3           : </b>" + (this.point.q3 / 10).toFixed(4) + '<br/>';
								text += "<b>Percentile 90: </b>" + (me.dataDistribution[7]).toFixed(4) + '<br/>';
								text += "<b>Max value    : </b>" + (this.point.high / 10).toFixed(4) + '<br/>';
								text += "<b>Max (outliers inc.): </b>" + (me.dataDistribution[8]).toFixed(4) + '<br/></span>';

								return text;
							}
						},
						yAxis: {
							labels: {
								formatter: function() {
									return this.value / 10;
								}
							},
							gridLineWidth: 0.1,
							plotLines: [{
								value: me.dataDistribution[3] * 10,
								color: '#001dff',
								width: 1,
								dashstyle: "DashDot",
								label: {
									text: 'p10',
									align: 'center',
									style: {
										color: 'gray'
									}
								}
							}, {
								value: me.dataDistribution[7] * 10,
								color: '#001dff',
								width: 1,
								dashstyle: "DashDot",
								label: {text: 'p90',align: 'center', style: {color: 'gray'}}
							}]
						},
						//   0        1       2    3    4    5     6,   7   8      9        10
						//[MAPPED, UNMAPPED, MIN, P10, Q1, MEDIAN, Q3, P90, MAX, MIN_IR, Max_IR]
						series: [{
							name: 'Values',
							data: [
								[me.dataDistribution[9] * 10, me.dataDistribution[4] * 10, me.dataDistribution[5] * 10, me.dataDistribution[6] * 10, me.dataDistribution[10] * 10]
							],
							tooltip: null
						}],
					});


				}
			}
		});

		return this.component;
	};
	return this;
}
PA_OmicSummaryPanel.prototype = new View();
