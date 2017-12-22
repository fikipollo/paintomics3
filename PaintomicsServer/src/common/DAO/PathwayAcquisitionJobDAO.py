from src.common.DAO.DAO import DAO
from src.common.DAO.FeatureDAO import FeatureDAO
from src.common.DAO.FoundFeatureDAO import FoundFeatureDAO
from src.common.DAO.PathwayDAO import PathwayDAO
from src.classes.JobInstances.PathwayAcquisitionJob import PathwayAcquisitionJob
from time import strftime as formatDate

class PathwayAcquisitionJobDAO(DAO):
    #******************************************************************************************************************
    # CONSTRUCTORS
    #******************************************************************************************************************
    def __init__(self, *args, **kwargs):
        super(PathwayAcquisitionJobDAO, self).__init__(*args, **kwargs)
        self.collectionName = "jobInstanceCollection"

    #******************************************************************************************************************
    # GETTERS AND SETTER
    #******************************************************************************************************************
    def findByID(self, id, otherParams=None):
        jobInstance = None
        collection = self.dbManager.getCollection(self.collectionName)
        match = collection.find_one({"jobID" : id})
        if(match != None):
            match = self.adaptBSON(match)
            jobInstance = PathwayAcquisitionJob(id, "", "")
            jobInstance.parseBSON(match)

            auxDAO = FoundFeatureDAO(dbManager=self.dbManager)
            match = auxDAO.findAll({"jobID": id})
            for feature in match:
                jobInstance.addFoundCompound(feature)

            auxDAO = FeatureDAO(dbManager=self.dbManager)
            match = auxDAO.findAll({"jobID":id, "featureType" : "Gene"})
            for feature in match:
                jobInstance.addInputGeneData(feature)
            match = auxDAO.findAll({"jobID":id, "featureType" : "Compound"})
            for feature in match:
                jobInstance.addInputCompoundData(feature)

            auxDAO = PathwayDAO(dbManager=self.dbManager)
            match = auxDAO.findAll({"jobID":id})
            for feature in match:
                jobInstance.addMatchedPathway(feature)

        return jobInstance

    def touch(self, jobID):
        collection = self.dbManager.getCollection(self.collectionName)

        collection.update_one({"jobID": jobID}, {'$set': {"accessDate": formatDate("%Y%m%d%H%M")},
                                                 '$unset': {"reminderSent": 1}}, upsert=False)

    def insert(self, instance, otherParams=None):
        jobInstance=instance
        collection = self.dbManager.getCollection(self.collectionName)
        instanceBSON = jobInstance.toBSON(recursive= False)

        instanceBSON["jobType"] = "PathwayAcquisitionJob"

        collection.insert(instanceBSON)

        # Save foundCompounds to be able to retrieve the job from database
        if (len(jobInstance.getFoundCompounds()) > 0):
            auxDAO = FoundFeatureDAO(dbManager=self.dbManager)
            auxDAO.insertAll(jobInstance.getFoundCompounds(), {"jobID": jobInstance.getJobID()})

        auxDAO = FeatureDAO(dbManager=self.dbManager)
        if(len(jobInstance.getInputGenesData()) > 0):
            auxDAO.insertAll(jobInstance.getInputGenesData().values(), {"jobID": jobInstance.getJobID()})
        if(len(jobInstance.getInputCompoundsData()) > 0):
            auxDAO.insertAll(jobInstance.getInputCompoundsData().values(), {"jobID": jobInstance.getJobID()})

        #TODO
        #auxDAO = PathwayDAO(dbManager=self.dbManager)
        #auxDAO.insertAll(jobInstance.getMatchedPathways().values(), {"jobID": jobInstance.getJobID()})

        return True

    def update(self, instance, otherParams=None):
        jobInstance=instance
        collection = self.dbManager.getCollection(self.collectionName)
        instanceBSON = jobInstance.toBSON(recursive= False)

        if(otherParams.get("fieldList", None) != None):
            setFields = {}
            for i in otherParams.get("fieldList"):
                setFields[i] = instanceBSON.get(i)

            collection.update({"jobID" :jobInstance.getJobID()}, {'$set': setFields})
            return True


        collection.update({"jobID" :jobInstance.getJobID()}, instanceBSON)

        #SHOULD NOT CHANGE
        if(otherParams.get("recursive", None) == True):
            auxDAO = FeatureDAO()
            auxDAO.updateAll(jobInstance.getInputGenesData().values()  , {"jobId": jobInstance.getJobID()})
            auxDAO.updateAll(jobInstance.getInputCompoundsData().values(), {"jobId": jobInstance.getJobID()})
            auxDAO = PathwayDAO(dbManager=self.dbManager)
            auxDAO.updateAll(jobInstance.getMatchedPathways().values(), {"jobID": jobInstance.getJobID()})

        return True


    #******************************************************************************************************************
    # DELETE INSTANCES
    #******************************************************************************************************************
    def remove(self, id, otherParams=None):
        if(otherParams == None or not otherParams.has_key("userID")):
            return False

        collection = self.dbManager.getCollection(self.collectionName)
        collection.remove({"jobID": id, "userID" : otherParams.get("userID")})

        FeatureDAO().removeAll({"jobID": id})
        PathwayDAO(dbManager=self.dbManager).removeAll({"jobID": id})

        return True
