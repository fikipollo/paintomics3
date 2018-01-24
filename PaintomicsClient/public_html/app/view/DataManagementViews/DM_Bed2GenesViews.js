//# sourceURL=DM_Bed2GenesViews.js
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
* - DM_Bed2GenesJobView
*
*/
function DM_Bed2GenesJobView() {
	/*********************************************************************
	* ATTRIBUTES
	***********************************************************************/
	this.name = "DM_Bed2GenesJobView";
	this.nFiles = 3;
	this.exampleMode = false;
	/*********************************************************************
	* GETTERS AND SETTERS
	***********************************************************************/
	this.isExampleMode = function () {
		return this.exampleMode;
	};
	/*********************************************************************
	* OTHER FUNCTIONS
	***********************************************************************/
	this.resetViewHandler = function () {
		this.getComponent().queryById("omicSubmittingForm").getForm().reset();
	};

	this.submitFormHandler = function () {
		this.controller.fromBed2GenesOnFormSubmitHandler(this);
	};

	this.checkForm = function () {
		var items = this.getComponent().query("container[cls=omicbox regionBasedOmic]");
		var emptyFields = 0;

		for (var i in items) {
			if (items[i].isValid() !== true) {
				return false;
			}
		}
		return true;
	};

	this.showMyDataPanel = function () {
		this.controller.showMyDataPanelClickHandler(this);
	};

	this.initComponent = function () {
		var me = this;
		this.component = Ext.widget({
			xtype: "container",
			items: [{
				xtype: "box", cls: "toolbar secondTopToolbar", html:
				'<a class="button btn-danger btn-right" id="resetButton"><i class="fa fa-refresh"></i> Reset</a>' +
				'<a class="button btn-success btn-right" id="runButton"><i class="fa fa-play"></i> Run Regions2Genes</a>'
			},{
				xtype: 'box', style: "margin-top:50px;", html:
				'<div id="about" class="contentbox">' +
				'   <h2>From Regions to Genes</h2>' +
				'   <img alt="logorgmatch.png" src="resources/images/logo_rgmatch.png" style="width: 300px;margin:20px;">' +
				'   <div style=" max-width: 600px; float: left;padding-left: 10px; ">' +
				'       <h4>Match genomic regions to the closest gene </h4> ' +
				'       <p>This tool is based on RGmatch, a flexible and easy-to-use tool to match genomic regions to the closest gene ' +
				'       (also transcript or exon), which provides the area of the gene where the region overlaps. The algorithm can ' +
				'       be applied to any organism as long as the genome annotation is available.</br>' +
				'       The original tool from developed by P. Furio and S. Tarazona, was adapted to accept quantification values for each genomic region, ' +
				'       so the resulting gene list includes quantification values at gene level. See below for more information about input format.</p>' +
				'       <b>More info:</b>'+
				'       <ul><li><a href="http://paintomics.readthedocs.io/en/latest/2_1_accepted_input/#matching-regions-to-genes-rgmatch" target="_blank">Matching Regions to Genes (PaintOmics 3 Documentation)</a></li>' +
				'       <li><a href="https://bitbucket.org/pfurio/rgmatch" target="_blank">RGmatch repository</a></li></ul>' +
				'   </div>' +
				'</div>' +
				'<div class="contentbox">' +
				'   <h3>About input data</h3>' +
				'   <p>In order to compute the associations, <strong>Regions2Genes</strong> needs the following information:</p>' +
				'   <ul>' +
				'       <li>A <b>GTF</b> annotation file containing the chromosome positions of all the features to be considered (genes, transcripts and exons).<br>This GTF file must be sorted and should include annotations at exon level, that is, the 3rd column of the GTF must contain "exon" tag.</li>' +
				'       <li>A <i>modified</i> BED format file containing the regions of interest to be associated to features, followed by quantification values for each region (Figure 1. A). </li>' +
				'       <li>A list of all the regions which are specially relevant for our experiment (Figure 1. B).</li>' +
				'   </ul>' + 
				'   <img alt="paintomics_input_figure2.png" src="resources/images/paintomics_input_figure2.png" style="max-width: 700px;margin: auto;display: block;">' +
				'	<div style="text-align: center;height: 35px;margin-top: 20px;"><a class="button btn-success btn-right" target="_blank" style="float: none;" href="resources/rgmatch_example_data.zip"><i class="fa fa-play"></i> Download example data</a></div>' +
				'   <h3>About gene regions</h3>' +
				'   <p>By default, the region to gene associations will be computed as follows:</p>' +
				'   <ul>' +
				'      <li>All possible associations and areas will be reported (aggregation at exon level). This means that if a region overlaps several areas of a given gene, all of them will be returned.</li>' +
				'      <li>The maximum distance of feature associations will be of 10 kb upstream or downstream.</li>' +
				'      <li>The TSS area will start 200 nucleotides upstream the TSS and will end at the TSS (see Figure below).</li>' +
				'      <li>The Promoter area will have a length of 1300 nucleotides. Thus, it will start at 1500 nucleotides upstream the TSS and end at 200 nucleotides upstream the TSS (see Figure below).</li>' +
				'   </ul>' +
				'   <img alt="paintomics_input_figure5.png" src="resources/images/paintomics_input_figure5.png" style="max-width: 625px;margin: auto;display: block;">'+
				'</div>'
			},{
				xtype: 'form', bodyCls: "contentbox", itemId: "omicSubmittingForm", style: "max-width:1280px; padding-bottom:50px;",
				layout: {type: 'vbox', align: "stretch"},
				defaults: {labelAlign: "right", labelWidth: 220, maxWidth: 800},
				items: [
					{xtype: "box", flex: 1, maxWidth: 1300, html: '<h2>Data uploading</h2><h3>1. Choose the files to upload </h3>'},
					new RegionBasedOmicSubmittingPanel(0, {removable: false, allowToogle: false}).getComponent()
				]
			}],
			listeners: {
				boxready: function () {
					$("#runButton").click(function () {
						me.submitFormHandler();
					});
					$("#resetButton").click(function () {
						me.resetViewHandler();
					});
				},
				beforedestroy: function () {
					var model = me.getModel();

					if (model) {
						model.deleteObserver(me);
					}
				}
			}
		});
		return this.component;
	};
	return this;
}
DM_Bed2GenesJobView.prototype = new View();
