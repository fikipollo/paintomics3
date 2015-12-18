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
from os import path

def handleException(responseInstance, exceptionInstance, filename, function, responseStatus=400, userID = ""):
    """Given an exception object, register a new error message for current job.

    Keyword arguments:
    responseInstance -- the HTTP response
    exceptionInstance -- the handled exception
    location -- location where the exception was thrown
    responseStatus -- the response status (default 400)
    """
    #if isinstance(exceptionInstance, CredentialException):
    #    responseStatus=200

    responseMessage = type(exceptionInstance).__name__ + ": AT " + path.basename(filename) + ": " + function + ". ERROR MESSAGE: " + str(exceptionInstance)
    if userID != "":
        responseMessage += ". User ID: " + userID
    logging.error(responseMessage)

    responseInstance.setStatus(responseStatus)
    responseInstance.setContent({"success": False, "message" :responseMessage })

class CredentialException(Exception):
    pass
