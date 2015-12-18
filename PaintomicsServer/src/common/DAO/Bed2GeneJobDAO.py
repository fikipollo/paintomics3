from src.common.DAO.DAO import DAO

class Bed2GeneJobDAO(DAO):
    #******************************************************************************************************************
    # CONSTRUCTORS
    #******************************************************************************************************************
    def __init__(self, *args, **kwargs):
        super(Bed2GeneJobDAO, self).__init__(*args, **kwargs)
        self.collectionName = "jobInstanceCollection"

    #******************************************************************************************************************
    # GETTERS AND SETTER
    #******************************************************************************************************************
    def insert(self, instance, otherParams=None):
        jobInstance=instance
        collection = self.dbManager.getCollection(self.collectionName)
        instanceBSON = jobInstance.toBSON(recursive= False)

        instanceBSON["jobType"] = "Bed2GeneJob"

        collection.insert(instanceBSON)

        return True

    #******************************************************************************************************************
    # DELETE INSTANCES
    #******************************************************************************************************************
    def remove(self, id, otherParams=None):
        if(otherParams == None or not otherParams.has_key("userID")):
            return False
        collection = self.dbManager.getCollection(self.collectionName)

        collection.remove({"jobId": id, "userID" : otherParams.get("userID")})

        return True
