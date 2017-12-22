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
from src.classes.Feature import Feature
from difflib import SequenceMatcher

#**************************************************************
# CLASS Feature
#**************************************************************
class FoundFeature(Feature):
    #******************************************************************************************************************
    # CONSTRUCTORS
    #******************************************************************************************************************
    def __init__(self, ID):
        super(FoundFeature, self).__init__(ID)
        self.title = ""
        self.mainCompounds = []
        self.otherCompounds = []

    #******************************************************************************************************************
    # GETTERS AND SETTER
    #******************************************************************************************************************
    def setTitle(self, title):
        self.title = title
    def getTitle(self):
        return self.title


    def addMainCompound(self, compound):
        self.mainCompounds.append(compound)
    def addMainCompounds(self, compoundList):
        for compound in compoundList:
            self.mainCompounds.append(compound)
    def setMainCompounds(self, mainCompounds):
        self.mainCompounds = mainCompounds
    def getMainCompounds(self):
        return self.mainCompounds

    def addOtherCompound(self, compound):
        self.otherCompounds.append(compound)
    def addOtherCompounds(self, compoundList):
        for compound in compoundList:
            self.otherCompounds.append(compound)
    def setOtherCompounds(self, mainCompounds):
        self.otherCompounds = mainCompounds
    def getOtherCompounds(self):
        return self.otherCompounds

    #******************************************************************************************************************
    # OTHER FUNCTIONS
    #******************************************************************************************************************
    def combineData(self, otherFeature):
        if(self != otherFeature and self.ID == otherFeature.getID()):
            self.addOmicValues(otherFeature.getOmicsValues())

    def parseBSON(self, bsonData):
        bsonData.pop("_id");

        for (attr, value) in bsonData.items():
            if (attr == "mainCompounds"):
                self.setMainCompounds([])
                for item in value:
                    self.addMainCompound(Feature("").parseBSON(item))
            elif (attr == "otherCompounds"):
                self.setOtherCompounds([])
                for item in value:
                    self.addOtherCompound(Feature("").parseBSON(item))
            else:
                setattr(self, attr, value)

    def toBSON(self):
        bson = {}
        for attr, value in self.__dict__.iteritems():
            if (attr == "mainCompounds" or attr == "otherCompounds"):
                bson[attr] = []
                for elem in value:
                    bson[attr].append(elem.toBSON())
            else:
                bson[attr] = value
        return bson