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
from src.common.ServerErrorManager import CredentialException

class UserSessionManager(object):

    #Implementation of the singleton interface
    class __impl:
        logged_users=dict()

        def registerNewUser(self, user_id):
            import string
            import random
            sessionToken =''.join(random.choice(string.ascii_uppercase + string.digits) for _ in range(50))
            self.logged_users[user_id] = sessionToken
            return sessionToken

        def removeUser(self, user_id, sessionToken):
            assignedSessionToken = self.logged_users.get(user_id, None)

            if (assignedSessionToken != None and assignedSessionToken == sessionToken):
                del self.logged_users[user_id]
                return True
            return False

        def isValidUser(self, user, sessionToken):
            if (user == "0"):
                return True
            if (user == None or sessionToken == None or sessionToken != self.logged_users.get(user)):
                raise CredentialException("User not valid")

        def getLoggedUsersCount(self):
            return len(self.logged_users)

        def isLoggedUser(self, user):
            if (user == None):
                return False
            return self.logged_users.get(user, None) != None

    # storage for the instance reference
    __instance = None

    def __init__(self):
        """ Create singleton instance """
        # Check whether we already have an instance
        if UserSessionManager.__instance is None:
            # Create and remember instance
            UserSessionManager.__instance = UserSessionManager.__impl()

        # Store instance reference as the only member in the handle
        self.__dict__['_UserSessionManager__instance'] = UserSessionManager.__instance

    def __getattr__(self, attr):
        """ Delegate access to implementation """
        return getattr(self.__instance, attr)

    def __setattr__(self, attr, value):
        """ Delegate access to implementation """
        return setattr(self.__instance, attr, value)


