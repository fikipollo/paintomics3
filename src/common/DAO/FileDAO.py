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
from src.classes.File import File

class FileDAO(DAO):
    #******************************************************************************************************************
    # CONSTRUCTORS
    #******************************************************************************************************************
    def __init__(self, *args, **kwargs):
        super(FileDAO, self).__init__(*args, **kwargs)
        self.collectionName = "fileCollection"

    #******************************************************************************************************************
    # GETTERS AND SETTER
    #******************************************************************************************************************
    def findByID(self, userID, otherParams=None):
        queryParams={"userID" : userID}

        if(otherParams != None and otherParams.has_key("dataType")):
            queryParams["dataType"] = otherParams["dataType"]
        if(otherParams != None and otherParams.has_key("omicType")):
            queryParams["omicType"] = otherParams["omicType"]

        collection = self.dbManager.getCollection(self.collectionName)

        match = collection.find_one(queryParams)
        if(match != None):
            match = self.adaptBSON(match)
            fileInstance = File("")
            fileInstance.parseBSON(match)
            return fileInstance
        return None

    def findAll(self, otherParams=None):
        queryParams={}
        matchedFiles = []

        if(otherParams != None and otherParams.has_key("userID")):
            queryParams["userID"] = otherParams["userID"]
        if(otherParams != None and otherParams.has_key("dataType")):
            queryParams["dataType"] = otherParams["dataType"]
        if(otherParams != None and otherParams.has_key("omicType")):
            queryParams["omicType"] = otherParams["omicType"]

        collection = self.dbManager.getCollection(self.collectionName)

        match = collection.find(queryParams)
        if(match != None):
            fileInstance = None
            for instance in match:
                instance = self.adaptBSON(instance)
                fileInstance = File("")
                fileInstance.parseBSON(instance)
                matchedFiles.append(fileInstance)
            return matchedFiles
        return None

    def insert(self, instance, otherParams=None):
        fileInstance = instance
        if(otherParams == None or not otherParams.has_key("userID")):
            return False
        collection = self.dbManager.getCollection(self.collectionName)

        instanceBSON = fileInstance.toBSON()
        #GET THE NEXT USER ID
        instanceBSON["userID"] = otherParams["userID"]
        collection.insert(instanceBSON)
        return True

    def remove(self, id, otherParams=None):
        fileName = id
        if(otherParams == None or not otherParams.has_key("userID")):
            return False
        collection = self.dbManager.getCollection(self.collectionName)

        collection.remove({"fileName": fileName, "userID" : otherParams.get("userID")})

        return True

    def removeAll(self, otherParams=None):
        if(otherParams == None or not otherParams.has_key("userID")):
            return False
        collection = self.dbManager.getCollection(self.collectionName)

        collection.remove({"userID" : otherParams.get("userID")})

        return True