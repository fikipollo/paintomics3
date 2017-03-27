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
import json
from os import path as os_path
from shutil import rmtree as shutil_rmtree
import csv

#CPU MONITOR
import psutil
import subprocess

from src.common.UserSessionManager import UserSessionManager
from src.common.ServerErrorManager import handleException
from src.common.DAO.UserDAO import UserDAO
from src.common.DAO.JobDAO import JobDAO
from src.common.DAO.FileDAO import FileDAO
from src.common.DAO.MessageDAO import MessageDAO
from src.classes.Message import Message

from src.common.Util import sendEmail

from src.conf.serverconf import MONGODB_HOST, MONGODB_PORT, KEGG_DATA_DIR, CLIENT_TMP_DIR, smpt_sender, smpt_sender_name, MAX_CLIENT_SPACE, MAX_JOB_DAYS, MAX_GUEST_DAYS
from src.servlets.DataManagementServlet import dir_total_size

#----------------------------------------------------------------
# DATABASES
#----------------------------------------------------------------
def adminServletGetInstalledOrganisms(request, response):
    """
    This function...

    @param {Request} request, the request object
    @param {Response} response, the response object
    """
    try :
        #****************************************************************
        # Step 0.CHECK IF VALID USER SESSION
        #****************************************************************
        logging.info("STEP0 - CHECK IF VALID USER....")
        userID = request.cookies.get('userID')
        sessionToken = request.cookies.get('sessionToken')
        userName = request.cookies.get('userName')
        UserSessionManager().isValidAdminUser(userID, userName, sessionToken)

        #****************************************************************
        # Step 1.GET THE LIST OF INSTALLED SPECIES (DATABASES and SPECIES.JSON)
        #****************************************************************
        organisms_names = {}
        with open(KEGG_DATA_DIR + 'current/common/organisms_all.list') as organisms_all:
            reader = csv.reader(organisms_all, delimiter='\t')
            for row in reader:
                organisms_names[row[1]] = row[2]
        organisms_all.close()

        installedSpecies = []
        from pymongo import MongoClient

        client = MongoClient(MONGODB_HOST, MONGODB_PORT)
        databases = client.database_names()

        #****************************************************************
        # Step 2.FOR EACH INSTALLED DATABASE GET THE INFORMATION
        #****************************************************************
        databaseList=[]
        common_info_date=""

        for database in databases:
            if not "-paintomics" in database:
                continue
            elif "global-paintomics" == database:
                db = client[database]
                common_info_date = db.versions.find({"name": "COMMON"})[0].get("date")

                # Step 2.4 Check if the organism has non installed data available
                if os_path.isfile(KEGG_DATA_DIR + 'download/common/VERSION'):
                    downloaded = True
                elif os_path.isfile(KEGG_DATA_DIR + 'download/common/DOWNLOADING'):
                    downloaded = "downloading"
                else:
                    downloaded = False
                    #Erroneous download not removed --> remove
                    if os_path.isdir(KEGG_DATA_DIR + 'download/common/'):
                        shutil_rmtree(KEGG_DATA_DIR + 'download/common/')

                databaseList.append({
                    "organism_name" : "Common KEGG data",
                    "organism_code" : "common",
                    "kegg_date"     : common_info_date,
                    "downloaded": downloaded
                })

            else:
                # Step 2.1 GET THE SPECIE CODE
                organism_code=database.replace("-paintomics", "")
                # Step 2.2 GET THE SPECIE NAME
                organism_name= organisms_names.get(organism_code, "Unknown specie")

                # Step 2.3 GET THE SPECIE VERSIONS
                db = client[database]
                kegg_date = db.versions.find({"name": "KEGG"})[0].get("date")
                mapping_date = db.versions.find({"name": "MAPPING"})[0].get("date")
                acceptedIDs = db.versions.find({"name": "ACCEPTED_IDS"})

                if acceptedIDs.count() > 0:
                    acceptedIDs = acceptedIDs[0].get("ids")
                else:
                    acceptedIDs = ""

                # Step 2.4 Check if the organism has non installed data available
                if os_path.isfile(KEGG_DATA_DIR + 'download/' + organism_code + '/VERSION'):
                    downloaded = True
                elif os_path.isfile(KEGG_DATA_DIR + 'download/' + organism_code + '/DOWNLOADING'):
                    downloaded = "downloading"
                else:
                    downloaded = False
                    #Erroneous download not removed --> remove
                    if os_path.isdir(KEGG_DATA_DIR + 'download/' + organism_code):
                        shutil_rmtree(KEGG_DATA_DIR + 'download/' + organism_code)

                databaseList.append({
                    "organism_name" : organism_name,
                    "organism_code" : organism_code,
                    "kegg_date"     : kegg_date,
                    "mapping_date"  : mapping_date,
                    "acceptedIDs"   : acceptedIDs,
                    "downloaded": downloaded
                })

        client.close()

        response.setContent({"common_info_date" : common_info_date, "databaseList": databaseList})

    except Exception as ex:
        handleException(response, ex, __file__ , "adminServletGetInstalledOrganisms")

    finally:
        return response

def adminServletGetAvailableOrganisms(request, response):
    """
    This function...

    @param {Request} request, the request object
    @param {Response} response, the response object
    """
    try :
        #****************************************************************
        # Step 0.CHECK IF VALID USER SESSION
        #****************************************************************
        logging.info("STEP0 - CHECK IF VALID USER....")
        userID = request.cookies.get('userID')
        sessionToken = request.cookies.get('sessionToken')
        userName = request.cookies.get('userName')
        UserSessionManager().isValidAdminUser(userID, userName, sessionToken)

        #****************************************************************
        # Step 1.GET THE LIST OF INSTALLED SPECIES (DATABASES and SPECIES.JSON)
        #****************************************************************
        import csv
        databaseList = []
        with open(KEGG_DATA_DIR + 'current/common/organisms_all.list') as availableSpeciesFile:
            reader = csv.reader(availableSpeciesFile,  delimiter='\t')
            for row in reader:
                organism_code = row[1]
                # Step 2.4 Check if the organism has non installed data available
                if os_path.isfile(KEGG_DATA_DIR + 'download/' + organism_code + '/VERSION'):
                    downloaded = True
                elif os_path.isfile(KEGG_DATA_DIR + 'download/' + organism_code + '/DOWNLOADING'):
                    downloaded = "downloading"
                else:
                    downloaded = False
                    #Erroneous download not removed --> remove
                    if os_path.isdir(KEGG_DATA_DIR + 'download/' + organism_code):
                        shutil_rmtree(KEGG_DATA_DIR + 'download/' + organism_code)

                databaseList.append({
                    "organism_name": row[2],
                    "organism_code": organism_code,
                    "categories": row[3].split(";"),
                    "organism_id" : row[0],
                    "downloaded": downloaded
                })
        availableSpeciesFile.close()

        response.setContent({"databaseList": databaseList, "download_log" : KEGG_DATA_DIR + "download/download.log", "install_log" : KEGG_DATA_DIR + "current/install.log"})

    except Exception as ex:
        handleException(response, ex, __file__ , "adminServletGetInstalledOrganisms")

    finally:
        return response

def adminServletInstallOrganism(request, response, organism_code, ROOT_DIRECTORY):
    """
    This function manages an 'Install/Update Organism' request by calling to the
    DBManager tool.

    @param {Request} request, the request object
    @param {Response} response, the response object
    @param {String} organism_code,
    @param {String} ROOT_DIRECTORY,
    """
    try :
        #****************************************************************
        # Step 0.CHECK IF VALID USER SESSION
        #****************************************************************
        logging.info("STEP0 - CHECK IF VALID USER....")
        userID = request.cookies.get('userID')
        sessionToken = request.cookies.get('sessionToken')
        userName = request.cookies.get('userName')
        UserSessionManager().isValidAdminUser(userID, userName, sessionToken)

        #****************************************************************
        # Step 1.GET THE SPECIE CODE AND THE UPDATE OPTION
        #****************************************************************
        download  = json.loads(request.data).get("download")
        update_kegg=1
        update_mapping=1
        common = 0

        if organism_code == "common":
            common = 1
            organism_code = "#common"

        from subprocess import check_output, CalledProcessError, STDOUT


        #****************************************************************
        # Step 2a. IF THE SELECTED OPTION IS DOWNLOAD
        #****************************************************************
        if download:
            logging.info("STARTING DBManager download PROCESS.")
            scriptArgs = [ROOT_DIRECTORY + "AdminTools/DBManager.py", "download", "--specie=" + organism_code, "--kegg=" + str(update_kegg), "--mapping=" + str(update_mapping), "--common=" + str(common)]
            try:
                check_output(scriptArgs, stderr=STDOUT)
            except CalledProcessError as exc:
                raise Exception("Error while calling DBManager download: Exit status " + str(exc.returncode) + ". Error message: " + exc.output)
            logging.info("FINISHED DBManager Download PROCESS.")

        # ****************************************************************
        # Step 2B. IF THE SELECTED OPTION IS INSTALL
        # ****************************************************************
        else:
            logging.info("STARTING DBManager Install PROCESS.")
            scriptArgs = [ROOT_DIRECTORY + "AdminTools/DBManager.py", "install", "--specie=" + organism_code, "--common=" + str(common)]
            try:
                check_output(scriptArgs, stderr=STDOUT)
            except CalledProcessError as exc:
                raise Exception("Error while calling DBManager Install: Exit status " + str(exc.returncode) + ". Error message: " + exc.output)
            logging.info("FINISHED DBManager Install PROCESS.")

        response.setContent({"success": True})

    except Exception as ex:
        handleException(response, ex, __file__ , "adminServletUpdateOrganism")

    finally:
        return response

def adminServletRestoreData(request, response):
    """
    This function...

    @param {Request} request, the request object
    @param {Response} response, the response object
    """
    try :
        #****************************************************************
        # Step 0.CHECK IF VALID USER SESSION
        #****************************************************************
        logging.info("STEP0 - CHECK IF VALID USER....")
        userID = request.cookies.get('userID')
        sessionToken = request.cookies.get('sessionToken')
        userName = request.cookies.get('userName')
        UserSessionManager().isValidAdminUser(userID, userName, sessionToken)

        #****************************************************************
        # Step 1.GET THE SPECIE CODE AND THE UPDATE OPTION
        #****************************************************************
        formFields = request.form

        from subprocess import check_output, CalledProcessError, STDOUT

        logging.info("STARTING DBManager Restore PROCESS.")
        scriptArgs = [ROOT_DIRECTORY + "AdminTools/DBManager.py", "restore", "--remove=1", "--force=1"]
        try:
            check_output(scriptArgs, stderr=STDOUT)
        except CalledProcessError as exc:
            raise Exception("Error while calling DBManager Restore: Exit status " + str(exc.returncode) + ". Error message: " + exc.output)
        logging.info("FINISHED DBManager Restore PROCESS.")

        response.setContent({"success": True})

    except Exception as ex:
        handleException(response, ex, __file__ , "adminServletRestoreData")

    finally:
        return response

def clearFailedData():
    import shutil, os
    dirname = KEGG_DATA_DIR + 'download/'
    for subdirname in os.listdir(dirname):
        # print path to all subdirectories first.
        if os.path.isdir(os.path.join(dirname, subdirname)) and os.path.isfile(os.path.join(dirname, subdirname) + "/DOWNLOADING"):
                print "Removing " + os.path.join(dirname, subdirname)
                shutil.rmtree(os.path.join(dirname, subdirname))
#----------------------------------------------------------------
# USERS
#----------------------------------------------------------------
def adminServletGetAllUsers(request, response):
    """
    This function obtains a list of all the users registered in the system including different details
    such as the used space, the registration date, etc.

    @param {Request} request, the request object
    @param {Response} response, the response object
    """
    try :
        #****************************************************************
        # Step 0.CHECK IF VALID USER SESSION
        #****************************************************************
        logging.info("STEP0 - CHECK IF VALID USER....")
        userID = request.cookies.get('userID')
        sessionToken = request.cookies.get('sessionToken')
        userName = request.cookies.get('userName')
        UserSessionManager().isValidAdminUser(userID, userName, sessionToken)

        #****************************************************************
        # Step 1. GET THE LIST OF ALL USERS
        #****************************************************************
        logging.info("STEP1 - GET THE LIST OF ALL USERS...")
        userList = UserDAO().findAll()
        for userInstance in userList:
            userInstance.usedSpace = 0
            if os_path.isdir(CLIENT_TMP_DIR + str(userInstance.getUserId())):
                userInstance.usedSpace = dir_total_size(CLIENT_TMP_DIR + str(userInstance.getUserId()))

        response.setContent({"success": True, "userList": userList,  "availableSpace": MAX_CLIENT_SPACE, "max_jobs_days": MAX_JOB_DAYS, "max_guest_days" : MAX_GUEST_DAYS})

    except Exception as ex:
        handleException(response, ex, __file__ , "adminServletGetAllUsers")

    finally:
        return response

def adminServletDeleteUser(request, response, toDeleteUserID):
    """
    This function...

    @param {Request} request, the request object
    @param {Response} response, the response object
    """
    try :
        #****************************************************************
        # Step 0.CHECK IF VALID USER SESSION
        #****************************************************************
        logging.info("STEP0 - CHECK IF VALID USER....")
        userID = request.cookies.get('userID')
        sessionToken = request.cookies.get('sessionToken')
        userName = request.cookies.get('userName')
        UserSessionManager().isValidAdminUser(userID, userName, sessionToken)

        if toDeleteUserID == "0":
            response.setContent({"success": False})
        else:
            jobDAOInstance = JobDAO()
            filesDAOInstance = FileDAO()
            userDAOInstance = UserDAO()

            logging.info("STEP1 - CLEANING DATA FOR " + toDeleteUserID + "...")
            #****************************************************************
            # Step 1. DELETE ALL JOBS FOR THE USER
            #****************************************************************
            allJobs = jobDAOInstance.findAll(otherParams={"userID":toDeleteUserID})
            jobID = ""
            for jobInstance in allJobs:
                jobID = jobInstance.getJobID()
                logging.info("STEP2 - REMOVING " + jobID + " FROM DATABASE...")
                jobDAOInstance.remove(jobInstance.getJobID(), otherParams={"userID":toDeleteUserID})

            #****************************************************************
            # Step 3. DELETE ALL FILES FOR THE USER
            #****************************************************************
            logging.info("STEP3 - REMOVING ALL FILES FROM DATABASE...")
            filesDAOInstance.removeAll(otherParams={"userID":toDeleteUserID})
            logging.info("STEP3 - REMOVING ALL FILES FROM USER DIRECTORY...")
            if os_path.isdir(CLIENT_TMP_DIR + toDeleteUserID):
                shutil_rmtree(CLIENT_TMP_DIR + toDeleteUserID)

            #****************************************************************
            # Step 4. DELETE THE USER INSTANCE FROM DATABASE
            #****************************************************************
            logging.info("STEP6 - REMOVING ALL FILES FROM DATABASE...")
            userDAOInstance.remove(int(toDeleteUserID))

            response.setContent({"success": True})
    except Exception as ex:
        handleException(response, ex, __file__ , "adminServletDeleteUser")
    finally:
        return response

def adminCleanDatabases(request, response):
    """
    This function...

    @param {Request} request, the request object
    @param {Response} response, the response object
    """
    try :
        #****************************************************************
        # Step 0.CHECK IF VALID USER SESSION
        #****************************************************************
        logging.info("STEP0 - CHECK IF VALID USER....")
        userID = request.cookies.get('userID')
        sessionToken = request.cookies.get('sessionToken')
        userName = request.cookies.get('userName')
        UserSessionManager().isValidAdminUser(userID, userName, sessionToken)

        #****************************************************************
        # Step 1. RUN THE SCRIPT
        #****************************************************************
        from src.AdminTools.scripts.clean_databases import cleanDatabases as clean_databases_routine
        clean_databases_routine(force=True)

        response.setContent({"success": True})

    except Exception as ex:
        handleException(response, ex, __file__ , "cleanDatabases")

    finally:
        return response

#----------------------------------------------------------------
# MESSAGES
#----------------------------------------------------------------
def adminServletSaveMessage(request, response):
    try:
        #****************************************************************
        # Step 0.CHECK IF VALID USER SESSION
        #****************************************************************
        logging.info("STEP0 - CHECK IF VALID USER....")
        userID = request.cookies.get('userID')
        sessionToken = request.cookies.get('sessionToken')
        userName = request.cookies.get('userName')
        UserSessionManager().isValidAdminUser(userID, userName, sessionToken)

        #****************************************************************
        # Step 1.SAVE THE MESSAGE IN THE DATABASE
        #****************************************************************
        messageInstance = Message(request.form.get("message_type"))
        messageInstance.message_content = request.form.get("message_content")

        #****************************************************************
        # Step 2. SAVE THE MESSAGE
        #****************************************************************
        daoInstance = MessageDAO()
        daoInstance.removeAll(otherParams={"message_type" : messageInstance.message_type})
        daoInstance.insert(messageInstance)
        daoInstance.closeConnection()
        response.setContent({"success": True })

    except Exception as ex:
        handleException(response, ex, __file__ , "adminServletSaveMessage")
    finally:
        return response

def adminServletGetMessage(request, response):
    try:
        #****************************************************************
        # Step 0.CHECK IF VALID USER SESSION
        #****************************************************************
        message_type = request.form.get("message_type")

        if(message_type != "starting_message"):
            logging.info("STEP0 - CHECK IF VALID USER....")
            userID  = request.cookies.get('userID')
            sessionToken  = request.cookies.get('sessionToken')

            UserSessionManager().isValidUser(userID, sessionToken)

        #****************************************************************
        # Step 1.GET THE MESSAGES FROM THE DATABASE
        #****************************************************************
        daoInstance = MessageDAO()
        matchedMessages = daoInstance.findAll(otherParams={"message_type" : message_type})
        daoInstance.closeConnection()
        response.setContent({"success": True, "messageList" : matchedMessages})

    except Exception as ex:
        handleException(response, ex, __file__ , "adminServletGetMessage")
    finally:
        return response

def adminServletDeleteMessage(request, response):
    try:
        #****************************************************************
        # Step 0.CHECK IF VALID USER SESSION
        #****************************************************************
        logging.info("STEP0 - CHECK IF VALID USER....")
        userID = request.cookies.get('userID')
        sessionToken = request.cookies.get('sessionToken')
        userName = request.cookies.get('userName')
        UserSessionManager().isValidAdminUser(userID, userName, sessionToken)

        #****************************************************************
        # Step 1.GET THE MESSAGES FROM THE DATABASE
        #****************************************************************
        message_type = request.form.get("message_type")
        daoInstance = MessageDAO()
        daoInstance.removeAll(otherParams={"message_type" : message_type})
        daoInstance.closeConnection()

        response.setContent({"success": True})

    except Exception as ex:
        handleException(response, ex, __file__ , "adminServletDeleteMessage")
    finally:
        return response

#----------------------------------------------------------------
# SYSTEM
#----------------------------------------------------------------
def adminServletSystemInformation(request, response):
    """
    This function...

    @param {Request} request, the request object
    @param {Response} response, the response object
    """
    try:
        #****************************************************************
        # Step 0.CHECK IF VALID USER SESSION
        #****************************************************************
        logging.info("STEP0 - CHECK IF VALID USER....")
        userID = request.cookies.get('userID')
        sessionToken = request.cookies.get('sessionToken')
        userName = request.cookies.get('userName')
        UserSessionManager().isValidAdminUser(userID, userName, sessionToken)
        disk_use = []
        try:
            df = subprocess.Popen(["df", "-h"], stdout=subprocess.PIPE)
            output = df.communicate()[0]
            output = output.split("\n")
            output.pop(0)
            for line in output:
                disk_use.append(line.split())
        except Exception as e:
            pass

        return response.setContent({
            'cpu_count' : psutil.cpu_count(),
            "cpu_use" : psutil.cpu_percent(),
            "mem_total" : psutil.virtual_memory().total/(1024.0**3),
            "mem_use" : psutil.virtual_memory().percent,
            "swap_total": psutil.swap_memory().total/(1024.0**3),
            "swap_use" : psutil.swap_memory().percent,
            "disk_use": disk_use
        }).getResponse()

    except Exception as ex:
        handleException(response, ex, __file__ , "monitorCPU")
    finally:
        return response

def adminServletSendReport(request, response, ROOT_DIRECTORY):
    """
    This function...

    @param {Request} request, the request object
    @param {Response} response, the response object
    """
    try :
        #logging.info("STEP0 - CHECK IF VALID USER....")
        #****************************************************************
        # Step 0.CHECK IF VALID USER SESSION
        #****************************************************************
        userID  = request.cookies.get('userID')
        #sessionToken  = request.cookies.get('sessionToken')
        #UserSessionManager().isValidUser(userID, sessionToken)

        userEmail = UserDAO().findByID(userID)
        userName = userEmail.getUserName()
        userEmail = userEmail.getEmail()

        #****************************************************************
        # Step 1.GET THE SPECIE CODE AND THE UPDATE OPTION
        #****************************************************************
        formFields = request.form

        type = formFields.get("type")
        _message = formFields.get("message")

        title = "Other request"
        color = "#333"

        if type == "error":
            type = "Error notification"
            title = "<h1>New error notification</h1>"
            color = "#f95959"
        elif type == "specie_request":
            type = "New specie requesting"
            title = "<h1>New organism requested</h1>"
            color = "#0090ff"
        else:
            type = "Other request"

        message = '<html><body>'
        message +=  "<a href='" + "http://bioinfo.cipf.es/paintomics/" + "' target='_blank'>"
        message += "  <img src='cid:image1' border='0' width='auto' height='50' alt='Paintomics 3 logo'>"
        message += "</a>"
        message += "<div style='width:100%; height:10px; border-top: 1px dotted #333; margin-top:20px; margin-bottom:30px;'></div>"
        message += "<h1>"+ title + "</h1>"
        message += "<p>Thanks for the report, " + userName + "!</p>"
        message += "<p><b>Username:</b> " + userEmail + "</p></br>"
        message += "<div style='width:100%; border: 1px solid " + color +"; padding:10px;font-family: monospace;color:"+ color + ";'>" + _message + "</div>"
        message += "<p>We will contact you as soon as possible.</p>"
        message += "<p>Best regards,</p>"
        message += "<p>The Paintomics developers team.</p>"
        message += "<div style='width:100%; height:10px; border-top: 1px dotted #333; margin-top:20px; margin-bottom:30px;'></div>"
        message += "<p>Problems? E-mail <a href='mailto:" + "paintomics@cipf.es" + "'>" + "paintomics@cipf.es" + "</a></p>"
        message += '</body></html>'

        sendEmail(ROOT_DIRECTORY, smpt_sender, smpt_sender_name, type, message, fromEmail=userEmail, fromName=userName, isHTML=True)

        response.setContent({"success": True})

    except Exception as ex:
        handleException(response, ex, __file__ , "adminServletSendReport")

    finally:
        return response

