/* global Ext, application, SERVER_URL_DM_UPLOAD_FILE, UPLOAD_TIMEOUT */

//# sourceURL=DM_MyDataView.js
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
* THIS FILE CONTAINS THE FOLLOWING COMPONENT DECLARATION
* - DM_MyDataListView
* - DM_MyDataSummaryPanel
* - DM_MyDataFileListView
* - DM_MyDataJobListView
* - DM_GTFFileListView
* - MyFilesSelectorButton
* - MyFilesSelectorDialog
* - GTFSelectorDialog
* -
*
******************************************************************************/
function DM_MyDataListView() {
	/*********************************************************************
	* ATTRIBUTES
	***********************************************************************/
	this.name = "DM_MyDataListView";
	this.myDataSummaryPanel = null;
	this.myDataFileListView = null;
	this.myDataJobListView = null;

	/*********************************************************************
	* OTHER FUNCTIONS
	***********************************************************************/
	this.updateContent = function(updateFiles, updateJobs) {
		if (updateFiles !== false) {
			this.myDataFileListView.updateContent();
		}
		if (updateJobs !== false) {
			this.myDataJobListView.updateContent();
		}
	};

	this.updateSummary = function(dataSummary) {
		this.myDataSummaryPanel.updateContent(dataSummary);
	};

	this.changePassButtonClickHandler = function(){
		application.getController("UserController").changePassLinkClickHandler();
	};

	this.initComponent = function() {
		var me = this;

		this.myDataSummaryPanel = new DM_MyDataSummaryPanel();
		this.myDataFileListView = new DM_MyDataFileListView().setAllowRowRemoving(true, true).setParent(me).setController(me.getController());
		this.myDataJobListView = new DM_MyDataJobListView().setAllowRowRemoving(true, true).setParent(me).setController(me.getController());

		this.component = Ext.widget(
			{
				xtype: "container",
				padding: '10',
				border: 0,
				maxWidth: 1300,
				items: [
					{
						xtype: "box", cls: "toolbar secondTopToolbar", html:
						'<a class="button btn-secondary" id="uploadNewFilesButton"><i class="fa fa-cloud-upload"></i> Upload new files</a>'
					},
					{
						xtype: 'container',
						layout: 'column',
						style: "max-width:1300px; margin: 5px 10px; margin-top:50px;",
						items: [{
							xtype: 'box',cls: "contentbox omicSummaryBox", minHeight: 230, html:
							'<div id="about">'+
							'  <h2>My Data</h2>'+
							'   <table id="myDataUserDetails"><tbody>' +
							'     <tr><td><b>User name:</b></td><td>' + Ext.util.Cookies.get('userName') + '</td></tr>' +
  						'     <tr><td><b>Email:</b></td><td>' + Ext.util.Cookies.get('lastEmail') + '</td></tr>' +
  						'     <tr><td><b>Password:</b></td><td>************</td></tr>' +
  						'     <tr><td><b></b></td><td><a id="changePassButton" href="javascript:void(0)">Click here to change password</a></td></tr>' +
  						'  </tbody></table>' +
							'</div>'
						},
						this.myDataSummaryPanel.getComponent()
					]
				},
				this.myDataFileListView.getComponent(),
				this.myDataJobListView.getComponent()
			],
			listeners: {
				boxready: function () {
					$("#uploadNewFilesButton").click(function(){
						application.getMainView().changeMainView("DM_MyDataUploadFilesPanel");
					});
					$("#changePassButton").click(function () {
						me.changePassButtonClickHandler();
					});
				}
			}
		});
		return this.component;
	};
	return this;
}
DM_MyDataListView.prototype = new View();

function DM_MyDataSummaryPanel() {
	/***********************************************************************
	* ATTRIBUTES
	***********************************************************************/
	this.usageChart = null;
	/***********************************************************************
	* OTHER FUNCTIONS
	***********************************************************************/
	/**
	*
	* @param {type} dataSummary
	* @returns {undefined}
	*/
	this.updateContent = function(dataSummary) {
		if (dataSummary.usedSpace !== undefined && dataSummary.usedSpace !== undefined) {
			this.usageChart.series[0].data[0].update(Math.round(dataSummary.usedSpace / Math.pow(1024, 2) * 100) / 100);
			this.usageChart.series[0].data[1].update(Math.round(dataSummary.availableSpace / Math.pow(1024, 2) * 100) / 100);
			this.usageChart.setTitle({
				text: "<b>" + Math.round(dataSummary.usedSpace / Math.pow(1024, 2) * 100) / 100 + "</b> MB",
				style: {
					color: this.getUsageColor(dataSummary.usedSpace, dataSummary.availableSpace)
				}
			});
			$('#myDataAvailableSpace').html((Math.round(dataSummary.availableSpace / Math.pow(1024, 2) * 100) / 100) + "MB");
		}


		if (dataSummary.totalFiles !== undefined) {
			$('#myDataTotalFiles').html(dataSummary.totalFiles);
		}

		if (dataSummary.totalJobs !== undefined) {
			$('#myDataTotalJobs').html(dataSummary.totalJobs);
		}
		return this;
	};

	this.getUsageColor = function(value, max) {
		value = value / max;
		if (value > 0.9) {
			return '#DF5353';
		} else if (value > 0.6) {
			return '#DDDF0D';
		} else {
			return '#55BF3B';
		}
		return this;
	};

	this.initComponent = function() {
		var me = this;
		this.component = Ext.widget({
			xtype: "box",
			cls: "contentbox omicSummaryBox",
			height: 200,
			html: '<h3>Used space</h3>' +
			'<div style="text-align: center;">'+
			' <div class="myDataSummaryChartWrapper" id="usedSpaceSummaryPlot"></div>'+
			' <span class="myDataSummaryCount"><i class="fa fa-file-text-o"></i> <span id="myDataTotalFiles" class="odometer odometer-theme-default">0</span>  Files</span>' +
			' <span class="myDataSummaryCount"><i class="fa fa-code" style=" background: rgb(255, 182, 28);"></i><span id="myDataTotalJobs" class="odometer odometer-theme-default">0</span> Jobs</span>' +
   		' <p style="text-align: center;">This is your <b id="myDataAvailableSpace">20 MB</b> personal cloud storage, where you can find all your <b>Files</b> and <b>Jobs</b>.<br>Use it carefully and remember that you can always delete old files to free space.</p>'+
			'</div>',
			listeners: {
				boxready: function() {
					new Odometer({el: $("#myDataTotalFiles")[0],value: 0});
					new Odometer({el: $("#myDataTotalJobs")[0],value: 0});

					me.usageChart = new Highcharts.Chart({
						credits: {
							enabled: false
						},
						chart: {
							type: 'pie',
							renderTo: 'usedSpaceSummaryPlot'
						},
						tooltip: {
							enabled: true
						},
						title: {
							text: "",
							verticalAlign: 'middle',
							floating: true
						},
						series: [{
							name: 'Used space',
							data: [{
								name: "Used",
								y: 0,
								color: me.getUsageColor(me.usedSpace, me.availableSpace)
							}, {
								name: "Available",
								y: 10,
								color: "#dedede"
							}],
							tooltip: {
								valueSuffix: ' MB'
							},
							innerSize: '85%',
							dataLabels: false
						}]
					});
				}
			}
		});

		return this.component;
	};
	return this;
}
DM_MyDataSummaryPanel.prototype = new View();

function DM_MyDataFileListView() {
	/*********************************************************************
	* ATTRIBUTES
	***********************************************************************/
	this.name = "DM_MyDataFileListView";
	this.hideSummary = false;
	this.allowRowRemoving = true;
	this.multidelete = false;

	/*********************************************************************
	* OTHER FUNCTIONS
	***********************************************************************/
	this.setHideSummary = function(hide) {
		this.hideSummary = (hide === true);
		return this;
	};

	this.setAllowRowRemoving = function(allow, multiRemoving) {
		this.allowRowRemoving = (allow === true);
		this.multidelete = (multiRemoving === true);
		return this;
	};

	this.loadData = function(fileList, dataSummary) {
		this.getComponent().setLoading(true);
		var grid = this.getComponent().queryById("myFilesGrid");
		grid.getStore().removeAll();
		grid.getStore().loadData(fileList);

		if (this.parent !== null && this.parent.updateSummary !== undefined) {
			dataSummary.totalFiles = fileList.length;
			this.parent.updateSummary(dataSummary);
		}

		this.getComponent().setLoading(false);
		return this;
	};

	this.updateContent = function() {
		this.getController().loadMyFilesDataHandler(this);
		return this;
	};

	this.initComponent = function() {
		var me = this;
		this.component = Ext.widget({
			xtype: "container",
			itemId: "DM_MyDataFileListView",
			items: [{
				xtype: 'container',
				cls: "contentbox",
				items: [{
					xtype: "box",
					flex: 1,
					html: '<h3>My files</h3>' + "<p>" + " Use this section to avoid uploading your files again and again, when running Paintomics's tools.<br>" + " Everytime you submit a new file using the available forms, files are automatically stored on your personal space so you can reuse them in future analysis as well as download and visualize them online.<br>" + " Additionally, use the <a id='myFilesUploadFilesLink' href='javascript:void(0)'><i>Upload new files</i></a> option on the main menu to upload multiple files in batch. <b>Keep your available space in mind!</b>" + "</p>"
				}, {
					xtype: "livesearchgrid",
					itemId: "myFilesGrid",
					columnWidth: 300,
					searchFor: "fileName",
					border: 0,
					multidelete: this.multidelete,
					store: Ext.create('Ext.data.Store', {
						fields: [
							{name: 'selected'},
							{name: 'fileName'},
							{name: 'dataType'},
							{name: 'omicType'},
							{name: 'size'},
							{name: 'submissionDate'},
							{name: 'description'}
						],
						sorters: [{
							property: 'submissionDate',
							direction: 'DESC'
						}]
						// sorters: [{
						// 	property: 'omicType',
						// 	direction: 'ASC'
						// }, {
						// 	property: 'dataType',
						// 	direction: 'ASC'
						// }]
					}),
					columns: [{
						xtype: 'customcheckcolumn',
						dataIndex: 'selected',
						header: '',
						width: 30,
						hidden: !this.multidelete
					}, {
						text: 'File Name',
						dataIndex: 'fileName',
						flex: 2
					}, {
						text: 'Omic',
						dataIndex: 'omicType',
						width: 180
					}, {
						text: 'File type',
						dataIndex: 'dataType',
						width: 180
					}, {
						text: 'Description',
						dataIndex: 'description',
						flex: 3,
						renderer: function(value, metadata, record) {
							value = ((value === '') ? "<i>No description for this file</i>" : value);
							//TODO: MEJORAR
							var myToolTipText = "<b style='display:block; width:200px'>" + metadata.column.text + "</b>" + "<br>" + value.replace(/;/g, "<br>");
							metadata.tdAttr = 'data-qtip="' + myToolTipText + '"';
							return value;
						}
					}, {
						text: 'Size',
						dataIndex: 'size',
						width: 80,
						renderer: function(value, meta) {
							return Math.round(value / 1024) + "Kb";
						}
					}, {
						text: 'Submission Date',
						dataIndex: 'submissionDate',
						width: 140,
						renderer: function(value) {
							return value.substr(6, 4) + "-" + value.substr(3, 2) + "-" + value.substr(0, 2) + " " + value.substr(11, 5);
						}
					}, {
						xtype: 'customactioncolumn',
						text: "File Options",
						width: 200,
						hidden: !me.allowRowRemoving,
						items: [{
							icon: "fa-download",
							text: "Download",
							tooltip: 'Download this file.',
							handler: function(grid, rowIndex, colIndex) {
								me.getController().downloadFilesHandler(me, grid.getStore().getAt(rowIndex).get("fileName"), "input");
							}
						}, {
							icon: "fa-eye",
							text: "View",
							tooltip: 'View this file.',
							handler: function(grid, rowIndex, colIndex) {
								me.getController().viewFilesHandler(me, grid.getStore().getAt(rowIndex).get("fileName"), "input");
							}
						}, {
							icon: "fa-trash-o",
							text: "Delete",
							style: "color: rgb(242, 105, 105);",
							tooltip: 'Delete this file.',
							handler: function(grid, rowIndex, colIndex) {
								me.getController().deleteFilesHandler(me, grid.getStore().getAt(rowIndex).get("fileName"));
							}
						}]
					}],
					listeners: {
						cellclick: function(grid, td, cellIndex, record, tr, rowIndex) {
							var visibleColumns = grid.panel.query('gridcolumn:not([hidden]):not([isGroupHeader])').length;
							if (cellIndex === visibleColumns - 1) {
								return false; //IGNORE LAST COLUMN (EXTERNAL LINKS)
							}
							record.set("selected", record.get("selected") === true);
						}
					},
					multiDeleteHandler: function() {
						var selected = [];
						this.store.each(function(record) {
							if (record.get("selected")) {
								selected.push(record.get("fileName"));
							}
						});

						if (selected.length > 0) {
							me.getController().deleteFilesHandler(me, selected.join(","));
						}
					}
				}]
			}],
			listeners: {
				boxready: function() {
					me.updateContent();

					$("#myFilesUploadFilesLink").click(function() {
						application.getMainView().changeMainView("DM_MyDataUploadFilesPanel");
					});
				}
			}
		});
		return this.component;
	};
	return this;
}
DM_MyDataFileListView.prototype = new View;

function DM_MyDataJobListView() {
	/*********************************************************************
	* ATTRIBUTES
	***********************************************************************/
	this.name = "DM_MyDataJobListView";
	this.hideSummary = false;
	this.allowRowRemoving = true;
	this.multidelete = false;

	/*********************************************************************
	* OTHER FUNCTIONS
	***********************************************************************/
	this.setHideSummary = function(hide) {
		this.hideSummary = (hide === true);
		return this;
	};

	this.setAllowRowRemoving = function(allow, multiRemoving) {
		this.allowRowRemoving = (allow === true);
		this.multidelete = (multiRemoving === true);
		return this;
	};

	this.loadData = function(jobList, dataSummary) {
		this.getComponent().setLoading(true);
		var grid = this.getComponent().queryById("myFilesGrid");
		grid.getStore().removeAll();
		grid.getStore().loadData(jobList);

		if (this.parent !== null && this.parent.updateSummary !== undefined) {
			this.parent.updateSummary({
				totalJobs: jobList.length
			});
		}

		this.getComponent().setLoading(false);
		return this;
	};

	this.updateContent = function() {
		this.getController().loadMyJobsDataHandler(this);
		return this;
	};

	this.initComponent = function() {
		var me = this;

		this.component = Ext.widget({
			xtype: "container",
			itemId: "DM_MyDataJobListView",
			cls: "contentbox",
			items: [{
				xtype: "box",
				flex: 1,
				html: '<h3>My jobs</h3>' + "<p>" + " As you run new jobs in Paintomics, this section will show the status of your Jobs.</br>" + " You can resume your Jobs and continue working or download the results after each process." + "</p>"
			}, {
				xtype: "livesearchgrid",
				itemId: "myFilesGrid",
				columnWidth: 300,
				searchFor: "jobID",
				border: 0,
				multidelete: this.multidelete,
				store: Ext.create('Ext.data.Store', {
					fields: [
						{name: 'selected'},
						{name: 'jobID'}, {
							name: 'jobType'
						}, {
							name: 'lastStep'
						}, {
							name: 'date'
						},{
							name: 'name'
						},{
							name: 'description'
						}],
						sorters: [{
							property: 'date',
							direction: 'DESC'
						}]
					}),
					columns: [{
						xtype: 'customcheckcolumn',
						dataIndex: 'selected',
						header: '',
						width: 30,
						hidden: !this.multidelete
					}, {
						text: 'Job ID',
						dataIndex: 'jobID',
						flex: .5
					}, {
						text: 'Type',
						dataIndex: 'jobType',
						flex: 1
					}, {
						text: 'Last step',
						dataIndex: 'lastStep',
						flex: .4
					}, {
						text: 'Submission date',
						dataIndex: 'date',
						flex: .6,
						renderer: function(value) {
							return value.substr(0, 4) + "-" + value.substr(4, 2) + "-" + value.substr(6, 2) + " " + value.substr(8, 2) + ":" + value.substr(10, 2);
						}
					}, {
						text: 'Expiration date',
						dataIndex: 'date',
						flex: .6,
						renderer: function(value) {
							var date = new Date(value.substr(0, 4) + "-" + value.substr(4, 2) + "-" + value.substr(6, 2));
							date.setDate(date.getDate() + MAX_LIVE_JOB);
							return date.toISOString().substr(0, 10);

						}
					}, {
						text: 'Job name',
						dataIndex: 'name',
						flex: 1
					}, {
						text: 'Description',
						dataIndex: 'description',
						flex: 2,
						renderer: function(value, metadata, record) {
							value = ((value === '') ? "<i>No description for this file</i>" : value);
							//TODO: MEJORAR
							var myToolTipText = "<b style='display:block; width:200px'>" + metadata.column.text + "</b>" + value.replace(/;/g, "<br>");
							metadata.tdAttr = 'data-qtip="' + myToolTipText + '"';
							return value;
						}
					}, {
						xtype: 'customactioncolumn',
						text: "Job Options",
						width: 150,
						items: [{
							icon: "fa-repeat",
							text: "Recover",
							tooltip: 'Recover this Job.',
							handler: function(grid, rowIndex, colIndex) {
								me.getController().recoverJobsHandler(me, grid.getStore().getAt(rowIndex).get("jobID"), grid.getStore().getAt(rowIndex).get("jobType"), grid.getStore().getAt(rowIndex).get("date"));
							}
						}, {
							icon: "fa-trash-o",
							text: "Delete",
							style: "color: rgb(242, 105, 105);",
							tooltip: 'Delete this file.',
							handler: function(grid, rowIndex, colIndex) {
								me.getController().deleteJobsHandler(me, grid.getStore().getAt(rowIndex).get("jobID"), grid.getStore().getAt(rowIndex).get("jobType"));
							}
						}]
					}],
					multiDeleteHandler: function() {
						var selectedIDs = [];
						var selectedTypes = [];
						this.store.each(function(record) {
							if (record.get("selected")) {
								selectedIDs.push(record.get("jobID"));
								selectedTypes.push(record.get("jobType"));
							}
						});

						if (selectedIDs.length > 0) {
							me.getController().deleteJobsHandler(me, selectedIDs.join(","), selectedTypes.join(","));
						}
					}
				}],
				listeners: {
					boxready: function() {
						me.updateContent();
					}
				}
			});
			return this.component;
		};
		return this;
	}
	DM_MyDataJobListView.prototype = new View;

	/**
	* This component is used for submit simple jobs, such as Bed2Genes jobs.
	* @param {type} aViewName
	* @param {type} controller
	* @param {type} _callback
	* @returns {DM_MyDataSubmitJobPanel}
	*/
	function DM_MyDataSubmitJobPanel(aViewName, controller, _callback) {
		/*********************************************************************
		* ATTRIBUTES
		***********************************************************************/
		this.name = "DM_MyDataSubmitJobPanel";
		this.aViewName = aViewName;
		this.templatesPath = "/app/view/DataManagementViews/myDataFormTemplates/";

		/***********************************************************************
		* OTHER FUNCTIONS
		***********************************************************************/
		this.initComponent = function() {
			var me = this;
			this.component = Ext.widget('box', {
				html: "<div class='generatingFormWaitDiv'>Generating form...</div>"
			});
			var _callback = function(newComponent) {
				var parent = me.getComponent().up();
				parent.remove(me.getComponent());
				me.component = newComponent;
				parent.add(me.getComponent());
			};
			//AUTOGENERATE THE FORMULARY
			generateForm(me.templatesPath, me.aViewName, controller, _callback);
			return this.component;
		};
		return this;
	}
	DM_MyDataSubmitJobPanel.prototype = new View;

	function DM_MyDataUploadFilesPanel() {
		/*********************************************************************
		* ATTRIBUTES
		***********************************************************************/
		this.name = "DM_MyDataUploadFilesPanel";

		/***********************************************************************
		* OTHER FUNCTIONS
		***********************************************************************/
		this.initComponent = function() {
			var me = this;
			this.component = Ext.widget({
				xtype: "container",
				maxWidth: 1300,
				padding: '10',
				items: [{
					xtype: 'box',
					cls: "contentbox",
					html: '<div id="about">' +
					' <h2>File uploading</h2>' +
					' <p>' +
					'  Upload new files easily to your cloud space using this tool.</br>' +
					'  Uploaded files can be found at your section "My files and Jobs".' +
					'  Remember that available space is limited for each user.' +
					'  <ol>' +
					'   <li>Choose the files for uploading (Browse button)</li>' +
					'   <li>' +
					'     For each selected file, it\'s necessary to specify the following fields:' +
					'     <ul>' +
					'       <li>' +
					'          <b>Data type:</b> this field will help you to identify the type of data that the file contains.</br>' +
					'          Some examples of data type are "Gene Expression file", "Relevant Compound list", or "GTF file"..' +
					'       </li>' +
					'       <li><b>Omic type:</b> identifies the omic family to which the data belong. Possible values are Transcriptomic data, Metabolomics data, etc.</li>' +
					'     </ul>' +
					'   </li>' +
					'  </ol>' +
					' </p>' +
					'</div>'
				},
				Ext.create('Ext.upload.Panel', {
					cls: "contentbox",
					flex: 1,
					minHeight: 400,
					uploader: "Ext.upload.uploader.FormDataUploader",
					uploaderOptions: {
						url: SERVER_URL_DM_UPLOAD_FILE,
						timeout: UPLOAD_TIMEOUT * 1000 /*2 min*/
					}
				})
			]
		});

		return this.component;
	};
	return this;

}
DM_MyDataUploadFilesPanel.prototype = new View;

function DM_GTFFileListView() {
	/*********************************************************************
	* ATTRIBUTES
	***********************************************************************/
	this.name = "DM_GTFFileListView";
	this.hideSummary = false;
	this.allowRowRemoving = true;

	/*********************************************************************
	* OTHER FUNCTIONS
	***********************************************************************/
	this.loadData = function(fileList) {
		this.getComponent().setLoading(true);
		var grid = this.getComponent().queryById("GTFFilesGrid");
		grid.getStore().removeAll();
		var data = [],
		dataAux;
		for (var i in fileList) {
			dataAux = [];
			dataAux.push(fileList[i]["fileName"]);
			dataAux.push((fileList[i]["otherFields"] ? fileList[i]["otherFields"]["specie"] : ""));
			dataAux.push((fileList[i]["otherFields"] ? fileList[i]["otherFields"]["version"] : ""));
			dataAux.push((fileList[i]["otherFields"] ? fileList[i]["otherFields"]["source"] : ""));
			dataAux.push(fileList[i]["description"]);
			data.push(dataAux);
		}
		grid.getStore().loadData(data);
		this.getComponent().setLoading(false);
	};

	this.updateContent = function() {
		this.getController().loadGTFFilesHandler(this);
	};

	this.initComponent = function() {
		var me = this;
		this.component = Ext.widget({
			xtype: "container",
			itemId: "DM_GTFFileListView",
			items: [{
				xtype: "box",
				flex: 1,
				html: '<h3>Inbuilt GTF files</h3>'
			}, {
				xtype: "grid",
				itemId: "GTFFilesGrid",
				columnWidth: 300,
				store: Ext.create('Ext.data.ArrayStore', {
					fields: ['fileName', 'specie', 'version', 'source', 'description'],
					data: []
				}),
				columns: [{
					text: 'File Name',
					dataIndex: 'fileName',
					flex: 2
				}, {
					text: 'Specie',
					dataIndex: 'specie',
					flex: 1
				}, {
					text: 'Version',
					dataIndex: 'version',
					flex: 1
				}, {
					text: 'Source',
					dataIndex: 'source',
					flex: 1
				}, {
					text: 'Description',
					dataIndex: 'description',
					flex: 3
				}]
			}],
			listeners: {
				boxready: function() {
					me.updateContent();
				}
			}
		});
		return this.component;
	};
	return this;
}
DM_GTFFileListView.prototype = new View;

Ext.define('Paintomics.view.common.MyFilesSelectorButton', {
	extend: 'Ext.container.Container',
	alias: 'widget.myFilesSelectorButton',
	fieldLabel: "label",
	namePrefix: "filefield",
	buttonText: "Browse...",
	labelAlign: "right",
	labelWidth: 200,
	margin: "5px 0px",
	value: null,
	/***********************************************************************
	* OTHER FUNCTIONS
	***********************************************************************/
	getValue: function() {
		return this.queryById("visiblePathField").getRawValue();
	},
	setValue: function(value, origin) {
		origin = (origin || "mydata");
		this.queryById("visiblePathField").setRawValue((origin === "mydata" ? "[MyData]/" : "") + value);
		this.queryById("originField").setValue(origin);
	},
	clearValue: function(){
		this.queryById("fileField").reset();
		this.queryById("visiblePathField").setRawValue("");
		this.queryById("originField").setValue("");
	},
	setDisabled: function(disabled) {
		this.queryById("optionsButton").setDisabled(disabled);
	},
	markInvalid: function(errorMessage) {
		return this.queryById("visiblePathField").markInvalid(errorMessage);
	},
	/***********************************************************************
	* COMPONENT DECLARATION
	***********************************************************************/
	initComponent: function() {
		var me = this;

		me.items = [{
			xtype: "container",
			layout: {
				type: "hbox",
				align: "middle"
			},
			items: [{
				xtype: "textfield",
				itemId: "originField",
				name: me.namePrefix + "_origin",
				value: (this.value ? "mydata" : ""),
				hidden: true
			}, {
				xtype: "textfield",
				flex: 1,
				name: me.namePrefix + "_filelocation",
				itemId: "visiblePathField",
				value: (this.value ? this.value : ""),
				labelAlign: me.labelAlign,
				labelWidth: me.labelWidth,
				readOnly: true,
				fieldLabel: me.fieldLabel,
				style: {
					"margin-right": "3px"
				}
			}, {
				xtype: "splitbutton",
				itemId: "optionsButton",
				text: me.buttonText,
				maxHeight: 24,
				menu: new Ext.menu.Menu({
					items: [
						// these will render as dropdown menu items when the arrow is clicked:
						{
							text: 'Upload file from my PC',
							scope: me,
							handler: function() {
								me.queryById("fileField").fileInputEl.el.dom.click();
							}
						}, {
							text: 'Use a file from My Data',
							disabled: (Ext.util.Cookies.get("userID") === null),
							handler: function() {
								var _callback = function(selectedItem) {
									if (selectedItem !== null) {
										me.clearValue();
										me.setValue(selectedItem[0].get("fileName"));
									}
								};
								Ext.widget("myFilesSelectorDialog").showDialog(_callback);
							}
						}, {
							text: 'Clear selection',
							handler: function() {
								me.clearValue();
							}
						}
					].concat(me.extraButtons)
				}),
				handler: function() {
					this.showMenu();
				}
			}, (me.helpTip !== undefined ? {
				xtype: "label",
				html: '<span class="helpTip" style="float:right;" title="' + this.helpTip + '""></span>'
			} : null)]
		}, {
			xtype: 'filefield',
			itemId: "fileField",
			name: me.namePrefix + "_file",
			buttonText: '',
			hidden: true,
			listeners: {
				change: function(item, value) {
					me.setValue(value, "client");
				}
			}
		}];
		me.callParent(arguments);
	}
});

Ext.define('Paintomics.view.common.MyFilesSelectorDialog', {
	extend: 'Ext.window.Window',
	alias: 'widget.myFilesSelectorDialog',
	autoScroll: true,
	selectedItem: null,
	_callback: null,
	buttons: [{
		text: 'Accept',
		itemId: "acceptButton",
		handler: function() {
			this.up("window").selectedItem = this.up("window").queryById("myFilesGrid").getSelectionModel().getSelection();
			this.up("window").close();
		}
	}, {
		text: 'Cancel',
		handler: function() {
			this.up("window").selectedItem = null;
			this.up("window").close();
		}
	}],
	showDialog: function(_callback) {
		this._callback = _callback;
		this.setHeight(Ext.getBody().getViewSize().height * 0.9);
		this.setWidth(Ext.getBody().getViewSize().width * 0.8);
		this.center();
		this.show();
	},
	initComponent: function() {
		var me = this;
		var myDataFileListView = new DM_MyDataFileListView().setHideSummary(true).setAllowRowRemoving(false);
		myDataFileListView.setController(application.getController("DataManagementController"));
		me.items = [myDataFileListView.getComponent()];
		me.callParent(arguments);

		me.listeners = {
			boxready: function() {
				var me = this;
				this.queryById("myFilesGrid").on({
					itemdblclick: function() {
						me.queryById("acceptButton").el.dom.click();
					}
				});
			},
			close: function() {
				if (this._callback !== null) {
					this._callback(this.selectedItem);
				}
			}
		};
	}
});

Ext.define('Paintomics.view.common.GTFSelectorDialog', {
	extend: 'Ext.window.Window',
	alias: 'widget.GTFSelectorDialog',
	selectedItem: null,
	_callback: null,
	buttons: [{
		text: 'Accept',
		itemId: "acceptButton",
		handler: function() {
			this.up("window").selectedItem = this.up("window").queryById("GTFFilesGrid").getSelectionModel().getSelection();
			this.up("window").close();
		}
	}, {
		text: 'Cancel',
		handler: function() {
			this.up("window").selectedItem = null;
			this.up("window").close();
		}
	}],
	showDialog: function(_callback) {
		this._callback = _callback;
		this.setHeight(Ext.getBody().getViewSize().height * 0.9);
		this.setWidth(Ext.getBody().getViewSize().width * 0.8);
		this.center();
		this.show();
	},
	initComponent: function() {
		var me = this;
		var myDataFileListView = new DM_GTFFileListView();
		myDataFileListView.setController(application.getController("DataManagementController"));
		me.items = [myDataFileListView.getComponent()];
		me.callParent(arguments);

		me.listeners = {
			boxready: function() {
				var me = this;
				this.queryById("GTFFilesGrid").on({
					itemdblclick: function() {
						me.queryById("acceptButton").el.dom.click();
					}
				});
			},
			close: function() {
				if (this._callback !== null) {
					this._callback(this.selectedItem);
				}
			}
		};
	}
});
