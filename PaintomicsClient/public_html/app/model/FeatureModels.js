//# sourceURL=FeatureModels.js
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
* - Feature
* - OmicValue
* - Gene
* - Compound
* - CompoundSet
* - FeatureSet
* - FeatureSetElem
*
*/

/**
*
* @param {type} name
* @returns {Feature}
*/
function Feature(name) {
	this.ID = "";
	this.name = name;
	this.url = "";
	this.featureType = "";
	this.omicsValues = [];

	this.selected = false;

	/*****************************
	** GETTERS AND SETTERS
	*****************************/
	this.setID = function(ID) {
		this.ID = ID;
	};
	this.getID = function() {
		return this.ID;
	};
	this.setName = function(name) {
		this.name = name;
	};
	this.getName = function() {
		return this.name;
	};
	this.setUrl = function(url) {
		this.url = url;
	};
	this.getUrl = function() {
		return this.url;
	};
	this.setSignificative = function(significative) {
		this.significative = significative;
	};
	this.isSignificative = function() {
		return this.significative;
	};
	this.setFeatureType = function(featureType) {
		this.featureType = featureType;
	};
	this.getFeatureType = function() {
		return this.featureType;
	};
	this.setOmicsValues = function(omicsValues) {
		this.omicsValues = omicsValues;
	};
	this.getOmicsValues = function() {
		return this.omicsValues;
	};
	this.getOmicValues = function(omicName) {
		for (var i in this.omicsValues) {
			if (this.omicsValues[i].getOmicName() === omicName) {
				return this.omicsValues[i];
			}
		}
		return null;
	};
	this.setSelected = function(selected) {
		this.selected = selected;
	};
	this.isSelected = function() {
		return this.selected;
	};
	this.isRelevant = function() {
		for (var i in this.omicsValues) {
			if (this.omicsValues[i].isRelevant() === true) {
				return true;
			}
		}
		return false;
	};
	/********************************************
	** OTHER FUNCTIONS
	********************************************/
	this.loadFromJSON = function(jsonObject) {
		for(var i in jsonObject){
			if(i === "omicsValues"){
				if (jsonObject.omicsValues !== undefined) {
					this.omicsValues = [];
					for (var i in jsonObject.omicsValues) {
						this.omicsValues.push(OmicValue.loadFromJSON(jsonObject.omicsValues[i]));
					}
				}
			}else{
				this[i] = jsonObject[i];
			}
		}
		return this;
	};
}
Feature.prototype = new Model;

/**
*
* @param {type} ID
* @returns {Gene}
*/
function Gene(ID) {
	this.ID = ID;
}
Gene.prototype = new Feature;
/**
*
* @param {type} name
* @returns {Compound}
*/
function Compound(name) {
	this.name = name;
}
Compound.prototype = new Feature;
/**
*
* @param {type} title
* @returns {CompoundSet}
*/
function CompoundSet(title) {
	this.title = title;
	this.mainCompounds = [];
	this.otherCompounds = [];

	/*****************************
	** GETTERS AND SETTERS
	*****************************/
	this.setTitle = function(title) {
		this.title = title;
	};
	this.getTitle = function() {
		return this.title;
	};
	this.setMainCompounds = function(mainCompounds) {
		this.mainCompounds = mainCompounds;
	};
	this.getMainCompounds = function() {
		return this.mainCompounds;
	};
	this.findMainCompound = function(compoundCode) {
		for (var i in this.mainCompounds) {
			if (this.mainCompounds[i].getID() === compoundCode) {
				return this.mainCompounds[i];
			}
		}
		return null;
	};
	this.setOtherCompounds = function(otherCompounds) {
		this.otherCompounds = otherCompounds;
	};
	this.getOtherCompounds = function() {
		return this.otherCompounds;
	};
	this.findOtherCompound = function(compoundCode) {
		for (var i in this.otherCompounds) {
			if (this.otherCompounds[i].getID() === compoundCode) {
				return this.otherCompounds[i];
			}
		}
		return null;
	};
	this.loadFromJSON = function(jsonObject) {
		if (jsonObject.title !== undefined) {
			this.title = jsonObject.title;
		}

		if (jsonObject.mainCompounds !== undefined) {
			var compound = null;
			for (var i in jsonObject.mainCompounds) {
				compound = new Compound();
				compound.loadFromJSON(jsonObject.mainCompounds[i]);
				this.mainCompounds.push(compound);
			}
			for (var i in jsonObject.otherCompounds) {
				compound = new Compound();
				compound.loadFromJSON(jsonObject.otherCompounds[i]);
				this.otherCompounds.push(compound);
			}
		}
		return this;
	};
}
CompoundSet.prototype = new Model;
/**
*
* @param {type} x
* @param {type} y
* @returns {FeatureSet}
*/
function FeatureSet(x, y) {
	this.x = x;
	this.y = y;
	this.mainFeature = null;
	this.medianValuesFeature = null;
	this.meanValuesFeature = null;
	this.maxValuesFeature = null;
	this.relevantFeatures = null;

	this.features = null;

	/*****************************
	** GETTERS AND SETTERS
	*****************************/
	this.setX = function(x) {
		this.x = x;
	};
	this.getX = function() {
		return this.x;
	};
	this.setY = function(y) {
		this.y = y;
	};
	this.getY = function() {
		return this.y;
	};
	this.getMainFeature = function() {
		return this.mainFeature;
	};
	this.setMainFeature = function(mainFeature) {
		this.mainFeature = mainFeature;
	};
	this.isMainFeature = function(aFeature) {
		return this.mainFeature === aFeature;
	};

	this.getMedianValuesFeature = function() {
		return this.medianValuesFeature;
	};
	this.setMedianValuesFeature = function(medianValuesFeature) {
		this.medianValuesFeature = medianValuesFeature;
	};

	this.getMeanValuesFeature = function() {
		return this.meanValuesFeature;
	};
	this.setMeanValuesFeature = function(meanValuesFeature) {
		this.meanValuesFeature = meanValuesFeature;
	};

	this.getMaxValuesFeature = function() {
		return this.maxValuesFeature;
	};
	this.setMaxValuesFeature = function(maxValuesFeature) {
		this.maxValuesFeature = maxValuesFeature;
	};

	this.getRelevantFeatures = function() {
		return this.relevantFeatures;
	};
	this.setRelevantFeatures = function(relevantFeatures) {
		this.relevantFeatures = relevantFeatures;
	};
	this.addRelevantFeature = function(relevantFeature) {
		if (this.relevantFeatures === null) {
			this.relevantFeatures = [];
		}
		this.relevantFeatures.push(relevantFeature);
	};

	this.getFeatures = function() {
		return this.features;
	};
	this.setFeatures = function(features) {
		this.features = features;
	};
	this.addFeature = function(feature) {
		if (this.features === null) {
			this.features = [];
		}
		this.features.push(feature);
	};
}
FeatureSet.prototype = new Model;

function FeatureSetElem(feature, featureGraphicalData) {
	this.feature = feature;
	this.featureGraphicalData = featureGraphicalData;

	/*****************************
	** GETTERS AND SETTERS
	*****************************/
	this.setFeature = function(feature) {
		this.feature = feature;
	};
	this.getFeature = function() {
		return this.feature;
	};
	this.setFeatureGraphicalData = function() {
		this.featureGraphicalData = featureGraphicalData;
	};
	this.getFeatureGraphicalData = function() {
		return this.featureGraphicalData;
	};
	this.setParent= function(parent) {
		this.parent = parent;
	};
	this.getParent= function() {
		return this.parent;
	};
}
FeatureSetElem.prototype = new Model;

/**
*
* @returns {OmicValue}
*/
function OmicValue() {
	/***********************************************************************
	* ATTRIBUTES
	***********************************************************************/
	this.inputName = "";
	this.omicName = "";
	this.relevant = "";
	this.values = null;

	/***********************************************************************
	* GETTERS AND SETTERS
	***********************************************************************/
	this.setInputName = function(inputName) {
		this.inputName = inputName;
	};
	this.getInputName = function() {
		return this.inputName;
	};
	this.setRelevant = function(relevant) {
		this.relevant = relevant;
	};
	this.isRelevant = function() {
		return this.relevant;
	};
	this.setOmicName = function(omicName) {
		this.omicName = omicName;
	};
	this.getOmicName = function() {
		return this.omicName;
	};
	this.setValues = function(values) {
		this.values = values;
	};
	this.getValues = function() {
		return this.values;
	};
	this.isCompoundOmicsValue = function() {
		throw Error("Not implemented");
	};
}
OmicValue.prototype = new Model;
/********************************************
** STATIC FUNCTIONS
********************************************/
OmicValue.loadFromJSON = function(jsonObject) {
	var omicValueInstance;

	if (jsonObject.values !== undefined && isNaN(jsonObject.values[0])) {
		omicValueInstance = new CompoundOmicValue();
		omicValueInstance.values = [];
		for (var i in jsonObject.values) {
			omicValueInstance.values.push(OmicValue.loadFromJSON(jsonObject.values[i]));
		}
	} else {
		omicValueInstance = new SimpleOmicValue();
		omicValueInstance.values = [];
		for (var i in jsonObject.values) {
			omicValueInstance.values.push(parseFloat(jsonObject.values[i]));
		}
	}

	for(var i in jsonObject){
		if(i !== "values"){
			omicValueInstance[i] = jsonObject[i];
		}
	}

	return omicValueInstance;
};

function CompoundOmicValue() {
	/***********************************************************************
	* GETTERS AND SETTERS
	***********************************************************************/
	this.isCompoundOmicsValue = function() {
		return true;
	};
}
CompoundOmicValue.prototype = new OmicValue;

function SimpleOmicValue() {
	/***********************************************************************
	* ATTRIBUTES
	***********************************************************************/
	//TODO: CAMBIAR ESTO
	this.visibleAtFeatureFamilyDetails = true;
	this.visibleAtFeatureDetails = true;
	this.visibleAtPathwayDetails = false;
	/***********************************************************************
	* GETTERS AND SETTERS
	***********************************************************************/
	this.isCompoundOmicsValue = function() {
		return false;
	};

	this.isVisibleAtFeatureFamilyDetails = function() {
		return this.visibleAtFeatureFamilyDetails;
	};

	this.isVisibleAtFeatureDetails = function() {
		return this.visibleAtFeatureDetails;
	};

	this.isVisibleAtPathwayDetails = function() {
		return this.visibleAtPathwayDetails;
	};

}
SimpleOmicValue.prototype = new OmicValue;
