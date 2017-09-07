//# sourceURL=JobInstanceModels.js
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
* - JobInstance
*
*/

function JobInstance(jobID) {
	this.jobID = jobID;
	this.stepNumber = 1;
	this.organism = null;

	this.pathways = [];
	this.summary = null;
	this.mappingSummary = null;

	this.geneBasedInputOmics = null;
	this.compoundBasedInputOmics = null;

	this.omicsValues = null;
	this.foundCompounds = [];

	this.selectedPathway = null;

	/*****************************
	** GETTERS AND SETTERS
	*****************************/
	this.setJobID = function (jobID) {
		this.jobID = jobID;
	};
	this.getJobID = function () {
		return this.jobID;
	};
	this.setStepNumber = function (stepNumber) {
		this.stepNumber = stepNumber;
	};
	this.getStepNumber = function () {
		return this.stepNumber;
	};
	this.setOrganism = function (organism) {
		this.organism = organism;
	};
	this.getOrganism = function () {
		return this.organism;
	};
	this.setPathways = function (pathways) {
		this.pathways = pathways;
	};
	this.getPathways = function () {
		return this.pathways;
	};
	this.getPathway = function (pathwayID) {
		for (var i in this.pathways) {
			if (pathwayID == this.pathways[i].getID()) {
				return this.pathways[i];
			}
		}
		return null;
	};
	this.addPathway = function (pathway) {
		//TODO: CHECK CLASSES?
		this.pathways.push(pathway);
	};
	this.setSummary = function (summary) {
		this.summary = summary;
	};
	this.getSummary = function () {
		return this.summary;
	};
	this.setMappingSummary = function (mappingSummary) {
		this.mappingSummary = mappingSummary;
	};
	this.getMappingSummary = function () {
		return this.mappingSummary;
	};
	this.setGeneBasedInputOmics = function (geneBasedInputOmics) {
		this.geneBasedInputOmics = geneBasedInputOmics;
	};
	this.getGeneBasedInputOmics = function () {
		return this.geneBasedInputOmics;
	};
	this.setCompoundBasedInputOmics = function (compoundBasedInputOmics) {
		this.compoundBasedInputOmics = compoundBasedInputOmics;
	};
	this.getCompoundBasedInputOmics = function () {
		return this.compoundBasedInputOmics;
	};
	this.setFoundCompounds = function (foundCompounds) {
		this.foundCompounds = foundCompounds;
	};
	this.getFoundCompounds = function () {
		return this.foundCompounds;
	};
	this.addFoundCompound = function (compoundSet) {
		//TODO: CHECK CLASSES?
		this.foundCompounds.push(compoundSet);
	};
	this.updatePathway = function (pathway) {
		for (var i in this.pathways) {
			if (pathway.getID() == this.pathways[i].getID()) {
				this.pathways.splice(i, 1);
				break;
			}
		}
		this.pathways.push(pathway);
	};
	this.setSelectedPathway = function (pathwayID) {
		this.selectedPathway = pathwayID;
	};
	this.getSelectedPathway = function () {
		return this.selectedPathway;
	};
	this.setOmicsValues = function (omicsValues) {
		this.omicsValues = omicsValues;
	};
	this.getOmicsValues = function () {
		if (this.omicsValues === null) {
			this.omicsValues = {};
		}
		return this.omicsValues;
	};
	this.addOmicValue = function (omicsValue) {
		this.getOmicsValues()[omicsValue.getID()] = omicsValue;
	};

	/**
	* This function returns the values for min/max for each omic type.
	* This information is calculated during first step and returned as part of
	* the matching summary.
	* The information is stored as part of the Objects stored in geneBasedInputOmics
	* and compoundBasedInputOmics, but using this function we adapt extract only the min/max
	* (i.e. p10 and p90) and store it in an appropriate format (which PA_Step4PathwayView).
	*
	* @returns {minMaxValues}, an object containing 2 arrays: pos 0 contains the min values
	*   for each omic (indexed by omic name), and pos 1 contains max values for each omic
	*   (indexed by omic name)
	*/
	this.getDataDistributionSummaries = function (omicName) {
		//   0        1       2    3   4     5     6    7    8     9       10      11          12
		//[MAPPED, UNMAPPED, MIN, P10, Q1, MEDIAN, Q3, P90, MAX, MIN_IR, Max_IR, MIN_CUSTOM, MAX_CUSTOM]
		if(this.dataDistributionSummaries === undefined){
			this.dataDistributionSummaries = {};

			var omicsAux = this.getGeneBasedInputOmics();
			for (var i in omicsAux) {
				if (omicsAux[i].omicSummary === undefined) {
					showWarningMessage("No information about min/max available.", {
						message: "The current job instance do not include information about min/max values for each omic type.</br>" +
						"A possible explanation for this issue could be that the data was generated using an older version of Paintomics.</br>" +
						"Instead of using the percentiles 10 and 90 for each omics as reference to obtain the colors for the heatmap, Paintomics " +
						"will calculate locally the min / max for each omics for each selected pathway.", showButton: true, height: 260
					});
					return null;
				}
				//TODO: SAVE SUMMARY AS DICT??
				this.dataDistributionSummaries[omicsAux[i].omicName] = omicsAux[i].omicSummary;
			}
			omicsAux = this.getCompoundBasedInputOmics();
			for (var i in omicsAux) {
				if (omicsAux[i].omicSummary === undefined) {
					showWarningMessage("No information about min/max available.", {
						message: "The current job instance do not include information about min/max values for each omic type.</br>" +
						"A possible explanataion for this issue could be that the data was generated using an older version of Paintomics.</br>" +
						"Instead of using the percentiles 10 and 90 for each omics as reference to obtain the colors for the heatmap, Paintomics" +
						" will calculate locally the min / max for each omics for each selected pathway."
					});
					return null;
				}
				//TODO: SAVE SUMMARY AS DICT??
				this.dataDistributionSummaries[omicsAux[i].omicName] = omicsAux[i].omicSummary;
			}
		}


		return (omicName? this.dataDistributionSummaries[omicName]: this.dataDistributionSummaries);
	};

	this.setDataDistributionSummaries = function(dataDistributionSummaries, omicName) {
		if (omicName) {
			this.dataDistributionSummaries[omicName] = dataDistributionSummaries;
		} else {
			this.dataDistributionSummaries = dataDistributionSummaries;
		}
 	};

	this.loadFromJSON = function (jsonObject) {
		for(var i in jsonObject){
			if(i === "geneBasedInputOmics"){
				this.geneBasedInputOmics = jsonObject.geneBasedInputOmics;
				this.geneBasedInputOmics.sort(function(a,b) {return (a.omicName > b.omicName) ? 1 : ((b.omicName > a.omicName) ? -1 : 0);} );
			}else if(i === "compoundBasedInputOmics"){
				this.compoundBasedInputOmics = jsonObject.compoundBasedInputOmics;
				this.compoundBasedInputOmics.sort(function(a,b) {return (a.omicName > b.omicName) ? 1 : ((b.omicName > a.omicName) ? -1 : 0);} );
			}else if(i === "foundCompounds"){
				this.foundCompounds = [];
				for (var i in jsonObject.foundCompounds){
					this.addFoundCompound(new CompoundSet("").loadFromJSON(jsonObject.foundCompounds[i]));
				}
			}else if(i === "pathways"){
				this.pathways = [];
				for (var i in jsonObject.pathways){
					this.addPathway(new Pathway("").loadFromJSON(jsonObject.pathways[i]));
				}
			}else if(i === "omicsValues"){
				this.omicsValues = {};
				for (var i in jsonObject.omicsValues){
					this.addOmicValue(new Feature(i).loadFromJSON(jsonObject.omicsValues[i]));
				}
			}else{
				this[i] = jsonObject[i];
			}
		}
	};
}
JobInstance.prototype = new Model();
