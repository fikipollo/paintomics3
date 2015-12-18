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

class FeatureGraphicalData(Model):
    #******************************************************************************************************************
    # CONSTRUCTORS
    #******************************************************************************************************************
    def __init__(self, ID):
        self.ID = ID
        self.name = ""
        self.type = ""
        self.x = 0
        self.y = 0
        self.boxWidth = 0
        self.boxHeight = 0
        self.visible = True

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

    def setType(self, type):
        self.type = type
    def getType(self):
        return self.type

    def setX(self, x):
        self.x = x
    def getX(self):
        return self.x

    def setY(self, y):
        self.y = y
    def getY(self):
        return self.y

    def setBoxWidth(self, boxWidth):
        self.boxWidth = boxWidth
    def getBoxWidth(self):
        return self.boxWidth

    def setBoxHeight(self, boxHeight):
        self.boxHeight = boxHeight
    def getBoxHeight(self):
        return self.boxHeight

    def setVisible(self, visible):
        self.visible = visible
    def isVisible(self):
        return self.visible
