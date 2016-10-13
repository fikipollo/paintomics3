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

from .DAO import DAO
from src.classes.User import User

class UserDAO(DAO):
    #******************************************************************************************************************
    # CONSTRUCTORS
    #******************************************************************************************************************
    def __init__(self, *args, **kwargs):
        super(UserDAO, self).__init__(*args, **kwargs)
        self.collectionName = "userCollection"

    #******************************************************************************************************************
    # GETTERS AND SETTER
    #******************************************************************************************************************
    def findByID(self, userID, otherParams=None):
        queryParams={"userID" : int(userID)}

        if(otherParams != None and otherParams.has_key("password")):
            queryParams["password"] = otherParams["password"]

        collection = self.dbManager.getCollection(self.collectionName)

        match = collection.find_one(queryParams)
        if(match != None):
            match = self.adaptBSON(match)
            userInstance = User(userID)
            userInstance.parseBSON(match)
            return userInstance
        return None

    def findByEmail(self, email, otherParams=None):
        queryParams={"email" : email}

        if(otherParams != None and otherParams.has_key("password")):
            queryParams["password"] = otherParams["password"]

        collection = self.dbManager.getCollection(self.collectionName)

        match = collection.find_one(queryParams)
        if(match != None):
            match = self.adaptBSON(match)
            userInstance = User("")
            userInstance.parseBSON(match)
            return userInstance
        return None

    def findAll(self,otherParams=None):
        queryParams={}
        matchedUsers = []
        # if(otherParams != None and otherParams.has_key("omicType")):
        #     queryParams["omicType"] = otherParams["omicType"]

        collection = self.dbManager.getCollection(self.collectionName)

        match = collection.find(queryParams)
        if(match != None):
            userInstance = None
            for instance in match:
                instance = self.adaptBSON(instance)
                userInstance = User("")
                userInstance.parseBSON(instance)
                matchedUsers.append(userInstance)
            return matchedUsers
        return None

    def insert(self, instance, otherParams=None):
        userInstance = instance
        collection = self.dbManager.getCollection(self.collectionName)

        instanceBSON = userInstance.toBSON()
        #GET THE NEXT USER ID
        userID = self.getNextUserID()
        instanceBSON["userID"] = userID
        collection.insert(instanceBSON)
        return userID

    def update(self, instance, otherParams=None):
        userInstance=instance
        collection = self.dbManager.getCollection(self.collectionName)
        instanceBSON = userInstance.toBSON()

        if(otherParams.get("fieldList", None) != None):
            setFields = {}
            for i in otherParams.get("fieldList"):
                setFields[i] = instanceBSON.get(i)

            collection.update({"userID" :userInstance.getUserId()}, {'$set': setFields})
            return True


        collection.update({"userID" :userInstance.getUserId()}, instanceBSON)

        return True

    def remove(self, id, otherParams=None):
        userID = id
        collection = self.dbManager.getCollection(self.collectionName)
        collection.remove({"userID" : userID})

        return True

    def getNextUserID(self):
        collection = self.dbManager.getCollection("counters")
        sequenceDocument = collection.find_and_modify(query={"_id": 'userID'}, update = {"$inc":{"sequence_value":1}}, new=True )
        return int(sequenceDocument["sequence_value"])
