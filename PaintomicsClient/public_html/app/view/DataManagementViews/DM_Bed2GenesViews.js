//@ sourceURL=DM_Bed2GenesViews.js
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
* - PA_Step1JobView
* - OmicSubmittingPanel
*
*/
function DM_Bed2GenesJobView() {
    /*********************************************************************
    * ATTRIBUTES
    ***********************************************************************/
    this.name = "PA_Step1JobView";
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
            xtype: "container", minHeight: 800,
            items: [
                {
                    xtype: "box", cls: "toolbar secondTopToolbar", html:
                    '   <a href="javascript:void(0)" class="toolbarOption helpTip" style="float: left; display:none;" id="showMenuButton"  title="Show menu"><i class="fa fa-bars"></i></a>' +
                    '   <a href="javascript:void(0)" style="float:right" class="button acceptButton" id="runButton"><i class="fa fa-play"></i> Run Bed2Genes</a>' +
                    '   <a href="javascript:void(0)" style="float:right" class="button cancelButton" id="resetButton"><i class="fa fa-refresh"></i> Reset</a>'
                },
                {
                    xtype: "container", style: "margin-top:50px;  max-width:1300px;",
                    items: [
                        {
                            xtype: 'box', html:
                            '<div id="about" class="contentbox">' +
                            '   <h2>From BED to Genes</h2>' +
                            '   <p>' +
                            '       This tool is based on RGmatch, a flexible and easy-to-use tool to match genomic regions to the closest gene ' +
                            '       (also transcript or exon), which provides the area of the gene where the region overlaps. The algorithm can ' +
                            '       be applied to any organism as long as the genome annotation is available.</br>' +
                            '       The original tool from developed by P. Furio and S. Tarazona, was adapted to accept quantification values for each genomic region, ' +
                            '       so the resulting gene list includes quantification values at gene level. See below for more information about input format.</br>' +
                            '       More info <a href="https://bitbucket.org/pfurio/rgmatch">https://bitbucket.org/pfurio/rgmatch</a>' +
                            '   </p>' +
                            '</div>' +
                            '<div class="contentbox">' +
                            '   <h3>About input data</h3>' +
                            '   <p>In order to compute the associations, <strong>Bed2Genes</strong> needs the following information:</p>' +
                            '   <ul>' +
                            '       <li>A GTF annotation file providing the chromosome positions of all the features to be considered (genes, transcripts and exons). This GTF file must be sorted and should include annotations at exon level, that is, the 3rd column of the GTF must contain "exon" tag.</li>' +
                            '       <li>A <i>modified</i> BED format file containing the regions of interest to be associated to features, followed by quantification values for each region. </li>' +
                            '       <div style="text-align: center;width: 620px;margin: 10px auto; font-family: monospace;color: #7A9CBD; background-color: #F5F5F5; padding: 10px;">' +
                            '           <table style="width: 100%;">' +
                            '               <tbody>' +
                            '                   <tr><td>#CHR</td><td>START</td><td>END</td><td>Cond 1</td><td>Cond 2</td><td>Cond 3</td><td>Cond 4</td></tr>' +
                            '                   <tr><td>10</td><td>100487291</td><td>100487483</td><td>0.514722</td><td>0.938385</td><td>0.434174</td><td>0.165846</td></tr>' +
                            '                   <tr><td>10</td><td>100487717</td><td>100487888</td><td>0.785665</td><td>0.679343</td><td>0.951135</td><td>0.723835</td></tr>' +
                            '                   <tr><td>10</td><td>105841395</td><td>105841570</td><td>0.479711</td><td>0.504641</td><td>0.507179</td><td>0.164656</td></tr>' +
                            '                   <tr><td>...</td><td>...</td><td>...</td><td>...</td><td>...</td><td>...</td><td>...</td></tr>' +
                            '               </tbody>' +
                            '           </table>' +
                            '       </div>' +
                            '       <li>A list of all the regions which are specially relevant for our experiment.</li>' +
                            '       <div style="text-align: center;width: 620px;margin: 10px auto; font-family: monospace;color: #7A9CBD; background-color: #F5F5F5; padding: 10px;">' +
                            '          <table style="width: 240px;">' +
                            '            <tbody>' +
                            '               <tr><td>#CHR</td><td>START</td><td>END</td></tr>' +
                            '               <tr><td>10</td><td>100487291</td><td>100487483</td></tr>' +
                            '               <tr><td>10</td><td>100487717</td><td>100487888</td></tr>' +
                            '               <tr><td>...</td><td>...</td><td>...</td></tr>' +
                            '            </tbody>' +
                            '          </table>' +
                            '       </div>' +
                            '   </ul>' +
                            '   <h3>About gene regions</h3>' +
                            '   <p>By default, the region to gene associations will be computed as follows:</p>' +
                            '   <ul>' +
                            '      <li>All possible associations and areas will be reported (aggregation at exon level). This means that if a region overlaps several areas of a given gene, all of them will be returned.</li>' +
                            '      <li>The maximum distance of feature associations will be of 10 kb upstream or downstream.</li>' +
                            '      <li>The TSS area will start 200 nucleotides upstream the TSS and will end at the TSS (see Figure below).</li>' +
                            '      <li>The Promoter area will have a length of 1300 nucleotides. Thus, it will start at 1500 nucleotides upstream the TSS and end at 200 nucleotides upstream the TSS (see Figure below).</li>' +
                            '   </ul>' +
                            '   <img alt="figure1apng.png" src="resources/images/rgmatch_generegions.png" style=" width: 750px; margin: 20px auto; display: block; ">'+
                            '</div>'
                        },
                        {
                            xtype: 'form', bodyCls: "contentbox", itemId: "omicSubmittingForm", style: "max-width:1280px; padding-bottom:50px;",
                            layout: {type: 'vbox', align: "stretch"},
                            defaults: {labelAlign: "right", labelWidth: 220, maxWidth: 800},
                            items: [
                                {xtype: "box", flex: 1, maxWidth: 1300, html: '<h2>Data uploading</h2><h3>1. Choose the files to upload </h3>'},
                                new RegionBasedOmicSubmittingPanel(0, {removable: false, allowToogle: false}).getComponent()
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
DM_Bed2GenesJobView.prototype = new View();
