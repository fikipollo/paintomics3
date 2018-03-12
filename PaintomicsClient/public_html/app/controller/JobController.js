//# sourceURL=JobController.js
/* global Ext, SERVER_URL_PA_STEP1, SERVER_URL_PA_EXAMPLE_STEP1, extJSErrorHandler, SERVER_URL_DM_FROMBED2GENES, ajaxErrorHandler */

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
*  - JobController
*
* EVENT HANDLERS MAPPING
*  - step1OnFormSubmitHandler
*  - step2OnFormSubmitHandler
*  - step3OnFormSubmitHandler
*  - step3GetPathwaysNetworkDataHandler
*  - recoverPAJobHandler
*  - backButtonOnClickHandler
*  - resetButtonClickHandler
*  - showJobInstance
*  - updateStoredVisualOptions
*  - updateStoredApplicationData
*  - cleanStoredApplicationData
*  - getCredentialsParams
*
*/
function JobController() {
	/**
	*
	* @param {type} jobID
	* @param {type} jobView
	* @param {type} callback
	* @param {type} other
	* @returns {undefined}
	*/
	this.checkJobStatus = function (jobID, jobView, callback, other, showURL = false) {
		other = (other || {});
		var errorHandler = (other.errorHandler || ajaxErrorHandler);
		var me = this;

		console.info("Checking status for Job " + jobID);
		$.ajax({
			type: "POST",
			headers: {"Content-Encoding": "gzip"},
			url: SERVER_URL_JOB_STATUS + "/" + jobID,
			success: function (response) {
				if (response.success === false) {
					if (response.status === "JobStatus.STARTED" || response.status === "started") {
						var message = "Running job " + jobID;
						
						if (showURL) {
							var jobURL = 'http://' + window.location.host + window.location.pathname + "?jobID=" + jobID;
							message += ".<br/> You will we able to access it from the URL: <br/><br /><a href=\"" + jobURL  + "\" target=\"_blank\">" + jobURL + "</a>";
						}

						showInfoMessage(message, {logMessage: "Job " + jobID + " still running.", showSpin: true, append: other.multipleJobs, itemId: jobID, icon: "play"});
					}
					//Check again in N seconds
					setTimeout(function () {
						me.checkJobStatus(jobID, jobView, callback, other, showURL);
					}, CHECK_STATUS_TIMEOUT);
				} else {
					callback(response, jobID, jobView, other);
				}
			},
			error: function (response) {
				errorHandler(response, jobID, jobView, other);
			}
		});
	};

	/**
	* This function gets a list of of RegionBasedOmicViews/miRNABasedOmicView and send each item to
	* server for processing.
	*
	* @param {JobView} jobView
	* @param {Array} specialOmics
	* @returns {String} error message in case of invalid form.
	*/
	this.step1ComplexFormSubmitHandler = function (jobView, specialOmics) {
		//STEP 1. INITIALIZE THE COUNTERS
		jobView.pendingRequests = 0;
		jobView.runningRequests = 0;
		jobView.failedRequests = 0;

		var me = this;

		//CHECK FORM VALIDITY
		if (jobView.checkForm() === true) {

			var regionURL = SERVER_URL_DM_FROMBED2GENES;
			var miRNAURL = SERVER_URL_DM_FROMMIRNA2GENES;

			if (jobView.isExampleMode() === true) {
				regionURL = SERVER_URL_DM_EXAMPLE_FROMBED2GENES;
				miRNAURL = SERVER_URL_DM_EXAMPLE_FROMMIRNA2GENES;
			}

			/**
			* Given a JobView and a list of RegionBasedOmicViews,
			* we get the first element in the list (if any) and
			* create a temporal form with the corresponding fields.
			* After that, we send the form to the server and get the corresponding
			* Genes for the given regions.
			* When we get a response, we replace the content for the
			* corresponding RegionBasedOmicView by the location of output files or an
			* error message in case that something went wrong.
			*
			* If regions are mapped correctly, then we call this function recursively
			* for the next element in the list, if exits.
			* Otherwise, we check if all regions were mapped correctly and, if so, we
			* call to the normal submission function step1OnFormSubmitHandler.
			*
			* @param jobView
			* @param genericBasedOmic list of RegionBasedOmicViews/miRNABasedOmicView elements.
			*/
			var sendRequest = function (jobView, genericBasedOmic) {
				//STEP1. TAKE THE ITEM THAT WILL BE SENT TO SERVER
				var subview = genericBasedOmic.shift();

				//STEP2. SHOW WAITING MESSAGE INSIDE THE PANEL
				subview.remove(subview.queryById("errorMessage"));

				//STEP3. CREATE A TEMPORAL FORM TO SUBMIT THE DATA
				var itemsContainer = subview.queryById("itemsContainer");
				var temporalForm = Ext.widget({xtype: "form", items: [itemsContainer]});

				// DEFINE THE URL BASED ON THE TYPE OF OMIC
				var formURL = subview.cls.search("regionBasedOmic") != -1 ? regionURL : miRNAURL;

				jobView.pendingRequests++;

				temporalForm.getForm().submit({
					method: 'POST',
					url: formURL,
					success: function (form, action) {
						var response = JSON.parse(action.response.responseText);

						showInfoMessage("Job " + response.jobID + " is waiting at job queue...", {logMessage: "Now Job is in the queue...", showSpin: true, append: true, itemId: response.jobID, icon: "clock-o"});
						subview.add(temporalForm.queryById("itemsContainer"));
						Ext.destroy(temporalForm);
						/**
						* Execute this code after the job finished at the QUEUE
						* @param {type} jobID
						* @param {type} jobView
						* @param {type} response
						* @returns {undefined}
						*/
						var callback = function (response, jobID, jobView, other) {
							showInfoMessage("Job " + jobID + " finished successfully.", {logMessage: "Job " + jobID + " finished.", showSpin: true, append: true, itemId: jobID, icon: "check-circle-o"});

							jobView.pendingRequests--;

							other.subview.setContent("itemsContainerAlt", {
								mainFile: response.mainOutputFileName,
								secondaryFile: response.secondOutputFileName,
								title: itemsContainer.queryById("omicNameField").getValue(),
								configVars: response.description,
								enrichmentType: response.featureEnrichment
							});

							if (jobView.pendingRequests === 0) {
								if (jobView.failedRequests === 0) {
									me.step1OnFormSubmitHandler(jobView);
								} else {
									showErrorMessage("Ops!... Something went wrong during the request files processing.", {message: "One or more files were not succesfully processed.</br>Please check the form for more info."});
								}
							}
						};

						var errorHandler = function (response, jobID, jobView, other) {
							showInfoMessage("Job " + jobID + " finished with errors.", {logMessage: "Job " + jobID + " finished.", showSpin: true, append: other.multipleJobs, itemId: jobID, icon: "times-circle-o"});

							//WHAT TO DO IN CASE OF ERROR
							jobView.failedRequests++;
							jobView.pendingRequests--;

							var response = JSON.parse(action.response.responseText);

							other.subview.add(Ext.widget({xtype: "box", itemId: "errorMessage", html: '<h3 style="color: #EC696E;  font-size: 20px;"><i class="fa fa-cog fa-spin"></i> Error when processing the request file.<br><span style="font-size:14px;">' + response.message + '</span></h3>'}));

							if (jobView.pendingRequests === 0) {
								showErrorMessage("Ops!... Something went wrong during the request files processing.", {
									message: "One or more files were not succesfully processed.</br>Please check the form for more information."
								});
							}
						};

						me.checkJobStatus(response.jobID, jobView, callback, {subview: subview, errorHandler: errorHandler, multipleJobs: true});

						if (genericBasedOmic.length > 0) {
							sendRequest(jobView, genericBasedOmic);
						}
					},
					failure: extJSErrorHandler
				});
			};

			showInfoMessage("Uploading BED/miRNA files... (" + jobView.pendingRequests + " pending)", {logMessage: "New Job created, submitting files...", showSpin: true});

			//SEND ALL FORM TO THE QUEUE
			sendRequest(jobView, specialOmics);
		} else {
			showErrorMessage("Invalid form. Please check form errors.", {height: 150, width: 400});
			return false;
		}
	};

	/************************************************************
	* This function...
	* @param {type} jobView
	* @returns {undefined}
	************************************************************/
	this.step1OnFormSubmitHandler = function (jobView) {
		var URL = SERVER_URL_PA_STEP1;
		if (jobView.isExampleMode() === true) {
			URL = SERVER_URL_PA_EXAMPLE_STEP1;
		}

		if (jobView.checkForm() === true) {
			var me = this;
			var form = jobView.getComponent().down("form").getForm();

			showInfoMessage("Uploading files...", {logMessage: "New Job created, submitting files...", showSpin: true});
			form.submit({
				method: 'POST', url: URL,
				success: function (form, action) {
					var response = JSON.parse(action.response.responseText);
					console.log("JOB " + response.jobID + " is queued ");

					showInfoMessage("Waiting at job queue...", {logMessage: "Now Job is in the queue...", showSpin: true, icon: "clock-o"});
					/**
					* Execute this code after the job finished at the QUEUE
					* @param {type} jobID
					* @param {type} jobView
					* @param {type} response
					* @returns {undefined}
					*/
					var callback = function (response, jobID, jobView) {
						showSuccessMessage("Done", {logMessage: "FILES PROCESSED SUCCESSFULLY"});
						//Wait 0.5 sec and update the page content with the STEP2 content
						showInfoMessage("Generating Metabolites list...", {showTimeout: 0.5, showSpin: true});

						var jobModel = jobView.getModel();
						jobModel.setStepNumber(2);         //UPDATE THE STEP NUMBER
						jobModel.setJobID(response.jobID); //UPDATE THE foundCompounds FIELD WITH RESPONSE DATA+
						jobModel.setOrganism(response.organism);  //UPDATE ORGANISM
						jobModel.setDatabases(response.databases); //UPDATE DATABASES
						jobModel.setName(response.name);

						jobModel.setCompoundBasedInputOmics(response.compoundBasedInputOmics);
						jobModel.setGeneBasedInputOmics(response.geneBasedInputOmics);

						//TODO: IF IS THE SECOND TIME THAT THE PREVIOUS STEP WAS EXECUTED AND NOTHING CHANGES, AVOID RESENDING?
						jobModel.setFoundCompounds([]);
						var matchedMetabolites = response.matchedMetabolites;
						var matchedCompound = null;
						for (var i in matchedMetabolites) {
							matchedCompound = new CompoundSet();
							matchedCompound.loadFromJSON(matchedMetabolites[i]);
							jobModel.addFoundCompound(matchedCompound);
						}

						//UPDATE SELECTED METABOLITES IN ORDER TO AVOID REPEATED SELECTIONS
						// e.g. if the user uploaded "Alanine" and "beta-Alanine" separately,
						// the beta-Alanine proposed by the "Alanine" panel will be unselected
						// by default
						var selectedCompounds = {};
						var auxCompound=null;
						for(var i in jobModel.foundCompounds){
							for(var j in jobModel.foundCompounds[i].mainCompounds){
								matchedCompound = jobModel.foundCompounds[i].mainCompounds[j];
								auxCompound = (selectedCompounds[matchedCompound.getID()] || matchedCompound) ;
								if(matchedCompound.similarity >= auxCompound.similarity){
									auxCompound.selected = false;
									matchedCompound.selected = true;
									selectedCompounds[matchedCompound.getID()] = matchedCompound;
								}else{
									matchedCompound.selected = false;
								}
							}
						}

						me.updateStoredApplicationData("jobModel", jobModel);
						me.showJobInstance(jobModel);
						showSuccessMessage("Done", {logMessage: "Generating Metabolites list...DONE", showTimeout: 1, closeTimeout: 0.5});
					};

					me.checkJobStatus(response.jobID, jobView, callback, {}, true);
				},
				failure: extJSErrorHandler
			});
		} else {
			showErrorMessage("Invalid form. Please check form errors.", {height: 150, width: 400, showReportButton:false});
			return false;
		}
	};

	/************************************************************
	* This function...
	* @param {type} jobView
	* @returns {undefined}
	************************************************************/
	this.step2OnFormSubmitHandler = function (jobView) {
		if (jobView.checkForm() === true) {
			var me = this;
			showInfoMessage("Obtaining Pathways list...", {logMessage: "Sending new request (get pathway list).", showSpin: true});

			// TODO: disabled code, allow setting customValues from step2
			// Get omicNames and customValues from view
			// jobView.getModel().getCompoundBasedInputOmics().concat(jobView.getModel().getGeneBasedInputOmics());
			// var omicNames = ...
			// var omicValues = {};
			//
			// $(omicNames).each(function(omic) {
			// 		omicValues[omic] = Ext.ComponentQuery.query('[name="customslider_' + omic + '"]')[0].getValues();
			// });
			var form = jobView.getComponent().down("form");
			var formData = $.extend(form ? form.getForm().getValues() : {}, {
				jobID: jobView.getModel().getJobID(),
				selectedCompounds: jobView.getSelectedCompounds()
			});

			$.ajax({
				type: "POST",
				headers: {"Content-Encoding": "gzip"},
				url: SERVER_URL_PA_STEP2,
				data: formData,
				success: function (response) {
					console.log("JOB " + response.jobID + " is queued ");

					showInfoMessage("Waiting at job queue...", {logMessage: "Now Job is in the queue...", showSpin: true});
					/**
					* Execute this code after the job finished at the QUEUE
					* @param {type} jobID
					* @param {type} jobView
					* @param {type} response
					* @returns {undefined}
					*/
					var callback = function (response, jobID, jobView) {
						if (response.success === false) {
							var errorMessage = "An error occurred getting the pathway list.</br>Please try again later.</br>If the error is repeated, please contact your web administrator.";
							if (response.errorMessage !== "") {
								errorMessage = response.errorMessage;
							}
							showErrorMessage(errorMessage);
							return;
						}

						//Wait 0.5 sec and update the page content with the STEP2 content
						showInfoMessage("Updating Pathways list...", {logMessage: "Obtaining Pathways list...DONE", showSpin: true});

						var jobModel = jobView.getModel();
						jobModel.setStepNumber(3);   //UPDATE THE STEP NUMBER
						jobModel.setCompoundBasedInputOmics(response.compoundBasedInputOmics);
						jobModel.setGeneBasedInputOmics(response.geneBasedInputOmics);
						jobModel.setSummary(response.summary);
						jobModel.setOrganism(response.organism);  //UPDATE ORGANISM
						jobModel.setDatabases(response.databases);
						jobModel.setTimestamp(response.timestamp);

						var pathways = response.pathwaysInfo;
						var pathway = null;
						jobModel.setPathways([]);
						for (var i in pathways) {
							pathway = new Pathway(i);
							pathway.loadFromJSON(pathways[i]);
							jobModel.addPathway(pathway);
						}

						me.updateStoredApplicationData("jobModel", jobModel);
						
						me.showJobInstance(jobModel);
						showSuccessMessage("Done", {logMessage: "Updating Pathways list...DONE", showTimeout: 1, closeTimeout: 0.5});
					};

					me.checkJobStatus(response.jobID, jobView, callback, true);
				},
				error: ajaxErrorHandler
			});
		} else {
			showErrorMessage("At least one compound must be selected. Please check the form.", {height: 200, width: 400});
			return false;
		}
	};
	/************************************************************
	* This function...
	* @param {type} jobView
	*
	************************************************************/
	this.step3OnFormSubmitHandler = function (jobView, pathwayID) {
		var me = this;
		var jobModel = jobView.getModel();
		var pathwayModel = jobModel.getPathway(pathwayID);

		if (pathwayModel.getGraphicalOptions() === null) {
			showInfoMessage("Fetching Pathway information...", {logMessage: "Sending new request (get pathway information).", showSpin: true});
			$.ajax({
				data: {selectedPathways: pathwayID, jobID: jobModel.getJobID()},
				method: 'POST', url: SERVER_URL_PA_STEP3,
				success: function (response) {
					var graphicalOptionsInstances = response.graphicalOptionsInstances;
					var graphicalOptionsInstance = null;
					for (var i in graphicalOptionsInstances) {
						graphicalOptionsInstance = new PathwayGraphicalData();
						graphicalOptionsInstance.loadFromJSON(graphicalOptionsInstances[i]);
						jobModel.getPathway(pathwayID).setGraphicalOptions(graphicalOptionsInstance);
					}
					var omicsValues = response.omicsValues;
					var feature = null;
					for (var i in omicsValues) {
						feature = new Feature(i);
						feature.loadFromJSON(omicsValues[i]);
						jobModel.addOmicValue(feature);
					}
					me.updateStoredApplicationData("jobModel", jobModel);
					showSuccessMessage("Done", {logMessage: "Pathway information retrieved successfully", closeTimeout: 0.4});
					me.showJobInstance(jobModel, {stepNumber: 4}).showPathwayView(pathwayID);
				},
				failure: ajaxErrorHandler
			});
		} else {
			me.showJobInstance(jobModel, {stepNumber: 4}).showPathwayView(pathwayID);
		}
	};
	/************************************************************
	* This function...
	* @param {type} jobView
	*
	************************************************************/
	this.step3GetPathwaysNetworkDataHandler = function (jobView) {
		var me = this;

		if (window.sessionStorage && sessionStorage.getItem("pathwaysNetwork") !== null) {
			var pathwaysNetworkData = JSON.parse(sessionStorage.getItem("pathwaysNetwork"));
			jobView.generateNetwork(pathwaysNetworkData);
		} else {
			//TODO: CHANGE URL
			$.getJSON(SERVER_URL_GET_PATHWAY_NETWORK + "/" + jobView.getModel().getOrganism(), function (pathwaysNetworkData) {
				me.updateStoredApplicationData("pathwaysNetwork", pathwaysNetworkData);
				jobView.generateNetwork(pathwaysNetworkData);
			});
		}
	};
    
 	/************************************************************
	* This function...
	* @param {type} jobView
	*
	************************************************************/   
    this.step3GetUpdatedPvalues = function (pathwayTableView, pathwayPvalues, stouferrWeights = null, visiblePathways = null) {
        var me = this;
        var formData = {pValues: pathwayPvalues};
        
        if (stouferrWeights !== null) {
            formData['stoufferWeights'] = stouferrWeights;
			formData['visiblePathways'] = visiblePathways;
        }
        
        showInfoMessage("Fetching new adjusted p-values...", {logMessage: "Sending new request (get new adjusted p-values after filtering).", showSpin: true});
        
        $.ajax({
            data: JSON.stringify(formData),
            method: 'POST', 
			url: SERVER_URL_ADJUST_PVALUES,
			dataType: "json",
  			contentType : "application/json",
            success: function (response) {
				
				if (response.success) {
					/*
						For new Stouffer values, update the visualOptions of each database
						in both Stouffer and adjusted, otherwise only the adjusted p-values.
						
						The visual options databases objects should be initialized at this point.
					*/	
					var currentVisualOptions = pathwayTableView.getParent().getVisualOptions();
					
					if (response.stoufferPvalues) {
						Object.keys(response.stoufferPvalues).forEach(function(db) {
							currentVisualOptions[db]['Stouffer'] = response.stoufferPvalues[db];
							
							$.extend(true, currentVisualOptions[db], {
								'adjustedPvalues': {
									'Stouffer': response.adjustedStoufferPvalues[db]
								}
							});
						});
					} else {
						Object.keys(response.adjustedPvalues).forEach(function(db) {
							currentVisualOptions[db]['adjustedPvalues'] = response.adjustedPvalues[db];
						});
					}
					
					me.updateStoredVisualOptions(pathwayTableView.getParent().getModel().jobID, currentVisualOptions);
                	showSuccessMessage("Done", {logMessage: "Adjusted p-values retrieved successfully", closeTimeout: 0.4});
                	pathwayTableView.updatePvaluesFromStore();
				}                
            },
            failure: ajaxErrorHandler
        });
        
        
    };

	/************************************************************
	* This function recovers an instance of JOB from database by a given JobID.
	*
	* @param {String} jobID [optional], the ID for the job, if not defined, the
	* user will be prompt.
	*
	************************************************************/
	this.recoverPAJobHandler = function (jobID) {
		var me = this;

		var _recover = function (btn, jobID) {
			if (btn === "ok" && jobID !== "") {
				showInfoMessage("Loading job information...", {logMessage: "Sending new request (recover job).", showSpin: true});
				$.ajax({
					type: "POST", headers: {"Content-Encoding": "gzip"},
					url: SERVER_URL_PA_RECOVER_JOB,
					data: {jobID: jobID},
					success: function (response) {
						if (response.success === false) {
							if (response.message) {
								showInfoMessage(response.message);
							} else {
								showErrorMessage(response.errorMessage);
							}
							return;
						}
						me.cleanStoredApplicationData();

						var jobModel = new JobInstance(jobID);
						//UPDATE THE STEP NUMBER
						jobModel.setStepNumber(response.stepNumber);
						//TODO: NO ES NECESARIO DEVOLVER ESTO!!! MUY GRANDE! MEJOR CALCULARLO EN EL SERVER
						jobModel.setCompoundBasedInputOmics(response.compoundBasedInputOmics);
						jobModel.setGeneBasedInputOmics(response.geneBasedInputOmics);
						jobModel.setSummary(response.summary);
						jobModel.setOrganism(response.organism);  //UPDATE ORGANISM
						jobModel.setDatabases(response.databases); //UPDATE DATABASES
						jobModel.setName(response.name);
						jobModel.setTimestamp(response.timestamp);

						jobModel.setFoundCompounds([]);
						var matchedMetabolites = response.matchedMetabolites;
						var matchedCompound = null;
						for (var i in matchedMetabolites) {
							matchedCompound = new CompoundSet();
							matchedCompound.loadFromJSON(matchedMetabolites[i]);
							jobModel.addFoundCompound(matchedCompound);
						}

						//UPDATE SELECTED METABOLITES IN ORDER TO AVOID REPEATED SELECTIONS
						// e.g. if the user uploaded "Alanine" and "beta-Alanine" separately,
						// the beta-Alanine proposed by the "Alanine" panel will be unselected
						// by default
						var selectedCompounds = {};
						var auxCompound=null;
						for(var i in jobModel.foundCompounds){
							for(var j in jobModel.foundCompounds[i].mainCompounds){
								matchedCompound = jobModel.foundCompounds[i].mainCompounds[j];
								auxCompound = (selectedCompounds[matchedCompound.getID()] || matchedCompound) ;
								if(matchedCompound.similarity >= auxCompound.similarity){
									auxCompound.selected = false;
									matchedCompound.selected = true;
									selectedCompounds[matchedCompound.getID()] = matchedCompound;
								}else{
									matchedCompound.selected = false;
								}
							}
						}

						var pathways = response.pathwaysInfo;
						var pathway = null;
						jobModel.setPathways([]);
						for (var i in pathways) {
							pathway = new Pathway(i);
							pathway.loadFromJSON(pathways[i]);
							jobModel.addPathway(pathway);
						}
						jobModel.isRecoveredJob = true;

						me.cleanStoredApplicationData();
						me.updateStoredApplicationData("jobModel", jobModel);

						var visualOptions = response.visualOptions;
						if(visualOptions){
							visualOptions.timestamp = response.timestamp;
							me.updateStoredApplicationData("visualOptions", visualOptions);
						}

						me.showJobInstance(jobModel, {force:true});

						showSuccessMessage("Done", {logMessage: "Getting Job information...DONE", closeTimeout: 1});
					},
					error: ajaxErrorHandler
				});
			}
		};

		if (jobID === undefined) {
			Ext.MessageBox.prompt('Job ID', 'Please enter the Job ID:', _recover);
		} else {
			_recover("ok", jobID);
		}
	};

	/************************************************************
	* This function...
	* @param {type} jobView
	* @returns {undefined}
	************************************************************/
	this.fromBed2GenesOnFormSubmitHandler = function (jobView) {
		var URL = jobView.isExampleMode() === true ? SERVER_URL_DM_EXAMPLE_FROMBED2GENES : SERVER_URL_DM_FROMBED2GENES;

		if (jobView.checkForm() === true) {
			var me = this;
			var form = jobView.getComponent().down("form").getForm();

			showInfoMessage("Uploading and processing files...", {logMessage: "New Job created, submitting files...", showSpin: true});
			form.submit({
				method: 'POST', url: URL,
				success: function (form, action) {
					var response = JSON.parse(action.response.responseText);
					console.log("JOB " + response.jobID + " is queued ");

					showInfoMessage("Waiting at job queue...", {logMessage: "Now Job is in the queue...", showSpin: true});

					/**
					* Execute this code after the job finished at the QUEUE
					* @param {type} jobID
					* @param {type} jobView
					* @param {type} response
					* @returns {undefined}
					*/
					var callback = function (response, jobID, jobView) {
						var jobId = response.jobID;
						showSuccessMessage("Bed2Genes finished successfully", {
							message: "Click on the link below to download your files.</br>" +
							"<b>Note</b> that the main output (quantification at gene level) is now available at your data section.</br>" +
							"<a href='" + window.location.pathname + SERVER_URL_DM_DOWNLOAD_FILE + "?jobID=" + jobId + "&fileName=" + response.compressedFileName + "&fileType=job_result'>Download files.</a>",
							showButton: true
						});
					};

					me.checkJobStatus(response.jobID, jobView, callback);
				},
				failure: extJSErrorHandler
			});
		} else {
			showErrorMessage("Invalid form. Please check form errors.", {height: 150, width: 400, showReportButton:false});
			return false;
		}
	};

	/************************************************************
	* This function...
	* @param {type} jobView
	* @returns {undefined}
	************************************************************/
	this.fromMiRNA2GenesOnFormSubmitHandler = function (jobView) {
		var URL = jobView.isExampleMode() === true ? SERVER_URL_DM_EXAMPLE_FROMMIRNA2GENES : SERVER_URL_DM_FROMMIRNA2GENES;

		if (jobView.checkForm() === true) {
			var me = this;
			var form = jobView.getComponent().down("form").getForm();

			showInfoMessage("Uploading and processing files...", {logMessage: "New Job created, submitting files...", showSpin: true});
			form.submit({
				method: 'POST', url: URL,
				success: function (form, action) {
					var response = JSON.parse(action.response.responseText);
					console.log("JOB " + response.jobID + " is queued ");

					showInfoMessage("Waiting at job queue...", {logMessage: "Now Job is in the queue...", showSpin: true});

					/**
					* Execute this code after the job finished at the QUEUE
					* @param {type} jobID
					* @param {type} jobView
					* @param {type} response
					* @returns {undefined}
					*/
					var callback = function (response, jobID, jobView) {
						var jobId = response.jobID;
						showSuccessMessage("miRNA2Genes finished successfully", {
							message: "Click on the link below to download your files.</br>" +
							"<b>Note</b> that the main output (quantification at gene level) is now available at your data section.</br>" +
							"<a href='" + window.location.pathname + SERVER_URL_DM_DOWNLOAD_FILE + "?jobID=" + jobId + "&fileName=" + response.compressedFileName + "&fileType=job_result'>Download files.</a>",
							showButton: true
						});
					};

					me.checkJobStatus(response.jobID, jobView, callback);
				},
				failure: extJSErrorHandler
			});
		} else {
			showErrorMessage("Invalid form. Please check form errors.", {height: 150, width: 400, showReportButton:false});
			return false;
		}
	};
	
	/************************************************************
	* This function...
	* @param {type} jobView
	* @returns {undefined}
	************************************************************/
	this.updateMetagenesSubmitHandler = function (jobView, numberClusters, omicName) {
		if (parseInt(numberClusters) > 0) {
			var me = this;
			var jobModel = jobView.getModel();

			showInfoMessage("Sending information to generate new clusters...", {logMessage: "New Metagenes Job created...", showSpin: true});
			
			$.ajax({
				type: "POST",
				url: SERVER_URL_UPDATE_METAGENES,
				data: {
					jobID: jobModel.getJobID(),
					number: numberClusters,
					omic: omicName
				},
				success: function (response) {
					if (response.success) {
						/**
						* Execute this code after the job finished at the QUEUE
						* @param {type} jobID
						* @param {type} jobView
						* @param {type} response
						* @returns {undefined}
						*/
						var callback = function (response, jobID, jobView) {
							if (response.success) {
								console.log("MetaGenes JOB " + response.jobID + " is queued ");

								showInfoMessage("Waiting at job queue...", {logMessage: "Now Job is in the queue...", showSpin: true});

								var jobId = response.jobID;
								
								// Override the pathway info and update stored session data
								var pathways = response.pathwaysInfo;
								var pathway = null
								jobModel.setClusterNumber(null);
								jobModel.setPathways([]);
								
								for (var i in pathways) {
									pathway = new Pathway(i);
									pathway.loadFromJSON(pathways[i]);
									jobModel.addPathway(pathway);
								}

								me.updateStoredApplicationData("jobModel", jobModel);

								// Notify to other components
								jobView.getParent().indexPathways(jobModel.getPathways());
								jobModel.setChanged();
								jobModel.notifyObservers();

								showSuccessMessage("New clusters retrieved successfully", {
									message: "The new clusters were generated for the selected omic and information was updated in the pathways",
									closeTimeout: 0.7
								});
							} else {
								showErrorMessage(response.errorMessage || response.message);
							}
						};

						me.checkJobStatus(response.jobID, jobView, callback);	
					} else {
						showErrorMessage(response.errorMessage || response.message);
					}
				},
				error: ajaxErrorHandler
			});
		} else {
			showErrorMessage("Invalid number of clusters.", {height: 150, width: 400, showReportButton:false});
			return false;
		}
	};

	/**
	*
	* @param {type} button
	* @param {type} jobView
	* @returns {undefined}
	*/
	this.backButtonClickHandler = function (jobView) {
		var jobModel = jobView.getModel();
		var me = this;
		if (jobModel.getStepNumber() > 1) {
			showInfoMessage("Loading job information...", {
				callback: function () {
					jobModel.setStepNumber(jobModel.getStepNumber() - 1);
					me.updateStoredApplicationData("jobModel", jobModel);
					me.showJobInstance(jobModel, {doUpdate: false});
					//                    showSuccessMessage("Done", {logMessage: "Getting Job information..."});
				}, closeTimeout: 1, showSpin: true
			});
		}
	};
	/**
	*
	* @param {type} button
	* @param {type} jobView
	* @returns {undefined}
	*/
	this.resetButtonClickHandler = function (jobView, force, callback) {
		var me = this;
		if (force === true) {
			me.cleanStoredApplicationData();
			me.showJobInstance(new JobInstance(null));
			if (callback !== undefined) {
				callback();
			}
			//location.reload();
			return;
		}
		Ext.MessageBox.confirm('Confirm', 'Are you sure you want to exit the current job?', function (opcion) {
			if (opcion === "yes") {
				me.cleanStoredApplicationData();
				me.showJobInstance(new JobInstance(null));
				if (callback !== undefined) {
					callback();
				}
				// location.reload();
				window.history.replaceState(null, null, window.location.pathname);
			}
		});
	};

	/**
	*
	* @param {type} jobModel
	* @param {type} callback
	* @returns {PA_Step1JobView|PA_Step3JobView|Step5View|PA_Step4JobView|PA_Step2JobView}
	*/
	this.showJobInstance = function (jobModel, options) {
		var me = this;
		options = (options || {});
		var stepNumber = (options.stepNumber || jobModel.getStepNumber());
		var doUpdate = (options.doUpdate !== false);
		var callback = options.callback;
		var force = (options.force || false);

		var jobView = application.getMainView().getSubView("PA_Step" + stepNumber + "JobView");

		if(jobView !== undefined && force){
			jobView.getModel().deleteObserver(jobView);
			jobView.loadModel(jobModel);
			jobModel.addObserver(jobView);
			doUpdate = true;
		}

		if (jobView === undefined) {
			if (stepNumber === 4) {
				jobView = new PA_Step4JobView();
			} else if (stepNumber === 3) {
				jobView = new PA_Step3JobView();
			} else if (stepNumber === 2) {
				jobView = new PA_Step2JobView();
			} else if (stepNumber === 1) {
				jobView = new PA_Step1JobView();
			}

			jobView.setController(me);
			jobView.loadModel(jobModel);
			jobModel.addObserver(jobView);

			application.getMainView().addMainView(jobView);
			doUpdate = true;
		}

		application.getMainView().changeMainView(jobView.getName());

		if (doUpdate && jobView.updateObserver !== undefined) {
			console.info(Date.logFormat() + "JobController.js : Updating jobview...");
			jobView.updateObserver();
		}

		// Update the URL adding the parameter with the jobID
		if (jobModel.getJobID() !== null && doUpdate) {
			window.history.replaceState(null, null, window.location.pathname + "?jobID=" + jobModel.getJobID());

			// Call the server to update the job's access date even when it was
			// loaded from session data.
			$.ajax({
				type: "POST",
				url: SERVER_URL_PA_TOUCH_JOB,
				data: {jobID: jobModel.getJobID()},
				success: function (response) {
					console.info(Date.logFormat() + " job's access date succesfully updated.");
				},
				error: function (response) {
					console.error(Date.logFormat() + " failed when updating job's access date.");
				},
			});
		}

		return jobView;
	};

	/**
	*
	* @param {type} jobModel
	* @returns {undefined}
	*/
	this.updateStoredVisualOptions = function (jobID, visualOptions) {
		/********************************************************/
		/* STEP 1. SAVE TO CACHE                                */
		/********************************************************/
		var me = this;
		
		this.updateStoredApplicationData("visualOptions", visualOptions);

		/********************************************************/
		/* STEP 2. SEND TO SERVER                               */
		/********************************************************/
		visualOptions.jobID = jobID;

		$.ajax({
			method: "POST",
			url: SERVER_URL_PA_SAVE_VISUAL_OPTIONS,
			data: JSON.stringify(visualOptions),
			dataType: "json",
			contentType: "application/json",
			success: function (response) {
				// Update only the timestamp value when the server has properly saved the options.
				visualOptions.timestamp = response.timestamp;
				me.updateStoredApplicationData("visualOptions", visualOptions);
				
				console.info(Date.logFormat() + "Visual options saved succesfully.");
			},
			error: function (response) {
				console.error(Date.logFormat() + "failed when saving Visual options.");
			},
		});
	};
	/**
	*
	* @param {type} jobModel
	* @returns {undefined}
	*/
	this.updateStoredApplicationData = function (key, data) {
		if (window.sessionStorage) {
			if (data != null) {
				var replacerFn = function (key, value) {
					if (key === 'observers' || key === 'changed') {
						return;
					}
					return value; // returning undefined omits the key from being serialized
				};
				sessionStorage.setItem(key, JSON.stringify(data, replacerFn));
			}
		}
	};
	/**
	*
	* @returns {undefined}
	*/
	this.cleanStoredApplicationData = function () {
		if (window.sessionStorage) {
			sessionStorage.removeItem("jobModel");
			sessionStorage.removeItem("pathwaysNetwork");
			sessionStorage.removeItem("visualOptions");
			sessionStorage.clear();
		}
		application.getMainView().clearSubViews();
		application.getMainView().showSignInDialog();
	};

	this.getCredentialsParams = function (request_params) {
		var credentials = {};
		if (request_params != null) {
			credentials = request_params;
		}

		credentials.sessionToken = Ext.util.Cookies.get('sessionToken');
		credentials.userID = Ext.util.Cookies.get('userID');
		return credentials;
	};
}
