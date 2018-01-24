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

from src.common.Util import Model
from difflib import SequenceMatcher

#**************************************************************
# CLASS Feature
#**************************************************************
class Feature(Model):
    #******************************************************************************************************************
    # CONSTRUCTORS
    #******************************************************************************************************************
    def __init__(self, ID):
        self.ID = ID
        self.name = ""
        self.url = ""
        self.featureType= ""
        self.omicsValues = []
        self.matchingDB = ""

    #******************************************************************************************************************
    # GETTERS AND SETTER
    #******************************************************************************************************************
    def setID(self, ID):
        self.ID = ID
    def getID(self):
        return self.ID

    def setName(self, name):
        self.name = name
    def getName(self):
        return self.name

    def setUrl(self, url):
        self.url = url
    def getUrl(self):
        return self.url

    def setFeatureType(self, featureType):
        self.featureType = featureType
    def getFeatureType(self):
        return self.featureType

    def setOmicsValues(self, omicsValues):
        self.omicsValues = omicsValues
    def getOmicsValues(self):
        return self.omicsValues
    def addOmicValue(self, omicValue):
        self.omicsValues.append(omicValue)
    def addOmicValues(self, omicValuesList):
        for omicValue in omicValuesList:
            self.omicsValues.append(omicValue)

    def setMatchingDB(self, matchingDB):
        self.matchingDB = matchingDB
    def getMatchingDB(self):
        return self.matchingDB

    #******************************************************************************************************************
    # OTHER FUNCTIONS
    #******************************************************************************************************************
    def combineData(self, otherFeature):
        if(self != otherFeature and self.ID == otherFeature.getID()):
            self.addOmicValues(otherFeature.getOmicsValues())

    def parseBSON(self, bsonData):
        bsonData.pop("_id", None);

        for (attr, value) in bsonData.items():
            if(attr == "omicsValues"):
                self.setOmicsValues([])
                for item in value:
                    self.addOmicValue(OmicValue("").parseBSON(item))
            else:
                setattr(self, attr, value)

    def toBSON(self):
        bson = {}
        for attr, value in self.__dict__.iteritems():
            if (attr == "omicsValues"):
                bson[attr] = []
                for elem in value:
                    bson[attr].append(elem.toBSON())
            else:
                bson[attr] = value
        return bson

#*****************************************************************************************************************
# CLASS OmicValue
#*****************************************************************************************************************
class OmicValue(Model):
    #******************************************************************************************************************
    # CONSTRUCTORS
    #******************************************************************************************************************
    def __init__(self, inputName):
        self.inputName = inputName
        self.originalName = inputName
        self.omicName  = ""
        self.relevant  = ""
        self.values    = None

    #******************************************************************************************************************
    # GETTERS AND SETTER
    #******************************************************************************************************************
    def setInputName(self, inputName):
        self.inputName = inputName
    def getInputName(self):
        return self.inputName

    def setOriginalName(self, originalName):
        self.originalName= originalName
    def getOriginalName(self):
        return self.originalName

    def setRelevant(self, relevant):
        self.relevant = relevant
    def isRelevant(self):
        return self.relevant

    def setOmicName(self, omicName):
        self.omicName = omicName
    def getOmicName(self):
        return self.omicName

    def setValues(self, values):
        self.values = values
    def getValues(self):
        return self.values

    #******************************************************************************************************************
    # OTHER FUNCTIONS
    #******************************************************************************************************************
    def parseBSON(self, bsonData):
        for (attr, value) in bsonData.items():
            if(attr == "relevant"):
                value= (value == "True" or value == True)
            setattr(self, attr, value)
        return self

#*****************************************************************************************************************
# CLASS GENE
#*****************************************************************************************************************
class Gene(Feature):
    #******************************************************************************************************************
    # CONSTRUCTOR
    #******************************************************************************************************************
    def __init__(self, ID):
        super(Gene, self).__init__(ID)
        self.featureType= "Gene"

#*****************************************************************************************************************
# CLASS Compound
#*****************************************************************************************************************
class Compound(Feature):
    #******************************************************************************************************************
    # CONSTRUCTOR
    #******************************************************************************************************************
    def __init__(self, ID):
        super(Compound, self).__init__(ID)
        self.featureType= "Compound"
        self.similarity= 0

    def calculateSimilarity(self, other_name):
        mainPrefixes = {"", "cis-","trans-","d-","l-","(s)-","alpha-","beta-","alpha-d-","beta-d-","alpha-l-","beta-l-"}
        if self.getName().lower() == other_name.lower():
            self.similarity = 1
        elif self.getName().lower().replace(other_name.lower(), "") in mainPrefixes:
            self.similarity = 0.9
        else:
            self.similarity = SequenceMatcher(a=self.getName().lower(), b=other_name.lower()).ratio()
        return self.similarity
