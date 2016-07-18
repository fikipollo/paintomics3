//@ sourceURL=app.js
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
 * - Application
 *
 */
if (debugging === true)
    console.warn("DEBUGGING MODE IS ON.")

function Application() {
    //TODO: CARGAR COSAS A PETICION?
    this.models = ['JobInstanceModels', "FeatureModels", "PathwayModels"];
    this.views = [
        'MainView',
        'PathwayAcquisitionViews/PA_Step1Views',
        "PathwayAcquisitionViews/PA_Step2Views",
        "PathwayAcquisitionViews/PA_Step3Views",
        "PathwayAcquisitionViews/PA_Step4Views",
        "DataManagementViews/DM_MyDataView",
        "DataManagementViews/DM_Bed2GenesViews",
        "DataManagementViews/DM_miRNA2GenesViews",
        "UserManagementViews/UserViews"
    ];
    this.controllers = ['JobController', "PathwayController", "UserController", "DataManagementController"];
    this.controllerInstances = [];
    this.mainView = null;

    this.launch = function () {
        var modelsLocation = "app/model/";
        var viewsLocation = "app/view/";
        var controllersLocation = "app/controller/";
        for (var i = 0; i < this.models.length; i++) {
            this.loadModule(modelsLocation, this.models[i]);
        }
        for (var i = 0; i < this.views.length; i++) {
            this.loadModule(viewsLocation, this.views[i]);
        }
        for (var i = 0; i < this.controllers.length; i++) {
            this.loadModule(controllersLocation, this.controllers[i]);
        }

        this.mainView = new MainView();
        this.mainView.getComponent();

        var jobInstanceModel = new JobInstance(null);
        if (window.sessionStorage && sessionStorage.getItem("jobModel") != null) {
            jobInstanceModel.loadFromJSON(JSON.parse(sessionStorage.getItem("jobModel")));
        }
        this.getController("JobController").showJobInstance(jobInstanceModel);

        if (Ext.util.Cookies.get("silence") != null) {
            console.log("Message already shown, ignoring.");
        } else {
            if (Ext.isIE) {
                showWarningMessage("Using Internet Explorer?", {message: "Paintomics was developed to work on Internet Explorer, however some features could not work properly.</br>We recommend to work with Chrome or Firefox.", closeTimeout: 5, showButton: true});
//            } else if (Ext.isGecko) {
//                var version = navigator.userAgent.toLowerCase().split("firefox/");
//                if (version.length > 1) {
//                    try {
//                        var version = parseFloat(version[1]);
//                        if (version >= 22) {
//                            showWarningMessage("Using Firefox?", {message: "From version 22 of Firefox, the Paintomics application looks bigger in the screen.<br>Please, accommodate the application to your browser window using the zoom tool (Ctrl and keys +/-)", closeTimeout: 5, showButton: true});
//                        }
//                    } catch (error) {
//
//                    }
//                }
            } else if (Ext.isSafari) {
                showWarningMessage("Using Safari?", {message: "Paintomics was developed to work in Safari, however some features could not work properly.<br>We recommend to work with Chrome or Firefox.", closeTimeout: 5, showButton: true});
            }

            //ADD A COOKIE WITH 2 HOURS EXPIRATION
            Ext.util.Cookies.set("silence", true, new Date(new Date().getTime() + 2 * 60 * 60 * 1000), location.pathname);
        }

    };

    this.loadModule = function (location, name) {
        $.ajax({
            url: location + name + ".js",
            async: false, dataType: "script",
            success: function () {
                console.info(Date.logFormat() + "app.js : Loaded " + name);
            }
        });
    };

    this.getMainView = function () {
        return this.mainView;
    };

    this.getController = function (controllerName) {
        if ($.inArray(controllerName, this.controllers) !== -1) {
            if (this.controllerInstances[controllerName] === undefined) {
                this.controllerInstances[controllerName] = new window[controllerName]();
            }
            return this.controllerInstances[controllerName];
        }
        return null;
    };
}

$(document).ready(function () {
    application = new Application();
    Ext.application({name: 'Paintomics', launch: function () {
            try {
                application.launch();
            } catch (error) {
                showErrorMessage("Oops..Internal error!", {message:"</br>Please try again later.</br>If the error persists, please contact your web <a href='mailto:paintomics@cipf.es' target='_blank'> administrator</a>.", showButton: true});
            }
        }});
    Ext.form.field.File.override({
        extractFileInput: function () {
            var me = this, fileInput = me.fileInputEl.dom, clone = fileInput.cloneNode(true);

            fileInput.parentNode.replaceChild(clone, fileInput);
            me.fileInputEl = Ext.get(clone);
            return fileInput;
        }
    });
});
