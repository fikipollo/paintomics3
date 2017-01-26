#SERVER SETTINGS
SERVER_HOST_NAME          = "0.0.0.0" ##THE IP ADDRESS FOR GALAKSIO, LEAVE 0.0.0.0 FOR LISTENING ALL REQUESTS
SERVER_PORT_NUMBER        = 8080 ##THE PORT NUMBER THAT GALAKSIO LISTENS FOR REQUESTS
SERVER_ALLOW_DEBUG        = False ##ENABLE DEBUG, THIS OPTION IS JUST FOR DEVELOPMENT
SERVER_SUBDOMAIN          = "" ##USE THIS OPTION IF GALAKSIO RUNS UNDER AN SPECIFIC SUBDOMAIN, E.G. myserver.com/paintomics (w/o proxy)
SERVER_MAX_CONTENT_LENGTH = 200 * pow(1024,2) ##THE MAX SIZE FOR THE REQUESTS SENT BY THE CLIENTS, IN MB

#FILES SETTINGS
ROOT_DIRECTORY            = "" ##THE LOCATION FOR THE GALAKSIO FILES, LEAVE BLANK TO AUTO DETECT
EXAMPLE_FILES_DIR         = ROOT_DIRECTORY + "/examplefiles/"
CLIENT_TMP_DIR            = "/data/CLIENT_TMP/"
KEGG_DATA_DIR             = "/data/KEGG_DATA/"
MAX_CLIENT_SPACE          = 20 * pow(1024,2) #MAX_CLIENT_SPACE IN MB

#MONGO DB SETTINGS
MONGODB_HOST      = "localhost"
MONGODB_PORT      = 27017
MONGODB_DATABASE  = "PaintomicsDB"

#MULTI-THREADING OPTIONS
MAX_THREADS      = 6
MAX_WAIT_THREADS = 300 #IN SECONDS
N_WORKERS        = 4

#CACHE SIZES
JOB_CACHE_MAX_SIZE  = 10
KEGG_CACHE_MAX_SIZE = 5

#DOWNLOAD SETTINGS
DOWNLOAD_DELAY_1    =2
DOWNLOAD_DELAY_2    =2
MAX_TRIES_1 = 3
MAX_TRIES_2 = 5

#SMTP CONFIGURATION
smtp_host       = "smtp.gmail.com"           #Sets Gmail, Office... as the SMTP server
smtp_port       = 465                        #Set the SMTP port for the GMAIL
use_smtp_auth   = True                       #Enable SMTP authentication
use_smtp_ssl    = True                       #Whether use normal SMTP or SMTP_SSL
smtp_secure     = ""                         #Use tls, etc.
smpt_username   = "notifications@mydomain.com"  #THE SENDER EMAIL, DEPENDS ON THE SMTP SETTINGS
smpt_pass       = "09bf93aae4166cd12775c2592a1c613c" #THE SENDER PASS IN MD5 CODIFICATION, DEPENDS ON THE SMTP SETTINGS
smpt_sender     = "notifications@mydomain.com"       #Sender email (From value at the email)
smpt_sender_name= "Paintomics 3"             #Sender name (From value at the email)
