from .DAO import DAO
from src.classes.Feature import Feature

class FeatureDAO(DAO):
    #******************************************************************************************************************
    # CONSTRUCTORS
    #******************************************************************************************************************
    def __init__(self, *args, **kwargs):
        super(FeatureDAO, self).__init__(*args, **kwargs)
        self.collectionName = "featuresCollection"

    #******************************************************************************************************************
    # GETTERS AND SETTER
    #******************************************************************************************************************
    def findAll(self, otherParams=None):
        #TODO: USE INDEXES
        matchedFeatures = []
        queryParams={}

        if(otherParams.has_key("jobID")):
            queryParams["jobID"] = otherParams["jobID"]
        if(otherParams.has_key("featureType")):
            queryParams["featureType"] = otherParams["featureType"]

        collection = self.dbManager.getCollection(self.collectionName)

        match = collection.find(queryParams)
        if(match != None):
            featureInstance = None
            for instance in match:
                instance = self.adaptBSON(instance)
                featureInstance = Feature("")
                featureInstance.parseBSON(instance)
                matchedFeatures.append(featureInstance)

        return matchedFeatures

    def insert(self, instance, otherParams=None):
        #TODO: MULTITHREADING
        featureInstance = instance
        jobID= otherParams["jobID"]

        collection = self.dbManager.getCollection(self.collectionName)

        instanceBSON = featureInstance.toBSON()
        instanceBSON["jobID"] = jobID

        collection.insert(instanceBSON)
        return True

    def insertAll(self, instancesList, otherParams=None):
        #TODO: MULTITHREADING
        jobID= otherParams["jobID"]

        collection = self.dbManager.getCollection(self.collectionName)
        instanceBSONList = []
        for featureInstance in instancesList:
            instanceBSON = featureInstance.toBSON()
            instanceBSON["jobID"] = jobID
            instanceBSONList.append(instanceBSON)
        if len(instanceBSONList) > 0:
            collection.insert(instanceBSONList)

        return True

    def removeAll(self, otherParams=None):
        queryParams={}
        if(otherParams.has_key("jobID")):
            queryParams["jobID"] = otherParams["jobID"]
        if(otherParams.has_key("featureType")):
            queryParams["featureType"] = otherParams["featureType"]
        collection = self.dbManager.getCollection(self.collectionName)
        match = collection.remove(queryParams)
        return True