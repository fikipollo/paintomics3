//# sourceURL=DM_miRNA2GenesJobView.js
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
* - DM_miRNA2GenesJobView
*
*/
function DM_miRNA2GenesJobView() {
	/*********************************************************************
	* ATTRIBUTES
	***********************************************************************/
	this.name = "DM_miRNA2GenesJobView";
	this.nFiles = 4;
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
		this.controller.fromMiRNA2GenesOnFormSubmitHandler(this);
	};

	this.checkForm = function () {
		var items = this.getComponent().query("container[cls=omicbox miRNABasedOmic]");
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
			xtype: "container", minHeight: 800,
			items: [{
				xtype: "box", cls: "toolbar secondTopToolbar", html:
				'<a class="button btn-danger btn-right" id="resetButton"><i class="fa fa-refresh"></i> Reset</a>' +
				'<a class="button btn-success btn-right" id="runButton"><i class="fa fa-play"></i> Run miRNA2Genes</a>'
			},{
				xtype: "container", style: "margin-top:50px;  max-width:1300px;",
				items: [
					{
						xtype: 'box', html:
						'<div id="about" class="contentbox">' +
						'   <h2>From miRNAs to Genes</h2>' +
						'   <img alt="logo_mirna2genes.png" src="resources/images/logo_mirna2genes.png" style="width: 300px;margin:20px;">' +
						'   <div style=" max-width: 600px; float: left;padding-left: 10px; ">' +
						'       <h4>Match miRNAs to their target protein-coding genes</h4> ' +
						'       <p>This tool processes your input miRNA quantification data and assigns the expression values to the known list of target genes for each miRNA. The tool includes many options to customize the resulting gene list. See below for more information.</p>' +
						'       <b>More info:</b>'+
						'       <ul><li><a href="http://paintomics.readthedocs.io/en/latest/2_1_accepted_input/#matching-mirnas-to-genes-rgmatch" target="_blank">Matching miRNAs to Genes (PaintOmics 3 Documentation)</a></li>' +
						'   </div>' +
						'</div>' +
						'<div class="contentbox">' +
						'   <h3>About input data</h3>' +
						'   <p>In order to compute the associations, <strong>miRNA2Genes</strong> needs the following input data:</p>' +
						'   <p>Note that there is not any limitation in the identifiers or names for miRNAs or target gene. <br>The only requirement for the input data is that both input files use the same convention for miRNAs ID/names (e.g. if quantification file uses "mmu-miR-XXX" as naming convention, then the miRNA->targets file must use the same names.</p>' +
						'   <ul>' +
						'     <li>A <strong>tabulated</strong> file containing the quantification values for all the miRNAs (Figure 1.A).</li>' +
						'     <li>A <strong>tabulated</strong> file containing the list of <i>miRNA --> target gene</i> associations  (Figure 1.C)</li>' +
						'   </ul>' +
						'   <p>Additionally, two secondary files can be provided for a more accurate results.</p>' +
						'   <ul>' +
						'     <li>A list of relevant miRNAs, usually the differentially expressed miRNAs (Figure 1.C).</li>' +
						'     <li>A mRNA-Seq quantification file that will be used for filtering the matched targets based on the correlation between gene expression and miRNA expression.<br>Naming convention must be the same that the used in the miRNA--> target gene file (Figure 1.D).</li>' +
						'   </ul>' +
						'   <img alt="paintomics_input_figure5b.png" src="resources/images/paintomics_input_figure5b.png" style="max-width: 800px;margin: auto;display: block;">' +
						'   <h3>About multiple target genes</h3>' +
						'   <p>Usually, for each miRNA there are numerous known target genes. However, the presence of a miRNA does not mean that a certain target gene is being regulated for that miRNA. Hence, it is necessary to discriminate those genes that may be affected by the action of a miRNA from the complete list of potential target genes for that miRNA. Assuming that all files explained above are provided, miRNA2Genes includes the following selection strategies.</p>' +
						'   <ul>' +
						'     <li>If the list of relevant miRNAs is provided, you can choose between reporting the target genes for all miRNAs in the input files, or reporting only the target genes for the relevant miRNAs (e.g. the DE miRNAs), ignoring the rest.</li>' +
						'     <li>If the transcriptomics quantification file is provided, reported target genes can be discriminated based on the existing correlation between the quantification for a miRNA and the codified by target genes. Usually, it is expected a negative correlation between miRNA and target genes being regulated, and the usage of a cutoff for correlation value determines the selection of the genes that are finally reported.</li>' +
						'   </ul>' +
						'   <img alt="figure1apng.png" src="resources/images/paintomics_input_figure5c.png" style=" width: 750px; margin: 20px auto; display: block; ">'+
						'</div>'
					},{
						xtype: 'form', bodyCls: "contentbox", itemId: "omicSubmittingForm", style: "max-width:1280px; padding-bottom:50px;",
						layout: {type: 'vbox', align: "stretch"},
						defaults: {labelAlign: "right", labelWidth: 220, maxWidth: 800},
						items: [
							{xtype: "box", flex: 1, maxWidth: 1300, html: '<h2>Data uploading</h2><h3>1. Choose the files to upload </h3>'},
							new MiRNAOmicSubmittingPanel(0, {removable: false, allowToogle: false}).getComponent(),
							{xtype: "box", html: '<div style="height:150px"></div>'},
						]
					}
				]
			},
		],
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
				me.getModel().deleteObserver(me);
			}
		}
	});
	return this.component;
};
return this;
}
DM_miRNA2GenesJobView.prototype = new View();
