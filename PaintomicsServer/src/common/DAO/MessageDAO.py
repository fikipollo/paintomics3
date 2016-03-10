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
from src.classes.Message import Message

class MessageDAO(DAO):
    #******************************************************************************************************************
    # CONSTRUCTORS
    #******************************************************************************************************************
    def __init__(self, *args, **kwargs):
        super(MessageDAO, self).__init__(*args, **kwargs)
        self.collectionName = "messageCollection"

    #******************************************************************************************************************
    # GETTERS AND SETTER
    #******************************************************************************************************************
    def findByType(self, message_type, otherParams=None):
        queryParams={"message_type" : message_type}

        collection = self.dbManager.getCollection(self.collectionName)

        match = collection.find_one(queryParams)
        if(match != None):
            match = self.adaptBSON(match)
            messageInstance = Message("")
            messageInstance.parseBSON(match)
            return messageInstance
        return None

    def findAll(self, otherParams=None):
        queryParams={}
        matchedMessages = []

        if(otherParams != None and otherParams.has_key("message_type") and otherParams.get("message_type") != None):
            queryParams={"message_type" : otherParams.get("message_type")}

        collection = self.dbManager.getCollection(self.collectionName)

        match = collection.find(queryParams)
        if(match != None):
            messageInstance = None
            for instance in match:
                instance = self.adaptBSON(instance)
                messageInstance = Message("")
                messageInstance.parseBSON(instance)
                matchedMessages.append(messageInstance)
            return matchedMessages
        return None

    def insert(self, instance, otherParams=None):
        messageInstance = instance
        collection = self.dbManager.getCollection(self.collectionName)
        instanceBSON = messageInstance.toBSON()
        collection.insert(instanceBSON)
        return True

    def removeAll(self, otherParams=None):
        if(otherParams == None or not otherParams.has_key("message_type")):
            return False
        collection = self.dbManager.getCollection(self.collectionName)

        collection.remove({"message_type" : otherParams.get("message_type")})

        return True