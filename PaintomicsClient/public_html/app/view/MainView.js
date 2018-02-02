//# sourceURL=MainView.js
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
* - MainView
*
*/
function MainView() {
	/*********************************************************************
	* ATTRIBUTES
	***********************************************************************/
	this.name = "MainView";

	this.subviews = {};
	this.currentView = null;

	/*********************************************************************
	* OTHER FUNCTIONS
	***********************************************************************/
	this.getSubView = function(aViewName) {
		return this.subviews[aViewName];
	};
	this.addMainView = function(aViewInstance) {
		this.subviews[aViewInstance.getName()] = aViewInstance;
	};
	this.setLoading = function(loading) {
		this.getComponent().queryById("mainViewCenterPanel").setLoading(loading);
	};

	this.getLastJobView = function() {
		for (var i = 5; i > 0; i--) {
			if (this.getSubView("PA_Step" + i + "JobView") !== undefined) {
				return this.getSubView("PA_Step" + i + "JobView");
			}
		}
		return null;
	};

	this.clearSubViews = function(){
		for(var i in this.subviews){
			if(this.subviews[i].getModel && this.subviews[i].getModel() !== null){
					var observers = this.subviews[i].getModel().getObservers();
					for(var j = observers.length - 1; j >= 0; j--) {
						this.subviews[i].getModel().deleteObserver(observers[j])
					}
			}

			nObservers = 0;

			delete this.subviews[i];
			this.subviews[i] = null;
		}
		this.currentView = null;
		this.subviews = {};
		this.getComponent().queryById("mainViewCenterPanel").removeAll();
	};

	this.changeMainView = function(aViewName) {
		var aView = null;
		var me = this;
		if (aViewName === "" || (me.currentView !== null && me.currentView.getName() === aViewName)) {
			if (aViewName === "DM_MyDataListView") {
				me.currentView.updateContent();
			}
			return;
		}else if(aViewName === "contactForm"){
			application.getController("DataManagementController").sendReportHandler();
			return;
		} else if (this.subviews[aViewName] == null) {
			if (aViewName === "paintPathways") {
				application.getController("JobController").showJobInstance(this.getLastJobView().getModel()); //DELEGATE TO JobController
				return;
			} else if (aViewName === "DM_MyDataListView") {
				aView = new DM_MyDataListView();
				aView.setController(application.getController("DataManagementController"));
				this.subviews[aViewName] = aView;
			} else if (aViewName === "DM_MyDataUploadFilesPanel") {
				aView = new DM_MyDataUploadFilesPanel();
				aView.setController(application.getController("DataManagementController"));
				this.subviews[aViewName] = aView;
			} else if (aViewName === "fromBEDtoGenes") {
				aView = new DM_Bed2GenesJobView();
				aView.setController(application.getController("JobController"));
				this.subviews[aViewName] = aView;
			} else if (aViewName === "fromMiRNAtoGenes") {
				aView = new DM_miRNA2GenesJobView();
				aView.setController(application.getController("JobController"));
				this.subviews[aViewName] = aView;
			} else {
				aView = new DM_MyDataSubmitJobPanel(aViewName, application.getController("DataManagementController"));
				this.subviews[aViewName] = aView;
			}
		}else{
			aView = this.subviews[aViewName];
			if (aViewName === "DM_MyDataListView") {
				aView.updateContent();
			}
		}

		if (me.currentView !== null) {
			me.getComponent().queryById("mainViewCenterPanel").remove(me.currentView.getComponent(), false);
		}

		me.currentView = aView;

		me.getComponent().queryById("mainViewCenterPanel").add(aView.getComponent());
	};

	this.showSignInDialog = function () {
		var loggedIn = Ext.util.Cookies.get("userID") !== null;
		var noLogin = Ext.util.Cookies.get("nologin") !== null;

		/* Show the login form only when there is no session or nologin session enabled */
		if (loggedIn !== true && noLogin !== true) {
			$(".loggedOption").remove();
			application.getController("UserController").signInLinkClickHandler();
		}
	}

	this.initComponent = function() {
		var me = this;

		/* TODO: currently not used? Update it to work with "nologin" session */
		var sessionInfoBar = new SessionInfoBar();
		sessionInfoBar.setController(application.getController("UserController"));
		sessionInfoBar.getComponent().updateLoginState();

		var noLogin = Ext.util.Cookies.get("nologin") !== null;

		this.component = Ext.create('Ext.container.Viewport', {
			id: 'mainView',
			border: false,
			defaults: {border: 0},
			layout: "border",
			items: [{
				xtype: "box",
				cls: "toolbar mainTopToolbar",
				region: 'north',
				html:
				'<div id="header">'+
				'  <img src="resources/images/paintomics_150x150.png" alt="Paintomics logo">' +
				'  <h1> PaintOmics 3<span style="font-size: 8px; margin-left:10px;">' + APP_VERSION + '</span></h1>' +
				'</div>' +
				'<a class="button btn-sm btn-right loggedOption" data-name="logout" id="logoutButton"><i class="fa fa-sign-out"></i> ' + (noLogin !== true ? 'Log out' : 'Sign in/Log in') + '</a>'
			}, {
				xtype: "box",
				id: "lateralMenu",
				cls: "lateralMenu",
				region: 'west',
				html: "<ul class='lateralMenu-body'>" +
				" <li class='menuOption' id='homeButton'><i class='fa fa-paint-brush'></i> Job view</li>" + 
				" <li class='menuOption loggedOption' ><i class='fa fa-cloud'></i>  Personal storage" +
				"  <ul class='submenu loggedOption'>" +
				(noLogin != true ?
					"     <li class='menuOption' data-name='DM_MyDataListView'><i class='fa fa-file-text'></i>  My files and Jobs</li>" +
					"     <li class='menuOption' data-name='DM_MyDataUploadFilesPanel'><i class='fa fa-cloud-upload'></i>   Upload new files</li>"
					:
					"     <li class='menuOption externalOption'><i class='fa fa-file-text'></i>  Only available for registered accounts.</li>"
				) +
				// "     <li class='menuOption' data-name='fileEdition'><i class='fa fa-cloud-upload'></i>   File edition</li>"+
				" </ul></li>" +
				" <li class='menuOption loggedOption' ><i class='fa fa-rocket'></i>  Supporting tools" +
				" <ul class='submenu loggedOption'>" +
				"     <li class='menuOption' data-name='fromBEDtoGenes'><i class='fa fa-align-center'></i>   From Regions to Genes</li>" +
				"     <li class='menuOption' data-name='fromMiRNAtoGenes'><i class='fa fa-link'></i>   From miRNA to Genes</li>"+
				" </ul></li>" +
				" <li class='menuOption' ><i class='fa fa-info-circle'></i>  Resources" +
				" <ul class='submenu'>" +
				"     <li class='menuOption externalOption'><a href='http://paintomics.readthedocs.org/en/latest/' target='_blank'><i class='fa fa-book'></i>  Paintomics Documentation</a></li>" +
				"     <li class='menuOption externalOption'><a href='http://www.paintomics.org/' target='_blank'><i class='fa fa-external-link'></i>  PaintOmics 2</a></li>" +
				"	  <li class='menuOption externalOption'><a href='http://bioinfo.cipf.es/paintomics/resources/paintomics_example_data.zip' target='_blank'><i class='fa fa-download'></i>  Paintomics example data</a></li>" +
				"	  <li class='menuOption externalOption'><a href='http://bioinfo.cipf.es/paintomics/resources/rgmatch_example_data.zip' target='_blank'><i class='fa fa-download'></i>  RGmatch example data</a></li>" +
				"	  <li class='menuOption externalOption'><a href='http://bioinfo.cipf.es/paintomics/resources/mirna2genes_example_data.zip' target='_blank'><i class='fa fa-download'></i>  miRNA2Genes example data</a></li>" +
				" </ul></li>" +
				" <li class='menuOption' ><i class='fa fa-paper-plane-o'></i>  Publications" +
				" <ul class='submenu'>" +
				// "     <li class='menuOption'><a href='http://www.paintomics.org/'' target='_blank'><i class='fa fa-book'></i>  Paintomics Documentation</a></li>"+
				"     <li class='menuOption externalOption' style='font-size: 9px;'><a href='http://bioinformatics.oxfordjournals.org/content/early/2010/11/23/bioinformatics.btq594' target='_blank'>García-Alcalde F, García-López F, Dopazo J, Conesa A. <b>Paintomics: a web based tool for the joint visualization of transcriptomics and metabolomics data</b>. <i>Bioinformatics</i> 2011 27(1): 137–139.</a><br><a href='resources/images/paintomics2-garcia-alcalde.bib' target='_blank'>BibTeX</a></li>" +
				" </ul></li>" +
				" <li class='menuOption'><i class='fa fa-envelope-o'></i>  Contact" +
				" <ul class='submenu'>" +
				"     <li class='menuOption' data-name='contactForm'><i class='fa fa-envelope-o'></i>  Contact by email</li>" +
				" </ul></li>" +
				"</ul>"
			}, {
				xtype: 'container', itemId: 'mainViewCenterPanel', id: 'mainViewCenterPanel',
				flex: 1, region: 'center', overflowY: "auto", style: "background-color:#f3f3f3;",
				defaults: {border: 0},
				// layout: {type: 'vbox', pack: 'start', align: 'stretch'},
				items: []
			}],
			listeners: {
				boxready: function() {
					$("#logoutButton").click(function() {
						application.getController("UserController").signOutButtonClickHandler();
					});

					me.showSignInDialog();
					
					$('#homeButton').click(function() {
						$(".menuOption.selected").removeClass("selected");
						me.changeMainView('paintPathways');
					});

					$(".submenu .menuOption:not(.externalOption)").click(function() {
						$(".menuOption.selected").removeClass("selected");
						$(this).parents(".menuOption").addClass("selected");
						me.changeMainView(this.getAttribute("data-name"));
					});

					$(".lateralMenu-body").children(".menuOption").each(function() {
						var me = this;
						$(this).hover(function() {
							$(this).children(".submenu").fadeIn(100);
						}, function() {
							$(this).children(".submenu").fadeOut(0);
						});
					});

					$('#header').click(function() {
							application.getController("JobController").resetButtonClickHandler(null, false);
					});

					//TODO: AQUI
					if (Ext.util.Cookies.get("silence") != null) {
						console.log("Message already shown, ignoring.");
					} else {
						$.ajax({
							type: "POST",
							url: SERVER_URL_GET_MESSAGE,
							data: {message_type: "starting_message"},
							success: function (response) {
								if (response.success === false) {
									return;
								}
								if(response.messageList.length > 0){
									showInfoMessage("Welcome to PaintOmics 3!", {
										message: response.messageList[0].message_content,
										showButton: true
									})
								}
							},
							error: ajaxErrorHandler
						});
					}
				},
				resize: function(){
					if($("#mainViewCenterPanel").width() < 1000){
						$("#mainViewCenterPanel").addClass("mobileMode");
					}else{
						$("#mainViewCenterPanel").removeClass("mobileMode");
					}
				}
			}

		});

		return this.component;
	};
}
MainView.prototype = new View;
