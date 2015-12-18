from .DAO import DAO
from src.classes.PathwayGraphicalData import PathwayGraphicalData

class GraphicalDataDAO(DAO):
    #******************************************************************************************************************
    # CONSTRUCTORS
    #******************************************************************************************************************
    def __init__(self, *args, **kwargs):
        super(GraphicalDataDAO, self).__init__(*args, **kwargs)
        self.collectionName = "graphicalDataCollection"

    #******************************************************************************************************************
    # GETTERS AND SETTER
    #******************************************************************************************************************
    def findByID(self, id, otherParams=None):
        queryParams={"pathwayID" : id}

        if(otherParams.has_key("jobID")):
            queryParams["jobID"] = otherParams["jobID"]

        collection = self.dbManager.getCollection(self.collectionName)

        match = collection.find_one(queryParams)
        if(match != None):
            match = self.adaptBSON(match)
            pathwayGraphicalDataInstance = PathwayGraphicalData("")
            pathwayGraphicalDataInstance.parseBSON(match)
            return pathwayGraphicalDataInstance
        return None

    def insert(self, instance, otherParams=None):
        pathwayGraphicalDataInstance = instance
        pathwayID= otherParams["pathwayID"]
        jobID= otherParams["jobID"]

        collection = self.dbManager.getCollection(self.collectionName)

        instanceBSON = pathwayGraphicalDataInstance.toBSON()
        instanceBSON["pathwayID"] = pathwayID
        instanceBSON["jobID"] = jobID

        collection.insert(instanceBSON)
        return True

    def removeAll(self, otherParams=None):
        queryParams={}
        if(otherParams.has_key("jobID")):
            queryParams["jobID"] = otherParams["jobID"]
        collection = self.dbManager.getCollection(self.collectionName)
        match = collection.remove(queryParams)
        return True
