from ..DBmanager import DBmanager
from src.common.Util import adapt_string

class DAO(object):
    def __init__(self, *args, **kwargs):
        self.dbManager = kwargs.get("dbManager", DBmanager())
        self.collectionName = ""

    def getDBManager(self):
        return self.dbManager

    def findByID(self, id, otherParams=None):
        raise NotImplementedError

    def findAll(self,otherParams=None):
        raise NotImplementedError

    def insert(self, instance, otherParams=None):
        raise NotImplementedError

    def insertAll(self, instancesList, otherParams=None):
        raise NotImplementedError

    def update(self, instance, otherParams=None):
        raise NotImplementedError

    def updateAll(self, instance, otherParams=None):
        raise NotImplementedError

    def remove(self, id, otherParams=None):
        raise NotImplementedError

    def removeAll(self, otherParams=None):
        raise NotImplementedError

    def closeConnection(self, otherParams=None):
        if(self.dbManager != None):
            self.dbManager.closeConnection()
        return True

    def adaptBSON(self, object, otherParams=None):
        if isinstance(object, dict):
            newDict = {}
            for (key, value) in object.items():
                newDict[str(key)] = self.adaptBSON(value)
            return newDict
        elif isinstance(object, list):
            newList = []
            for value in object:
                newList.append(self.adaptBSON(value))
            return newList
        elif isinstance(object, bool):
            return bool(object)
        elif isinstance(object, int):
            return int(object)
        elif isinstance(object, float):
            return float(object)
        else:
            return adapt_string(object)
