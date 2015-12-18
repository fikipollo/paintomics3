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

from flask import Flask, request, send_from_directory, jsonify
from flask.json import JSONEncoder
from re import sub

from src.common.PySiQ import Queue

from src.conf.serverconf import *

from src.servlets.PathwayAcquisitionServlet import *
from src.servlets.DataManagementServlet import *
from src.servlets.UserManagementServlet import *
from src.servlets.Bed2GenesServlet import *
from src.servlets.AdminServlet import *
from src.common.KeggInformationManager import KeggInformationManager
from src.common.JobInformationManager import JobInformationManager


class Application(object):
    #******************************************************************************************************************
    # CONSTRUCTORS
    #******************************************************************************************************************
    def __init__(self):
        ##*******************************************************************************************
        ##****SERVLET DEFINITION*********************************************************************
        ##*******************************************************************************************
        self.readConfigurationFile()
        self.app = Flask(__name__)

        self.app.config['MAX_CONTENT_LENGTH'] =  SERVER_MAX_CONTENT_LENGTH
        self.app.json_encoder = MyJSONEncoder

        KeggInformationManager(KEGG_DATA_DIR) #INITIALIZE THE SINGLETON
        JobInformationManager()#INITIALIZE THE SINGLETON

        self.queue = Queue()
        self.queue.start_worker(N_WORKERS)

        #******************************************************************************************
        #     ______ _____ _      ______  _____
        #   |  ____|_   _| |    |  ____|/ ____|
        #   | |__    | | | |    | |__  | (___
        #   |  __|   | | | |    |  __|  \___ \
        #   | |     _| |_| |____| |____ ____) |
        #   |_|    |_____|______|______|_____/
        #
        #  COMMON STEPS HANDLERS
        #*******************************************************************************************
        @self.app.route(SERVER_SUBDOMAIN + '/')
        def main():
            return send_from_directory(ROOT_DIRECTORY + 'public_html','index.html')
        ##*******************************************************************************************
        ##* GET THUMBNAILS, PATHWAY IMAGE, etc
        ##*******************************************************************************************
        @self.app.route(SERVER_SUBDOMAIN + '/kegg_data/<path:filename>')
        def get_kegg_data(filename):
            if str(filename) == "species.json":
                return send_from_directory(KEGG_DATA_DIR + 'last/species/', 'species.json')
            elif str(filename).endswith("_thumb"):
                return send_from_directory(KEGG_DATA_DIR + 'last/png/thumbnails/', 'map' + sub("[^0-9]", "", filename ) + '_thumb.png')
            else:
                return send_from_directory(KEGG_DATA_DIR + 'last/png/', 'map' + filename + '.png')
        ##*******************************************************************************************
        ##* GET PATHWAY IMAGE
        ##*******************************************************************************************
        @self.app.route(SERVER_SUBDOMAIN + '/kegg_data/pathway_network/<path:specie>')
        def get_pathway_network(specie):
            return send_from_directory(KEGG_DATA_DIR + 'last/species/' + specie, 'pathways_network.json')
        ##*******************************************************************************************
        ##* GET DATA FROM CLIENT TMP DIR
        ##*******************************************************************************************
        @self.app.route(SERVER_SUBDOMAIN + '/CLIENT_TMP/<path:filename>')
        def get_client_file(filename):
            #TODO: CHECK CREDENTIALS?
            UserSessionManager().isValidUser(request.cookies.get('userID'), request.cookies.get('sessionToken'))
            return send_from_directory(ROOT_DIRECTORY + 'CLIENT_TMP', filename)

        @self.app.route(SERVER_SUBDOMAIN + '/get_cluster_image/<path:filename>')
        def get_cluster_image(filename):
            UserSessionManager().isValidUser(request.cookies.get('userID'), request.cookies.get('sessionToken'))
            return send_from_directory(ROOT_DIRECTORY + 'CLIENT_TMP/' + request.cookies.get('userID') + "/jobsData/", filename)
        ##*******************************************************************************************
        ##* GET FILE
        ##*******************************************************************************************
        @self.app.route(SERVER_SUBDOMAIN + '/<path:filename>')
        def get_static(filename):
            return send_from_directory(ROOT_DIRECTORY + 'public_html', filename)


        #******************************************************************************************
        #    _    _  _____ ______ _____   _____
        #   | |  | |/ ____|  ____|  __ \ / ____|
        #   | |  | | (___ | |__  | |__) | (___
        #   | |  | |\___ \|  __| |  _  / \___ \
        #   | |__| |____) | |____| | \ \ ____) |
        #    \____/|_____/|______|_|  \_\_____/
        #
        #  USER MANAGEMENT SERVLETS HANDLERS
        #*******************************************************************************************
        ##* LOGIN
        #*******************************************************************************************
        @self.app.route(SERVER_SUBDOMAIN + '/um_signin', methods=['OPTIONS', 'POST'])
        def signInHandler():
            return userManagementSignIn(request, Response()).getResponse()
        #*******************************************************************************************
        ##* LOGOUT
        #*******************************************************************************************
        @self.app.route(SERVER_SUBDOMAIN + '/um_signout', methods=['OPTIONS', 'POST'])
        def signOutHandler():
            return userManagementSignOut(request, Response()).getResponse()
        #*******************************************************************************************
        ##* LOGOUT
        #*******************************************************************************************
        @self.app.route(SERVER_SUBDOMAIN + '/um_signup', methods=['OPTIONS', 'POST'])
        def signUpHandler():
            return userManagementSignUp(request, Response()).getResponse()
        #*******************************************************************************************
        ##* LOGOUT
        #*******************************************************************************************
        @self.app.route(SERVER_SUBDOMAIN + '/um_guestsession', methods=['OPTIONS', 'POST'])
        def newGuestSessionHandler():
            return userManagementNewGuestSession(request, Response()).getResponse()
        #*******************************************************************************************
        ##* USER MANAGEMENT SERVLETS HANDLERS - END
        #******************************************************************************************



        #******************************************************************************************
        #     ______ _____ _      ______  _____
        #   |  ____|_   _| |    |  ____|/ ____|
        #   | |__    | | | |    | |__  | (___
        #   |  __|   | | | |    |  __|  \___ \
        #   | |     _| |_| |____| |____ ____) |
        #   |_|    |_____|______|______|_____/
        #
        #   FILE UPLOAD HANDLERS
        #*******************************************************************************************
        @self.app.route(SERVER_SUBDOMAIN + '/dm_upload_file', methods=['OPTIONS', 'POST'])
        def uploadFileHandler():
            return dataManagementUploadFile(request, Response(), CLIENT_TMP_DIR).getResponse()
        #*******************************************************************************************
        ##* FILE LIST HANDLERS
        #*******************************************************************************************
        @self.app.route(SERVER_SUBDOMAIN + '/dm_get_myfiles', methods=['OPTIONS', 'POST'])
        def getMyFilesHandler():
            return dataManagementGetMyFiles(request, Response(), CLIENT_TMP_DIR, MAX_CLIENT_SPACE).getResponse()
        #*******************************************************************************************
        ##* FILE DELETION HANDLERS
        #*******************************************************************************************
        @self.app.route(SERVER_SUBDOMAIN + '/dm_delete_file', methods=['OPTIONS', 'POST'])
        def deleteFileHandler():
            return dataManagementDeleteFile(request, Response(), CLIENT_TMP_DIR, MAX_CLIENT_SPACE).getResponse()
        #*******************************************************************************************
        ##* JOB LIST HANDLERS
        #*******************************************************************************************
        @self.app.route(SERVER_SUBDOMAIN + '/dm_get_myjobs', methods=['OPTIONS', 'POST'])
        def getMyJobsHandler():
            return dataManagementGetMyJobs(request, Response()).getResponse()
        #*******************************************************************************************
        ##* JOB DELETION HANDLERS
        #*******************************************************************************************
        @self.app.route(SERVER_SUBDOMAIN + '/dm_delete_job', methods=['OPTIONS', 'POST'])
        def deleteJobHandler():
            return dataManagementDeleteJob(request, Response()).getResponse()
        #*******************************************************************************************
        ##* JOB RESULTS HANDLERS
        #*******************************************************************************************
        @self.app.route(SERVER_SUBDOMAIN + '/dm_downloadFile', methods=['OPTIONS', 'GET'])
        def downloadFileHandler():
            response =  dataManagementDownloadFile(request, Response())
            if hasattr(response,"getResponse") :
                response = response.getResponse()
            return response
        #*******************************************************************************************
        ##* GFT FILES HANDLERS
        #*******************************************************************************************
        @self.app.route(SERVER_SUBDOMAIN + '/dm_get_gtffiles', methods=['OPTIONS', 'POST'])
        def getGTFFilesHandler():
            return dataManagementGetMyFiles(request, Response(), EXAMPLE_FILES_DIR, MAX_CLIENT_SPACE, isGFT=True).getResponse()
        #*******************************************************************************************
        ##* DATA MANIPULATION SERVLETS HANDLERS - END
        #*******************************************************************************************




        #*******************************************************************************************
        #         _  ____  ____   _____
        #        | |/ __ \|  _ \ / ____|
        #        | | |  | | |_) | (___
        #    _   | | |  | |  _ < \___ \
        #   | |__| | |__| | |_) |____) |
        #    \____/ \____/|____/|_____/
        #
        #############################################################################################
        #  COMMON JOB HANDLERS
        #
        #  CHECK JOB STATUS
        #*******************************************************************************************
        @self.app.route(SERVER_SUBDOMAIN + '/check_job_status/<path:jobID>', methods=['OPTIONS', 'POST'])
        def checkJobStatus(jobID):
            jobInstance = self.queue.fetch_job(jobID)

            if jobInstance.is_finished():
                return self.queue.get_result(jobID).getResponse()
            elif jobInstance.is_failed():
                self.queue.get_result(jobID) #remove job
                return Response().setContent({"success": False, "status" : jobInstance.get_status(), "message": jobInstance.error_message})
            else:
                return Response().setContent({"success": False, "status" : jobInstance.get_status()}).getResponse()
        #*******************************************************************************************
        ##* COMMON JOB HANDLERS - END
        #############################################################################################
        #############################################################################################
        #
        # PATHWAY ACQUISITION SERVLETS HANDLERS
        #
        # STEP 1 HANDLERS
        #*******************************************************************************************
        @self.app.route(SERVER_SUBDOMAIN + '/pa_step1/<path:exampleMode>', methods=['OPTIONS', 'POST'])
        @self.app.route(SERVER_SUBDOMAIN + '/pa_step1', methods=['OPTIONS', 'POST'])
        def pathwayAcquisitionStep1Handler(exampleMode=False):
            return pathwayAcquisitionStep1_PART1(request, Response(), self.queue, self.generateRandomID(), exampleMode).getResponse()
        #*******************************************************************************************
        # STEP 2 HANDLERS
        #*******************************************************************************************
        @self.app.route(SERVER_SUBDOMAIN + '/pa_step2', methods=['OPTIONS', 'POST'])
        def pathwayAcquisitionStep2Handler():
            return pathwayAcquisitionStep2_PART1(request, Response(), self.queue).getResponse()
        #*******************************************************************************************
        # STEP 3 HANDLERS
        #*******************************************************************************************
        @self.app.route(SERVER_SUBDOMAIN + '/pa_step3', methods=['OPTIONS', 'POST'])
        def pathwayAcquisitionStep3Handler():
            return pathwayAcquisitionStep3(request, Response()).getResponse()
        #*******************************************************************************************
        # RECOVER JOB HANDLER
        #*******************************************************************************************
        @self.app.route(SERVER_SUBDOMAIN + '/pa_recover_job', methods=['OPTIONS', 'POST'])
        def recoverJobHandler():
            return pathwayAcquisitionRecoverJob(request, Response()).getResponse()
        #*******************************************************************************************
        # SAVE IMAGE HANDLER
        #*******************************************************************************************
        @self.app.route(SERVER_SUBDOMAIN + '/pa_save_image', methods=['OPTIONS', 'POST'])
        def saveImageHandler():
            return pathwayAcquisitionSaveImage(request, Response()).getResponse()
        #*******************************************************************************************
        # SAVE VISUAL OPTIONS HANDLER
        #*******************************************************************************************
        @self.app.route(SERVER_SUBDOMAIN + '/pa_save_visual_options', methods=['OPTIONS', 'POST'])
        def saveVisualOptionsHandler():
            return pathwayAcquisitionSaveVisualOptions(request, Response()).getResponse()
        #*******************************************************************************************
        # PATHWAY SERVLETS HANDLERS - END
        #############################################################################################
        #############################################################################################
        #
        # ALTERNATIVE PIPELINES SERVLETS HANDLERS
        #
        # fromBEDtoGenes HANDLERS
        #*******************************************************************************************
        @self.app.route(SERVER_SUBDOMAIN + '/dm_fromBEDtoGenes/<path:exampleMode>', methods=['OPTIONS', 'POST'])
        @self.app.route(SERVER_SUBDOMAIN + '/dm_fromBEDtoGenes', methods=['OPTIONS', 'POST'])
        def fromBEDtoGenesHandler(exampleMode=False):
            result = fromBEDtoGenes_STEP1(request, Response(), self.queue, self.generateRandomID(), exampleMode).getResponse()
            return result
        #*******************************************************************************************
        ##* ALTERNATIVE PIPELINES SERVLETS HANDLERS - END
        #############################################################################################


        #*******************************************************************************************
        #             _____  __  __ _____ _   _
        #       /\   |  __ \|  \/  |_   _| \ | |
        #      /  \  | |  | | \  / | | | |  \| |
        #     / /\ \ | |  | | |\/| | | | | . ` |
        #    / ____ \| |__| | |  | |_| |_| |\  |
        #   /_/    \_\_____/|_|  |_|_____|_| \_|
        #
        ##* ADMIN SERVLETS HANDLERS
        ##*
        ##* GET ADMIN SITE FILES HANDLERS
        ##*******************************************************************************************
        ##*******************************************************************************************
        @self.app.route(SERVER_SUBDOMAIN + '/admin/<path:filename>')
        def get_admin_static(filename):
            try :
                userID = request.cookies.get('userID')
                if(userID != "0"):
                    raise Exception
                sessionToken = request.cookies.get('sessionToken')
                UserSessionManager().isValidUser(userID, sessionToken)
                return send_from_directory(ROOT_DIRECTORY + 'public_html/admin', filename)
            except Exception as ex:
                return send_from_directory(ROOT_DIRECTORY + 'public_html/admin', "404.html")
        ##*******************************************************************************************
        ##* ADD FILES HANDLERS
        ##*******************************************************************************************
        @self.app.route(SERVER_SUBDOMAIN + '/dm_add_gtffiles', methods=['OPTIONS', 'POST'])
        def addGTFFilesHandler():
            return dataManagementUploadFile(request, Response(), EXAMPLE_FILES_DIR, isGFT=True).getResponse()
        ##*******************************************************************************************
        ##* GFT FILE DELETION HANDLERS
        ##*******************************************************************************************
        @self.app.route(SERVER_SUBDOMAIN + '/dm_delete_gtffile', methods=['OPTIONS', 'POST'])
        def deleteGTFFileHandler():
            return dataManagementDeleteFile(request, Response(), EXAMPLE_FILES_DIR, MAX_CLIENT_SPACE, isGFT=True).getResponse()
        ##*******************************************************************************************
        ##* GET LIST OF INSTALLED SPECIES
        ##*******************************************************************************************
        @self.app.route(SERVER_SUBDOMAIN + '/dm_get_installed_organism', methods=['OPTIONS', 'POST'])
        def getOrganismDatabasesInfo():
            return adminServletGetInstalledOrganisms(request, Response()).getResponse()
        ##*******************************************************************************************
        ##* UPDATE SELECTED SPECIE
        ##*******************************************************************************************
        @self.app.route(SERVER_SUBDOMAIN + '/dm_update_organism_db_data', methods=['OPTIONS', 'POST'])
        def updateOrganismDatabaseData():
            return adminServletUpdateOrganism(request, Response()).getResponse()
        ##*******************************************************************************************
        ##* UPDATE SELECTED SPECIE
        ##*******************************************************************************************
        @self.app.route(SERVER_SUBDOMAIN + '/dm_restore_organism_db_data', methods=['OPTIONS', 'POST'])
        def restoreOrganismDatabaseData():
            return adminServletRestoreData(request, Response()).getResponse()
        ##*******************************************************************************************
        ##* UPDATE SELECTED SPECIE
        ##*******************************************************************************************
        @self.app.route(SERVER_SUBDOMAIN + '/dm_sendReport', methods=['OPTIONS', 'POST'])
        def sendReportHandler():
            return adminServletSendReport(request, Response()).getResponse()
        ##*******************************************************************************************
        ##* GET ALL USERS AND DISK USAGE
        ##*******************************************************************************************
        @self.app.route(SERVER_SUBDOMAIN + '/um_get_all_users', methods=['OPTIONS', 'POST'])
        def getAllUsers():
            return adminServletGetAllUsers(request, Response()).getResponse()
        ##*******************************************************************************************
        ##* REMOVE OLD USERS AND CLEAN OLD DATA
        ##*******************************************************************************************
        @self.app.route(SERVER_SUBDOMAIN + '/um_clean_old_data', methods=['OPTIONS', 'POST'])
        def cleanOldData():
            return adminServletCleanOldData(request, Response()).getResponse()

        ##*******************************************************************************************
        ##* ADMIN SERVLETS HANDLERS - END
        #############################################################################################
        #############################################################################################
    def launch(self):
        ##*******************************************************************************************
        ##* LAUNCH APPLICATION
        ##*******************************************************************************************
        self.app.run(host=SERVER_HOST_NAME, port=SERVER_PORT_NUMBER,  debug=SERVER_ALLOW_DEBUG )

    ##*************************************************************************************************************
    # This function returns a new random job id
    #
    # @returns jobID
    ##*************************************************************************************************************
    def generateRandomID(self):
        #RANDOM GENERATION OF THE JOB ID
        #TODO: CHECK IF NOT EXISTING ID
        import string, random
        jobID = ''.join(random.sample(string.ascii_letters+string.octdigits*5,10))
        return jobID

    def readConfigurationFile(self):
        #PREPARE LOGGING
        logging.config.fileConfig(ROOT_DIRECTORY + 'conf/logging.cfg')

#################################################################################################################
#################################################################################################################
##* SUBCLASSES
##*************************************************************************************************************
class Response(object):
    """This class is used to specify the custom response object"""

    #****************************************************************
    # CONSTRUCTORS
    #****************************************************************
    def __init__(self):
        self.content=""
        self.status= 200
        #TODO: ENABLE THIS CODE??
        self.JSON_CONTENT_TYPE = {'Content-Type': 'application/json; charset=utf-8'}
        self.content_type = self.JSON_CONTENT_TYPE

    #****************************************************************
    # GETTERS AND SETTER
    #****************************************************************
    def setContent(self, content):
        self.content=content
        return self
    def getContent(self):
        return self.content

    def setStatus(self, status):
        self.status=status
        return self
    def getStatus(self):
        return self.status

    def setContentType(self, content_type):
        self.content_type=content_type
        return self
    def getContentType(self):
        return self.content_type

    def getResponse(self):
        return (jsonify(self.content), self.status, self.content_type)

class MyJSONEncoder(JSONEncoder):
    def default(self, obj):
        if hasattr(obj,"toBSON"):
            return obj.toBSON()
        return super(MyJSONEncoder, self).default(object)
