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

class User (Model):
    #******************************************************************************************************************
    # CONSTRUCTORS
    #******************************************************************************************************************
    def __init__(self, userID):
        self.userID = userID
        self.sessionToken = ""
        self.userName = ""
        self.email = ""
        self.password = ""
        self.affiliation = ""
        self.activated= False
        self.creation_date = ""
        self.last_login = ""
        self.is_guest = False

    #******************************************************************************************************************
    # GETTERS AND SETTER
    #******************************************************************************************************************
    def getUserId(self):
        return self.userID

    def setUserId(self, userID):
        self.userID = userID

    def getSessionToken(self):
        return self.sessionToken

    def setSessionToken(self, sessionToken):
        self.sessionToken = sessionToken

    def getUserName(self):
        return self.userName

    def setUserName(self, userName):
        self.userName = userName

    def getEmail(self):
        return self.email

    def setEmail(self, email):
        self.email = email

    def getPassword(self):
        return self.password

    def setPassword(self, password):
        self.password = password

    def getAffiliation(self):
        return self.affiliation

    def setAffiliation(self, affiliation):
        self.affiliation= affiliation

    def isActivated(self):
        return self.activated

    def setActivated(self, activated):
        self.activated = activated

    def getCreationDate(self):
        return self.creation_date

    def setCreationDate(self, creation_date):
        self.creation_date= creation_date

    def getLastLogin(self):
        return self.last_login

    def setLastLogin(self, last_login):
        self.last_login= last_login

    def isGuest(self):
        return self.is_guest

    def setIsGuest(self, is_guest):
        self.is_guest = is_guest
