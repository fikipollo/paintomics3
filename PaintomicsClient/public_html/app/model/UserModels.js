////# sourceURL=UserModels.js
///*
// * (C) Copyright 2014 The Genomics of Gene Expression Lab, CIPF 
// * (http://bioinfo.cipf.es/aconesawp) and others.
// *
// * All rights reserved. This program and the accompanying materials
// * are made available under the terms of the GNU Lesser General Public License
// * (LGPL) version 3 which accompanies this distribution, and is available at
// * http://www.gnu.org/licenses/lgpl.html
// *
// * This library is distributed in the hope that it will be useful,
// * but WITHOUT ANY WARRANTY; without even the implied warranty of
// * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
// * Lesser General Public License for more details.
// *
// * Contributors:
// *     Rafael Hernandez de Diego
// *     rhernandez@cipf.es
// *     Ana Conesa Cegarra
// *     aconesa@cipf.es
// * 
// * THIS FILE CONTAINS THE FOLLOWING COMPONENT DECLARATION
// * - User
// * 
// */
//
///**
// * 
// * @param {type} name
// * @returns {Feature}
// */
//function User(userID) {
//    this.userID = userID;
//    this.email = "";
//    this.url = "";
//    this.featureType = "";
//    this.omicsValues = [];
//
//    this.selected = false;
//
//    /*****************************
//     ** GETTERS AND SETTERS      
//     *****************************/
//    this.setID = function(ID) {
//        this.ID = ID;
//    };
//    this.getID = function() {
//        return this.ID;
//    };
//    this.setName = function(name) {
//        this.name = name;
//    };
//    this.getName = function() {
//        return this.name;
//    };
//    this.setUrl = function(url) {
//        this.url = url;
//    };
//    this.getUrl = function() {
//        return this.url;
//    };
//    this.setSignificative = function(significative) {
//        this.significative = significative;
//    };
//    this.isSignificative = function() {
//        return this.significative;
//    };
//    this.setFeatureType = function(featureType) {
//        this.featureType = featureType;
//    };
//    this.getFeatureType = function() {
//        return this.featureType;
//    };
//    this.setOmicsValues = function(omicsValues) {
//        this.omicsValues = omicsValues;
//    };
//    this.getOmicsValues = function() {
//        return this.omicsValues;
//    };
//    this.getOmicValues = function(omicName) {
//        for (var i in this.omicsValues) {
//            if (this.omicsValues[i].getOmicName() === omicName) {
//                return this.omicsValues[i];
//            }
//        }
//        return null;
//    };
//    this.setSelected = function(selected) {
//        this.selected = selected;
//    };
//    this.isSelected = function() {
//        return this.selected;
//    };
//    /********************************************
//     ** OTHER FUNCTIONS
//     ********************************************/
//    this.loadFromJSON = function(jsonObject) {
//        if (jsonObject.ID !== undefined) {
//            this.ID = jsonObject.ID;
//        }
//        if (jsonObject.name !== undefined) {
//            this.name = jsonObject.name;
//        }
//        if (jsonObject.url !== undefined) {
//            this.url = jsonObject.url;
//        }
//        if (jsonObject.significative !== undefined) {
//            this.significative = jsonObject.significative;
//        }
//        if (jsonObject.featureType !== undefined) {
//            this.featureType = jsonObject.featureType;
//        }
//        if (jsonObject.omicsValues !== undefined) {
//            this.omicsValues = [];
//            for (var i in jsonObject.omicsValues) {
//                this.omicsValues.push(new OmicValue().loadFromJSON(jsonObject.omicsValues[i]));
//            }
//        }
//        if (jsonObject.selected !== undefined) {
//            this.selected = jsonObject.selected;
//        }
//        return this;
//    };
//}
//Feature.prototype = new Model;