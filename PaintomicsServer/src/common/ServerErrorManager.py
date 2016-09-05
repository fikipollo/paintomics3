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
    exc_type=None
    exc_tb=None
    file_name = None

    try:
        import sys, os
        exc_type, exc_obj, exc_tb = sys.exc_info()
        file_name = os.path.split(exc_tb.tb_frame.f_code.co_filename)[1]
    except Exception as ex:
        if exc_type == None:
            exc_type = "Unable to get the exception type"
        if exc_tb == None:
            exc_tb = {"tb_lineno" : "Unable to get the exception line"}
        if file_name == None:
            file_name = "Unable to get the exception file name"

    responseMessage = type(exceptionInstance).__name__ + ": AT " + path.basename(filename) + ": " + function + ". ERROR MESSAGE: " + str(exceptionInstance)
    if userID != "":
        responseMessage += ". User ID: " + userID
    logging.error(responseMessage)

    responseInstance.setStatus(responseStatus)
    responseInstance.setContent({"success": False, "message" :responseMessage, "extra": {"exc_type": str(exc_type), "file_name": str(file_name), "exc_line": str(exc_tb.tb_lineno)}})

class CredentialException(Exception):
    pass
