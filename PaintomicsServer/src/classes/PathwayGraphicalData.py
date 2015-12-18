#***************************************************************
#  This file is part of Paintomics v3
#
#  Paintomics is free software: you can redistribute it and/or
#  modify it under the terms of the GNU General Public License as
#  published by the Free Software Foundation, either version 3 of
#  the License, or (at your option) any later version.
#
#  Paintomics is distributed in the hope that it will be useful,
#  but WITHOUT ANY WARRANTY; without even the implied warranty of
#  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
#  GNU General Public License for more details.
#
#  You should have received a copy of the GNU General Public License
#  along with Paintomics.  If not, see <http://www.gnu.org/licenses/>.
#
#  More info http://bioinfo.cipf.es/paintomics
#  Technical contact paintomics@cipf.es
#**************************************************************

from FeatureGraphicalData import FeatureGraphicalData
from src.common.Util import Model

class PathwayGraphicalData(Model):
    #******************************************************************************************************************
    # CONSTRUCTORS
    #******************************************************************************************************************
    def __init__(self):
        #ARRAY OF THE NAMES OF THE VISIBLE OMICS (STRING)
        self.visibleOmics = []
        #LIST OF ALL THE FeatureGraphicalData
        self.featuresGraphicalData = []
        #Other visual info
        self.imageWidth = 0
        self.imageHeight = 0

    #******************************************************************************************************************
    # GETTERS AND SETTER
    #******************************************************************************************************************
    def getVisibleOmics(self):
        return  self.visibleOmics
    def setVisibleOmics(self, visibleOmics):
        self.visibleOmics = visibleOmics
    def addVisibleOmic(self, omicName):
        if not omicName in self.visibleOmics:
            self.visibleOmics.append(omicName)
    def removeVisibleOmic(self, omicName):
        if omicName in self.visibleOmics:
            self.visibleOmics.remove(omicName)
    def toogleVisibleOmic(self, omicName):
        if omicName in self.visibleOmics:
            self.visibleOmics.remove(omicName)
        else:
            self.visibleOmics.append(omicName)

    def getFeaturesGraphicalData(self):
        return  self.featuresGraphicalData
    def setFeaturesGraphicalData(self, featuresGraphicalData):
        self.featuresGraphicalData = featuresGraphicalData
    def addFeaturesGraphicalData(self, featureGraphicalData):
        self.featuresGraphicalData.append(featureGraphicalData)

    def setImageSize(self, size):
        self.imageWidth = size[0]
        self.imageHeight = size[1]

    def setImageWidth(self, imageWidth):
        self.imageWidth = imageWidth
    def getImageWidth(self):
        return self.imageWidth

    def setImageHeight(self, imageHeight):
        self.imageHeight = imageHeight
    def getImageHeight(self):
        return self.imageHeight

    #******************************************************************************************************************
    # OTHER FUNCTIONS
    #******************************************************************************************************************
    def parseBSON(self, bsonData):
        for (attr, value) in bsonData.items():
            if(attr == "featuresGraphicalData"):
                featureGraphicalInstance = None
                self.featuresGraphicalData = []
                for featureGraphicalData in value:
                    featureGraphicalInstance = FeatureGraphicalData("")
                    featureGraphicalInstance.parseBSON(featureGraphicalData)
                    self.addFeaturesGraphicalData(featureGraphicalInstance)
            else:
                setattr(self, attr, value)

    def toBSON(self):
        bson = {}
        for attr, value in self.__dict__.iteritems():
            if (attr == "featuresGraphicalData"):
                featuresGraphicalData = []
                for featureGraphicalData in self.getFeaturesGraphicalData():
                    featuresGraphicalData.append(featureGraphicalData)
                bson[attr] = featuresGraphicalData
            else:
                bson[attr] = value
        return bson