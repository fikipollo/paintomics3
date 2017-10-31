//# sourceURL=PathwayModels.js
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
 * - Pathway
 * - PathwayGraphicalData
 * - FeatureGraphicalData
 *
 */
function Pathway(ID) {
    this.ID = ID;
    this.name = "";
    this.classification = "";
    this.source = "KEGG";
    this.pValue = 0;
    this.matchedCompounds = []; //IDENTIFIERS OF MATCHED COMPOUNDS, DATA IS AT JOBINSTANCE
    this.matchedGenes = []; //IDENTIFIERS OF MATCHED GENES, DATA IS AT JOBINSTANCE
    this.metagenes = null;

    //SIGNIFICANCE VALUES PER OMIC in format OmicName -> [totalFeatures, totalRelevantFeatures, pValue]
    this.significanceValues = null;
    //SIGNIFICANCE COMBINED VALUE
    this.combinedSignificancePvalue = 0;
    //GRAPHICAL INFORMATION
    this.graphicalOptions = null;
    this.totalFeatures = null;

    this.selected = false;
    this.visible = true;
    /*****************************
     ** GETTERS AND SETTERS
     *****************************/
    this.setID = function (pathwayID) {
        this.ID = pathwayID;
    };
    this.getID = function () {
        return this.ID;
    };
    this.setName = function (name) {
        this.name = name;
    };
    this.getName = function () {
        return this.name;
    };
    this.setClassification = function (classification) {
        this.url = classification;
    };
    this.getClassification = function () {
        return this.classification.toString();
    };
    this.setSource = function (source) {
        this.source = source;
    };
    this.getSource = function () {
        return this.source;
    };
    this.setPvalue = function (pValue) {
        this.pValue = pValue;
    };
    this.getPvalue = function () {
        return this.pValue;
    };
    this.setSelected = function (selected) {
        this.selected = selected;
    };
    this.isSelected = function () {
        return this.selected;
    };
    this.setVisible = function (visible) {
        this.visible = visible;
    };
    this.isVisible = function () {
        return this.visible;
    };
    this.setMatchedGenes = function (matchedGenes) {
        this.matchedGenes = matchedGenes;
    };
    this.getMatchedGenes = function () {
        return this.matchedGenes;
    };
    this.addMatchedGene = function (matchedGene) {
        this.matchedGenes.push(matchedGene);
    };
    this.setMatchedCompounds = function (matchedCompounds) {
        this.matchedCompounds = matchedCompounds;
    };
    this.getMatchedCompounds = function () {
        return this.matchedCompounds;
    };
    this.addMatchedCompound = function (matchedCompound) {
        this.matchedCompounds.push(matchedCompound);
    };
    this.getMetagenes = function () {
        return this.metagenes;
    };
    this.setMetagenes = function (metagenes) {
        this.metagenes = metagenes;
    };
    this.setSignificanceValues = function (significanceValues) {
        this.significanceValues = significanceValues;
    };
    this.getSignificanceValues = function () {
        return this.significanceValues;
    };
    this.setCombinedSignificanceValues = function (combinedSignificancePvalue) {
        this.combinedSignificancePvalue = combinedSignificancePvalue;
    };
    this.getCombinedSignificanceValues = function () {
        return this.combinedSignificancePvalue;
    };
    this.setTotalFeatures = function (totalFeatures) {
        this.totalFeatures = totalFeatures;
    };
    this.getTotalFeatures= function () {
        return this.totalFeatures;
    };
    this.setGraphicalOptions = function (graphicalOptions) {
        this.graphicalOptions = graphicalOptions;
    };
    this.getGraphicalOptions = function () {
        return this.graphicalOptions;
    };
    /*********************************************************************************
     * OTHER FUNCTIONS
     **********************************************************************************/
    this.loadFromJSON = function (jsonObject) {
        //TODO: HACER EN BUCLE AUTOMATICO?
        if (jsonObject.name !== undefined) {
            this.name = jsonObject.name;
        }
        if (jsonObject.ID !== undefined) {
            this.ID = jsonObject.ID;
        }
        if (jsonObject.classification !== undefined) {
            this.classification = jsonObject.classification;
        }
        if (jsonObject.source !== undefined) {
            this.source = jsonObject.source;
        }
        if (jsonObject.pValue !== undefined) {
            this.pValue = parseFloat(jsonObject.pValue);
        }
        if (jsonObject.selected !== undefined) {
            this.selected = jsonObject.selected;
        }
        if (jsonObject.imagePath !== undefined) {
            this.imagePath = jsonObject.imagePath;
        }
        if (jsonObject.imageWidth !== undefined) {
            this.imageWidth = parseInt(jsonObject.imageWidth);
        }
        if (jsonObject.imageHeight !== undefined) {
            this.imageHeight = parseInt(jsonObject.imageHeight);
        }
        if (jsonObject.matchedGenes !== undefined) {
            this.matchedGenes = jsonObject.matchedGenes;
        }
        if (jsonObject.matchedCompounds !== undefined) {
            this.matchedCompounds = jsonObject.matchedCompounds;
        }
        if (jsonObject.metagenes !== undefined) {
            this.metagenes = jsonObject.metagenes;
        }
        if (jsonObject.significanceValues !== undefined) {
            this.significanceValues = jsonObject.significanceValues;
        }
        if (jsonObject.combinedSignificancePvalue !== undefined) {
            this.combinedSignificancePvalue = parseFloat(jsonObject.combinedSignificancePvalue);
        }
        if (jsonObject.graphicalOptions != null) {
            this.graphicalOptions = new PathwayGraphicalData().loadFromJSON(jsonObject.graphicalOptions);
        }
        return this;
    };
}
Pathway.prototype = new Model;

function PathwayGraphicalData() {
    this.visibleOmics = [];
    this.featuresGraphicalData = [];
    this.imageWidth = 0;
    this.imageHeight = 0;
    this.pathwayID = "";
    //TODO: MAKE OPTIONS BEFORE PAINTING
    this.colorScale = "bwr"; //(RED-BLACK-GREEN -> "rbg", BLUE-WHITE-RED -> "bwr")
    this.colorReferences = "p10p90"; //[absoluteMinMax, riMinMax, localMinMax, p10p90]

    /*****************************
     ** GETTERS AND SETTERS
     *****************************/
    this.setVisibleOmics = function (visibleOmics) {
        //WARNING: KEEP USING SAME VARIABLE, COULD NOT WORK
        this.visibleOmics.length = 0;
        for (var i in visibleOmics) {
            this.visibleOmics.push(visibleOmics[i]);
        }
    };
    this.getVisibleOmics = function () {
        return this.visibleOmics;
    };
    this.setFeaturesGraphicalData = function (featuresGraphicalData) {
        this.featuresGraphicalData = featuresGraphicalData;
    };
    this.getFeaturesGraphicalData = function () {
        return this.featuresGraphicalData;
    };
    this.addFeaturesGraphicalData = function (featureGraphicalData) {
        this.featuresGraphicalData.push(featureGraphicalData);
    };
    this.findFeatureGraphicalData = function (featureID) {
      var data = [];
      for (var i in this.featuresGraphicalData) {
          if (this.featuresGraphicalData[i].getID().toLowerCase() === featureID.toLowerCase()) {
              data.push(this.featuresGraphicalData[i]);
          }
      }
      return data;
    };
    this.setImageWidth = function (imageWidth) {
        this.imageWidth = imageWidth;
    };
    this.getImageWidth = function () {
        return this.imageWidth;
    };
    this.setImageHeight = function (imageHeight) {
        this.imageHeight = imageHeight;
    };
    this.getImageHeight = function () {
        return this.imageHeight;
    };
    this.setPathwayID = function (pathwayID) {
        this.pathwayID = pathwayID;
    };
    this.getPathwayID = function () {
        return this.pathwayID;
    };
    this.setColorScale = function (colorScale) {
        this.colorScale = colorScale;
    };
    this.getColorScale = function () {
        return this.colorScale;
    };
    this.setColorReferences = function (colorReferences) {
        this.colorReferences = colorReferences;
    };
    this.getColorReferences = function () {
        return this.colorReferences;
    };
    /*********************************************************************************
     * OTHER FUNCTIONS
     **********************************************************************************/
    this.loadFromJSON = function (jsonObject) {
        //TODO: HACER EN BUCLE AUTOMATICO?
        if (jsonObject.visibleOmics !== undefined) {
            this.visibleOmics = jsonObject.visibleOmics;
        }
        if (jsonObject.featuresGraphicalData !== undefined) {
            this.featuresGraphicalData = []
            for (var i in jsonObject.featuresGraphicalData) {
                this.addFeaturesGraphicalData(new FeatureGraphicalData("").loadFromJSON(jsonObject.featuresGraphicalData[i]));
            }
        }
        if (jsonObject.imageWidth !== undefined) {
            this.imageWidth = parseInt(jsonObject.imageWidth);
        }
        if (jsonObject.imageHeight !== undefined) {
            this.imageHeight = parseInt(jsonObject.imageHeight);
        }
        if (jsonObject.pathwayID !== undefined) {
            this.pathwayID = jsonObject.pathwayID;
        }
        return this;
    };
}

function FeatureGraphicalData(type) {
    this.id = "";
    this.x = 0;
    this.y = 0;
    this.width = 0;
    this.height = 0;
    this.visible = true;

    /*****************************
     ** GETTERS AND SETTERS
     *****************************/
    this.setID = function (id) {
        this.id = id;
    };
    this.getID = function () {
        return this.id;
    };
    this.setX = function (x) {
        this.x = x;
    };
    this.getX = function () {
        return this.x;
    };
    this.setY = function (y) {
        this.y = y;
    };
    this.getY = function () {
        return this.y;
    };
    this.setBoxWidth = function (width) {
        this.width = width;
    };
    this.getBoxWidth = function () {
        return this.width;
    };
    this.setBoxHeight = function (height) {
        this.height = height;
    };
    this.getBoxHeight = function () {
        return this.height;
    };
    this.setVisible = function (visible) {
        this.visible = visible;
    };
    this.isVisible = function () {
        return this.visible;
    };

    /*********************************************************************************
     * OTHER FUNCTIONS
     **********************************************************************************/
    this.loadFromJSON = function (jsonObject) {
        //TODO: HACER EN BUCLE AUTOMATICO?
        if (jsonObject.id !== undefined) {
            this.id = jsonObject.id;
        }
        if (jsonObject.x !== undefined) {
            this.x = parseFloat(jsonObject.x);
        }
        if (jsonObject.y !== undefined) {
            this.y = parseFloat(jsonObject.y);
        }
        if (jsonObject.width !== undefined) {
            this.width = parseFloat(jsonObject.width);
        }
        if (jsonObject.height !== undefined) {
            this.height = parseFloat(jsonObject.height);
        }
        if (jsonObject.visible !== undefined) {
            this.visible = jsonObject.visible;
        }

        return this;
    };
}
