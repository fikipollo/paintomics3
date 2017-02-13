#! /usr/bin/python
import sys
import os
# sys.path.insert(0, os.path.dirname(os.path.realpath(__file__)) + "/../../")

import datetime, traceback, shutil, inspect
import logging
import logging.config
import Image
from textwrap import wrap
from time import strftime, sleep, time
from subprocess import check_call, CalledProcessError

from conf.serverconf import ROOT_DIRECTORY, KEGG_DATA_DIR, CLIENT_TMP_DIR, DOWNLOAD_DELAY_1, DOWNLOAD_DELAY_2, MAX_TRIES_1, MAX_TRIES_2

VERSION=0.11


#------------------------------------------------------------------------------------------
#------------------------------------------------------------------------------------------
#---  MAIN FUNCTIONS                                                                   ----
#------------------------------------------------------------------------------------------
#------------------------------------------------------------------------------------------

def download_command(inputfile=None, specie=None, kegg=0, mapping=0, common=0, retry=0):
    """
    Download the information for given species
    Usage: AdminTools.py download <options>
    Examples:
              ./DBManager.py download --specie=mmu --kegg=1 --mapping=1 --common=0

    Keyword arguments:
        from_file -- a file containing a list of a list of species IDs (one per line), followed by (tabulated)
                            + [0,1]: download Kegg data for the specie
                            + [0,1]: download Mapping data,  where [0 = FALSE,1 = TRUE]
                            default ""
                            e.g.
                                mmu   1   0
                                hsa   1   1
                                ...
        specie    -- a valid KEGG specie code e.g. mmu, hsa

        kegg      -- (optional) download the KEGG data for the given specie. Default=0
        mapping   -- (optional) download the Mapping data for the given specie. Default=0
        common    -- (optional) 1 if Pathways info (classification, PNG images...) should be downloaded, 0 to keep from previous version. Default=0
        retry     -- (optional) 1 to retry the installation of ERRONEOUS SPECIES from previous version, 0 to ignore them. Default=0
    """

    if inputfile == None and specie == None:
        print "Organisms not specified, please type ./DBManager.py download -h for help"
        exit(-1)

    #**************************************************************************
    #STEP 1. READ CONFIGURATION AND PARSE INPUT FILES
    #**************************************************************************
    readConfigurationFile()

    rootName = KEGG_DATA_DIR + strftime("%Y%m%d_%H%M") + "/"
    speciesDirName = rootName + "species/"
    downloadLog= rootName + "download.log"
    currentStep = 0;

    log("######################################################################" )
    log("### PAINTOMICS 3.0 - DATABASE KEGG DOWNLOADER ")
    log("### v."+ str(VERSION))
    log("######################################################################" )
    log("")
    log("Download log is at: " + downloadLog)
    log("")
    log("STEP " + str(currentStep) + ". READ CONFIGURATION AND PARSE INPUT FILES..." )

    COPIED_SPECIES = []
    UPDATED_SPECIES = []
    ERRONEOUS_SPECIES = []
    SPECIES_UPDATE = None

    if inputfile != None:
        SPECIES_UPDATE= readFile(inputfile) #THE IDS FOR THE SPECIES TO UPDATE
    else:
        n=3
        if mapping == 0:
            n-=1

        if kegg == 0:
            n-=2

        SPECIES_UPDATE= {specie : n} #THE IDS FOR THE SPECIES TO UPDATE

    DOWNLOADED_PREVIOUS, ERRONEOUS_PREVIOUS, INSTALLED_PREVIOUS = getPreviousSpecies(KEGG_DATA_DIR + "/last/summary.log") #THE PREVIOUSLY INSTALLED SPECIES

    sleep(2)
    log("       - " + str(len(SPECIES_UPDATE.keys())) + " new organisms will be downloaded." )
    log("       - " + str(len(DOWNLOADED_PREVIOUS)) + " organisms were downloaded on previous executions." )
    log("       - " + str(len(INSTALLED_PREVIOUS)) + " organisms were installed on previous executions." )
    log("       - " + str(len(ERRONEOUS_PREVIOUS)) + " organisms failed during the installation on previous executions." )
    log("")

    #TODO: TEST
    if((retry==None and len(ERRONEOUS_PREVIOUS) > 0 and confirm(prompt='Do you want to download the failed organisms?', resp=False)) or (retry== "1")):
        for i in ERRONEOUS_PREVIOUS:
            SPECIES_UPDATE[i] = 3

    if((common==None and confirm(prompt='Download common KEGG information (pathway names, classifications, PNG images,...)?', resp=False)) or (common== "1")):
        common = True

    #INITIALIZE THE NEW DIRECTORY
    log("New data will be stored at " + rootName )
    os.mkdir(rootName)
    os.mkdir(rootName + "error/")
    os.mkdir(speciesDirName)
    os.system("touch " + downloadLog)
    os.symlink(rootName, KEGG_DATA_DIR + "/tmp")

    summary = open(rootName + 'summary.log','w')

    currentStep+=1

    #********************************************************************************
    #STEP 2. IF WE CHOOSED TO DOWNLOAD THE GENERAL DATA (PATHWAYS CLASSIFICATION, ETC.) -> GO TO 2.A
    #        OTHERWISE, JUST COPY --> GO TO 2.B
    #********************************************************************************
    try:
        #********************************************************************************
        #STEP 2.A
        #********************************************************************************
        if common == True:
            log('')
            log("STEP " + str(currentStep) + ". DOWNLOAD THE COMMON KEGG INFORMATION")

            #STEP 2.A.1 DOWNLOAD THE DATA FILES
            downloadKEGGFile("              * LIST OF ORGANISMS", downloadLog, "http://rest.kegg.jp/list/organism", rootName, "organisms_all.list",  DOWNLOAD_DELAY_1, MAX_TRIES_1)
            downloadKEGGFile("              * PATHWAYS CLASSIFICATION", downloadLog,  "http://rest.kegg.jp/get/br:br08901", rootName, "pathways_classification.list",  DOWNLOAD_DELAY_1, MAX_TRIES_1)
            downloadKEGGFile("              * LIST OF REFERENCE PATHWAYS", downloadLog,  "http://rest.kegg.jp/list/pathway", rootName, "pathways_all.list",  DOWNLOAD_DELAY_1, MAX_TRIES_1)
            downloadKEGGFile("              * LIST OF COMPOUND NAMES", downloadLog,  "http://rest.kegg.jp/list/compound", rootName, "compounds_all.list",  DOWNLOAD_DELAY_1, MAX_TRIES_1)
            #downloadKEGGFile("              * PATHWAY to COMPOUND TABLE", downloadLog,  "http://rest.kegg.jp/link/pathway/compound", rootName, "pathway2compound.list",  DOWNLOAD_DELAY_1, MAX_TRIES_1)

            pathways=readFile(rootName + "pathways_all.list", {"forced":True, "forcedColumn": 0})
            total=len(pathways.keys())
            log("             DETECTED " + str(total) + " REFERENCE PATHWAYS " + calculateAproxTime(total, DOWNLOAD_DELAY_2 +3))

            #STEP 2.A.2 DOWNLOAD THE PNG IMAGES
            os.mkdir(rootName + "png/")
            os.mkdir(rootName + "png/thumbnails")
            version = open(rootName + "png/" + 'VERSION','w')
            version.write("# CREATION DATE:" + strftime("%Y%m%d %H%M"))
            version.close()

            i=1
            for pathway in pathways.keys():
                pathway = pathway.replace("path:","")
                downloadKEGGFile("                     - " + pathway + " [" + str(i) + "/" + str(total) + "]", downloadLog,  "http://rest.kegg.jp/get/"+ pathway+"/image", rootName + "png/", pathway + ".png",  DOWNLOAD_DELAY_2, MAX_TRIES_1)
                generateThumbnail(rootName + "png/" +  pathway + ".png")
                i+=1
        else:
            #********************************************************************************
            #STEP 2.B
            #********************************************************************************
            log("STEP " + str(currentStep) + ". COPYING THE PREVIOUS COMMON KEGG INFORMATION")
            shutil.copyfile(KEGG_DATA_DIR + "/last/organisms_all.list", rootName + "organisms_all.list")
            shutil.copyfile(KEGG_DATA_DIR + "/last/pathways_classification.list", rootName + "pathways_classification.list")
            shutil.copyfile(KEGG_DATA_DIR + "/last/pathways_all.list", rootName + "pathways_all.list")
            shutil.copyfile(KEGG_DATA_DIR + "/last/compounds_all.list", rootName + "compounds_all.list")
            shutil.copytree(KEGG_DATA_DIR + "/last/png/", rootName + "/png/", symlinks=True)# COPY THE ENTIRE DIRECTORY
            #shutil.copyfile(KEGG_DATA_DIR + "/last/pathway2compound.list", rootName + "pathway2compound.list")

    except Exception as e:
        log("        FAILED WHILE DOWNLOADING/COPYING PATHWAYS INFORMATION. UNABLE TO CONTINUE. ABORTING!!")
        summary.write('FAILED WHILE DOWNLOADING/COPYING THE PATHWAYS INFORMATION. UNABLE TO CONTINUE')
        errorlog(e)
        summary.close()
        exit(1)

    currentStep+=1

    #**************************************************************************
    #STEP 3. COPY PREVIOUS SPECIES (NOT CHECKED FOR INSTALLING/UPDATING)
    #**************************************************************************
    log('')
    log("STEP " + str(currentStep) + ". COPY THE PREVIOUS INFORMATION FOR ORGANISMS")

    DOWNLOADED_PREVIOUS= diff(DOWNLOADED_PREVIOUS, SPECIES_UPDATE.keys())    #REMOVE FROM THE SPECIES_PREVIOUS LIST THE TO_UPDATE SPECIES
    log("       - " + str(len(DOWNLOADED_PREVIOUS)) + " organisms were downloaded on previous executions." )

    step=0;
    total =  str(len(DOWNLOADED_PREVIOUS))

    for specie in DOWNLOADED_PREVIOUS:
        step+=1
        try:
            log("              * COPYING  " + specie + " (" + str(step) + "/" + total + ")...")
            shutil.copytree(KEGG_DATA_DIR + "/last/species/" + specie, speciesDirName + specie, symlinks=True)# COPYT THE ENTIRE DIRECTORY
            COPIED_SPECIES.append(specie)
            summary.write(specie + '\tCOPY\tSUCCESS\n')
            log("              * COPYING  " + specie  + " (" + str(step) + "/" + total + ")...SUCCESS\n")
        except Exception as e:
            summary.write(specie + '\tCOPY\tERROR\n')
            log("              * COPYING  " + specie  + " (" + str(step) + "/" + total + ")...ERROR\n")
            errorlog(e)
            errorlog(traceback.extract_stack())
            ERRONEOUS_SPECIES.append(specie)
            if os.path.isdir(speciesDirName + specie):
                shutil.move(speciesDirName + specie, rootName + "error/")

    shutil.copy(KEGG_DATA_DIR + "/last/species/species.json", speciesDirName + "species.json")

    currentStep+=1

    #**************************************************************************
    #STEP 5. GET DATA FOR "TO UPDATE" SPECIES
    #**************************************************************************
    log('')
    log("STEP " + str(currentStep) + ". DOWNLOADING THE INFORMATION FOR THE SELECTED ORGANISMS")
    speciesAux = SPECIES_UPDATE.keys()
    total =  str(len(speciesAux))
    log("       - " + str(total) + " new organisms will be downloaded." )

    step=0
    for specie in speciesAux:
        if specie[0] == "#":
            log("    IGNORING " + specie[1:] + "...")
            continue

        step+=1
        dirNameAux = speciesDirName + specie + "/"
        log("        DOWLOADING  " + specie + "...")

        try:
            kegg_errors = "";
            mapping_errors = "";

            #GET THE KEGG DATA
            if(SPECIES_UPDATE[specie] > 1): #2 = updateKegg, 3 = updateKegg && updateMapping
                os.mkdir(dirNameAux)
                os.mkdir(dirNameAux + "kgml")
                kegg_errors = getSpecieKeggData(specie, downloadLog, dirNameAux, str(step)+ "/" + total)

            else: #COPY PREVIOUS DATA
                log("COPYING PREVIOUS KEGG DATA FOR " + specie + "...")
                shutil.copytree(KEGG_DATA_DIR + "last/species/" + specie, dirNameAux, symlinks=True)# COPYT THE ENTIRE DIRECTORY
                shutil.rmtree(dirNameAux + "mapping")

            #GET THE MAPPING DATA
            if(SPECIES_UPDATE[specie] == 1 or SPECIES_UPDATE[specie] == 3): #1=updateMapping, 3 = updateKegg && updateMapping
                os.mkdir(dirNameAux + "mapping")
                mapping_errors = getSpecieMappingData(specie, downloadLog, dirNameAux + "mapping/", str(step)+ "/" + total, self.ROOT_DIRECTORY + "AdminTools/scripts/")

            else: #COPY PREVIOUS DATA
                log("COPYING PREVIOUS MAPPING DATA...")
                shutil.copytree(KEGG_DATA_DIR + "last/species/" + specie + "/mapping", dirNameAux + "mapping", symlinks=True)# COPYT THE ENTIRE DIRECTORY

            #IF THE SOME WENT WRONG DURING THE DOWNLOAD BUT THE PROCESS CONTINUED (TOLERANCE)
            if kegg_errors != "" or mapping_errors != "":
                log("Errors detected during the download for organism " + specie)
                log("  - Errors during KEGG data download: " + kegg_errors)
                log("  - Errors during MAPPING data download: " + mapping_errors)
                log("The organism will be moved to the erroneous directory but could be valid for installation.")
                #TODO: ask if keep as valid
                raise Exception("Errors detected during the download for organism " + specie + ". Aborting.")

            UPDATED_SPECIES.append(specie)
            summary.write(specie + '\tDOWNLOAD\tSUCCESS\t' + str(SPECIES_UPDATE[specie]) + '\n')
            log("UPDATE  "+ str(SPECIES_UPDATE[specie]) + " " + specie + "...SUCCESS\n")

        except Exception as e:
            summary.write(specie + '\tDOWNLOAD\tERROR\t' + str(SPECIES_UPDATE[specie]) + '\n')
            log("UPDATE  "+ str(SPECIES_UPDATE[specie]) + " " + specie + "...ERROR\n")
            errorlog(e)
            ERRONEOUS_SPECIES.append(specie)
            if os.path.isdir(dirNameAux):
                shutil.move(dirNameAux, rootName + "error/")

    currentStep+=1

    #**************************************************************************
    #STEP 6. CLOSING LOG FILES, GENERATING VERSION FILE
    #**************************************************************************
    log('')
    log("STEP " + str(currentStep) + ". CLOSING LOG FILES, GENERATING VERSION FILE")
    summary.close()

    version = open(rootName + 'VERSION','w')

    version.write("# CREATION DATE:\t" + strftime("%Y%m%d %H%M")+"\n\n")
    version.write("######################################################################\n")
    version.write("#### THIS FILE WAS CREATED USING PAINTOMICS DATABASE GENERATOR    ####\n")
    version.write("######################################################################\n\n")
    version.write("----------------------------------------------------------------------\n\n")
    version.write("# DOWNLOADED SPECIES\n\n")
    version.write("\n".join(wrap("\t".join(UPDATED_SPECIES), 40)))
    version.write("\n\n")
    version.write("----------------------------------------------------------------------\n\n")
    version.write("# COPIED SPECIES\n\n")
    version.write("\n".join(wrap("\t".join(COPIED_SPECIES), 40)))
    version.write("\n\n")
    version.write("----------------------------------------------------------------------\n\n")
    version.write("# ERRONEOUS SPECIES\n\n")
    version.write("\n".join(wrap("\t".join(ERRONEOUS_SPECIES), 40)))
    version.write("\n\n")
    version.write("----------------------------------------------------------------------\n\n")
    version.close()

    if os.path.exists(KEGG_DATA_DIR + "/tmp"):
        os.remove(KEGG_DATA_DIR + "/tmp")

    if os.path.exists(KEGG_DATA_DIR + "/last"):
        os.remove(KEGG_DATA_DIR + "/last")
    os.symlink(rootName, KEGG_DATA_DIR + "/last")

def install_command(inputfile=None, specie=None, common=0):
    """
    Install the information for given species
    Usage: AdminTools.py install <options>
    Examples:
              ./DBManager.py install --specie=mmu --common=0

    Keyword arguments:
        from_file -- a file containing a list of a list of species IDs (one per line) to be installed
        specie    -- a valid KEGG specie code e.g. mmu, hsa
        common    -- (optional) 1 if Pathways info (classification, PNG images...) should be reinstalled, 0 to keep from previous version. Default=0
    """
    if inputfile == None and specie == None:
        print "Organisms not specified, please type ./DBManager.py install -h for help"
        exit(-1)

    readConfigurationFile()

    #**************************************************************************
    #STEP 1. READ CONFIGURATION AND PARSE INPUT FILES
    #**************************************************************************
    rootName = KEGG_DATA_DIR + "/last/"
    speciesDirName = rootName + "species/"
    installLog= rootName + "install.log"
    summary = open(rootName + 'summary.log','a')
    currentStep = 1;

    log("######################################################################" )
    log("### PAINTOMICS 3.0 - DATABASE INSTALLER ")
    log("### v." + str(VERSION))
    log("######################################################################" )
    log("")
    log("Installation log is at: " + installLog)
    log("")
    log("STEP " + str(currentStep) + ". READ CONFIGURATION AND PARSE INPUT FILES..." )

    INSTALLED_SPECIES = []
    ERRONEOUS_SPECIES = []

    SPECIES_INSTALL = None
    if inputfile != None:
        SPECIES_INSTALL= readFile(inputfile) #THE IDS FOR THE SPECIES TO UPDATE
    else:
        SPECIES_INSTALL= {specie : 1} #THE IDS FOR THE SPECIES TO UPDATE

    DOWNLOADED_PREVIOUS, ERRONEOUS_PREVIOUS, INSTALLED_PREVIOUS = getPreviousSpecies(KEGG_DATA_DIR + "/last/summary.log") #THE PREVIOUSLY DOWNLOADED SPECIES

    sleep(2)
    log("       - " + str(len(SPECIES_INSTALL.keys())) + " new organisms will be installed." )
    log("       - " + str(len(DOWNLOADED_PREVIOUS)) + " organisms were downloaded on previous executions." )
    log("       - " + str(len(INSTALLED_PREVIOUS)) + " organisms were installed on previous executions." )
    log("       - " + str(len(ERRONEOUS_PREVIOUS)) + " organisms failed during the installation on previous executions." )
    log("")

    currentStep+=1
    if((common==None and confirm(prompt='Do you want to install the common KEGG information (compound names, pathway names, ...)?', resp=False)) or (common== 1)):
        common = True

    #**************************************************************************
    #STEP 2. INSTALLING KEGG GLOBAL DATA
    #**************************************************************************
    try:
        #********************************************************************************
        #STEP 2.A.1 IF WE CHOOSED TO DONWLOAD THE GENERAL DATA (PATHWAYS CLASSIFICATION, ETC.)
        #********************************************************************************
        if common == True:
            log("STEP " + str(currentStep) + ". INSTALLING COMMON KEGG INFORMATION")
            installCommonData(rootName, self.ROOT_DIRECTORY + "AdminTools/scripts/")
            currentStep+=1

    except Exception as e:
        log("        FAILED WHILE INSTALLING COMMON INFORMATION. UNABLE TO CONTINUE. ABORTING!!")
        summary.write('FAILED WHILE INSTALLING COMMON INFORMATION. UNABLE TO CONTINUE. ABORTING!!')
        errorlog(e)
        summary.close()
        exit(1)

    #**************************************************************************
    #STEP 3. INSTALLING THE PROVIDED SPECIES
    #**************************************************************************
    log("")
    log("STEP " + str(currentStep) + ". INSTALLING NEW ORGANISMS")
    speciesAux = SPECIES_INSTALL.keys()
    total =  str(len(speciesAux))
    log("       " + str(total) + " new organisms will be installed." )

    step=0
    for specie in speciesAux:
        if specie[0] == "#":
            log("    IGNORING " + specie[1:] + "...")
            continue

        step+=1
        dirNameAux = speciesDirName + specie + "/"
        log("        INSTALLING  " + specie + "...")

        try:
            installSpecieData(specie, installLog, dirNameAux, str(step)+ "/" + total, self.ROOT_DIRECTORY + "AdminTools/scripts/")
            INSTALLED_SPECIES.append(specie)
            summary.write(specie + '\tINSTALL\tSUCCESS\t' + str(SPECIES_INSTALL[specie]) + '\n')
            log("INSTALL  "+ str(SPECIES_INSTALL[specie]) + " " + specie + "...SUCCESS\n")
        except Exception as e:
            summary.write(specie + '\tINSTALL\tERROR\t' + str(SPECIES_INSTALL[specie]) + '\n')
            log("INSTALL  "+ str(SPECIES_INSTALL[specie]) + " " + specie + "...ERROR\n")
            errorlog(e)
            ERRONEOUS_SPECIES.append(specie)

    step=0

    for specie in list(INSTALLED_PREVIOUS):
        summary.write(specie + '\tINSTALL\tSUCCESS\tPREVIOUS\n')

    currentStep+=1

    #**************************************************************************
    #STEP 6. CLOSING LOG FILES, GENERATING VERSION FILE
    #**************************************************************************
    log("")
    log("STEP " + str(currentStep) + ". CLOSING LOG FILES, GENERATING VERSION FILE")
    summary.close()

    version = open(rootName + 'VERSION','a')

    version.write("\n\n")
    version.write("----------------------------------------------------------------------\n\n")
    version.write("# INSTALLED SPECIES\n\n")
    version.write("\n".join(wrap("\t".join(INSTALLED_SPECIES), 40)))
    version.write("\n\n")
    version.write("----------------------------------------------------------------------\n\n")
    version.write("# FAILED SPECIES (INSTALL)\n\n")
    version.write("\n".join(wrap("\t".join(ERRONEOUS_SPECIES), 40)))
    version.write("\n\n")
    version.write("----------------------------------------------------------------------\n\n")
    version.close()

    generateAvailableSpeciesFile(list(INSTALLED_PREVIOUS) + INSTALLED_SPECIES, ERRONEOUS_SPECIES, rootName + "organisms_all.list", rootName + "/species/species.json")

def restore_command(remove=1, force=0):
    """
    Restores the last version of the database to previous version

    Keyword arguments:
        remove  -- 1 remove the current database directory, 0 keep the directory
        force   -- 1 force remove the current database directory and use previous version, 0  to prompt
    """

    readConfigurationFile()

    realPath = os.path.realpath(KEGG_DATA_DIR + "/last")
    currentFile = os.path.basename(realPath)

    older= '19870729_0534'
    limit =  datetime.datetime.strptime(currentFile, "%Y%m%d_%H%M")
    for i in next(os.walk(KEGG_DATA_DIR))[1]:
        if i == "last" or i == "tmp" or i == "TEST_DATA":
            continue

        aux = datetime.datetime.strptime(i, "%Y%m%d_%H%M")
        aux2= datetime.datetime.strptime(older, "%Y%m%d_%H%M")
        if (aux > aux2) and (aux < limit):
            older=i

    if older != '19870729_0534':
        if(force==0 and not confirm(prompt='Restore to previous directory ' + older + '?', resp=False)):
            exit(1)

        if os.path.exists(KEGG_DATA_DIR + "/last"):
            os.remove(KEGG_DATA_DIR + "/last")
        os.symlink(KEGG_DATA_DIR + older, KEGG_DATA_DIR + "last")

        if remove == 1:
            if(force==1 or confirm(prompt='Remove previous directory '+realPath+'?', resp=False)):
                import shutil
                shutil.rmtree(realPath)

def findnew_command():
    """Find new available species in KEGG."""
    readConfigurationFile()

def findolder_command(nDays):
    """Find installed species older than nDays."""
    readConfigurationFile()



#------------------------------------------------------------------------------------------
#---  AUXILIAR FUNCTIONS                                                               ----
#------------------------------------------------------------------------------------------
def downloadKEGGFile(message, logFile, URL, dirName, fileName, delay, maxTries):
    log(message)

    nTry = 1
    while nTry <= maxTries:
        wait(delay)
        try:
            check_call(["wget", "-O", dirName + fileName, "-a", logFile, URL])
            return True
        except Exception as e:
            nTry+=1
            errorlog("FAIL! Trying again... " + str(nTry) + " of " + str(maxTries))
    raise Exception('Unable to retrieve ' + fileName + " from " + URL)

def getSpecieKeggData(specie, downloadLog, dirName, step):
    start_time = time()
    kegg_errors = ""

    log("            FETCHING KEGG DATA FOR " + specie + " (" + step + ")...")
    version = open(dirName + 'KEGG_VERSION','w')
    version.write("# CREATION DATE:\t" + strftime("%Y%m%d %H%M"))
    version.close()

    downloadKEGGFile("              * GENE to PATHWAY TABLE",  downloadLog, "http://rest.kegg.jp/link/pathway/"+ specie, dirName, "gene2pathway.list",  DOWNLOAD_DELAY_1, MAX_TRIES_1)
    downloadKEGGFile("              * PATHWAYS LIST", downloadLog,  "http://rest.kegg.jp/list/pathway/"+ specie, dirName, "pathways.list",  DOWNLOAD_DELAY_1, MAX_TRIES_1)
    #downloadKEGGFile("              * PATHWAY to GENE TABLE", downloadLog,  "http://rest.kegg.jp/link/" + specie + "/pathway", dirName, "pathway2gene.list",  DOWNLOAD_DELAY_1, MAX_TRIES_1)

    #CREATE THE pathway2gene.list File
    check_call("cat " + dirName + "/gene2pathway.list | awk '{print $2\"\t\"$1}' | sort > " + dirName + "/pathway2gene.list", shell=True)

    #GET THE PATHWAYS LIST AND DOWNLOAD THE IMAGES
    if os.path.isfile(dirName + "pathways.list"):
        if not os.path.isdir(dirName + "kgml/"):
            os.mkdir(dirName + "kgml/")

        pathways=readFile(dirName + "pathways.list", {"forced":True, "forcedColumn": 0})
        total=len(pathways.keys())
        log("                DETECTED " + str(total) + " PATHWAYS FOR " + specie + " " + calculateAproxTime(total, DOWNLOAD_DELAY_2 + 3))

        error_tolerance= int(total * 0.05) #we tolerate that a 5% of the pathways fail on download
        i=1
        for pathway in pathways.keys():
            try:
                pathway = pathway.replace("path:","")
                downloadKEGGFile("                     - " + pathway + " [" + str(i) + "/" + str(total) + "]", downloadLog,  "http://rest.kegg.jp/get/"+ pathway+"/kgml", dirName + "kgml/", pathway + ".kgml",  DOWNLOAD_DELAY_2, MAX_TRIES_1)
            except Exception as e:
                error_tolerance-=1;
                kegg_errors+=" " + pathway
                if error_tolerance == 0:
                    raise Exception("Too many errors while downloading the KGML files for organism " + specie + ": " + kegg_errors)
                log("                       Failed!! The download process will continue...")
            i+=1
    else:
        raise Exception('Unable to retrieve ' + dirName + "pathways.list")

    wait(DOWNLOAD_DELAY_2)

    log("        DOWNLOADED IN " + str((time() - start_time)) + " seconds ---")

    return kegg_errors

def getSpecieMappingData(specie, downloadLog, dirName, step, scriptsDir):
    start_time = time()
    mapping_errors = ""

    log("            FETCHING MAPPING DATA FOR " + specie + " (" + step + ")...")
    version = open(dirName + 'MAP_VERSION','w')
    version.write("# CREATION DATE:\t" + strftime("%Y%m%d %H%M"))
    version.close()

    downloadLogFile = open(downloadLog, 'a')
    try:
        if os.path.isfile(scriptsDir + specie + "_resources/download_others.py"):
            log("     * RETRIEVING EXTERNAL MAPPING DATA")
            try:
                check_call(["python", scriptsDir + specie + "_resources/download_others.py", specie, self.ROOT_DIRECTORY + "AdminTools/", dirName], stdout=downloadLogFile, stderr=downloadLogFile)
            except CalledProcessError as exc:
                raise Exception("Error while calling " + scriptsDir + specie + "_resources/download_others.py" +": Exit status " + str(exc.returncode) + ". Output is available at " + downloadLog)

        #we tolerate that some of the files fail on download
        error_tolerance= 2
        try:
            downloadKEGGFile("             * KEGG TO NCBI GeneID", downloadLog,  "http://rest.kegg.jp/conv/"+ specie +"/ncbi-geneid", dirName, "ncbi-geneid2kegg.list",  DOWNLOAD_DELAY_1, MAX_TRIES_1)
        except Exception as e:
            error_tolerance-=1;
            mapping_errors+=" ncbi-geneid"
            if error_tolerance == 0:
                raise Exception("Too many errors while downloading the KEGG mapping files for organism " + specie + ": " + mapping_errors)
            log("                       Failed!! The download process will continue...")

        try:
            downloadKEGGFile("             * KEGG TO Uniprot", downloadLog,  "http://rest.kegg.jp/conv/"+ specie +"/uniprot", dirName, "uniprot2kegg.list",  DOWNLOAD_DELAY_1, MAX_TRIES_1)
        except Exception as e:
            error_tolerance-=1;
            mapping_errors+=" uniprot2kegg"
            if error_tolerance == 0:
                raise Exception("Too many errors while downloading the KEGG mapping files for organism " + specie + ": " + mapping_errors)
            log("                       Failed!! The download process will continue...")

        try:
            downloadKEGGFile("             * KEGG TO Gene Symbol", downloadLog,  "http://rest.kegg.jp/list/"+ specie, dirName, "kegg2genesymbol.list",  DOWNLOAD_DELAY_1, MAX_TRIES_1)
        except Exception as e:
            error_tolerance-=1;
            mapping_errors+=" kegg2genesymbol"
            if error_tolerance == 0:
                raise Exception("Too many errors while downloading the KEGG mapping files for organism " + specie + ": " + mapping_errors)
            log("                       Failed!! The download process will continue...")

        #downloadKEGGFile("             * KEGG TO NCBI GI", downloadLog,  "http://rest.kegg.jp/conv/"+ specie +"/ncbi-gi", dirName, "ncbi-gi2kegg.list",  DOWNLOAD_DELAY_1, MAX_TRIES_1)

        log("            DOWNLOADED IN " + str(int((time() - start_time)/60)) + " minutes ---")
    except Exception as ex:
        raise ex
    finally:
        downloadLogFile.close()
    return mapping_errors

def installSpecieData(specie, downloadLog, dirName, step, scriptsDir):
    start_time = time()
    log("                 INSTALLING MAPPING DATA FOR " + specie + " (" + step + ")...")
    downloadLogFile = open(downloadLog, 'a')

    try:
        if os.path.isfile(scriptsDir + specie + "_resources/build_database.py"):
            log("       * PROCESSING AND INSTALLING CUSTOM AND KEGG DATA ")
            try:
                check_call(["python", scriptsDir + specie + "_resources/build_database.py", specie, self.ROOT_DIRECTORY + "AdminTools/", dirName, downloadLog], stdout=downloadLogFile, stderr=downloadLogFile)
            except CalledProcessError as exc:
                errorlog(traceback.extract_stack())
                raise Exception("Error while calling " + scriptsDir + specie + "_resources/build_database.py" +": Exit status " + str(exc.returncode) + ". Output is available at " + downloadLog)
        else:
            log("       * PROCESSING AND INSTALLING DEFAULT KEGG DATA ")
            try:
                check_call(["python", scriptsDir  +  "default/build_database.py", specie, self.ROOT_DIRECTORY + "AdminTools/", dirName, downloadLog], stdout=downloadLogFile, stderr=downloadLogFile)
            except CalledProcessError as exc:
                errorlog(traceback.extract_stack())
                raise Exception("Error while calling " + scriptsDir + "default/build_database.py" +": Exit status " + str(exc.returncode) + ". Output is available at " + downloadLog)

        log("        INSTALLED IN " + str(int((time() - start_time))) + " seconds ---")
    except Exception as ex:
        raise ex
    finally:
        downloadLogFile.close()
    return True

def installCommonData(dirName, scriptsDir):
    log("            INSTALLING COMMON DATA... ")

    try:
        import imp
        COMMON_BUILD_DB_TOOLS = imp.load_source('common_build_database', scriptsDir + "common_build_database.py")
        COMMON_BUILD_DB_TOOLS.processKEGGCommonData(dirName, self.ROOT_DIRECTORY)
    except Exception as ex:
        raise ex
    return True

def getPreviousSpecies(path, options=None):
    DOWNLOADED = set([])
    INSTALLED =  set([])
    FAILED    =  set([])

    if os.path.isfile(path):
        with open(path, 'rU') as inputDataFile:
            import csv
            for line in csv.reader(inputDataFile, delimiter="\t"):
                if line[2] == "SUCCESS": #IF WAS INSTALLED/COPIED/UPDATED SUCCESSFULLY
                    if line[1] == "INSTALL":
                        INSTALLED.add(line[0])
                    else:
                        DOWNLOADED.add(line[0])
                else:
                    FAILED.add(line[0])
        inputDataFile.close()

    return DOWNLOADED, FAILED, INSTALLED

def generateAvailableSpeciesFile(VALID_SPECIES, INVALID_SPECIES, species_file, installed_species_file):
    #rootName, "organisms_all.list",
    import csv
    species={}
    with open(species_file, "r") as csvfile:
        rows = csv.reader(csvfile, delimiter='\t')
        #FILL THE TABLE specie_code -> specie_name
        for row in rows:
            species[row[1]] = row[2]
    csvfile.close()

    if os.path.isfile(installed_species_file):
        shutil.copy(installed_species_file, installed_species_file + "_prev")

    output_file = open(installed_species_file, 'w')
    output_file.write('{"success": true, "species": [\n')

    VALID_SPECIES.sort()
    VALID_SPECIES = set(VALID_SPECIES)

    total= len(VALID_SPECIES)
    for i, specieCode in enumerate(VALID_SPECIES):
        try:
            name = species.get(specieCode, "")
            if name!="":
                name= '\t{"name": "' + name + '", "value": "' + specieCode + '"}'
                if i < total-1:
                    name+=","
                output_file.write(name + '\n')
            else:
                raise Exception()
        except Exception as ex:
            errorlog(traceback.extract_stack())
            errorlog("Error while writting specie " + specieCode)

    output_file.write(']}')
    output_file.close()

#------------------------------------------------------------------------------------------
#------------------------------------------------------------------------------------------
#---  MORE AUXILIAR FUNCTIONS                                                          ----
#------------------------------------------------------------------------------------------
#------------------------------------------------------------------------------------------

def generateThumbnail(imagePath):
    destination = imagePath.replace("png/", "png/thumbnails/").replace(".png", "_thumb.png")
    thumb = Image.open(imagePath)
    #Generate the thumbnail
    s = thumb.size
    n = min(s)
    thumb = thumb.crop((s[0]/2 - n/4, s[1]/2-n/4, s[0]/2 + n/4, s[1]/2 + n/4))
    thumb.thumbnail((300,300))
    thumb.save(destination)

def readConfigurationFile():
    self.ROOT_DIRECTORY = ROOT_DIRECTORY
    import os
    if self.ROOT_DIRECTORY == "":
        self.ROOT_DIRECTORY = os.path.abspath(os.path.dirname(os.path.realpath(__file__)) + "/../") + "/"
    else:
        self.ROOT_DIRECTORY = os.path.abspath(self.ROOT_DIRECTORY) + "/"

    #PREPARE LOGGING
    logging.config.fileConfig(self.ROOT_DIRECTORY + 'conf/logging.cfg')

def readFile(path, options=None):
    data = {}
    forced=False
    forcedColumn=0

    if(options != None):
        options.get("forced", False)
        options.get("forcedColumn", 0)

    if os.path.isfile(path):
        with open(path, 'rU') as inputDataFile:
            import csv
            for line in csv.reader(inputDataFile, delimiter="\t"):
                if len(line) == 3 and forced == False: #IF IT IS UPDATE FILE
                    data[line[0]] = 0 # 0= DO NOTHING (DEFAULT ACTION), 1 = updateMapping, 2 = updateKegg, 3 = updateKegg && updateMapping

                    if(line[2] == "1"):#updateMapping = 1
                        data[line[0]] += 1
                    if(line[1] == "1"):#updateKegg = 1
                        data[line[0]] += 2
                    if(data[line[0]] == 0): #IF DO NOTHING, WE REMOVE THE SPECIE FROM THE LIST
                        del data[line[0]]
                else:
                    data[line[forcedColumn]] = 3 #updateKegg = 1, updateMapping = 1

        inputDataFile.close()
    return data

def confirm(prompt=None, resp=False):
    """prompts for yes or no response from the user. Returns True for yes and
    False for no.

    'resp' should be set to the default value assumed by the caller when
    user simply types ENTER.

    >>> confirm(prompt='Create Directory?', resp=True)
    Create Directory? [y]|n:
    True
    >>> confirm(prompt='Create Directory?', resp=False)
    Create Directory? [n]|y:
    False
    >>>
    Create Directory? [n]|y: y
    True

    """

    if prompt is None:
        prompt = 'Confirm'

    if resp:
        prompt = '%s [%s]|%s: ' % (prompt, 'y', 'n')
    else:
        prompt = '%s [%s]|%s: ' % (prompt, 'n', 'y')

    while True:
        ans = raw_input(prompt)
        if not ans:
            return resp
        if ans not in ['y', 'Y', 'n', 'N']:
            print 'please enter y or n.'
            continue
        if ans == 'y' or ans == 'Y':
            return True
        if ans == 'n' or ans == 'N':
            return False

def diff(a, b):
        b = set(b)
        return [aa for aa in a if aa not in b]

def log(msg):
    frame,filename,line_number,function_name,lines,index=inspect.getouterframes(
        inspect.currentframe())[1]
    line=lines[0]
    indentation_level=line.find(line.lstrip())
    logging.info('{i} {m}'.format(
        i=' '*indentation_level,
        m=msg
        ))

def errorlog(msg):
    frame,filename,line_number,function_name,lines,index=inspect.getouterframes(
        inspect.currentframe())[1]
    line=lines[0]
    indentation_level=line.find(line.lstrip())
    logging.error('{i} {m}'.format(
        i=' '*indentation_level,
        m=msg
        ))

def wait(nSeconds):
    #log(message)
    sleep(nSeconds)

def calculateAproxTime(nElems, delay):
    return "[" + str(int(nElems * delay /60) ) + " min aprox.]"

#------------------------------------------------------------------------------------------
#------------------------------------------------------------------------------------------
#---  RUN APP
#------------------------------------------------------------------------------------------
#------------------------------------------------------------------------------------------
if __name__ == '__main__':
    import scriptine
    scriptine.run()
