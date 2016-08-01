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
* - PA_Step1JobView
* - OmicSubmittingPanel
*
*/
function DM_miRNA2GenesJobView() {
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
                            '   <h2>From miRNA to Genes</h2>' +
                            '   <p>' +
                            '             Lorem ipsum dolor sit amet, consectetur' +
                            '             adipiscing elit. Phasellus lacus turpis, lobortis ac ornare congue, volutpat non elit. Vivamus' +
                            '             nec dui vel eros vulputate luctus. Vivamus eros purus, dictum in mollis ut, maximus at tortor.' +
                            '             Phasellus posuere nisi massa, eget vulputate magna volutpat vulputate. Praesent non ante id' +
                            '             justo ultrices laoreet sit amet nec ipsum. Sed imperdiet sollicitudin gravida. Vestibulum at' +
                            '             gravida felis. Vestibulum nisl magna, vestibulum vitae molesti e sit amet, finibus quis mi.' +
                            '             Vivamus eget nulla ac purus semper gravida. Suspendisse varius et nisi at lobortis.' +
                            '             Maecenas non luctus enim, at tempor justo. Etiam nec ur na nec arcu rutrum posuere.' +
                            '   </p>' +
                            '</div>' +
                            '<div class="contentbox">' +
                            '   <h3>About input data</h3>' +
                            '   <p>In order to compute the associations, <strong>miRNA2Genes</strong> needs the following information:</p>' +
                            '   <ul>' +
                            '       <li>A <strong>tabulated</strong> file containing the ??? for miRNA and target genes.</li>' +
                            '       <div style="text-align: center;width: 620px;margin: 10px auto; font-family: monospace;color: #7A9CBD; background-color: #F5F5F5; padding: 10px;">' +
                            '           <table style="width: 100%;">' +
                            '               <tbody>' +
                            '                   <tr><td>#miRNA ID</td><td>Gene ID</td></tr>' +
                            '                   <tr><td>mirbase123123</td><td>ENSEMBL....</td></tr>' +
                            '                   <tr><td>mirbase123123</td><td>ENSEMBL....</td></tr>' +
                            '                   <tr><td>mirbase123123</td><td>ENSEMBL....</td></tr>' +
                            '                   <tr><td>...</td><td>...</td></tr>' +
                            '               </tbody>' +
                            '           </table>' +
                            '       </div>' +
                            '       <li>A <strong>tabulated</strong> file containing the quantification values for all the miRNAs.</li>' +
                            '       <div style="text-align: center;width: 620px;margin: 10px auto; font-family: monospace;color: #7A9CBD; background-color: #F5F5F5; padding: 10px;">' +
                            '          <table style="width: 240px;">' +
                            '            <tbody>' +
                            '               <tr><td>#miRNA</td><td>Condition 1</td><td>Condition 2</td><td>...</td></tr>' +
                            '               <tr><td>mirbase123123</td><td>0.23213</td><td>-0.0345</td><td>...</td></tr>' +
                            '               <tr><td>mirbase123123</td><td>0.23213</td><td>-0.0345</td><td>...</td></tr>' +
                            '               <tr><td>...</td><td>...</td><td>...</td><td>...</td></tr>' +
                            '            </tbody>' +
                            '          </table>' +
                            '       </div>' +
                            '   </ul>' +
                            '   <h3>About multiple targe summarization</h3>' +
                            '   <p>' +
                            '             Lorem ipsum dolor sit amet, consectetur' +
                            '             adipiscing elit. Phasellus lacus turpis, lobortis ac ornare congue, volutpat non elit. Vivamus' +
                            '             nec dui vel eros vulputate luctus. Vivamus eros purus, dictum in mollis ut, maximus at tortor.' +
                            '             Phasellus posuere nisi massa, eget vulputate magna volutpat vulputate. Praesent non ante id' +
                            '             Maecenas non luctus enim, at tempor justo. Etiam nec ur na nec arcu rutrum posuere.' +
                            '   </p>' +
                            '   <img alt="figure1apng.png" src="resources/images/rgmatch_generegions.png" style=" width: 750px; margin: 20px auto; display: block; ">'+
                            '</div>'
                        },
                        {
                            xtype: 'form', bodyCls: "contentbox", itemId: "omicSubmittingForm", style: "max-width:1280px; padding-bottom:50px;",
                            layout: {type: 'vbox', align: "stretch"},
                            defaults: {labelAlign: "right", labelWidth: 220, maxWidth: 800},
                            items: [
                                {xtype: "box", flex: 1, maxWidth: 1300, html: '<h2>Data uploading</h2><h3>1. Choose the files to upload </h3>'},
                                new MiRNAOmicSubmittingPanel(0, {removable: false, allowToogle: false}).getComponent()
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
