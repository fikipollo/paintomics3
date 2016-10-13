#***************************************************************
#  This file is part of Paintomics v3
#
#  Paintomics is free software: you can redistribute it and/or
#  modify it under the terms of the GNU General Public License as
#  published by the Free Software Foundation, either version 3 of
#  the License, or (at your option) any later version.
#
#  Paintomics is distributed in the hope that it will be useful,
#  but WITHOUT ANY WARRANTY without even the implied warranty of
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

class File (Model):
    #******************************************************************************************************************
    # CONSTRUCTORS
    #******************************************************************************************************************
    def __init__(self, userID):
        self.fileName= userID
        self.dataType = ""
        self.omicType = ""
        self.size = ""
        self.submissionDate = ""
        self.description = ""
        self.otherFields = None

    #******************************************************************************************************************
    # GETTERS AND SETTER
    #******************************************************************************************************************
    def getFileName(self):
        return self.fileName

    def setFileName(self, fileName):
        self.fileName = fileName

    def getDataType(self):
        return self.dataType

    def setDataType(self, dataType):
        self.dataType = dataType

    def getOmicType(self):
        return self.omicType

    def setOmicType(self, omicType):
        self.omicType = omicType

    def getSize(self):
        return self.size

    def setSize(self, size):
        self.size = size

    def getSubmissionDate(self):
        return self.submissionDate

    def setSubmissionDate(self, submissionDate):
        self.submissionDate = submissionDate

    def getDescription(self):
        return self.description

    def setDescription(self, description):
        self.description= description

