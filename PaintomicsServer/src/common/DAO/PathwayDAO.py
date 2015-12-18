from .DAO import DAO
from .GraphicalDataDAO import GraphicalDataDAO
from src.classes.Pathway import Pathway

class PathwayDAO(DAO):
    #******************************************************************************************************************
    # CONSTRUCTORS
    #******************************************************************************************************************
    def __init__(self, *args, **kwargs):
        super(PathwayDAO, self).__init__(*args, **kwargs)
        self.collectionName = "pathwaysCollection"

    #******************************************************************************************************************
    # GETTERS AND SETTER
    #******************************************************************************************************************
    def findAll(self, otherParams=None):
        matchedPathways = []
        queryParams={}

        if(otherParams != None and otherParams.has_key("jobID")):
            queryParams["jobID"] = otherParams["jobID"]

        loadGraphicalData = False
        graphicalDataDAO = None
        if(otherParams.has_key("loadGraphicalData") and otherParams["loadGraphicalData"] == True ):
            loadGraphicalData = True
            graphicalDataDAO = GraphicalDataDAO(dbManager=self.dbManager)

        collection = self.dbManager.getCollection(self.collectionName)

        match = collection.find(queryParams)
        if(match != None):
            matchedPathways = []
            for instance in match:
                instance = self.adaptBSON(instance)
                pathwayInstance = Pathway("")
                pathwayInstance.parseBSON(instance)

                if(loadGraphicalData == True):
                    pathwayInstance.setGraphicalOptions(graphicalDataDAO.findByID(pathwayInstance.getID(), queryParams))

                matchedPathways.append(pathwayInstance)

        return matchedPathways

    def insert(self, instance, otherParams=None):
        pathwayInstance = instance
        jobID= otherParams["jobID"]

        collection = self.dbManager.getCollection(self.collectionName)

        instanceBSON = pathwayInstance.toBSON()
        instanceBSON["jobID"] = jobID

        collection.insert(instanceBSON)
        return True

    def insertAll(self, instancesList, otherParams=None):
        saveGraphicalData = False
        if(otherParams != None and otherParams.has_key("saveGraphicalData") and otherParams["saveGraphicalData"] == True ):
            saveGraphicalData = True
            graphicalDataDAO = GraphicalDataDAO(dbManager=self.dbManager)

        for instance in instancesList:
            self.insert(instance, otherParams)
            if(saveGraphicalData == True):
                otherParams["pathwayID"] = instance.getID()
                graphicalDataDAO.insert(instance.getGraphicalOptions(), otherParams)
        return True

    def update(self, instance, otherParams=None):
        pathwayInstance = instance
        jobID= otherParams["jobID"]

        collection = self.dbManager.getCollection(self.collectionName)

        instanceBSON = pathwayInstance.toBSON()
        instanceBSON["jobID"] = jobID

        collection.update({"jobID" : jobID, "ID" : pathwayInstance.getID()}, instanceBSON)

        collection.insert(instanceBSON)
        return True

    def updateAll(self, instancesList, otherParams=None):
        for instance in instancesList:
            self.update(instance, otherParams)
        return True

    def removeAll(self, otherParams=None):
        queryParams={}
        if(otherParams != None and otherParams.has_key("jobID")):
            queryParams["jobID"] = otherParams["jobID"]

        collection = self.dbManager.getCollection(self.collectionName)
        collection.remove(queryParams)

        return True
