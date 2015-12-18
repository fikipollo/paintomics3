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

from src.conf.serverconf import CLIENT_TMP_DIR

from src.classes.User import User
from src.common.DAO.UserDAO import UserDAO
from src.common.UserSessionManager import UserSessionManager
from src.common.ServerErrorManager import handleException, CredentialException
from src.common.Util import sendEmail, adapt_string

def userManagementSignIn(request, response):
    #VARIABLE DECLARATION
    userInstance = None
    daoInstance = None

    try :
        #****************************************************************
        # Step 1.READ PARAMS AND CHECK IF USER ALREADY EXISTS
        #****************************************************************
        logging.info("STEP1 - READ PARAMS AND CHECK IF USER ALREADY EXISTS..." )
        formFields = request.form
        email  = formFields.get("email")
        password  = formFields.get("password")
        from hashlib import sha1
        password = sha1(password.encode('ascii')).hexdigest()

        daoInstance = UserDAO()
        userInstance = daoInstance.findByEmail(email, {"password" : password})

        if userInstance == None:
            raise CredentialException("The email or password you entered is incorrect.")
        #TODO: LINK PARA ACTIVAR CUENTAS
        # elif userInstance.isActivated() == False:
        #     raise CredentialException("Account not activated, please check your email inbox and follow the instructions for account activation.")

        logging.info("STEP1 - READ PARAMS AND CHECK IF USER ALREADY EXISTS...OK USER EXISTS" )
        #****************************************************************
        # Step 2. REGISTER NEW SESSION
        #****************************************************************
        logging.info("STEP2 - GETTING A NEW SESSION TOKEN..." )
        sessionToken = UserSessionManager().registerNewUser(userInstance.getUserId())

        #Update the last login date at the database
        from time import strftime
        today = strftime("%Y%m%d")
        userInstance.setLastLogin(today)
        daoInstance.update(userInstance, {"fieldList" : ["last_login"]})

        logging.info("STEP2 - GETTING A NEW SESSION TOKEN...DONE" )
        response.setContent({"success": True, "userID":userInstance.getUserId(),"userName":userInstance.getUserName(), "sessionToken" : sessionToken})

    except CredentialException as ex:
        handleException(response, ex, __file__ , "userManagementSignIn", 200)
    except Exception as ex:
        handleException(response, ex, __file__ , "userManagementSignIn")
    finally:
        if(daoInstance != None):
            daoInstance.closeConnection()
        return response

def userManagementSignOut(request, response):
    userInstance = None
    daoInstance = None

    try :
        #****************************************************************
        # Step 1.READ PARAMS
        #****************************************************************
        logging.info("STEP1 - READ PARAMS..." )
        formFields = request.form
        userID  = formFields.get("userID")
        sessionToken  = formFields.get("sessionToken")
        #****************************************************************
        # Step 2. CLOSE SESSION
        #****************************************************************
        logging.info("STEP2 - REMOVING USER.." )
        UserSessionManager().removeUser(userID, sessionToken)
        response.setContent({"success": True})

    except Exception as ex:
        handleException(response, ex, __file__ , "userManagementSignOut")
    finally:
        if(daoInstance != None):
            daoInstance.closeConnection()
        return response

def userManagementSignUp(request, response):
    #VARIABLE DECLARATION
    userInstance = None
    daoInstance = None

    try :
        #****************************************************************
        # Step 1.READ PARAMS AND CHECK IF USER ALREADY EXISTS
        #****************************************************************
        logging.info("STEP1 - READ PARAMS AND CHECK IF USER ALREADY EXISTS..." )
        formFields = request.form
        email  = formFields.get("email")
        email = email.lower()
        password  = formFields.get("password")
        userName  = adapt_string(formFields.get("userName"))
        affiliation  = adapt_string(formFields.get("affiliation"))

        daoInstance = UserDAO()
        userInstance = daoInstance.findByEmail(email)
        if userInstance != None:
            logging.info("STEP1 - ERROR! EMAIL ALREADY AT THE DATABASE..." )
            raise CredentialException("Email is already registered")

        #****************************************************************
        # Step 2. Add user to database
        #****************************************************************
        logging.info("STEP2 - CREATING USER INSTANCE AND SAVING TO DATABASE..." )
        userInstance = User("")
        userInstance.setEmail(email)
        from hashlib import sha1
        userInstance.setPassword(sha1(password.encode('ascii')).hexdigest())
        userInstance.setUserName(userName)
        userInstance.setAffiliation(affiliation)
        #Update the last login date at the database
        from time import strftime
        today = strftime("%Y%m%d")
        userInstance.setCreationDate(today)
        userInstance.setLastLogin(today)

        userID = daoInstance.insert(userInstance)

        #****************************************************************
        # Step 3. Sending confirmation email
        #****************************************************************
        logging.info("STEP3 - SENDING CONFIRMATION EMAIL... TODO!!" )
        try:
            #TODO: SERVER ADDRESS AND ADMIN EMAIL
            message = '<html><body>'
            message +=  "<a href='" + "http://bioinfo.cipf.es/paintomics/" + "' target='_blank'>"
            message += "  <img src='" + "http://bioinfo.cipf.es/paintomics/" + "resources/images/paintomics_white_300x66' border='0' width='150' height='33' alt='Paintomics 3 logo'>"
            message += "</a>"
            message += "<div style='width:100%; height:10px; border-top: 1px dotted #333; margin-top:20px; margin-bottom:30px;'></div>"
            message += "<h1>Welcome to Paintomics 3!</h1>"
            message += "<p>Thanks for joining, " + userInstance.getUserName() + "! You're already able to work with Paintomics.</p>"
            message += "<p>Your user name is as follows:</p>"
            message += "<p><b>Username:</b> " + userInstance.getEmail() + "</p></br>"
            message += "<p>Login in to Paintomics 3 at </p><a href='" + "http://bioinfo.cipf.es/paintomics/" + "'>" + "http://bioinfo.cipf.es/paintomics/" + "</a>"
            message += "<div style='width:100%; height:10px; border-top: 1px dotted #333; margin-top:20px; margin-bottom:30px;'></div>"
            message += "<p>Problems? E-mail <a href='mailto:" + "paintomics@cipf.es" + "'>" + "paintomics@cipf.es" + "</a></p>"
            message += '</body></html>'

            sendEmail(userInstance.getEmail(), userInstance.getUserName(), "Welcome to Paintomics 3", message, isHTML=True)
        except Exception:
            logging.error("Failed to send the email.")

        #****************************************************************
        # Step 4. Create user directories
        #****************************************************************
        logging.info("STEP4 - INITIALIZING DIRECTORIES..." )
        initializeUserDirectories(str(userID))

        response.setContent({"success": True})

    except Exception as ex:
        handleException(response, ex, __file__ , "userManagementSignUp")
    finally:
        if(daoInstance != None):
            daoInstance.closeConnection()
        return response

def userManagementNewGuestSession(request, response):
    #VARIABLE DECLARATION
    userInstance = None
    daoInstance = None

    try :
        #****************************************************************
        # Step 1.GENERATE RANDOM PASSWORD AND A RANDOM EMAIL FOR GUEST USER
        #****************************************************************
        logging.info("STEP1 - GETTING RANDOM PASS AND USER..." )

        password  = getRandowWord(6) #GENERATE A RANDOM PASSWORD USING A WORD

        daoInstance = UserDAO()
        valid = False
        userName = ""
        from random import randrange
        while valid == False:
            userName = "guest" + str(randrange(99999))
            valid = daoInstance.findByEmail(userName+"@paintomics.org") == None

        #****************************************************************
        # Step 2. ADD NEW USER TO DATABASE
        #****************************************************************
        logging.info("STEP2 - CREATING USER INSTANCE AND SAVING TO DATABASE..." )
        userInstance = User("")
        userInstance.setEmail(userName+"@paintomics.org")
        from hashlib import sha1
        userInstance.setPassword(sha1(password.encode('ascii')).hexdigest())
        userInstance.setUserName(userName)
        userInstance.setAffiliation("GUEST USER")
        #Update the last login date at the database
        from time import strftime
        today = strftime("%Y%m%d")
        userInstance.setCreationDate(today)
        userInstance.setLastLogin(today)
        userInstance.setIsGuest(True)

        userID = daoInstance.insert(userInstance)

        #****************************************************************
        # Step 3. Create user directories
        #****************************************************************
        logging.info("STEP3 - INITIALIZING DIRECTORIES..." )
        initializeUserDirectories(str(userID))

        #****************************************************************
        # Step 4. Create new session
        #****************************************************************
        logging.info("STEP4 - GETTING A NEW SESSION TOKEN..." )
        sessionToken = UserSessionManager().registerNewUser("" + str(userID))

        response.setContent({"success": True, "userID":userID, "userName":userInstance.getUserName(), "sessionToken" : sessionToken, "p":password})

    except Exception as ex:
        handleException(response, ex, __file__ , "userManagementNewGuestSession")
    finally:
        if(daoInstance != None):
            daoInstance.closeConnection()
        return response

def getRandowWord(minLength):
    import os.path
    from random import randrange
    WORDS = open(os.path.dirname(os.path.realpath(__file__)) + "/../examplefiles/words").read().splitlines()
    password  = WORDS[randrange(len(WORDS))].split("'")[0].lower()

    if len(password) < minLength:
        return getRandowWord(minLength)
    return password

def initializeUserDirectories(userID):
    import os.path
    if os.path.isfile(CLIENT_TMP_DIR + userID):
        import shutil
        shutil.rmtree(CLIENT_TMP_DIR + 'userID') #THIS SHOULD NEVER HAPPEN!!!

    os.mkdir(CLIENT_TMP_DIR + userID)
    os.mkdir(CLIENT_TMP_DIR + userID + "/inputData")
    os.mkdir(CLIENT_TMP_DIR + userID + "/jobsData")
    os.mkdir(CLIENT_TMP_DIR + userID + "/tmp")

