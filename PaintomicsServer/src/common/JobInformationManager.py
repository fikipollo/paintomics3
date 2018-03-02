#***************************************************************
#  This file is part of PaintOmics 3
#
#  PaintOmics 3 is free software: you can redistribute it and/or
#  modify it under the terms of the GNU General Public License as
#  published by the Free Software Foundation, either version 3 of
#  the License, or (at your option) any later version.
#
#  PaintOmics 3 is distributed in the hope that it will be useful,
#  but WITHOUT ANY WARRANTY; without even the implied warranty of
#  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
#  GNU General Public License for more details.
#
#  You should have received a copy of the GNU General Public License
#  along with PaintOmics 3.  If not, see <http://www.gnu.org/licenses/>.
#  Contributors:
#     Rafael Hernandez de Diego <paintomics@cipf.es>
#     Ana Conesa Cegarra
#     and others
#
#  More info http://bioinfo.cipf.es/paintomics
#  Technical contact paintomics@cipf.es
#
#**************************************************************

import logging
from threading import RLock as threading_lock
from src.common.Util import Singleton
from collections import deque

from src.conf.serverconf import JOB_CACHE_MAX_SIZE

from src.common.DAO.PathwayAcquisitionJobDAO import PathwayAcquisitionJobDAO
from src.common.DAO.Bed2GeneJobDAO import Bed2GeneJobDAO
from src.common.DAO.MiRNA2GeneJobDAO import MiRNA2GeneJobDAO
from src.common.DAO.FeatureDAO import FeatureDAO
from src.common.DAO.FoundFeatureDAO import FoundFeatureDAO
from src.common.DAO.PathwayDAO import PathwayDAO
from src.common.DAO.VisualOptionsDAO import VisualOptionsDAO

from src.servlets.DataManagementServlet import saveFile

class JobInformationManager:
    __metaclass__ = Singleton

    def __init__(self):
        logging.info("CREATING NEW INSTANCE FOR JobInformationManager...")
        self.recentJobs= deque([])
        self.lock = threading_lock()

    #**********************************************
    #*
    #**********************************************
    def storeJobInstance(self, jobInstance, stepNumber):
        daoInstance = None
        logging.info("STORING JOB "  + jobInstance.getJobID() + "...")

        try :
            if type(jobInstance).__name__ == "Bed2GeneJob":
                #SAVE THE WHOLE JOB INSTANCE
                logging.info("SAVING Bed2GeneJob "  + jobInstance.getJobID() + " TO DATABASE...")
                daoInstance = Bed2GeneJobDAO()
                daoInstance.insert(jobInstance)

            elif type(jobInstance).__name__ == "MiRNA2GeneJob":
                #SAVE THE WHOLE JOB INSTANCE
                logging.info("SAVING MiRNA2GeneJob "  + jobInstance.getJobID() + " TO DATABASE...")
                daoInstance = MiRNA2GeneJobDAO()
                daoInstance.insert(jobInstance)

            elif type(jobInstance).__name__ == "PathwayAcquisitionJob":
                #IF JOB WAS NOT IN CACHE
                if(self.findInCache(jobInstance.getJobID()) == None):
                    self.addToCache(jobInstance)

                #NOW SAVE JOB IN DATABASE
                if(stepNumber == 1):
                    #SAVE THE WHOLE JOB INSTANCE
                    logging.info("SAVING PathwayAcquisitionJob "  + jobInstance.getJobID() + " TO DATABASE... IS STEP 1")
                    logging.info("SAVING PathwayAcquisitionJob "  + jobInstance.getJobID() + " TO DATABASE...")
                    daoInstance = PathwayAcquisitionJobDAO()
                    daoInstance.insert(jobInstance)
                elif(stepNumber == 2):
                    #SAVE ONLY CHANGED WHOLE JOB INSTANCE
                    logging.info("UPDATING PathwayAcquisitionJob "  + jobInstance.getJobID() + " TO DATABASE... IS STEP 2")
                    daoInstance = PathwayAcquisitionJobDAO()
                    logging.info("UPDATING JOB INSTANCE...")
                    daoInstance.update(jobInstance, {"fieldList": ["summary", "lastStep"]})
                    daoInstance = FoundFeatureDAO()
                    logging.info("REMOVING MATCHED METABOLITES FROM DATABASE...")
                    daoInstance.removeAll({"jobID": jobInstance.getJobID()})
                    daoInstance = FeatureDAO()
                    logging.info("REMOVING COMPOUNDS TO DATABASE...")
                    daoInstance.removeAll({"featureType":"Compound","jobID":jobInstance.getJobID()})
                    logging.info("SAVING COMPOUNDS TO DATABASE...")
                    daoInstance.insertAll(jobInstance.getInputCompoundsData().values(), {"jobID": jobInstance.getJobID()})
                    daoInstance = PathwayDAO(dbManager=daoInstance.getDBManager())
                    logging.info("REMOVING PATHWAYS TO DATABASE...")
                    daoInstance.removeAll({"jobID":jobInstance.getJobID()})
                    logging.info("SAVING PATHWAYS TO DATABASE...")
                    daoInstance.insertAll(jobInstance.getMatchedPathways().values(), {"jobID":jobInstance.getJobID()})
            else:
                raise NotImplementedError
            return True
        except Exception as ex:
            raise
        finally:
            if(daoInstance != None):
                daoInstance.closeConnection()

    def loadJobInstance(self, jobID):
        """
        This function...

        @param {type}
        @return {type}
        """
        jobInstance = None
        jobInstanceDAO = None
        try :
            # Update access time
            self.touchAccessDate(jobID)

            jobInstance = self.findInCache(jobID)
            if(jobInstance == None):
                logging.info("JOB "  + jobID + " NOT FOUND IN CACHE, TRYING IN DB...")
                jobInstanceDAO = PathwayAcquisitionJobDAO()
                jobInstance = jobInstanceDAO.findByID(jobID)
                if(jobInstance == None):
                    logging.info("JOB "  + jobID + " NOT FOUND IN DATABASE...")
                else:
                    logging.info("JOB "  + jobID + " FOUND IN DATABASE...")
                    self.addToCache(jobInstance)

            return jobInstance
        except Exception as ex:
            raise
        finally:
            if(jobInstanceDAO != None):
                jobInstanceDAO.closeConnection()

    def findInCache(self, jobID):
        """
        This function...

        @param {type}
        @return {type}
        """
        try:
            self.lock.acquire() #LOCK CACHE
            logging.info( str(len(self.recentJobs)) + " JOBS IN CACHE...")

            for jobInstanceAux in list(self.recentJobs) :
                if(jobInstanceAux.getJobID() == jobID):
                    logging.info("JOB "  + jobID + " IS IN CACHE...")
                    return jobInstanceAux
        except Exception as ex:
            logging.info("JOB "  + jobID + " IS NOT IN CACHE...")
            return None
        finally:
                self.lock.release() #UNLOCK CACHE

    #**********************************************
    #*
    #**********************************************
    def addToCache(self, jobInstance):
        try:
            self.lock.acquire() #LOCK CACHE

            #IF CACHE WAS FULL, POP LAST ELEMENT
            if(len(self.recentJobs) == JOB_CACHE_MAX_SIZE):
                prevJobInstance = self.recentJobs.popleft()
                logging.info("PREVIOUS JOB "  + prevJobInstance.getJobID() + " REMOVED FROM CACHE...")
            self.recentJobs.append(jobInstance)
            logging.info("NEW JOB "  + jobInstance.getJobID() + " ADDED TO CACHE...")
        finally:
                self.lock.release() #UNLOCK CACHE

    #**********************************************
    #*
    #**********************************************
    def saveFiles(self, uploadedFiles, formFields, userID, jobInstance, CLIENT_TMP_DIR, EXAMPLE_FILES_DIR=""):
        nOthers = 1
        uploadedDataFile = None
        uploadedRelevantFile = None
        dataFileName = ""
        relevantFileName = ""
        origin = None
        fields = None
        omicType = ""
        dataType = ""
        userDirID = userID if userID is not None else "nologin"
        CLIENT_TMP_DIR = CLIENT_TMP_DIR + userDirID + "/inputData/"

        for uploadedFileName in uploadedFiles.keys():
            #IF THE FILE IS NOT A RELEVANT FEATURES FILE
            fields = {}
            if (uploadedFileName is not None and uploadedFileName.find("_relevant") == -1  and uploadedFileName.find("_annotations_file") == -1):
                ##GET THE MATCHING TYPE: GENE OR COMPOUND
                matchingType = formFields.get(uploadedFileName.replace("file","match_type"))
                omicType = formFields.get(uploadedFileName.replace("file","omic_name"))  ##GET THE USER NAME: "Gene Expression", "Metabolomics", "Proteomics", .... (or user name)

                fields["omicType"] = omicType
                fields["dataType"] =  formFields.get(uploadedFileName.replace("file","file_type")) ##GET THE FILE TYPE: GENE EXPRESSION, ETC.
                fields["description"] =  formFields.get(uploadedFileName.replace("file","description"), "") ##GET THE FILE DESCRIPTION

            #IF IS ANNOTATION FILE
            elif (uploadedFileName is not None and uploadedFileName.find("_annotations_file") != -1):
                matchingType = "reference_file" ##GET THE MATCHING TYPE: GENE OR COMPOUND
                omicType =  "Reference file"
                dataType = formFields.get(uploadedFileName.replace("file","file_type"))

                fields["omicType"] = omicType
                fields["dataType"] = dataType ##GET THE FILE TYPE: GENE EXPRESSION, ETC.
                fields["description"] =  formFields.get(uploadedFileName.replace("file","description"), "") ##GET THE FILE DESCRIPTION
            else:
                continue

            #GET THE FILE OBJECTS
            uploadedDataFile = uploadedFiles.get(uploadedFileName)
            uploadedRelevantFile = uploadedFiles.get(uploadedFileName.replace("file","relevant_file"), None)

            configValues = formFields.get(uploadedFileName.replace("file", "config_args"), None)
            featureEnrichment = formFields.get(uploadedFileName.replace("file", "feature_enrichment"), 'false') != 'false'

            origin = formFields.get(uploadedFileName.replace("file","origin"))
            logging.info("SAVE FILES - ORIGIN FOR " + uploadedFileName + " IS " + origin)

            #GET THE ORIGIN OF THE FILE. IF CLIENT -> SAVE THE FILE
            if(origin == 'client'):
                #THE NAME WHEN SAVING THE DATA
                dataFileName = uploadedDataFile.filename
                #IF NO FILE WAS PROVIDED, IGNORE
                if(dataFileName == ''):
                   logging.info("\tIGNORING " + omicType + ", EMPTY FILE OR NOT PROVIDED")
                   continue
                else:
                    ##ELSE, SAVE THE FILE, GET THE NEW NAME IS ALREADY EXISTS
                    if( fields["description"] == ""):
                         fields["description"] = "File uploaded through the submission form."

                    # If no user is provided, prepend the jobID to avoid possible conflictions
                    if userID is None:
                        dataFileName = jobInstance.getJobID() + '_' + dataFileName

                    dataFileName = saveFile(userID, dataFileName, fields, uploadedDataFile, CLIENT_TMP_DIR)
            elif(origin == 'mydata'):
                dataFileName = formFields.get(uploadedFileName.replace("file","filelocation")).replace("[MyData]/","")
                logging.info("SAVE FILES  - USING ALREADY SUBMITTED FILE (data file) " + dataFileName + " FOR  " + omicType)
            elif(origin == 'inbuilt_gtf'):
                dataFileName = EXAMPLE_FILES_DIR + "GTF/" + formFields.get(uploadedFileName.replace("file","filelocation")).replace("[inbuilt GTF files]/","")
                logging.info("SAVE FILES  - USING ALREADY INBUILT GTF FILE " + dataFileName + " FOR  " + omicType)
            else:
                logging.info("\tIGNORING " + omicType + ", EMPTY FILE OR NOT PROVIDED")
                continue

            #SAVE THE ASSOCIATED RELEVANT FEATURED FILE (IF ANY)
            if (uploadedRelevantFile is not None):
                relevantFileName = uploadedRelevantFile.filename
                origin = formFields.get(uploadedFileName.replace("file","relevant") + "_origin") ##GET THE ORIGIN OF THE FILE. IF CLIENT -> SAVE THE FILE

                fieldsRelevant={"omicType": omicType}
                fieldsRelevant["dataType"]= formFields.get(uploadedFileName.replace("file","relevant_file_type")) ##GET THE FILE TYPE: GENE EXPRESSION, ETC.
                fieldsRelevant["description"] =  formFields.get(uploadedFileName.replace("file","description"), "Uploaded using the submission form.")##GET THE FILE DESCRIPTION

                logging.info("STEP1 - ORIGIN FOR " + uploadedFileName.replace("file","relevant") + " IS " + origin)
                if(origin == 'client'):
                    #TODO: GENERATE AUTOMATICALLY THE DATA TYPE (Gene exp, Gene list, etc.) AND THE DESCRIPTION
                    ##SAVE THE FILE, GET THE NEW NAME IS ALREADY EXISTS
                    # If no user is provided, prepend the jobID to avoid possible conflictions
                    if userID is None:
                        relevantFileName = jobInstance.getJobID() + '_' + relevantFileName

                    relevantFileName = saveFile(userID, relevantFileName, fieldsRelevant, uploadedRelevantFile, CLIENT_TMP_DIR)
                else:
                    relevantFileName = formFields.get(uploadedFileName.replace("file","relevant_filelocation")).replace("[MyData]/","")
                    logging.info("STEP1 - USING ALREADY SUBMITTED FILE (relevant features file) " + relevantFileName + " FOR  " + omicType)

            if(jobInstance != None):
                if(matchingType.lower() == "gene"):
                    jobInstance.addGeneBasedInputOmic({"omicName": omicType, "inputDataFile": dataFileName, "relevantFeaturesFile": relevantFileName, "configOptions": configValues, "featureEnrichment": featureEnrichment})
                elif(matchingType.lower() == "compound"):
                    jobInstance.addCompoundBasedInputOmic({"omicName": omicType, "inputDataFile": dataFileName, "relevantFeaturesFile": relevantFileName, "configOptions": configValues, "featureEnrichment": featureEnrichment})
                elif(matchingType.lower() == "reference_file"):
                    jobInstance.addReferenceInput({"omicName": omicType, "fileType": dataType, "inputDataFile": dataFileName})

    def getVisualOptions(self, jobID):
        daoInstance = VisualOptionsDAO()
        visualOptions = daoInstance.findByID(jobID)
        daoInstance.closeConnection()
        return visualOptions

    def storeVisualOptions(self, jobID, visualOptionsInstance):
        daoInstance = VisualOptionsDAO()
        daoInstance.remove(jobID)
        success = daoInstance.insert(visualOptionsInstance, {"jobID":jobID})
        daoInstance.closeConnection()
        return success

    def touchAccessDate(self, jobID):
        jobInstanceDAO = PathwayAcquisitionJobDAO()
        jobInstanceDAO.touch(jobID)

    def storePathways(self, jobInstance):
        daoInstance = PathwayDAO()
        logging.info("STORE PATHWAYS - REMOVING PATHWAYS TO DATABASE...")
        daoInstance.removeAll({"jobID": jobInstance.getJobID()})
        logging.info("STORE PATHWAYS - SAVING PATHWAYS TO DATABASE...")
        daoInstance.insertAll(jobInstance.getMatchedPathways().values(), {"jobID": jobInstance.getJobID()})