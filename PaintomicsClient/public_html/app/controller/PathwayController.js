//# sourceURL=PathwayController.js
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
*		 Rafael Hernandez de Diego
*		 rhernandez@cipf.es
*		 Ana Conesa Cegarra
*		 aconesa@cipf.es
*
* THIS FILE CONTAINS THE FOLLOWING COMPONENT DECLARATION
* - PathwayController
*
*/
function PathwayController() {
	/**
	*
	* @param {type} pathwayView
	* @param {type} jobID
	* @param {type} format
	* @returns {undefined}
	*/
	this.downloadPathwayHandler = function (pathwayView, jobID, format) {
		//First get the original image in order to get the original size
		showInfoMessage("Generating image, please wait...", {
			logMessage: "Sending SVG image to server",
			showSpin: true,
			itemId: jobID,
			icon: "clock"
		});

		var image = new Image();
		var src = $("#" + pathwayView.getComponent().id + " image")[0].href.baseVal;
		image.src = src;

		$(image).load(function () {
			/*GENERATE THE BACKGROUND IMAGE CODE*/
			var canvas = document.createElement('canvas');
			canvas.width = image.width;
			canvas.height = image.height;
			var context = canvas.getContext('2d');
			context.drawImage(image, 0, 0);

			var forcedImageCode = canvas.toDataURL();
			if (forcedImageCode == "data:,") {
				showErrorMessage("Unable to download image, please try again.")
				return;
			}

			/*CLONE THE SVG IMAGE AND REPLACE THE URL WITH THE GENERATED BASE64 CODE*/
			var svgElem = $("#" + pathwayView.getComponent().id + " svg.keggPathwaySVG").clone();

			//Get the current and the original sizes
			var original_width = image.width * 3;
			var original_height = image.height * 3;
			var current_height = Number.parseFloat(svgElem.find(".keggImageBack").attr("height"));
			var current_width = Number.parseFloat(svgElem.find(".keggImageBack").attr("width")) ;

			//TODO: GENERATE TOOLTIPS FOR THE SVG IMAGE
			/*IF WE WANT TO SAVE IN SVG ADD THE SCRIPTS TO SHOW THE POPUPS*/
			// if (format === "svg") {
			//	 /*GENERATE THE OBJECT WITH THE INFO INDEXED BY pathwayID#featureID*/
			//	 var featureSetViews = pathwayView.diagramPanel.items;
			//	 var imageInfo = {}, elemAux;
			//
			//
			//	 //GET THE VIEW PORT AND IF THE IMAGE IS BIGGER, CALCULATE THE ADJUST FACTOR
			//	 var viewportWidth = $("#pathwaysPanelsWrapper").width();
			//	 var graphicalOptions = pathwayView.getModel().getGraphicalOptions();
			//	 var imageWidth = graphicalOptions.getImageWidth(), imageHeight = graphicalOptions.getImageHeight();
			//	 var imageProportion = imageHeight / imageWidth;
			//	 var adjustFactor = 1;
			//
			//	 //if the image is bigger than the available space, the it's neccessary to adjust the image as well as all the coordinateS
			//	 if (viewportWidth < imageWidth) {
			//		 imageWidth = viewportWidth * 0.98;/*UN 95% del espacio disponible*/
			//		 imageHeight = imageWidth * imageProportion;
			//		 adjustFactor = imageWidth / graphicalOptions.getImageWidth();
			//	 }
			//
			//	 for (var i in featureSetViews) {
			//			 elemAux = featureSetViews[i].featureView;
			//			 imageInfo[elemAux.getID()] = elemAux.getPopUpInformation(graphicalOptions.getVisibleOmics(), adjustFactor);
			//	 }
			//
			//	 /*OVERRIDE THIS FUNCTION*/
			//	 var showToolTip = function (featureId) {
			//		 var elemData = imageInfo[featureId];
			//		 generateToolTip(elemData.name, elemData.values, elemData.x, elemData.y, minMaxValues, featureId + "_popup", canvasID)
			//	 };
			//	 /*OVERRIDE THIS FUNCTION*/
			//	 var showCompleteDataDialog = function (toolTipId) {
			//		 $("#" + toolTipId).css("display", "none");
			//	 };
			//
			//	 svgString.attr("xmlns:xlink", "http://www.w3.org/1999/xlink");
			//	 //ADD THE SCRIPTS
			//	 svgString.prepend('<script xmlns="http://www.w3.org/2000/svg"><![CDATA[' +
			//	 'canvasID = "' + $("#" + pathwayView.getComponent().id + " svg").attr("id") + '";\n' +
			//	 'minMaxValues = ' + JSON.stringify(pathwayView.minMaxValues) + ';\n' +
			//	 'imageInfo = ' + JSON.stringify(imageInfo) + ';\n' +
			//	 ("" + showToolTip).replace("function", "function showToolTip") + ';\n' +
			//	 ("" + generateToolTip).replace("function", "function generateToolTip") + ';\n' +
			//	 ("" + getColor).replace("function", "function getColor") + ';\n' +
			//	 ("" + hideToolTip).replace("function", "function hideToolTip") + ';\n' +
			//	 '//]]></script>');
			// }

			canvas	= SVG(svgElem[0]);
			canvas.viewbox(0,0, current_width, current_height);
			canvas.text("Created with PaintOmics 3").size(8).attr({ x: current_width - 100, y: current_height - 15})
			canvas.height(original_height);
			canvas.width(original_width);

			var svgString	= new XMLSerializer().serializeToString(svgElem[0]);
			/*REPLACE THE URL FOR	THE PNG FILE BY A FORCED IMAGE CODE*/
			svgString = svgString.replace(src, forcedImageCode);
			var fileName = pathwayView.getModel().getName();

			/*SEND THE IMAGE TO SERVER IN ORDER TO GENERATE THE SPECIFIED FORMAT*/
			$.ajax({
				type: "POST", headers: {"Content-Encoding": "gzip"},
				url: SERVER_URL_PA_SAVE_IMAGE,
				data: {fileName: fileName.replace(" ", "_"), jobID: jobID, format: format, svgCode: svgString},
				success: function (response) {
					showSuccessMessage("Done", {logMessage: "Image generated successfully", closeTimeout: 0.5});

					var a = document.createElement('a');
					a.download = "paintomics_" + fileName.replace(" ", "_") + "_" + jobID +  "." + format;
					a.type = 'image/' + format;
					// a.href = window.location.href.replace(/\/$/,"") + response.filepath;
					a.href = window.location.href.replace(window.location.search, "").replace(/\/$/,"") + response.filepath;
					a.target = "_blank";
					a.style = "display:none";
					a.id = "downloadImage";
					$("body").append(a);
					a.click();
					$("body").remove("#downloadImage");
				},
				error: ajaxErrorHandler
			});
		});
	};
}
