from src.common.DAO.DAO import DAO
from src.classes.Job import Job

from src.common.DAO.Bed2GeneJobDAO import Bed2GeneJobDAO
from src.common.DAO.PathwayAcquisitionJobDAO import PathwayAcquisitionJobDAO

class VisualOptionsDAO(DAO):
    #******************************************************************************************************************
    # CONSTRUCTORS
    #******************************************************************************************************************
    def __init__(self, *args, **kwargs):
        super(VisualOptionsDAO, self).__init__(*args, **kwargs)
        self.collectionName = "visualOptionsCollection"

    #******************************************************************************************************************
    # GETTERS AND SETTER
    #******************************************************************************************************************
    def findByID(self, jobID, otherParams=None):
        queryParams={"jobID" : jobID}

        collection = self.dbManager.getCollection(self.collectionName)

        match = collection.find_one(queryParams)
        if(match != None):
            match = self.adaptBSON(match)
            return match
        return None

    def insert(self, instance, otherParams=None):
        fileInstance = instance
        if(otherParams == None or not otherParams.has_key("jobID")):
            return False

        collection = self.dbManager.getCollection(self.collectionName)
        instance["jobID"] = otherParams["jobID"]
        collection.insert(instance)
        return True

    #******************************************************************************************************************
    # DELETE INSTANCES
    #******************************************************************************************************************
    def remove(self, jobID, otherParams=None):
        collection = self.dbManager.getCollection(self.collectionName)
        collection.remove({"jobID": jobID})
        return True