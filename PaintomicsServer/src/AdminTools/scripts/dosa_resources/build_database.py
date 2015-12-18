import imp
import traceback

from sys import argv, stderr
from subprocess import CalledProcessError

#**************************************************************************
#
# DEFINE HERE ALL THE CUSTOM FUNCTIONS FOR INSTALLATION
#
#**************************************************************************
import os, csv

def processEnsemblData():
    """
    # ENSEMBL MAPPING FILE CONTAINS THE FOLLOWING COLUMNS
    # 1. Ensembl Gene ID
    # 2. MSU/TIGR locus
    # 3. Ensembl Protein ID
    # 4. Ensembl Transcript ID
    """
    COMMON_BUILD_DB_TOOLS.FAILED_LINES["ENSEMBL"]=[]

    resource = COMMON_BUILD_DB_TOOLS.EXTERNAL_RESOURCES.get("ensembl")[0]
    file_name= DATA_DIR + "mapping/" + resource.get("output")
    if not os.path.isfile(file_name):
        stderr.write("Unable to find the ENSEMBL MAPPING file: " + file_name)
        exit(1)

    #Get line count (for percentage)
    total_lines = int(COMMON_BUILD_DB_TOOLS.check_output(['wc', '-l', file_name]).split(" ")[0])

    #Register databases and get the assigned IDs
    ensembl_transcript_db_id = COMMON_BUILD_DB_TOOLS.insertDatabase(COMMON_BUILD_DB_TOOLS.DBNAME_Entry("ensembl_transcript", "Ensembl transcript", "Identifier"))
    ensembl_gene_db_id = COMMON_BUILD_DB_TOOLS.insertDatabase(COMMON_BUILD_DB_TOOLS.DBNAME_Entry("ensembl_gene", "Ensembl gene", "Identifier"))
    ensembl_peptide_db_id = COMMON_BUILD_DB_TOOLS.insertDatabase(COMMON_BUILD_DB_TOOLS.DBNAME_Entry("ensembl_peptide", "Ensembl protein", "Identifier"))
    msu_locus_db_id = COMMON_BUILD_DB_TOOLS.insertDatabase(COMMON_BUILD_DB_TOOLS.DBNAME_Entry("msu_locus", "MSU/TIGR locus", "Identifier"))
    msu_geneid_db_id = COMMON_BUILD_DB_TOOLS.insertDatabase(COMMON_BUILD_DB_TOOLS.DBNAME_Entry("msu_geneid", "MSU/TIGR Gene ID", "Identifier"))

    #Process files
    stderr.write("PROCESSING ENSEMBL MAPPING FILE...\n")
    with open(file_name, "r") as csvfile:
        rows = csv.reader(csvfile, delimiter=',')
        i =0
        prev=-1
        errorMessage=""

        for row in rows:
            i+=1
            prev = COMMON_BUILD_DB_TOOLS.showPercentage(i, total_lines, prev, errorMessage)
            try:
                ensembl_gi = row[0]
                msu_locus = row[1]
                ensembl_pi = row[2]
                ensembl_ti = row[3]

                if ensembl_ti == "": #ALWAYS FALSE
                    raise Exception("Empty ENSEMBL transcript value.")

                ensembl_ti = COMMON_BUILD_DB_TOOLS.insertXREF(COMMON_BUILD_DB_TOOLS.XREF_Entry(ensembl_ti, ensembl_transcript_db_id, resource.get("description")))
                COMMON_BUILD_DB_TOOLS.insertTR_XREF(ensembl_ti, ensembl_ti)

                if ensembl_gi != "": #ALWAYS TRUE
                    ensembl_gi = COMMON_BUILD_DB_TOOLS.insertXREF(COMMON_BUILD_DB_TOOLS.XREF_Entry(ensembl_gi, ensembl_gene_db_id, resource.get("description")))
                    COMMON_BUILD_DB_TOOLS.insertTR_XREF(ensembl_gi, ensembl_ti)

                if msu_locus != "":
                    msu_locus_id = COMMON_BUILD_DB_TOOLS.insertXREF(COMMON_BUILD_DB_TOOLS.XREF_Entry(msu_locus, msu_locus_db_id, resource.get("description")))
                    COMMON_BUILD_DB_TOOLS.insertTR_XREF(msu_locus_id, ensembl_ti)
                    #Add the gene id (locus without the .1, .2, etc.)
                    msu_locus_id = COMMON_BUILD_DB_TOOLS.insertXREF(COMMON_BUILD_DB_TOOLS.XREF_Entry(msu_locus.split(".")[0], msu_geneid_db_id, resource.get("description")))
                    COMMON_BUILD_DB_TOOLS.insertTR_XREF(msu_locus_id, ensembl_ti)

                if ensembl_pi != "":
                    ensembl_pi = COMMON_BUILD_DB_TOOLS.insertXREF(COMMON_BUILD_DB_TOOLS.XREF_Entry(ensembl_pi, ensembl_peptide_db_id, resource.get("description")))
                    COMMON_BUILD_DB_TOOLS.insertTR_XREF(ensembl_pi, ensembl_ti)

            except Exception as ex:
                errorMessage = "FAILED WHILE PROCESSING ENSEMBL MAPPING FILE [line " + str(i) + "]: "+ ex.message
                COMMON_BUILD_DB_TOOLS.FAILED_LINES["ENSEMBL"].append([errorMessage] + row)
    csvfile.close()

    COMMON_BUILD_DB_TOOLS.TOTAL_FEATURES["ENSEMBL"]=total_lines

    return total_lines



#**************************************************************************
#STEP 1. READ CONFIGURATION AND PARSE INPUT FILES
#
# DO NOT CHANGE THIS CODE
#**************************************************************************
SPECIE      = argv[1]
ROOT_DIR    = argv[2].rstrip("/") + "/"      #Should be src/AdminTools
DATA_DIR    = argv[3].rstrip("/") + "/"
LOG_FILE    = argv[4]

print SPECIE
print ROOT_DIR
print DATA_DIR
print LOG_FILE

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
    processEnsemblData()
    COMMON_BUILD_DB_TOOLS.processKEGGMappingData()

    #**************************************************************************
    # STEP 2. PROCESS THE KEGG DATABASE
    #**************************************************************************
    COMMON_BUILD_DB_TOOLS.processKEGGPathwaysData()
    #**************************************************************************
    # DUMP AND INSTALL
    #**************************************************************************
    COMMON_BUILD_DB_TOOLS.dumpDatabase()
    COMMON_BUILD_DB_TOOLS.createDatabase()

except CalledProcessError as ex:
    stderr.write("FAILED WHILE PROCESSING DATA " + ex.message)
    traceback.print_exc(file=stderr)
    exit(1)
except Exception as ex:
    stderr.write("FAILED WHILE PROCESSING DATA " + ex.message)
    traceback.print_exc(file=stderr)
    exit(1)

exit(0)
