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

from src.classes.Job import Job
from src.classes.Feature import OmicValue, Gene
from src.servlets.DataManagementServlet import copyFile
from src.common.bioscripts.miRNA2Target import run as run_miRNA2Target

from os import path as os_path, mkdir as os_mkdir
from csv import reader as csv_reader

import shutil
import time

class MiRNA2GeneJob(Job):
    #******************************************************************************************************************
    # CONSTRUCTORS
    #******************************************************************************************************************
    def __init__(self, jobID, userID, CLIENT_TMP_DIR):
        super(MiRNA2GeneJob, self).__init__(jobID, userID, CLIENT_TMP_DIR)
        self.omicName = None
        self.report               = "all" #all or DE
        self.score_method         = "kendall" #fc OR kendall OR spearman OR pearson
        self.selection_method     = "negative_correlation" #max_fc OR similar_fc OR abs_correlation OR positive_correlation OR negative_correlation
        self.cutoff               = -0.6

    def getOptions(self):
        return {
            "report": self.report,
            "score_method": self.score_method,
            "selection_method": self.selection_method,
            "cutoff": self.cutoff
        }

    def getJobDescription(self, generate=False, dataFile="", relevantFile="", targetsFile="", geneExpressionFile=""):
        if generate:
            self.description  = "Input data:" + os_path.basename(dataFile) + ";Relevant file: " + os_path.basename(relevantFile)  + ";Targets file: " + os_path.basename(targetsFile) + ";Gene expression file: " + os_path.basename(geneExpressionFile) + ";"
            self.description += "Params:;Report=" + str(self.report) + ";"
            self.description += "Score method=" + str(self.score_method)+ ";"
            self.description += "Selection method=" + str(self.selection_method)+ ";"
            self.description += "Cutoff=" + str(self.cutoff)+ ";"
        return self.description

    def validateInput(self):
        """
        This function check the content for files and returns an error message in case of invalid content

        @returns True if not error
        """
        error = ""
        #TODO: CHECK VALID SCORE AND SELECTION METHODS
        try:
            self.cutoff = float(self.cutoff)
        except:
            error +=  " -  Cutoff must be a numeric value"

        logging.info("VALIDATING miRNA-seq BASED FILES..." )
        nConditions, error = self.validateFile(self.geneBasedInputOmics["file"], -1, error)

        if len(self.geneBasedInputOmics) > 1:
            logging.info("VALIDATING RNA-seq BASED FILES..." )
            nConditions, error = self.validateFile(self.geneBasedInputOmics["rnaseqaux_file"], -1, error)

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
        logging.info("VALIDATING RELEVANT FEATURES FILE (" + omicName + ")..." )
        if os_path.isfile(relevantFileName):
            f = open(relevantFileName, 'rU')
            lines = f.readlines()
            for line in lines:
                if len(line) > 80:
                    error +=  " - Errors detected while processing " + inputOmic.get("relevantFeaturesFile", "") + ": The file does not look like a Relevant Features file (some lines are longer than 80 characters)." + "\n"
                    break
            f.close()

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
                            continue

                    if nConditions == -1:
                        if len(line) < 2:
                            erroneousLines[nLine] =  "Expected at least 2 columns, but found one."
                            break
                        nConditions = len(line)

                    #**************************************************************************************
                    # STEP 2.2 IF LINE LENGTH DOES NOT MATCH WITH EXPECTED NUMBER OF CONDITIONS, ADD ERROR
                    #**************************************************************************************
                    if(nConditions != len(line) and len(line)>0):
                        erroneousLines[nLine] = "Expected " +  str(nConditions) + " columns but found " + str(len(line)) + ";"

                    #**************************************************************************************
                    # STEP 2.2 IF CONTAINS NOT VALID VALUES, ADD ERROR
                    #**************************************************************************************
                    try:
                        map(float, line[1:len(line)])
                    except:
                        if(" ".join(line[1:len(line)]).count(",") > 0):
                            erroneousLines[nLine] = erroneousLines.get(nLine,  "") + "Perhaps you are using commas instead of dots as decimal mark?"
                        else:
                            erroneousLines[nLine] = erroneousLines.get(nLine,  "") + "Line contains invalid values or symbols."

                    if len(erroneousLines)  > 9:
                        break

            inputDataFile.close()

            #*************************************************************************
            # STEP 3. CHECK THE ERRORS AND RETURN
            #*************************************************************************
            if len(erroneousLines)  > 0:
                error += "Errors detected while processing " + inputOmic.get("inputDataFile") + ":\n"
                error += "[ul]"
                for k in sorted(erroneousLines.keys()):
                    error+=  "[li]Line " + str(k) + ":" + erroneousLines.get(k) + "[/li]"
                error += "[/ul]"

                if len(erroneousLines)  > 9:
                    error +=  "Too many errors detected while processing " + inputOmic.get("inputDataFile") + ", skipping remaining lines...\n"
        else:
            error += " - Error while processing " + omicName + ": File " + inputOmic.get("inputDataFile") + "not found.\n"

        return nConditions, error

    ##*************************************************************************************************************
    # This function...
    #
    # @param {type}
    # @returns
    ##*************************************************************************************************************
    def fromMiRNA2Genes(self):
        #STEP 1. GET THE FILES PATH AND PREPRARE THE OPTIONS
        logging.info("READING FILES...")

        inputRef = self.getReferenceInputs()[0]
        referenceFile = self.getReferenceInputs()[0].get("inputDataFile")
        if (inputRef.get("isExample", False) == False):
            referenceFile = self.getInputDir() + referenceFile

        if not os_path.isfile(referenceFile):
            raise Exception("Reference file not found.")

        inputOmic= self.getGeneBasedInputOmics()["file"]
        dataFile = inputOmic.get("inputDataFile")
        relevantFile = inputOmic.get("relevantFeaturesFile")

        geneExpressionFile =  None
        if len(self.getGeneBasedInputOmics()) > 1:
            inputOmic= self.getGeneBasedInputOmics()["rnaseqaux_file"]
            geneExpressionFile = inputOmic.get("inputDataFile")

        if(inputOmic.get("isExample", False) == False):
            dataFile = self.getInputDir()+  dataFile
            relevantFile = self.getInputDir()+ relevantFile
            if geneExpressionFile != None:
                geneExpressionFile = self.getInputDir() + geneExpressionFile

        if not os_path.isdir(self.getTemporalDir()):
            os_mkdir(self.getTemporalDir())

        tmpFile = self.getTemporalDir() +"/miRNAMatch_output.txt"

        #STEP 2. CALL TO miRNA2Target SCRIPT AND GENERATE ASSOCIATION BETWEEN miRNAS AND TARGET GENES
        logging.info("STARTING miRNA2Target PROCESS.")
        run_miRNA2Target(referenceFile, dataFile, geneExpressionFile, tmpFile, self.score_method)
        logging.info("STARTING miRNA2Target PROCESS...Done")

        #STEP 3. PARSE RELEVANT FILE
        logging.info("PROCESSING RELEVANT FEATURES FILE...")
        relevantMiRNAS = self.parseSignificativeFeaturesFile(relevantFile, isBedFormat=False)
        logging.info("PROCESSING RELEVANT FEATURES FILE...DONE")

        #STEP 4. PARSE GENERATED TEMPORAL FILE, GET THE MIRNAS, TARGET GENES AND QUANTIFICATION
        logging.info("PROCESSING miRNA2Target OUTPUT...")
        if os_path.isfile(tmpFile):
             with open(tmpFile, 'rU') as inputDataFile:
                mirnaID = geneID = score = methodsHasChanged = score_type = sortedScores = None
                scoresTable = {}

                csvReader = csv_reader(inputDataFile, delimiter="\t")

                #READ THE HEADER
                line = csvReader.next()
                #SAVE THE NAME OF THE CONDITIONS (e.g. COND1, COND2,...)
                header = "\t".join(line[4:])

                if self.selection_method == "negative_correlation":
                    self.cutoff *= -1 #INVERT VALUES

                for line in csvReader:
                    #STEP 5.1 GET THE mirna ID, THE ASSOCIATED GENE ID AND THE QUANTIFICATION VALUES
                    mirnaID   = line[0]
                    geneID    = line[1]
                    score      = float(line[2])
                    score_type = line[3]
                    values    =  map(float, line[4:])
                    isRelevant = relevantMiRNAS.has_key(mirnaID.lower())

                    #STEP 5.2 FILTER MIRNAS
                    #IF THE OPTION "ONLY RELEVANTS" WAS SELECTED, IGNORE ENTRY
                    if self.report == "DE" and not isRelevant:
                        continue

                    #EVEN WHEN THE USER HAS CHOOSE THE OPTION "FC", if the conditions do no allow to calculate the
                    #correlation, the script will calculate the FC
                    if score_type != "fc" and self.selection_method == "negative_correlation":
                        score *= -1  #INVERT VALUES
                    elif score_type != "fc" and self.selection_method == "abs_correlation":
                        score = abs(score)
                    #TODO: SIMILAR FC SELECTION

                    #DEPRECATED: WE REPORT ALL MIRNAS BUT NOW THE RELEVANT DEPEND ON THE DE AND THE SCORE
                    #FILTER BY SELECTION METHODS, IF CORRELATION OR FC IS LOWER THAN THE CUTOFF, IGNORE ENTRY
                    #if score < self.cutoff:
                    #    continue
                    if geneID == "ENSMUSG00000028986" and mirnaID == "mmu-miR-3074-1-3p":
                        pass


                    #STEP 5.3 CREATE A NEW OMIC VALUE WITH ROW DATA
                    omicValueAux = OmicValue(mirnaID)
                    #TODO: set omic name with chipseq, dnase,...?
                    omicValueAux.setOriginalName(mirnaID)
                    omicValueAux.setValues(values)
                    omicValueAux.setRelevant(isRelevant and score > self.cutoff)

                    #STEP 5.4 CREATE A NEW TEMPORAL GENE INSTANCE
                    geneAux = Gene(geneID)
                    geneAux.setName(line[0])
                    geneAux.addOmicValue(omicValueAux)

                    #STEP 5.5 ADD THE TEMPORAL GENE INSTANCE TO THE LIST OF GENES, IF ALREADY EXISTS, MERGE
                    self.addInputGeneData(geneAux)

                    #STEP 5.6 ADD THE OMIC VALUE TO THE LIST, FOR FURTHER ORDERING
                    if not geneID in scoresTable:
                        scoresTable[geneID] = []
                    scoresTable[geneID].append((score, omicValueAux))
                logging.info("PROCESSING miRNA2Target OUTPUT...DONE")

                #EVEN WHEN THE USER HAS CHOOSE THE OPTION "FC", if the conditions do no allow to calculate the
                #correlation, the script will calculate the FC
                methodsHasChanged = (score_type == "fc" and self.score_method != "fc")

                #STEP 6. FOR EACH GENE, ORDER THE MIRNAS BY THE HIGHER CORRELATION OR FC
                genesToMiRNAFile = open(self.getTemporalDir() + '/genesToMiRNAFile.tab', 'w')
                mirna2genesOutput = open(self.getTemporalDir() + '/' + "miRNA2Gene_output_" + time.strftime("%Y%m%d_%H%M") + ".tab", 'w')
                mirna2genesRelevant = open(self.getTemporalDir() +  '/' + "miRNA2Gene_relevant_" + time.strftime("%Y%m%d_%H%M") + ".tab", 'w')

                # PRINT HEADER
                genesToMiRNAFile.write("# Gene name\tmiRNA ID\tDE\tScore\tSelection\n")
                #TODO: RE-ENABLE THIS CODE
                mirna2genesOutput.write("# Gene name\t"+ header + "\n")
                #mirna2genesOutput.write("# Gene name\tmiRNA ID\t"+ header + "\n")
                mirna2genesRelevant.write("# Gene name\tmiRNA ID\n")

                logging.info("ORDERING miRNAS BY CORRELATION / FC...")
                for geneID, gene in self.getInputGenesData().iteritems():
                    #GET ALL THE miRNAs AND SORT
                    sortedScores = sorted(scoresTable[geneID], key=lambda omicValue: omicValue[0], reverse=True)

                    #STEP 6.1 WRITE RESULTS
                    for omicValue in sortedScores:
                        score = omicValue[0]
                        omicValue = omicValue[1]

                        lineAux = geneID + "\t" + omicValue.getOriginalName() + "\t"

                        #Recover the original value for the score
                        if not methodsHasChanged and self.selection_method == "negative_correlation":
                            score *= -1

                        #WRITE RESULTS TO genesToMiRNAFile FILE -->   gen_id mirna relevant score
                        genesToMiRNAFile.write(lineAux + ("*" if omicValue.isRelevant() else "") + "\t" + str(score) + "\t" + self.selection_method + "\n")

                        #WRITE RESULTS TO miRNA2Gene_output FILE -->   gen_id mirna values
                        #TODO: RE-ENABLE THIS CODE
                        #mirna2genesOutput.write(lineAux + '\t'.join(map(str, omicValue.getValues())) + "\n")
                        mirna2genesOutput.write(geneID + "\t" + '\t'.join(map(str, omicValue.getValues())) + "\n")

                        if omicValue.isRelevant():
                            #WRITE RESULTS TO mirna2genesRelevant FILE -->   gen_id mirna
                            mirna2genesRelevant.write(geneID + "\t" + omicValue.getOriginalName() + "\n")

                genesToMiRNAFile.close()
                mirna2genesOutput.close()
                mirna2genesRelevant.close()

                #STEP 7. GENERATE THE COMPRESSED FILE WITH RESULTS, COPY THE mirna2genesOutput FILE AT INPUT DIR AND CLEAN TEMPORAL FILES
                #COMPRESS THE RESULTING FILES AND CLEAN TEMPORAL DATA
                #TODO: REMOVE THE genesToMiRNAFile
                logging.info("COMPRESSING RESULTS...")
                fileName = "mirna2genes_" + time.strftime("%Y%m%d_%H%M")
                shutil.make_archive(self.getOutputDir() + fileName, "zip", self.getTemporalDir() + "/")
                logging.info("COMPRESSING RESULTS...DONE")

                fields = {
                    "omicType" : self.getGeneBasedInputOmics()["file"].get("omicName"),
                    "dataType" : self.getGeneBasedInputOmics()["file"].get("omicName").replace("data","quantification"),
                    "description" : "File generated using miRNA2Target tool (miRNA2Target);" + self.getJobDescription(True, dataFile, relevantFile, referenceFile, geneExpressionFile)
                }
                mainOutputFileName = copyFile(self.getUserID(), os_path.split(mirna2genesOutput.name)[1], fields,self.getTemporalDir() +  "/", self.getInputDir())

                fields = {
                    "omicType" : self.getGeneBasedInputOmics()["file"].get("omicName"),
                    "dataType" : "Relevant Genes list",
                    "description" : "File generated using miRNA2Target tool (miRNA2Target);"  + self.getJobDescription()
                }
                secondOutputFileName = copyFile(self.getUserID(), os_path.split(mirna2genesRelevant.name)[1], fields, self.getTemporalDir() + "/", self.getInputDir())

                #TODO: REMOVE FILES IF EXCEPTION
                inputDataFile.close()

                self.cleanDirectories()
                return [fileName + ".zip", mainOutputFileName, secondOutputFileName]
