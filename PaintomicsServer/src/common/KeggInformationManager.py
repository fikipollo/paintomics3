import logging

from collections import deque
from pymongo import MongoClient
from threading import RLock as threading_lock
from src.common.Util import Singleton

from src.conf.serverconf import KEGG_CACHE_MAX_SIZE

class KeggInformationManager():
    __metaclass__ = Singleton

    def __init__(self, KEGG_DATA_DIR=""):
        logging.info("CREATING NEW INSTANCE FOR KeggInformationManager...")
        self.lock = threading_lock()
        self.lastOrganisms = deque([])
        self.translationCache = {}

        #TODO: READ FROM CONF
        self.KEGG_DATA_DIR = KEGG_DATA_DIR + "current/common/"

    #*************************************************************************************
    #   _______  _____             _   _   _____  _              _______  ______
    #  |__   __||  __ \     /\    | \ | | / ____|| |         /\ |__   __||  ____|
    #     | |   | |__) |   /  \   |  \| || (___  | |        /  \   | |   | |__
    #     | |   |  _  /   / /\ \  | . ` | \___ \ | |       / /\ \  | |   |  __|
    #     | |   | | \ \  / ____ \ | |\  | ____) || |____  / ____ \ | |   | |____
    #     |_|   |_|  \_\/_/    \_\|_| \_||_____/ |______|/_/    \_\|_|   |______|
    #*************************************************************************************
    def getCompoundNameByID(self, compoundID):
        raise NotImplementedError("Not implemented")

    def getSubCompoundsByCompoundName(self, compoundName, prefix):
        raise NotImplementedError("Not implemented")

    def createTranslationCache(self, jobID):
        """
        This function...

        @param {type}
        @return {type}
        """
        try:
            self.lock.acquire() #LOCK CACHE

            self.translationCache[jobID] = {"id": {}, "symbol": {}, "compound":{}}

            return self
        except Exception as ex:
                raise ex
        finally:
                self.lock.release() #UNLOCK CACHE

    def findInTranslationCache(self, jobID, featureID, type="id"):
        """
        This function...

        @param {type}
        @return {type}
        """
        try:
            self.lock.acquire() #LOCK CACHE

            if self.translationCache.get(jobID) == None:
                return None

            return self.translationCache.get(jobID)[type].get(featureID, None)
        except Exception as ex:
            raise ex
        finally:
                self.lock.release() #UNLOCK CACHE

    def updateTranslationCache(self, jobID, newDataTable, type="id"):
        """
        This function...

        @param {type}
        @return {type}
        """
        try:
            self.lock.acquire() #LOCK CACHE

            if self.translationCache.get(jobID) != None:
                self.translationCache.get(jobID)[type] = dict(self.translationCache.get(jobID)[type].items() + newDataTable.items())
            return True
        except Exception as ex:
                raise ex
        finally:
                self.lock.release() #UNLOCK CACHE

    def clearTranslationCache(self, jobID):
        """
        This function...

        @param {type}
        @return {type}
        """
        try:
            self.lock.acquire() #LOCK CACHE

            if self.translationCache.get(jobID) != None:
                del self.translationCache[jobID]
            return True
        except Exception as ex:
                raise ex
        finally:
                self.lock.release() #UNLOCK CACHE

    #*************************************************************************************
    #  _____       _______  _    _ __          __   __     __ _____
    # |  __ \  /\ |__   __|| |  | |\ \        / //\ \ \   / // ____|
    # | |__) |/  \   | |   | |__| | \ \  /\  / //  \ \ \_/ /| (___
    # |  ___// /\ \  | |   |  __  |  \ \/  \/ // /\ \ \   /  \___ \
    # | |   / ____ \ | |   | |  | |   \  /\  // ____ \ | |   ____) |
    # |_|  /_/    \_\|_|   |_|  |_|    \/  \//_/    \_\|_|  |_____/
    #*************************************************************************************
    def getAllPathwaysByOrganism(self, organism):
        return self.getKeggData(organism).get("pathways").keys()

    def getPathwayInformation(self, organism, pathwayID):
        raise NotImplementedError("Not implemented")

    def getPathwayImagePath(self, organism, pathwayID):
        raise NotImplementedError("Not implemented")

    def getPathwayNameByID(self, organism, pathwayID):
        """
        This function...

        @param {type}
        @return {type}
        """
        try:
            self.lock.acquire() #LOCK CACHE

            pathway = self.getKeggData(organism).get("pathways").get(pathwayID, None)
            if pathway != None:
                return pathway.get("name")
            return "Unknown Pathway " + pathwayID
        finally:
                self.lock.release() #UNLOCK CACHE

    def getPathwayClassificationByID(self, organism, pathwayID):
        """
        This function...

        @param {type}
        @return {type}
        """
        try:
            self.lock.acquire() #LOCK CACHE
            pathway = self.getKeggData(organism).get("pathways").get(pathwayID, None)
            if pathway != None:
                return pathway.get("classification")
            return "Unknown Pathway " + pathwayID
        finally:
                self.lock.release() #UNLOCK CACHE

    def getAllFeatureIDsByPathwayID(self, organism, pathwayID):
        """
        This function...

        @param {type}
        @return {type}
        """
        try:
            self.lock.acquire() #LOCK CACHE
            pathway = self.getKeggData(organism).get("pathways").get(pathwayID, None)
            if pathway != None:
                if not "geneIDList" in pathway:
                    pathway["geneIDList"]=set([])
                    for feature in pathway.get("genes", []):
                        pathway["geneIDList"].add(feature.get("id"))
                if not "compoundIDList" in pathway:
                    pathway["compoundIDList"]=set([])
                    for feature in pathway.get("compounds", []):
                        pathway["compoundIDList"].add(feature.get("id"))

                return pathway["geneIDList"], pathway["compoundIDList"]
            else:
                return [],[]
        finally:
                self.lock.release() #UNLOCK CACHE

    def getAllFeaturesByPathwayID(self, organism, pathwayID):
        """
        This function...

        @param {type}
        @return {type}
        """
        try:
            self.lock.acquire() #LOCK CACHE

            pathway = self.getKeggData(organism).get("pathways").get(pathwayID, None)
            if pathway != None:
                return pathway.get("genes", []), pathway.get("compounds", [])
            else:
                return []
        finally:
                self.lock.release() #UNLOCK CACHE

    #*************************************************************************************
    #   ____  _______  _    _  ______  _____
    #  / __ \|__   __|| |  | ||  ____||  __ \
    # | |  | |  | |   | |__| || |__   | |__) |
    # | |  | |  | |   |  __  ||  __|  |  _  /
    # | |__| |  | |   | |  | || |____ | | \ \
    #  \____/   |_|   |_|  |_||______||_|  \_\
    #*************************************************************************************
    def getKeggData(self, organism):
        """
        This function load the KEGG information from database for the
        given organism code

        @param organism, the organism code e.g. mmu
        @returns an object containing all the KEGG information for the specie
        """
        for organismData in self.lastOrganisms:
            if organismData.get("name") == organism:
                return organismData

        #If we are here is because the organism was not in the list
        organismData = self.loadOrganismData(organism)

        #A SIZE LIMITED STACK TO KEEP TEMPORALY THE ORGANISMS DATA
        if len(self.lastOrganisms) == KEGG_CACHE_MAX_SIZE:
            self.lastOrganisms.popleft()
        self.lastOrganisms.append(organismData)

        return organismData

    def loadOrganismData(self, organism):
        client, db  = self.getConnectionByOrganismCode(organism)

        try:
            organismData = {
                "name"    : organism,
                "pathways": {}
            }
            #GET THE KEGG DATA FOR THE GIVEN ORGANISM FROM DATABASE
            cursor=db.kegg.find()
            for item in cursor:
                organismData["pathways"][item["ID"]] = item

            #PROCESS THE DATA AND GENERATE THE TABLES

            #RETURN THE DATA
            return organismData

        except Exception as ex:
            raise ex
        finally:
            client.close()

    def getConnectionByOrganismCode(self, organism):
        """
        Devuelve la conexion a la base de datos del organismo correspondiente asi como el nombre de la tabla
        que se usara para realizar la conversion para dicho organismo y un cursor asociado a ella

        @param {String} organism
        @returns
        """
        from src.conf.serverconf import MONGODB_HOST, MONGODB_PORT
        client = MongoClient(MONGODB_HOST, MONGODB_PORT)
        db = client[organism + "-paintomics"]

        return client, db

    def getKeggDataDir(self):
        return self.KEGG_DATA_DIR