from pymongo import MongoClient

from src.conf.serverconf import MONGODB_DATABASE, MONGODB_HOST, MONGODB_PORT

class DBmanager:
    def __init__(self):
        self.connection = None

    def openConnection(self):
        self.connection = MongoClient(MONGODB_HOST, MONGODB_PORT)

    def closeConnection(self):
        if(self.connection != None):
            self.connection.close()
            self.connection = None

    def getConnection(self):
        return self.connection

    def getCollection(self, collectionName):
        if(self.connection == None):
            self.openConnection()
        db = self.getConnection()[MONGODB_DATABASE]
        return db[collectionName]