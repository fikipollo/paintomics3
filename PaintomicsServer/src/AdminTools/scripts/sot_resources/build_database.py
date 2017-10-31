import imp
import traceback

from sys import argv, stderr
from subprocess import CalledProcessError, check_call
#**************************************************************************
#STEP 1. READ CONFIGURATION AND PARSE INPUT FILES
#
# DO NOT CHANGE THIS CODE
#**************************************************************************
SPECIE      = argv[1]
ROOT_DIR    = argv[2].rstrip("/") + "/"      #Should be src/AdminTools
DATA_DIR    = argv[3].rstrip("/") + "/"
LOG_FILE    = argv[4]

COMMON_BUILD_DB_TOOLS = imp.load_source('common_build_database', ROOT_DIR + "scripts/common_build_database.py")
COMMON_BUILD_DB_TOOLS.SPECIE= SPECIE
COMMON_BUILD_DB_TOOLS.DATA_DIR= DATA_DIR
COMMON_BUILD_DB_TOOLS.EXTERNAL_RESOURCES = imp.load_source('download_conf',  ROOT_DIR + "scripts/" + SPECIE + "_resources/download_conf.py").EXTERNAL_RESOURCES

#**************************************************************************
# CHANGE THE CODE FROM HERE
#
# STEP 2. INSTALL FILES
#**************************************************************************
try:
    #**************************************************************************
    # STEP 1. EXTRACT THE MAPPING DATABASE
    #**************************************************************************
    COMMON_BUILD_DB_TOOLS.processMapManMappingData()
    COMMON_BUILD_DB_TOOLS.processKEGGMappingData()
    #**************************************************************************
    # STEP 2. PROCESS THE KEGG DATABASE
    #**************************************************************************
    COMMON_BUILD_DB_TOOLS.processKEGGPathwaysData()

    # This must be after KEGG to avoid trying to process missing kgml files
    # (will not fail though)
    COMMON_BUILD_DB_TOOLS.processMapManPathwaysData()

    COMMON_BUILD_DB_TOOLS.mergeNetworkFiles()

    #**************************************************************************
    # DUMP AND INSTALL
    #**************************************************************************
    COMMON_BUILD_DB_TOOLS.dumpDatabase()
    COMMON_BUILD_DB_TOOLS.createDatabase()

    try:
        command = ROOT_DIR + "scripts/generateTestData.sh " + SPECIE + " " + DATA_DIR + "../../../"
        check_call(command, shell=True)
    except Exception:
        pass

except CalledProcessError as ex:
    stderr.write("FAILED WHILE PROCESSING DATA " + ex.message)
    traceback.print_exc(file=stderr)
    exit(1)
except Exception as ex:
    stderr.write("FAILED WHILE PROCESSING DATA " + ex.message)
    traceback.print_exc(file=stderr)
    exit(1)

exit(0)
