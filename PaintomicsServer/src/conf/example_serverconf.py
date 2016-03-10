#SERVER SETTINGS
SERVER_HOST_NAME          = "0.0.0.0"
SERVER_PORT_NUMBER        = 8080
SERVER_ALLOW_DEBUG        = False
SERVER_SUBDOMAIN          = ""
SERVER_MAX_CONTENT_LENGTH = 200 * pow(1024,2) #MAX_CLIENT_SPACE IN MB

#FILES SETTINGS
ROOT_DIRECTORY       = "/var/www/paintomics/src/"
CLIENT_TMP_DIR       = "/var/www/paintomics/src/CLIENT_TMP/"
KEGG_DATA_DIR        = "/home/paintomics/data/KEGG_DATA/"
EXAMPLE_FILES_DIR    = "/var/www/paintomics/src/examplefiles/"
MAX_CLIENT_SPACE     = 20 * pow(1024,2) #MAX_CLIENT_SPACE IN MB
CLIENT_DATA_DIR        = "/home/paintomics/data/"

#MONGO DB SETTINGS
MONGODB_HOST      = "localhost"
MONGODB_PORT      = 27017
MONGODB_DATABASE  = "PaintomicsDB"

#MULTITHREADING OPTIOS
MAX_THREADS      = 2
MAX_WAIT_THREADS = 300 #IN SECONDS
N_WORKERS        = 2

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

