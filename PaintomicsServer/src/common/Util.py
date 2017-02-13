#***************************************************************
#  This file is part of Paintomics v3
#
#  Paintomics is free software: you can redistribute it and/or
#  modify it under the terms of the GNU General Public License as
#  published by the Free Software Foundation, either version 3 of
#  the License, or (at your option) any later version.
#
#  Paintomics is distributed in the hope that it will be useful,
#  but WITHOUT ANY WARRANTY without even the implied warranty of
#  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
#  GNU General Public License for more details.
#
#  You should have received a copy of the GNU General Public License
#  along with Paintomics.  If not, see <http://www.gnu.org/licenses/>.
#matchedGeneIDsTablesList
#  More info http://bioinfo.cipf.es/paintomics
#  Technical contact paintomics@cipf.es
#**************************************************************
from Image import open as image_open

class Singleton(type):
    _instances = {}
    def __call__(cls, *args, **kwargs):
        if cls not in cls._instances:
            cls._instances[cls] = super(Singleton, cls).__call__(*args, **kwargs)
        return cls._instances[cls]

class Model (object):
    def parseBSON(self, bsonData):
        bsonData.pop("_id")
        for (attr, value) in bsonData.items():
            setattr(self, attr, value)

    def toBSON(self):
        return  self.__dict__

    def clone(self):
        import copy
        newobj = copy.deepcopy(self) # deep (recursive) copy
        return newobj


def chunks(l, n):
    """
        This function divides an array in n parts

        @param {Array} l, the array object
        @param {Int} n, number of parts
        @returns list of n arrays
    """
    return [l[i:i+n] for i in range(0, len(l), n)]


def getImageSize(imagePath):
    image = image_open(imagePath)
    return image.size

def unifyAndSort(seq, criteria=None):
    seq = sorted(seq, key=criteria)
    # order preserving
    if criteria is None:
       def idfun(x): return x
    seen = {}
    result = []
    for item in seq:
       marker = criteria(item)
       # in old Python versions:
       # if seen.has_key(marker)
       # but in new ones:
       if marker in seen: continue
       seen[marker] = 1
       result.append(item)
    return result


def sendEmail(ROOT_DIRECTORY, toEmail, toName, subject, _message, fromEmail=None, fromName=None, isHTML=False):
    import smtplib
    from email.mime.multipart import MIMEMultipart
    from email.mime.text import MIMEText
    from email.mime.image import MIMEImage
    from src.conf.serverconf import smtp_host, smtp_port, use_smtp_auth, smpt_username, smpt_pass,use_smtp_ssl, smtp_secure, smpt_sender, smpt_sender_name

    if fromEmail == None:
        fromEmail = smpt_sender
    if fromName == None:
        fromName = smpt_sender_name

    # Create message container - the correct MIME type is multipart/alternative.
    message = MIMEMultipart('alternative')
    message['Subject'] = subject
    message['From'] = fromName + " <" + fromEmail + ">"
    message['To'] = toName + " <" + toEmail+ ">"

    if isHTML:
        message.attach(MIMEText(_message, 'html'))

        fp = open(ROOT_DIRECTORY + 'public_html/resources/images/paintomics_white_300x66.png', 'rb')
        msgImage = MIMEImage(fp.read())
        fp.close()

        # Define the image's ID as referenced above
        msgImage.add_header('Content-ID', '<image1>')
        message.attach(msgImage)
    else:
        message.attach(MIMEText(_message, 'plain'))

    if use_smtp_ssl == True:
        server = smtplib.SMTP_SSL(smtp_host, smtp_port)
    else:
        server = smtplib.SMTP(smtp_host, smtp_port)

    if smtp_secure == "tls":
       server.starttls()

    if use_smtp_auth == True :
       server.login(smpt_username, smpt_pass)

    server.sendmail(fromEmail, toEmail, message.as_string())


def adapt_string(the_string):
    try:
        return str(the_string)
    except:
        try:
            import unicodedata
            return str(''.join(c for c in unicodedata.normalize('NFD', the_string) if unicodedata.category(c) != 'Mn'))
        except Exception:
            try:
                import re
                return str(re.sub('[^A-Za-z0-9]+', '', the_string))
            except:
                return "INVALID STRING"