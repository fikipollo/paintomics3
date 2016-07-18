#***************************************************************
#  This file is part of Paintomics v3
#
#  Paintomics is free software: you can redistribute it and/or
#  modify it under the terms of the GNU General Public License as
#  published by the Free Software Foundation, either version 3 of
#  the License, or (at your option) any later version.
#
#  Paintomics is distributed in the hope that it will be useful,
#  but WITHOUT ANY WARRANTY; without even the implied warranty of
#  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
#  GNU General Public License for more details.
#
#  You should have received a copy of the GNU General Public License
#  along with Paintomics.  If not, see <http://www.gnu.org/licenses/>.
#
#  More info http://bioinfo.cipf.es/paintomics
#  Technical contact paintomics@cipf.es
#**************************************************************
import logging
import logging.config
import cairo
import rsvg

from src.common.ServerErrorManager import handleException
from src.common.UserSessionManager import UserSessionManager
from src.common.JobInformationManager import JobInformationManager
from src.classes.JobInstances.PathwayAcquisitionJob import PathwayAcquisitionJob

from src.conf.serverconf import CLIENT_TMP_DIR, EXAMPLE_FILES_DIR

#************************************************************************
#     _____ _______ ______ _____    __
#    / ____|__   __|  ____|  __ \  /_ |
#   | (___    | |  | |__  | |__) |  | |
#    \___ \   | |  |  __| |  ___/   | |
#    ____) |  | |  | |____| |       | |
#   |_____/   |_|  |______|_|       |_|
#
def pathwayAcquisitionStep1_PART1(REQUEST, RESPONSE, QUEUE_INSTANCE, JOB_ID, exampleMode):
    """
    This function corresponds to FIRST PART of the FIRST step in the Pathways acquisition process.
    First, it takes a Request object which contains the fields of the form that started the process.
    This is a summarization for the steps in the process:
        Step 0. VARIABLE DECLARATION
        Step 1. CHECK IF VALID USER SESSION
        Step 2. CREATE THE NEW INSTANCE OF JOB
        Step 3. SAVE THE UPLOADED FILES
        Step 4. QUEUE THE JOB INSTANCE
        Step 5. RETURN THE NEW JOB ID

    @param {Request} REQUEST
    @param {Response} RESPONSE
    @param {RQ QUEUE} QUEUE_INSTANCE
    @param {String} JOB_ID
    @param {Boolean} exampleMode
    @returns Response
    """
    #TODO:ALLOWED_EXTENSIONS http://flask.pocoo.org/docs/0.10/patterns/fileuploads/
    #TODO: secure_filename
    #****************************************************************
    #Step 0. VARIABLE DECLARATION
    #The following variables are defined:
    #  - jobInstance: instance of the PathwayAcquisitionJob class.
    #                 Contains all the information for the current job.
    #  - userID: the ID for the user
    #****************************************************************
    jobInstance = None
    userID = None

    try :
        #****************************************************************
        # Step 1. CHECK IF VALID USER SESSION
        #****************************************************************
        logging.info("STEP0 - CHECK IF VALID USER....")
        userID  = REQUEST.cookies.get('userID')
        sessionToken  = REQUEST.cookies.get('sessionToken')
        UserSessionManager().isValidUser(userID, sessionToken)

        #****************************************************************
        # Step 2. CREATE THE NEW INSTANCE OF JOB
        #****************************************************************
        jobInstance = PathwayAcquisitionJob(JOB_ID, userID, CLIENT_TMP_DIR)
        jobInstance.initializeDirectories()
        logging.info("STEP1 - NEW JOB SUBMITTED " + jobInstance.getJobID())

        #****************************************************************
        # Step 3. SAVE THE UPLOADED FILES
        #****************************************************************
        if(exampleMode == False):
            logging.info("STEP1 - FILE UPLOADING REQUEST RECEIVED")
            uploadedFiles  = REQUEST.files
            formFields   = REQUEST.form
            jobInstance.description=""
            specie = formFields.get("specie") #GET THE SPECIE NAME
            jobInstance.setOrganism(specie)
            logging.info("STEP1 - SELECTED SPECIE IS " + specie)

            logging.info("STEP1 - READING FILES....")
            JobInformationManager().saveFiles(uploadedFiles, formFields, userID, jobInstance, CLIENT_TMP_DIR)
            logging.info("STEP1 - READING FILES....DONE")

        elif(exampleMode == "example"):
            #****************************************************************
            # Step 2.SAVE THE UPLOADED FILES
            #****************************************************************
            logging.info("STEP1 - EXAMPLE MODE SELECTED")
            logging.info("STEP1 - COPYING FILES....")

            exampleOmics = ["Gene expression", "Metabolomics", "Proteomics", "miRNA-seq", "DNase-seq"]
            for omicName in exampleOmics:
                dataFileName = omicName.replace(" ", "_").replace("-seq", "").lower() + "_values.tab"
                logging.info("STEP1 - USING ALREADY SUBMITTED FILE (data file) " + EXAMPLE_FILES_DIR + dataFileName + " FOR  " + omicName)

                relevantFileName =omicName.replace(" ", "_").lower() + "_relevant.tab"
                logging.info("STEP1 - USING ALREADY SUBMITTED FILE (relevant features file) " + EXAMPLE_FILES_DIR + relevantFileName + " FOR  " + omicName)

                if(["Metabolomics"].count(omicName)):
                    jobInstance.addCompoundBasedInputOmic({"omicName": omicName, "inputDataFile": EXAMPLE_FILES_DIR + dataFileName, "relevantFeaturesFile": EXAMPLE_FILES_DIR + relevantFileName, "isExample" : True})
                else:
                    jobInstance.addGeneBasedInputOmic({"omicName": omicName, "inputDataFile": EXAMPLE_FILES_DIR + dataFileName, "relevantFeaturesFile": EXAMPLE_FILES_DIR + relevantFileName,  "isExample" : True})

            specie = "mmu"
            jobInstance.setOrganism(specie)
        else:
            raise NotImplementedError


        #************************************************************************
        # Step 4. Queue job
        #************************************************************************
        QUEUE_INSTANCE.enqueue(
            fn=pathwayAcquisitionStep1_PART2,
            args=(jobInstance, userID, exampleMode, RESPONSE),
            timeout=600,
            job_id= JOB_ID
        )

        #************************************************************************
        # Step 5. Return the Job ID
        #************************************************************************
        RESPONSE.setContent({
            "success": True,
            "jobID":JOB_ID
        })
    except Exception as ex:
        if(jobInstance != None):
            jobInstance.cleanDirectories(remove_output=True)

        handleException(RESPONSE, ex, __file__ , "pathwayAcquisitionStep1_PART1", userID=userID)
    finally:
        return RESPONSE

def pathwayAcquisitionStep1_PART2(jobInstance, userID, exampleMode, RESPONSE):
    """
    This function corresponds to SECOND PART of the FIRST step in the Pathways acquisition process.
    Given a JOB INSTANCE, first processes the uploaded files (identifiers matching and compound list generation)
    and finally generates the response.
    This code is executed at the PyQlite Queue.

    This is a summarization for the steps in the process:
        Step 0. CHECK FILES CONTENT
        Step 1. PROCESS THE FILES DATA
        Step 2. SAVE THE JOB INSTANCE AT THE DATABASE
        Step 3. GENERATE RESPONSE AND FINISH

    @param {PathwayAcquisitionJob} jobInstance
    @param {Response} RESPONSE
    @param {String} userID
    @param {Boolean} exampleMode

    @returns Response
    """
    try :
        #****************************************************************
        # Step 0.VALIDATE THE FILES DATA
        #****************************************************************
        logging.info("STEP0 - VALIDATING INPUT..." )
        jobInstance.validateInput()
        logging.info("STEP1 - VALIDATING INPUT...DONE" )

        #****************************************************************
        # Step 1.PROCESS THE FILES DATA
        #****************************************************************
        logging.info("STEP1 - PROCESSING FILES..." )
        matchedMetabolites = jobInstance.processFilesContent() #This function processes all the files and returns a checkboxes list to show to the user
        logging.info("STEP1 - PROCESSING FILES...DONE" )

        #************************************************************************
        # Step 2. Save the jobInstance in the MongoDB
        #************************************************************************
        logging.info("STEP1 - SAVING JOB DATA..." )
        jobInstance.setLastStep(2)
        jobInstance.getJobDescription(True, exampleMode == "example")
        JobInformationManager().storeJobInstance(jobInstance, 1)
        logging.info("STEP1 - SAVING JOB DATA...DONE" )

        jobInstance.cleanDirectories()

        #************************************************************************
        # Step 3. Update the response content
        #************************************************************************
        RESPONSE.setContent({
            "success": True,
            "organism" : jobInstance.getOrganism(),
            "jobID":jobInstance.getJobID() ,
            "matchedMetabolites": matchedMetabolites,
            "geneBasedInputOmics":jobInstance.getGeneBasedInputOmics(),
            "compoundBasedInputOmics": jobInstance.getCompoundBasedInputOmics()
        })

    except Exception as ex:
        jobInstance.cleanDirectories(remove_output=True)

        handleException(RESPONSE, ex, __file__ , "pathwayAcquisitionStep1_PART2", userID=userID)
    finally:
        return RESPONSE

#************************************************************************
#     _____ _______ ______ _____    ___
#    / ____|__   __|  ____|  __ \  |__ \
#   | (___    | |  | |__  | |__) |    ) |
#    \___ \   | |  |  __| |  ___/    / /
#    ____) |  | |  | |____| |       / /_
#   |_____/   |_|  |______|_|      |____|
#
def pathwayAcquisitionStep2_PART1(REQUEST, RESPONSE, QUEUE_INSTANCE):
    """
    This function corresponds to FIRST PART of the SECOND step in the Pathways acquisition process.
    First, it takes a Request object which contains the fields of the form that started the process.
    This is a summary for the steps in the process:
        Step 0. VARIABLE DECLARATION
        Step 1. CHECK IF VALID USER SESSION
        Step 2. LOAD THE INSTANCE OF JOB
        Step 3. QUEUE THE JOB INSTANCE
        Step 4. RETURN THE JOB ID

    @param {Request} REQUEST
    @param {Response} RESPONSE
    @param {RQ QUEUE} QUEUE_INSTANCE
    @returns Response
    """
    #****************************************************************
    #Step 0. VARIABLE DECLARATION
    #The following variables are defined:
    #  - jobID: the ID for the job instance
    #  - userID: the ID for the user
    #****************************************************************
    jobID  =""
    userID = ""

    try :
        #****************************************************************
        # Step 1. CHECK IF VALID USER SESSION
        #****************************************************************
        logging.info("STEP0 - CHECK IF VALID USER....")
        userID  = REQUEST.cookies.get('userID')
        sessionToken  = REQUEST.cookies.get('sessionToken')
        UserSessionManager().isValidUser(userID, sessionToken)

        #****************************************************************
        # Step 2.LOAD THE INSTANCE OF JOB
        #****************************************************************
        formFields = REQUEST.form
        jobID  = formFields.get("jobID")
        selectedCompounds= REQUEST.form.getlist("selectedCompounds[]")

        #************************************************************************
        # Step 3. Queue job
        #************************************************************************
        QUEUE_INSTANCE.enqueue(
            fn=pathwayAcquisitionStep2_PART2,
            args=(jobID, userID, selectedCompounds, RESPONSE, ),
            timeout=600,
            job_id= jobID
        )

        #************************************************************************
        # Step 5. Return the Job ID
        #************************************************************************
        RESPONSE.setContent({
            "success": True,
            "jobID":jobID
        })

    except Exception as ex:
        handleException(RESPONSE, ex, __file__ , "pathwayAcquisitionStep2_PART1", userID=userID)
    finally:
        return RESPONSE

def pathwayAcquisitionStep2_PART2(jobID, userID, selectedCompounds, RESPONSE):
    """
    This function corresponds to SECOND PART of the SECOND step in the Pathways acquisition process.
    Given a JOB INSTANCE, first processes the uploaded files (identifiers matching and compound list generation)
    and finally generates the response.
    This code is executed at the Redis Queue.

    This is a summarization for the steps in the process:
        Step 1. READ AND UPDATE THE SELECTED METABOLITES
        Step 2. GENERATE PATHWAYS INFORMATION
        Step 3. GENERATE THE METAGENES INFORMATION
        Step 4. UPDATE JOB INFORMATION AT DATABASE
        Step 5. GENERATE RESPONSE AND FINISH

    @param {PathwayAcquisitionJob} jobInstance
    @param {String[]} selectedCompounds
    @param {Response} RESPONSE
    @param {String} userID
    @param {Boolean} exampleMode

    @returns Response
    """
    jobInstance = None

    try :
        logging.info("STEP2 - LOADING JOB " + jobID + "...")
        jobInstance = JobInformationManager().loadJobInstance(jobID)
        jobInstance.setUserID(userID)

        if(jobInstance == None):
            raise UserWarning("Job " + jobID + " was not found at database.")

        jobInstance.setDirectories(CLIENT_TMP_DIR)
        jobInstance.initializeDirectories()

        logging.info("STEP2 - JOB " + jobInstance.getJobID() + " LOADED SUCCESSFULLY.")

        #****************************************************************
        # Step 1.READ THE SELECTED METABOLITES
        #****************************************************************
        logging.info("STEP2 - UPDATING SELECTED COMPOUNDS LIST...")
        #TODO: CHANGE THIS TO ALLOW BACK
        jobInstance.updateSubmitedCompoundsList(selectedCompounds)
        logging.info("STEP2 - UPDATING SELECTED COMPOUNDS LIST...DONE")

        #****************************************************************
        # Step 2. GENERATING PATHWAYS INFORMATION
        #****************************************************************
        logging.info("STEP2 - GENERATING PATHWAYS INFORMATION...")
        summary = jobInstance.generatePathwaysList()
        logging.info("STEP2 - GENERATING PATHWAYS INFORMATION...DONE")

        #****************************************************************
        # Step 3. GENERATING METAGENES INFORMATION
        #****************************************************************
        logging.info("STEP2 - GENERATING METAGENES INFORMATION...")
        jobInstance.generateMetagenesList()
        logging.info("STEP2 - GENERATING METAGENES INFORMATION...DONE")

        jobInstance.setLastStep(3)

        #************************************************************************
        # Step 4. Save the all the Matched Compounds and pathways in MongoDB
        #************************************************************************
        logging.info("STEP2 - SAVING NEW JOB DATA..." )
        JobInformationManager().storeJobInstance(jobInstance, 2)
        logging.info("STEP2 - SAVING NEW JOB DATA...DONE" )

        #************************************************************************
        # Step 5. Update the response content
        #************************************************************************
        matchedPathwaysJSONList = []
        for matchedPathway in jobInstance.getMatchedPathways().itervalues():
            matchedPathwaysJSONList.append(matchedPathway.toBSON())

        RESPONSE.setContent({
            "success": True,
            "organism" : jobInstance.getOrganism(),
            "jobID":jobInstance.getJobID(),
            "summary" : summary,
            "pathwaysInfo" : matchedPathwaysJSONList,
            "geneBasedInputOmics":jobInstance.getGeneBasedInputOmics(),
            "compoundBasedInputOmics": jobInstance.getCompoundBasedInputOmics()
        })

    except Exception as ex:
        handleException(RESPONSE, ex, __file__ , "pathwayAcquisitionStep2_PART2", userID=userID)
    finally:
        jobInstance.cleanDirectories()
        return RESPONSE

#************************************************************************
#     _____ _______ ______ _____    ____
#    / ____|__   __|  ____|  __ \  |___ \
#   | (___    | |  | |__  | |__) |   __) |
#    \___ \   | |  |  __| |  ___/   |__ <
#    ____) |  | |  | |____| |       ___) |
#   |_____/   |_|  |______|_|      |____/
#
def pathwayAcquisitionStep3(request, response):
    #VARIABLE DECLARATION
    jobInstance = None
    jobID  = ""
    userID = ""

    try :
        #****************************************************************
        # Step 0.CHECK IF VALID USER SESSION
        #****************************************************************
        logging.info("STEP0 - CHECK IF VALID USER....")
        userID  = request.cookies.get('userID')
        sessionToken  = request.cookies.get('sessionToken')
        UserSessionManager().isValidUser(userID, sessionToken)

        #****************************************************************
        # Step 1.LOAD THE INSTANCE OF JOB
        #****************************************************************
        formFields = request.form
        jobID  = formFields.get("jobID")

        #TODO: IN PREVIOUS STEPS THE USER COULD SPECIFY THE DEFAULT OMICS TO SHOW
        visibleOmics = []

        logging.info("STEP3 - LOADING JOB " + jobID + "...")

        jobInstance = JobInformationManager().loadJobInstance(jobID)
        jobInstance.setUserID(userID)

        if(jobInstance == None):
            raise UserWarning("Job " + jobID + " was not found at database.")
        logging.info("STEP3 - JOB " + jobInstance.getJobID() + " LOADED SUCCESSFULLY.")

        #****************************************************************
        # Step 2.READ THE SELECTED PATHWAYS
        #****************************************************************
        logging.info("STEP3 - GENERATING PATHWAYS INFORMATION...")
        selectedPathways= formFields.getlist("selectedPathways")
        #TODO: SOLO GENERAR INFO PARA LAS QUE NO LA TENGAN YA GUARDADA EN LA BBDD
        [selectedPathwayInstances, graphicalOptionsInstancesBSON, omicsValuesSubset] = jobInstance.generateSelectedPathwaysInformation(selectedPathways, visibleOmics, True)
        logging.info("STEP3 - GENERATING PATHWAYS INFORMATION...DONE")

        #************************************************************************
        # Step 3. Save the jobInstance in the MongoDB
        #************************************************************************
        logging.info("STEP 3 - SAVING NEW JOB DATA..." )
        JobInformationManager().storeJobInstance(jobInstance, 3)
        logging.info("STEP 3 - SAVING NEW JOB DATA...DONE" )

        response.setContent({
            "success": True,
            "jobID":jobInstance.getJobID(),
            "graphicalOptionsInstances" : graphicalOptionsInstancesBSON,
            "omicsValues" : omicsValuesSubset,
            "organism" : jobInstance.getOrganism()
        })

    except Exception as ex:
        handleException(response, ex, __file__ , "pathwayAcquisitionStep3", userID=userID)
    finally:
        return response

def pathwayAcquisitionRecoverJob(request, response):
    #VARIABLE DECLARATION
    jobInstance = None
    jobID=""
    userID = ""
    #TODO: COMPROBAR OWNERS
    try :
        #****************************************************************
        # Step 0.CHECK IF VALID USER SESSION
        #****************************************************************
        logging.info("STEP0 - CHECK IF VALID USER....")
        userID  = request.cookies.get('userID')
        sessionToken  = request.cookies.get('sessionToken')
        UserSessionManager().isValidUser(userID, sessionToken)

        #****************************************************************
        # Step 1.LOAD THE INSTANCE OF JOB
        #****************************************************************
        formFields = request.form
        jobID  = formFields.get("jobID")

        logging.info("RECOVER_JOB - LOADING JOB " + jobID + "...")
        jobInstance = JobInformationManager().loadJobInstance(jobID)

        if(jobInstance == None):
            #TODO DIAS BORRADO?
            logging.info("RECOVER_JOB - JOB " + jobID + " NOT FOUND AT DATABASE.")
            response.setContent({"success": False, "errorMessage":"Job " + jobID + " not found at database.<br>Please, note that jobs are automatically removed after 7 days for guests and 14 days for registered users."})
            return response

        if(jobInstance.getUserID() != userID):
            logging.info("RECOVER_JOB - JOB " + jobID + " DOES NOT BELONG TO USER " + userID)
            response.setContent({"success": False, "errorMessage": "Invalid Job ID (" + jobID + ") for current user.<br>Please, check the Job ID and try again."})
            return response

        logging.info("RECOVER_JOB - JOB " + jobInstance.getJobID() + " LOADED SUCCESSFULLY.")

        matchedPathwaysJSONList = []
        for matchedPathway in jobInstance.getMatchedPathways().itervalues():
            matchedPathwaysJSONList.append(matchedPathway.toBSON())
        logging.info("RECOVER_JOB - GENERATING PATHWAYS INFORMATION...DONE")

        if(len(matchedPathwaysJSONList) == 0):
            logging.info("RECOVER_JOB - JOB " + jobID + " DOES NOT CONTAINS PATHWAYS.")
            response.setContent( {"success": False, "errorMessage":"Job " + jobID + " does not contains information about Pathways."})
        else:
            response.setContent({
                "success": True,
                "jobID":jobInstance.getJobID(),
                "pathwaysInfo" : matchedPathwaysJSONList,
                "geneBasedInputOmics":jobInstance.getGeneBasedInputOmics(),
                "compoundBasedInputOmics": jobInstance.getCompoundBasedInputOmics(),
                "organism" : jobInstance.getOrganism(),
                "visualOptions" : JobInformationManager().getVisualOptions(jobID)
            })

    except Exception as ex:
        handleException(response, ex, __file__ , "pathwayAcquisitionRecoverJob", userID=userID)
    finally:
        return response

def pathwayAcquisitionSaveImage(request, response):
    jobID=""
    try:
        #****************************************************************
        # Step 0.CHECK IF VALID USER SESSION
        #****************************************************************
        logging.info("STEP0 - CHECK IF VALID USER....")
        userID  = request.cookies.get('userID')
        sessionToken  = request.cookies.get('sessionToken')
        UserSessionManager().isValidUser(userID, sessionToken)

        svgData = request.form.get("svgCode")
        fileName = request.form.get("fileName").replace(" ", "_")
        jobID = request.form.get("jobID")
        fileFormat = request.form.get("format")

        path = CLIENT_TMP_DIR + userID + "/tmp/"

        if(fileFormat == "png"):
            svg = rsvg.Handle(data=svgData)
            x = width = svg.props.width
            y = height = svg.props.height
            surface = cairo.ImageSurface(cairo.FORMAT_ARGB32, x, y)
            context = cairo.Context(surface)
            svg.render_cairo(context)
            surface.write_to_png(path + fileName + "." + fileFormat)
        elif(fileFormat == "svg"):
            file_ = open(path + fileName + "." + fileFormat, 'w')
            file_.write(svgData)
            file_.close()

        path = path.replace(CLIENT_TMP_DIR, "")

        response.setContent({"success": True, "filepath": path + fileName + "." + fileFormat})

    except Exception as ex:
        handleException(response, ex, __file__ , "pathwayAcquisitionSaveImage")
    finally:
        return response

def pathwayAcquisitionSaveVisualOptions(request, response):
    #VARIABLE DECLARATION
    visualOptionsInstance = None
    jobID  = ""
    userID = ""

    try :
        #****************************************************************
        # Step 0.CHECK IF VALID USER SESSION
        #****************************************************************
        logging.info("STEP0 - CHECK IF VALID USER....")
        userID  = request.cookies.get('userID')
        sessionToken  = request.cookies.get('sessionToken')
        UserSessionManager().isValidUser(userID, sessionToken)

        #****************************************************************
        # Step 1.GET THE INSTANCE OF visual Options
        #****************************************************************
        formFields = request.form

        visualOptions = {}
        jobID  = formFields.get("jobID")

        for key in formFields.keys():
            value = formFields.get(key)
            if key == "pathwaysVisibility[]":
                visualOptions["pathwaysVisibility"] = formFields.getlist(key)
                continue
            elif key == "pathwaysPositions[]":
                visualOptions["pathwaysPositions"] = formFields.getlist(key)
                continue
            elif value == "true" or value == "false":
                value = (value == "true")
            else:
                try:
                    value = float(value)
                except:
                    pass
            visualOptions[key] = value

        #************************************************************************
        # Step 3. Save the visual Options in the MongoDB
        #************************************************************************
        logging.info("STEP 3 - SAVING VISUAL OPTIONS FOR JOB " + jobID + "..." )
        JobInformationManager().storeVisualOptions(jobID, visualOptions)
        logging.info("STEP 3 - SAVING VISUAL OPTIONS FOR JOB " + jobID + "...DONE" )

        response.setContent({"success": True})

    except Exception as ex:
        handleException(response, ex, __file__ , "pathwayAcquisitionStep3", userID=userID)
    finally:
        return response
