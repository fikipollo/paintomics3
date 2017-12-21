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
from src.conf.serverconf import ADMIN_ACCOUNTS
from src.common.DAO.UserDAO import UserDAO

class UserSessionManager(object):

    #Implementation of the singleton interface
    class __impl:
        logged_users=dict()

        def registerNewUser(self, user_id):
            import string
            import random
            user_id = str(user_id)
            sessionToken =''.join(random.choice(string.ascii_uppercase + string.digits) for _ in range(50))
            self.logged_users[user_id] = sessionToken
            return sessionToken

        def removeUser(self, user_id, sessionToken):
            user_id = str(user_id)
            assignedSessionToken = self.logged_users.get(user_id, None)
            if (assignedSessionToken != None and assignedSessionToken == sessionToken):
                del self.logged_users[user_id]
                return True
            return False

        def isValidUser(self, user_id, sessionToken):
            user_id = str(user_id)
            # TODO: security breach? (== 0)check if we are on debug mode
            if (user_id == "0" or (user_id == 'None' and sessionToken == None)):
                return True
            if (user_id == 'None' or sessionToken == None or sessionToken != self.logged_users.get(user_id)):
                raise CredentialException("[b]User not valid[/b]. It looks like your session is not valid, please log-in again.")

        def isValidAdminUser(self, user_id, user_name, sessionToken):
            self.isValidUser(user_id,sessionToken)
            _user = UserDAO().findByID(user_id)
            if _user.userName != user_name or not (user_name in ADMIN_ACCOUNTS.split(",")):
                raise Exception("User not allowed")

        def getLoggedUsersCount(self):
            return len(self.logged_users)

        def isLoggedUser(self, user_id):
            if (user_id == None):
                return False
            return self.logged_users.get(str(user_id), None) != None

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
