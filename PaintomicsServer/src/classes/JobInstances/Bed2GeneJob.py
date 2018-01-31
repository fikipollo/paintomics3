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

from src.classes.Job import Job
from src.classes.Feature import OmicValue, Gene
from src.servlets.DataManagementServlet import copyFile
from src.common.bioscripts.DHS_exon_association import run as run_DHS_exon_association
from src.conf.serverconf import MAX_WAIT_THREADS #MULTITHREADING

from os import path as os_path, mkdir as os_mkdir
from csv import reader as csv_reader

import shutil
import time

class Bed2GeneJob(Job):
    #******************************************************************************************************************
    # CONSTRUCTORS
    #******************************************************************************************************************
    def __init__(self, jobID, userID, CLIENT_TMP_DIR):
        super(Bed2GeneJob, self).__init__(jobID, userID, CLIENT_TMP_DIR)
        self.omicName = None
        self.presortedGTF  = False

        self.report               = "gene"
        self.distance             = 10
        self.tss                  = 200
        self.promoter             = 1300
        self.geneAreaPercentage   = 90
        self.regionAreaPercentage = 50
        self.rules                = ["TSS","1st_EXON","PROMOTER","INTRON","GENE_BODY","UPSTREAM","DOWNSTREAM"]
        self.geneIDtag            = "gene_id"

        self.summarizationMethod  = "mean"
        self.reportRegions        = ["all"]

    # def getOptions(self, scriptLocation, gtfFile, dataFile, tmpFile):
    #     return [
    #         scriptLocation,
    #         "-r", self.report,
    #         "-q", str(self.distance),
    #         "-t", str(self.tss),
    #         "-p", str(self.promoter),
    #         "-v", str(self.geneAreaPercentage),
    #         "-w", str(self.regionAreaPercentage),
    #         "-G", self.geneIDtag,
    #         "-g", gtfFile,
    #         "-b", dataFile,
    #         "-o", tmpFile,
    #     ]
    def getOptions(self):
        return {
            "presortedGTF": self.presortedGTF,
            "report": self.report,
            "distance": self.distance,
            "tss": self.tss,
            "promoter": self.promoter,
            "perc_area": self.geneAreaPercentage,
            "perc_region": self.regionAreaPercentage,
            "gene": self.geneIDtag
        }

    def getJobDescription(self, generate=False, dataFile="", relevantFile="", gtfFile=""):
        if(generate):
            self.description = "Input data:" + os_path.basename(dataFile) + ";Relevant file: " + os_path.basename(relevantFile)  + ";Reference file: " + os_path.basename(gtfFile) + ";"
            self.description += "Params:;Distance=" + str(self.distance) + ";"
            self.description += "TSS region distance=" + str(self.tss)+ ";"
            self.description += "Promoter region distance=" + str(self.promoter)+ ";"
            self.description += "Overlapped gene area(%)=" + str(self.geneAreaPercentage)+ ";"
            self.description += "Overlapped region area(%)=" + str(self.regionAreaPercentage)+ ";"
            self.description += "Summarization method=" + self.summarizationMethod + ";"
            self.description += "Report=" + ",".join(self.reportRegions) + ";"
        return self.description


    def validateInput(self):
        """
        This function check the content for files and returns an error message in case of invalid content

        @returns True if not error
        """
        error = ""

        try:
            self.distance = float(self.distance)
        except:
            error +=  " -  Distance must be a numeric value"
        try:
            self.tss = float(self.tss)
        except:
            error +=  " -  TSS region distance must be a numeric value"
        try:
            self.promoter = float(self.promoter)
        except:
            error +=  " -  Promoter region distance must be a numeric value"
        try:
            self.geneAreaPercentage = float(self.geneAreaPercentage)
            if self.geneAreaPercentage < 0 or self.geneAreaPercentage > 100:
                error +=  " -  Overlapped gene area must be a numeric value between 0 and 100"
        except:
            error +=  " -  Overlapped gene area must be a numeric value between 0 and 100"
        try:
            self.regionAreaPercentage = float(self.regionAreaPercentage)
            if self.regionAreaPercentage < 0 or self.regionAreaPercentage > 100:
                error +=  " -  Overlapped region area must be a numeric value between 0 and 100"
        except:
            error +=  " -  Overlapped region area must be a numeric value between 0 and 100"

        logging.info("VALIDATING REGION BASED FILES..." )
        nConditions, error = self.validateFile(self.geneBasedInputOmics[0], -1, error)

        if error != "":
            raise Exception("Errors detected in input files, please fix the following issues and try again:" + error)

        return True

    def validateFile(self, inputOmic, nConditions, error):
        """
        This function...

        @param {type}
        @returns
        """
        valuesFileName= inputOmic.get("inputDataFile")
        relevantFileName= inputOmic.get("relevantFeaturesFile", "")
        omicName = inputOmic.get("omicName")

        if(inputOmic.get("isExample", False) == True):
            return nConditions, error
        else:
            valuesFileName = self.getInputDir() + valuesFileName
            relevantFileName = self.getInputDir() + relevantFileName

        #*************************************************************************
        # STEP 1. VALIDATE THE RELEVANT FEATURES FILE
        #*************************************************************************
        logging.info("VALIDATING RELEVANT REGIONS FILE (" + omicName + ")..." )
        if os_path.isfile(relevantFileName):
            with open(relevantFileName, 'rU') as inputDataFile:
                nLine = -1
                erroneousLines = {}

                for line in csv_reader(inputDataFile, delimiter="\t"):
                    nLine = nLine+1
                    #TODO: HACER ALGO CON EL HEADER?
                    #*************************************************************************
                    # STEP 1.1 CHECK IF IT IS HEADER, IF SO, IGNORE LINE
                    #*************************************************************************
                    if(nLine == 0):
                        try:
                            int(line[1])
                        except:
                            continue

                    #**************************************************************************************
                    # STEP 2.2 IF LINE LENGTH DOES NOT MATCH WITH EXPECTED NUMBER OF CONDITIONS, ADD ERROR
                    #**************************************************************************************
                    if len(line) != 3:
                        erroneousLines[nLine] = "   > Line " + str(nLine) + ": expected 3 columns but found " + str(len(line)) + "; "

                    if len(erroneousLines)  > 9:
                        error +=  " - Too many errors detected while processing " + inputOmic.get("relevantFeaturesFile") + ", skipping remaining lines...\n"
                        break

            inputDataFile.close()

            #*************************************************************************
            # STEP 3. CHECK THE ERRORS AND RETURN
            #*************************************************************************
            if len(erroneousLines)  > 0:
                error += " - Errors detected while processing " + inputOmic.get("relevantFeaturesFile") + ":\n"
                for k in sorted(erroneousLines.keys()):
                    error+= erroneousLines.get(k) + "\n"


        #*************************************************************************
        # STEP 2. VALIDATE THE VALUES FILE
        #*************************************************************************
        logging.info("VALIDATING VALUES FILE (" + omicName + ")..." )

        #IF THE USER UPLOADED VALUES FOR GENE EXPRESSION
        if os_path.isfile(valuesFileName):
            with open(valuesFileName, 'rU') as inputDataFile:
                nLine = -1
                erroneousLines = {}

                for line in csv_reader(inputDataFile, delimiter="\t"):
                    nLine = nLine+1
                    #TODO: HACER ALGO CON EL HEADER?
                    #*************************************************************************
                    # STEP 2.1 CHECK IF IT IS HEADER, IF SO, IGNORE LINE
                    #*************************************************************************
                    if(nLine == 0):
                        try:
                            float(line[1])
                        except Exception:
                            if line[0][0] != "#":
                                erroneousLines[nLine] =  "   > Line " + str(nLine) + ": Header must start with a HASH symbol (#)."
                            continue

                    if nConditions == -1:
                        if len(line) < 4:
                            erroneousLines[nLine] =  "   > Line " + str(nLine) + " expected at least 4 columns, but found one."
                            break
                        nConditions = len(line)

                    #**************************************************************************************
                    # STEP 2.2 IF LINE LENGTH DOES NOT MATCH WITH EXPECTED NUMBER OF CONDITIONS, ADD ERROR
                    #**************************************************************************************
                    if(nConditions != len(line) and len(line)>0):
                        erroneousLines[nLine] = "   > Line " + str(nLine) + ": expected " +  str(nConditions) + " columns but found " + str(len(line)) + "; "

                    #**************************************************************************************
                    # STEP 2.2 IF CONTAINS NOT VALID VALUES, ADD ERROR
                    #**************************************************************************************
                    try:
                        map(float, line[3:len(line)])
                    except:
                        erroneousLines[nLine] = erroneousLines.get(nLine,  "   > Line " + str(nLine) + ":") + "Line contains invalid values."

                    if len(erroneousLines)  > 9:
                        error +=  " - Too many errors detected while processing " + inputOmic.get("inputDataFile") + ", skipping remaining lines...\n"
                        break

            inputDataFile.close()

            #*************************************************************************
            # STEP 3. CHECK THE ERRORS AND RETURN
            #*************************************************************************
            if len(erroneousLines)  > 0:
                error += " - Errors detected while processing " + inputOmic.get("inputDataFile") + ":\n"
                for k in sorted(erroneousLines.keys()):
                    error+= erroneousLines.get(k) + "\n"
        else:
            error += " - Error while processing " + omicName + ": File " + inputOmic.get("inputDataFile") + "not found.\n"

        return nConditions, error

    ##*************************************************************************************************************
    # This function...
    #
    # @param {type}
    # @returns
    ##*************************************************************************************************************
    def fromBED2Genes(self):
        #STEP 1. GET THE FILES PATH AND PREPRARE THE OPTIONS
        logging.info("READING FILES...")

        gtfFile = self.getInputDir()+ self.getReferenceInputs()[0].get("inputDataFile")
        if not os_path.isfile(gtfFile): #CHECK IF THE FILE IS AN INPUT FILE OR AN INBUILT GTF FILE
            gtfFile = self.getReferenceInputs()[0].get("inputDataFile")
        if not os_path.isfile(gtfFile): #CHECK IF THE FILE IS AN INPUT FILE OR AN INBUILT GTF FILE
            raise Exception("Reference file not found.")

        inputOmic = self.getGeneBasedInputOmics()[0]
        dataFile = inputOmic.get("inputDataFile")
        relevantFile = inputOmic.get("relevantFeaturesFile")

        if(inputOmic.get("isExample", False) == False):
            dataFile = self.getInputDir()+  dataFile
            relevantFile = self.getInputDir()+ relevantFile

        if not os_path.isdir(self.getTemporalDir()):
            os_mkdir(self.getTemporalDir())

        tmpFile = self.getTemporalDir() +"/RGMatch_output.txt"

        #STEP 2. CALL TO DHS_exon_association SCRIPT AND GENERATE ASSOCIATION BETWEEN REGIONS AND GENES
        logging.info("STARTING DHS_exon_association PROCESS.")

        from multiprocessing import Process
        thread = Process(target=run_DHS_exon_association, args=(gtfFile, dataFile, tmpFile, None, self.getOptions()))
        thread.start()
        thread.join(MAX_WAIT_THREADS)
        del thread

        logging.info("STARTING DHS_exon_association PROCESS...Done")


        #STEP 3. PARSE RELEVANT FILE
        logging.info("PROCESSING RELEVANT FEATURES FILE...")
        relevantRegions = self.parseSignificativeFeaturesFile(relevantFile, isBedFormat=True)
        logging.info("PROCESSING RELEVANT FEATURES FILE...DONE")

        #STEP 4. PARSE GENERATED TEMPORAL FILE, GET THE GENE, REGIONS AND QUANTIFICATION
        logging.info("PROCESSING DHS_exon_association OUTPUT...")
        if os_path.isfile(tmpFile):
             with open(tmpFile, 'rU') as inputDataFile:
                regionID = geneID = geneRegion = feature = None
                #TODO: (OPTIONAL) if result ordered by gene id -> reduce processing time
                csvReader = csv_reader(inputDataFile, delimiter="\t")
                #IGNORE THE HEADER
                line = csvReader.next()
                #SAVE THE NAME OF THE CONDITIONS (e.g. COND1, COND2,...)
                header = "\t".join(line[9:])

                for line in csvReader:
                    #STEP 5.1 GET THE REGION ID, THE ASSOCIATED GENE ID, THE GENE REGION AND THE QUANTIFICATION VALUES
                    regionID  = line[0]
                    geneID    = line[2]
                    geneRegion= line[5]
                    values    =  map(float, line[9:])

                    #STEP 5.2 CHECK IF GENE REGION IS VALID OR IGNORE ENTRY
                    if self.reportRegions.count("all") == 0 and self.reportRegions.count(geneRegion) == 0:
                        continue

                    #STEP 5.3 CREATE A NEW OMIC VALUE WITH ROW DATA
                    omicValueAux = OmicValue(regionID)
                    #TODO: set omic name with chipseq, dnase,...?
                    omicValueAux.setOmicName(regionID)
                    omicValueAux.setRelevant(relevantRegions.has_key(regionID))
                    omicValueAux.setValues(values)

                    #STEP 5.4 CREATE A NEW TEMPORAL GENE INSTANCE
                    geneAux = Gene(geneID)
                    geneAux.setName(line[0])
                    geneAux.addOmicValue(omicValueAux)

                    #STEP 5.5 ADD THE TEMPORAL GENE INSTANCE TO THE LIST OF GENES, IF ALREADY EXISTS, MERGE
                    self.addInputGeneData(geneAux)

                logging.info("PROCESSING DHS_exon_association OUTPUT...DONE")
                #STEP 6. FOR EACH GENE, SUMMARIZE THE QUANTIFICATION VALUES IF ASSOCIATED REGIONS > 1
                regionsToGeneFile = open(self.getTemporalDir() + '/regionsToGene.tab', 'w')
                genesToRegionsFile = open(self.getTemporalDir() + '/genesToRegions.tab', 'w')
                #TODO: USE JOB DATE
                fileName = "B2G_output_" + self.date + ".tab"
                bed2genesOutput = open(self.getTemporalDir() + '/' + fileName, 'w')
                fileName = "B2G_relevant_" + self.date + ".tab"
                bed2genesRelevant = open(self.getTemporalDir() +  '/' + fileName, 'w')

                #PRINT HEADER
                bed2genesOutput.write("Gene name\t"+ header + "\n")
                bed2genesRelevant.write("Gene name\n")

                logging.info("SUMMARIZING GENE QUANTIFICATION...")
                allRegionsValues = relevantRegionsValues = selectedRegions = omicValue = None
                for geneID, gene in self.getInputGenesData().iteritems():
                    #SAVE ALL REGIONS AND ALL RELEVANT REGIONS, IF RELEVANT_REGIONS > 0, THEN THE SUMMARIZATION WILL PERFORMED OVER RELEVANT REGIONS
                    allRegionsValues = []
                    relevantRegionsValues = []

                    #STEP 6.1 WRITE RESULTS TO genesToRegions FILE --> gen_id    region_1 region_2 region_3...
                    regionsAux = ""
                    for omicValue in gene.getOmicsValues():
                        regionsAux += omicValue.getOmicName() + " "
                        #WRITE RESULTS TO genesToRegions FILE -->   region_1  gen_id
                        regionsToGeneFile.write(omicValue.getOmicName() + "\t" + geneID + "\t" + ("*" if omicValue.isRelevant() else "") +"\n")

                        allRegionsValues.append(omicValue.getValues())
                        if omicValue.isRelevant():
                            relevantRegionsValues.append(omicValue.getValues())

                    genesToRegionsFile.write(geneID + "\t" + ("*" if len(relevantRegionsValues) > 0 else "") +  "\t" + regionsAux +"\n")

                    #IF AT LEAST ONE OF THE REGION WAS RELEVANT, IGNORE ALL NO RELEVANT REGIONS
                    selectedRegions = allRegionsValues
                    if len(relevantRegionsValues) > 0:
                        if self.summarizationMethod != "none":
                            selectedRegions = relevantRegionsValues
                        #TODO: REMOVE REPEATED GENES
                        bed2genesRelevant.write(geneID + "\n")

                    #SUMMARIZE THE QUANTIFICATION FOR CURRENT GENE
                    summarizedValues = self.summarizeValues(selectedRegions) #MUST BE A LIST OF LISTS

                    for values in summarizedValues:
                        bed2genesOutput.write(geneID + "\t" + '\t'.join(map(str, values)) + "\n")


                    #TODO: OMIC NAME??
                    #omicValue = OmicValue("TEST")
                    #omicValue.setValues(summarizedValues.tolist())
                    #gene.setOmicsValues([omicValue])
                logging.info("SUMMARIZING GENE QUANTIFICATION...DONE")

                genesToRegionsFile.close()
                regionsToGeneFile.close()
                bed2genesOutput.close()
                bed2genesRelevant.close()

                #STEP 7. GENERATE THE COMPRESSED FILE WITH RESULTS, COPY THE bed2genesOutput FILE AT INPUT DIR AND CLEAN TEMPORAL FILES
                #COMPRESS THE RESULTING FILES AND CLEAN TEMPORAL DATA
                logging.info("COMPRESSING RESULTS...")
                fileName = "bed2genes_" + self.date
                shutil.make_archive(self.getOutputDir() + fileName, "zip", self.getTemporalDir() + "/")
                logging.info("COMPRESSING RESULTS...DONE")

                fields = {
                    "omicType" : self.getGeneBasedInputOmics()[0].get("omicName"),
                    "dataType" : self.getGeneBasedInputOmics()[0].get("omicName").replace("data","quantification"),
                    "description" : "File generated using RGMatch tool (Bed2Genes);" + self.getJobDescription(True, dataFile, relevantFile, gtfFile)
                }
                mainOutputFileName = copyFile(self.getUserID(), os_path.split(bed2genesOutput.name)[1], fields,self.getTemporalDir() +  "/", self.getInputDir())

                fields = {
                    "omicType" : self.getGeneBasedInputOmics()[0].get("omicName"),
                    "dataType" : "Relevant Genes list",
                    "description" : "File generated using RGMatch tool (Bed2Genes);"  + self.getJobDescription()
                }
                secondOutputFileName = copyFile(self.getUserID(), os_path.split(bed2genesRelevant.name)[1], fields, self.getTemporalDir() + "/", self.getInputDir())

                #TODO: REMOVE FILES IF EXCEPTION
                inputDataFile.close()

                self.cleanDirectories()
                return [fileName + ".zip", mainOutputFileName, secondOutputFileName]

    def summarizeValues(self, selectedRegions):
        if(self.summarizationMethod == "mean"):
            from numpy import mean as npmean
            return [npmean(selectedRegions, axis=0).tolist()]
        elif(self.summarizationMethod == "max"):
            import numpy as np
            #1. CALCULATE THE SUM OF THE ABS VALUES FOR EACH REGION
            valuesSum = np.sum(np.abs(selectedRegions), axis=1)
            #2. GET THE MAX
            maxSum = np.max(valuesSum)
            #3. FIND THE POSITION OF MAX VALUE
            #TODO: WHAT IF MORE THAN 1 MAX??
            indices = [i for i, x in enumerate(valuesSum) if x == maxSum]
            return [selectedRegions[indices[0]]]
        else:
            return selectedRegions




