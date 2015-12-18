#!/usr/bin/python

import traceback
from sys import argv, stderr
import imp

#**************************************************************************
#STEP 1. READ CONFIGURATION AND PARSE INPUT FILES
#
# DO NOT CHANGE THIS CODE
#**************************************************************************
SPECIE      = argv[1]
ROOT_DIR    = argv[2].rstrip("/") + "/"      #Should be src/AdminTools
DESTINATION = argv[3].rstrip("/") + "/"

COMMON_BUILD_DB_TOOLS = imp.load_source('common_build_database', ROOT_DIR + "scripts/common_build_database.py")
COMMON_BUILD_DB_TOOLS.SPECIE= SPECIE
COMMON_BUILD_DB_TOOLS.EXTERNAL_RESOURCES = imp.load_source('download_conf',  ROOT_DIR + "scripts/" + SPECIE + "_resources/download_conf.py").EXTERNAL_RESOURCES

SERVER_SETTINGS = imp.load_source('serverconf.py',  ROOT_DIR + "../conf/serverconf.py")

#**************************************************************************
# CHANGE THE CODE FROM HERE
#
# STEP 2. DOWNLOAD FILES
#**************************************************************************
try:

    #**************************************************************************
    #STEP 2.1 GET ENSEMBL GENE ID -> TRANSCRIPT ID -> PEPTIDE ID -> ENTREZ ID
    resource = COMMON_BUILD_DB_TOOLS.EXTERNAL_RESOURCES.get("ensembl")[0]
    COMMON_BUILD_DB_TOOLS.queryBiomart(resource.get("url"), ROOT_DIR + "scripts/" + resource.get("file"), DESTINATION + resource.get("output"),  SERVER_SETTINGS.DOWNLOAD_DELAY_1, SERVER_SETTINGS.MAX_TRIES_1)

    #**************************************************************************
    #STEP 2.2 GET REFSEQ TRANSCRIPTS, PEPTIDES -> ENTREZ GENES and REFSEQ GENE ID -> GENE SYMBOL
    resource = COMMON_BUILD_DB_TOOLS.EXTERNAL_RESOURCES.get("refseq")
    for aux in resource:
        COMMON_BUILD_DB_TOOLS.downloadFile(aux.get("url"), aux.get("file"), DESTINATION + aux.get("output"),  SERVER_SETTINGS.DOWNLOAD_DELAY_1, SERVER_SETTINGS.MAX_TRIES_1)

    #**************************************************************************
    #STEP 2.3 GET UNIPROT TRANSCRIPTS, PEPTIDES -> ENTREZ GENES
    resource = COMMON_BUILD_DB_TOOLS.EXTERNAL_RESOURCES.get("uniprot")[0]
    COMMON_BUILD_DB_TOOLS.downloadFile(resource.get("url"), resource.get("file"), DESTINATION + resource.get("output"),  SERVER_SETTINGS.DOWNLOAD_DELAY_1, SERVER_SETTINGS.MAX_TRIES_1)

    #**************************************************************************
    #STEP 2.4 GET ENSEMBL VEGA GENE ID -> TRANSCRIPT ID -> PEPTIDE ID -> ENTREZ ID
    resource = COMMON_BUILD_DB_TOOLS.EXTERNAL_RESOURCES.get("vega")[0]
    COMMON_BUILD_DB_TOOLS.queryBiomart(resource.get("url"), ROOT_DIR + "scripts/" + resource.get("file"), DESTINATION + resource.get("output"),  SERVER_SETTINGS.DOWNLOAD_DELAY_1, SERVER_SETTINGS.MAX_TRIES_1)

except Exception as ex:
    stderr.write("FAILED WHILE DOWNLOADING DATA " + ex.message)
    traceback.print_exc(file=stderr)
    exit(1)

exit(0)
