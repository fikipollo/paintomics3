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
from os import path as os_path, system as os_system
from csv import reader as csv_reader
from zipfile import ZipFile as zipFile
from subprocess import check_call, STDOUT, CalledProcessError
from shutil import move as shutil_move

from src.common.Statistics import calculateSignificance, calculateCombinedSignificancePvalue
from src.common.Util import chunks, getImageSize

from src.common.KeggInformationManager import KeggInformationManager

from src.classes.Job import Job
from src.classes.Feature import Gene, Compound
from src.classes.Pathway import Pathway
from src.classes.PathwayGraphicalData import PathwayGraphicalData

from src.conf.serverconf import ROOT_DIRECTORY, KEGG_DATA_DIR


class PathwayAcquisitionJob(Job):
    #******************************************************************************************************************
    # CONSTRUCTORS
    #******************************************************************************************************************
    def __init__(self, jobID, userID, CLIENT_TMP_DIR):
        super(PathwayAcquisitionJob, self).__init__(jobID, userID, CLIENT_TMP_DIR)
        #TODO: OPTION TO CHANGE THESE VALUES
        self.test = "fisher"
        self.combinedTest = "fisher-combined"
        self.summary = None
        #In this table we save all the matched pathways and for each pathways the associated selected compounds and genes.
        self.matchedPathways = {}

    #******************************************************************************************************************
    # GETTERS AND SETTER
    #******************************************************************************************************************
    def setCombinedTest(self, combinedTest):
        self.combinedTest = combinedTest
    def getCombinedTest(self):
        return self.combinedTest

    def setTest(self, test):
        self.test = test
    def getTest(self):
        return self.test

    def setMatchedPathways(self, matchedPathways):
        self.matchedPathways = matchedPathways
    def getMatchedPathways(self):
        return self.matchedPathways
    def addMatchedPathway(self, matchedPathway):
        self.matchedPathways[matchedPathway.getID()] = matchedPathway

    def getJobDescription(self, generate=False, isExampleJob=False):
        if(generate):
            if isExampleJob:
                self.description = "Example Job;"
            from os.path import basename

            self.description+= "Input data:;"

            for omicAux in self.geneBasedInputOmics:
                self.description+=omicAux.get("omicName") + " [" + basename(omicAux.get("inputDataFile")) + "]; "
            for omicAux in self.compoundBasedInputOmics:
                self.description+=omicAux.get("omicName") + " [" + basename(omicAux.get("inputDataFile")) + "]; "

        return self.description

    #******************************************************************************************************************
    # OTHER FUNCTIONS
    #******************************************************************************************************************

    #VALIDATION FUNCTIONS  ----------------------------------------------------------------------------------------------------
    def validateInput(self):
        """
        This function check the content for files and returns an error message in case of invalid content

        @returns True if not error
        """
        error = ""

        nConditions = -1

        logging.info("VALIDATING GENE BASED FILES..." )
        for inputOmic in self.geneBasedInputOmics:
            nConditions, error = self.validateFile(inputOmic, nConditions, error)

        logging.info("VALIDATING COMPOUND BASED FILES..." )
        for inputOmic in self.compoundBasedInputOmics:
            nConditions, error = self.validateFile(inputOmic, nConditions, error)

        if error != "":
            raise Exception("[b]Errors detected in input files, please fix the following issues and try again:[/b][br]" + error)

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


    #GENERATE PATHWAYS LIST FUNCTIONS -----------------------------------------------------------------------------------------
    def updateSubmitedCompoundsList(self, selectedCompounds):
        """
        This function is used to generate the final list of selected compounds

        @param selectedCompounds, list of selected compounds in format originalName#comopundCode
        @param keggInformationManager, contains all the tools and info for ids and names matching
        """

        #1. SAVE THE PREVIOUS COMPOUNDS DICT
        initialCompounds = self.getInputCompoundsData()
        #LOAD THE KEGG INFORMATION FOR GIVEN SPECIE
        keggInformationManager = KeggInformationManager() #Singleton instance

        #2. CLEAN THE JOBINSTANCE COMPOUNDS LIST
        self.setInputCompoundsData({})

        #3. FOR EACH SELECTED COMPOUND
        #     -  adenosine#C00212 i.e. THE NAME OF THE ORIGINAL COMPOUND AND THE SELECTED COMPOUND ID
        compoundAux = None
        for selectedCompound in selectedCompounds:
            selectedCompound = selectedCompound.split(",")

            for compoundID in selectedCompound:
                self.addInputCompoundData(initialCompounds.get(compoundID))

            #initialCompoundName = selectedCompound.split("#")[0]
            #selectedCompoundID= selectedCompound.split("#")[1]

            #4. CLONE THE ORIGINAL COMPOUND, SET THE ID AND THE NAME (GET NAME COMPOUND USING KEGGINFOMANAGER)
            #compoundAux = initialCompounds.get(initialCompoundName).clone()
            #compoundAux.setID(selectedCompoundID)
            #compoundAux.setName(keggInformationManager.getCompoundNameByID(selectedCompoundID))

            #5. UPDATE THE FIELD NAME OF THE OMIC VALUE OBJECT USING THE COMPOUND NAME + THE ORIGINAL NAME (SOMETIMES THE
            #   COMPOUND MATCHES TO VARIOS ORIGINAL COMPOUNDS e.g. if input is beta-alanine and alanine and user checks both, the
            #   COMPOUND C00099 (beta-alanine) WILL HAVE 2 OMICS VALUES COMING FROM DIFFERENT COMPOUNDS
            #compoundAux.getOmicsValues()[0].setInputName(compoundAux.getName() + " [" + initialCompoundName + "]")
            #6. ADD THE COMPOUND TO THE JOB

        return True

    def generatePathwaysList(self):
        """
        This function gets a list of selected compounds and the list of matched genes and
        find out all the pathways which contain at least one feature.

        @param {type}
        @returns
        """
        from multiprocessing import Process, cpu_count, Manager
        from math import ceil


        #****************************************************************
        # Step 1. GET THE KEGG DATA AND PREPARE VARIABLES
        #****************************************************************
        inputGenes = self.getInputGenesData().values()
        inputCompounds = self.getInputCompoundsData().values()
        pathwayIDsList = KeggInformationManager().getAllPathwaysByOrganism(self.getOrganism())

        #GET THE IDS FOR ALL PATHWAYS FOR CURRENT SPECIE
        totalFeaturesByOmic, totalRelevantFeaturesByOmic = self.calculateTotalFeaturesByOmic()
        totalInputMatchedCompounds = len(self.getInputCompoundsData())
        totalInputMatchedGenes = len(self.getInputGenesData())
        totalKeggPathways = len(pathwayIDsList)

        #****************************************************************
        # Step 2. FOR EACH PATHWAY OF THE SPECIE, CHECK IF THERE IS ONE OR
        #         MORE FEATURES FROM THE INPUT (USING MULTITHREADING)
        #****************************************************************
        from src.conf.serverconf import MAX_THREADS, MAX_WAIT_THREADS
        try:
            #CALCULATE NUMBER OF THREADS
            nThreads = min(cpu_count(), MAX_THREADS)
        except NotImplementedError as ex:
            nThreads = MAX_THREADS
        logging.info("USING " + str(nThreads) + " THREADS")

        def matchPathways(jobInstance, pathwaysList, inputGenes, inputCompounds, totalFeaturesByOmic, totalRelevantFeaturesByOmic, matchedPathways):
            #****************************************************************
            # Step 2.1. FOR EACH PATHWAY IN THE LIST, GET ALL FEATURE IDS
            #           AND CALCULATE THE SIGNIFICANCE FOR THE PATHWAY
            #****************************************************************
            keggInformationManager = KeggInformationManager()

            genesInPathway = compoundsInPathway = pathway = None
            for pathwayID in pathwaysList:
                genesInPathway, compoundsInPathway = keggInformationManager.getAllFeatureIDsByPathwayID(jobInstance.getOrganism(), pathwayID)
                isValidPathway, pathway = self.testPathwaySignificance(genesInPathway, compoundsInPathway, inputGenes, inputCompounds, totalFeaturesByOmic, totalRelevantFeaturesByOmic)
                if(isValidPathway):
                    pathway.setID(pathwayID)
                    pathway.setName(keggInformationManager.getPathwayNameByID(jobInstance.getOrganism(), pathwayID))
                    pathway.setClassification(keggInformationManager.getPathwayClassificationByID(jobInstance.getOrganism(), pathwayID))

                    matchedPathways[pathwayID] = pathway

        manager=Manager()
        matchedPathways=manager.dict() #WILL STORE THE OUTPUT FROM THE THREADS
        nPathwaysPerThread = int(ceil(len(pathwayIDsList)/nThreads)) + 1  #GET THE NUMBER OF PATHWAYS TO BE PROCESSED PER THREAD
        pathwaysListParts = chunks(pathwayIDsList, nPathwaysPerThread) #SPLIT THE ARRAY IN n PARTS
        threadsList = []
        #LAUNCH THE THREADS
        for pathwayIDsList in pathwaysListParts:
            thread = Process(target=matchPathways, args=(self, pathwayIDsList, inputGenes, inputCompounds, totalFeaturesByOmic, totalRelevantFeaturesByOmic, matchedPathways))
            threadsList.append(thread)
            thread.start()

        #WAIT UNTIL ALL THREADS FINISH
        for thread in threadsList:
            thread.join(MAX_WAIT_THREADS)

        for thread in threadsList:
            if(thread.is_alive()):
                thread.terminate()

        self.setMatchedPathways(dict(matchedPathways))
        totalMatchedKeggPathways=len(self.getMatchedPathways())

        logging.info("SUMMARY: " + str(totalMatchedKeggPathways) +  " Matched Pathways of "  + str(totalKeggPathways) + "in KEGG; Total input Genes = " + str(totalInputMatchedGenes) + "; SUMMARY: Total input Compounds  = " + str(totalInputMatchedCompounds))

        for key in totalFeaturesByOmic:
            logging.info("SUMMARY: Total " + key + " Features = " + str(totalFeaturesByOmic.get(key)))
            logging.info("SUMMARY: Total " + key + " Relevant Features = " + str(totalRelevantFeaturesByOmic.get(key)))

        self.summary= [totalKeggPathways, totalMatchedKeggPathways, totalInputMatchedGenes, totalInputMatchedCompounds, totalFeaturesByOmic, totalRelevantFeaturesByOmic]
        #TODO: REVIEW THE SUMMARY GENERATION
        return self.summary

    def calculateTotalFeaturesByOmic(self):
        """
        This function...

        @param {type}
        @returns
        """
        totalFeaturesByOmic = {}
        totalRelevantFeaturesByOmic = {}

        for compound in self.getInputCompoundsData().values():
            for omicValue in compound.getOmicsValues():
                totalFeaturesByOmic[omicValue.getOmicName()] = totalFeaturesByOmic.get(omicValue.getOmicName(),0) + 1
                sum = 0
                if(omicValue.isRelevant()):
                    sum = 1
                totalRelevantFeaturesByOmic[omicValue.getOmicName()] = totalRelevantFeaturesByOmic.get(omicValue.getOmicName(),0) + sum

        for gene in self.getInputGenesData().values():
            for omicValue in gene.getOmicsValues():
                totalFeaturesByOmic[omicValue.getOmicName()] = totalFeaturesByOmic.get(omicValue.getOmicName(),0) + 1
                sum = 0
                if(omicValue.isRelevant()):
                    sum = 1
                if(omicValue.isRelevant()):
                    totalRelevantFeaturesByOmic[omicValue.getOmicName()] = totalRelevantFeaturesByOmic.get(omicValue.getOmicName(),0) + sum
        return totalFeaturesByOmic, totalRelevantFeaturesByOmic

    def testPathwaySignificance(self, genesInPathway, compoundsInPathway, inputGenes, inputCompounds, totalFeaturesByOmic, totalRelevantFeaturesByOmic):
        """
        This function takes a list of genes and compounds from the input and check if those features are at the
        list of feautures involved into a specific pathway.
        After that, the function calculates the significance for each omic type for the current pathway

        @param {List} genesInPathway, list of gene IDs in the pathway (ordered)
        @param {List} compoundsInPathway, list of gene IDs in the pathway (ordered)
        @param {List} inputGenes, list of genes (class Gene) in the input
        @param {List} inputCompounds, list of compounds (class Compound) in the input
        @param {Dict} totalFeaturesByOmic, contains the total features for each omic type (for statistics)
        @param {Dict} totalRelevantFeaturesByOmic, contains the total relevant features for each omic type (for statistics)
        @returns {Boolean} isValidPathway, True if at least one feature was matched, False in other cases.
        @returns {Pathway} pathwayInstance a new Pathway instance containing the matched info. None if pathway is not valid.
        """
        isValidPathway = False
        pathwayInstance= Pathway("")
        #TODO: RETURN AS A SET IN KEGGINFORMATION MANAGER
        genesInPathway=set([x.lower() for x in genesInPathway])
        for gene in inputGenes:
            if(gene.getID().lower() in genesInPathway):
                isValidPathway= True
                pathwayInstance.addMatchedGeneID(gene.getID())
                for omicValue in gene.getOmicsValues():
                    #SIGNIFICANCE-VALUES LIST STORES FOR EACH OMIC 3 VALUES: [TOTAL MATCHED, TOTAL RELEVANT, PVALUE]
                    #IN THIS LINE WE JUST ADD A NEW MATCH AND, IF RELEVANT, A NEW RELEVANT FEATURE, BUT KEEP PVALUE TO -1
                    #AS WE WILL CALCULATE IT LATER.
                    pathwayInstance.addSignificanceValues(omicValue.getOmicName(), omicValue.isRelevant())

        compoundsInPathway=set([x.lower() for x in compoundsInPathway])
        for compound in inputCompounds:
            if(compound.getID() in compoundsInPathway or compound.getID().lower() in compoundsInPathway):
                isValidPathway= True
                pathwayInstance.addMatchedCompoundID(compound.getID())
                for omicValue in compound.getOmicsValues():
                    #SIGNIFICANCE-VALUES LIST STORES FOR EACH OMIC 3 VALUES: [TOTAL MATCHED, TOTAL RELEVANT, PVALUE]
                    #IN THIS LINE WE JUST ADD A NEW MATCH AND, IF RELEVANT, A NEW RELEVANT FEATURE, BUT KEEP PVALUE TO -1
                    #AS WE WILL CALCULATE IT LATER.
                    pathwayInstance.addSignificanceValues(omicValue.getOmicName(), omicValue.isRelevant())

        if(isValidPathway):
            for omicName in pathwayInstance.getSignificanceValues().keys():
                values = pathwayInstance.getSignificanceValues().get(omicName)
                #FOR EACH OMIC TYPE, SIGNIFICANCE IS CALCULATED TAKING IN ACCOUNT:
                #  - THE TOTAL NUMBER OF MATCHED FEATURES FOR CURRENT OMIC (i.e. IF WE INPUT PROTEINS, THE TOTAL NUMBER WILL BE
                #    THE TOTAL OF PROTEINS THAT WE MANAGED TO MAP TO GENES.
                #  - THE TOTAL NUMBER OF RELEVANT FEATURES FOR THE CURRENT OMIC
                #  - THE TOTAL FOUND FEATURES FOR CURRENT PATHWAY
                #  - THE TOTAL RELEVANT FEATURES FOR CURRENT PATHWAY
                pValue = calculateSignificance(self.getTest(), totalFeaturesByOmic.get(omicName,0),totalRelevantFeaturesByOmic.get(omicName,0), values[0], values[1])
                pathwayInstance.setSignificancePvalue(omicName, pValue)

            #SIGNIFICANCE VALUES PER OMIC in format OmicName -> [totalFeatures, totalRelevantFeatures, pValue]
            pathwayInstance.setCombinedSignificancePvalue( calculateCombinedSignificancePvalue(self.getCombinedTest(),pathwayInstance.getSignificanceValues().values()))

        else:
            pathwayInstance=None

        return isValidPathway, pathwayInstance

    def generateSelectedPathwaysInformation(self, selectedPathways, visibleOmics, toBSON = False):
        """
        This function...

        @param {type}
        @returns
        """

        #************************************************************************
        # Step 1. Prepare the variables
        #************************************************************************
        pathwayInstance = None
        selectedPathwayInstances = []
        graphicalOptionsInstancesBSON = []
        omicsValuesSubset = {}
        bsonAux = None

        keggInformationManager = KeggInformationManager()

        if(len(visibleOmics) > 0):
            #TODO: IN PREVIOUS STEPS THE USER COULD SPECIFY THE DEFAULT OMICS TO SHOW
            pass
        else:
            #By default try to show 3 genes based omics and 1 Compound based omic
            visibleOmics = [inputData.get("omicName") + "#genebased" for inputData in self.getGeneBasedInputOmics()[0:3] ]
            visibleOmics.extend([inputData.get("omicName") + "#compoundbased" for inputData in self.getCompoundBasedInputOmics()[0:1] ])

        #************************************************************************
        # Step 2. For each provided pathway, get the graphical information
        #************************************************************************
        for pathwayID in selectedPathways:
            pathwayInstance = self.getMatchedPathways().get(pathwayID)

            #AQUI RECORRER PARA CADA ELEMENTO DE LA PATHWAY Y VER SI
            #  SI ES GEN Y ESTA EN LA LISTA DE GENES METIDOS -> GUARDAR VALORES, POSICIONES, SIGNIFICATIVO
            #  SI ES COMPOUND Y ESTA EN LA LISTA DE COMPOUND METIDOS -> GUARDAR VALORES, POSICIONES, SIGNIFICATIVO
            #  ...

            #************************************************************************
            # Step 2.1 Create the graphical information object -> features coordinates,
            #          box height,...
            #************************************************************************
            genesInPathway, compoundsInPathway = keggInformationManager.getAllFeaturesByPathwayID(self.getOrganism(), pathwayID)

            graphicalOptions = PathwayGraphicalData()
            graphicalOptions.setFeaturesGraphicalData(genesInPathway + compoundsInPathway)
            graphicalOptions.setImageSize(getImageSize(keggInformationManager.getKeggDataDir() + 'png/' + pathwayID.replace(self.getOrganism(), "map") + ".png"))
            graphicalOptions.setVisibleOmics(visibleOmics)

            #Set the graphical options for the pathway
            pathwayInstance.setGraphicalOptions(graphicalOptions)

            #************************************************************************
            # Step 2.2 Get the subset of genes and compounds that are in the current
            #          pathway and add them to the list of features that will be send
            #          to the client side with the expression values
            #************************************************************************
            #TODO: MEJORABLE, MULTHREADING U OTRAS OPCIONES
            auxDict = self.getInputGenesData()
            for geneID in pathwayInstance.getMatchedGenes():
                if(toBSON == True):
                    omicsValuesSubset[geneID] = auxDict.get(geneID).toBSON()
                else:
                    omicsValuesSubset[geneID] = auxDict.get(geneID)
            auxDict = self.getInputCompoundsData()

            for compoundID in pathwayInstance.getMatchedCompounds():
                if(toBSON == True):
                    omicsValuesSubset[compoundID] = auxDict.get(compoundID).toBSON()
                else:
                    omicsValuesSubset[compoundID] = auxDict.get(compoundID)

            if(toBSON == True):
                bsonAux = pathwayInstance.getGraphicalOptions().toBSON()
                bsonAux["pathwayID"] = pathwayID
                graphicalOptionsInstancesBSON.append(bsonAux)
            #Add the pathway to the list
            selectedPathwayInstances.append(pathwayInstance)

        return [selectedPathwayInstances, graphicalOptionsInstancesBSON, omicsValuesSubset]


    #GENERATE METAGENES LIST FUNCTIONS -----------------------------------------------------------------------------------------
    def generateMetagenesList(self):
        """
        This function obtains the metagenes for each pathway in KEGG based on the input values.

        @param {type}
        @returns
        """
        # STEP 1. EXTRACT THE COMPRESSED FILE WITH THE MAPPING FILES
        zipFile(self.getOutputDir() + "/mapping_results_" + self.getJobID() + ".zip").extractall(path=self.getTemporalDir())

        # STEP 2. GENERATE THE DATA FOR EACH OMIC DATA TYPE

        for inputOmic in self.geneBasedInputOmics:
            try:
                # STEP 2.1 EXECUTE THE R SCRIPT
                logging.info("GENERATING METAGENES INFORMATION...DONE")
                inputFile = self.getTemporalDir() +  "/" + inputOmic.get("omicName") + '_matched.txt'
                check_call([
                    ROOT_DIRECTORY + "common/bioscripts/generateMetaGenes.R",
                    '--specie="' + self.getOrganism() +'"',
                    '--input_file="' + inputFile  + '"',
                    '--output_prefix="'+ inputOmic.get("omicName") + '"',
                    '--data_dir="'+ self.getTemporalDir() + '"',
                    '--kegg_dir="'+ KEGG_DATA_DIR + '"',
                    '--sources_dir="' + ROOT_DIRECTORY + '/common/bioscripts/"'], stderr=STDOUT)
                # STEP 2.2 PROCESS THE RESULTING FILE
                with open(self.getTemporalDir() + "/" + inputOmic.get("omicName") + "_metagenes.tab", 'rU') as inputDataFile:
                    for line in csv_reader(inputDataFile, delimiter="\t"):
                        if self.matchedPathways.has_key(line[0]):
                            self.matchedPathways.get(line[0]).addMetagenes(inputOmic.get("omicName"), {"metagene": line[1], "cluster": line[2], "values" : line[3:] })
                inputDataFile.close()
            except CalledProcessError as ex:
                logging.error("STEP2 - Error while generating metagenes information for " + inputOmic.get("omicName"))

        os_system("mv " + self.getTemporalDir() +  "/" + "*.png " +  self.getOutputDir())
        return self

    #JSON <-> BSON FUNCTIONS ------------------------------------------------------------------------------------------------------
    def parseBSON(self, bsonData):
        """
        This function...

        @param {type}
        @returns
        """
        bsonData.pop("_id")
        for (attr, value) in bsonData.items():
            if(attr == "matchedPathways"):
                pathwayInstance = None
                self.matchedPathways.clear()
                for (pathwayID, pathwayData) in value.iteritems():
                    pathwayInstance = Pathway(pathwayID)
                    pathwayInstance.parseBSON(pathwayData)
                    self.addMatchedPathway(pathwayInstance)
            elif(attr == "inputCompoundsData"):
                compoundInstance = None
                self.inputCompoundsData.clear()
                for (compoundID, compoundData) in value.iteritems():
                    compoundInstance = Compound(compoundID)
                    compoundInstance.parseBSON(compoundData)
                    self.addInputCompoundData(compoundInstance)
            elif(attr == "inputGenesData"):
                geneInstance = None
                self.inputGenesData.clear()
                for (geneID, genData) in value.iteritems():
                    geneInstance = Gene(geneID)
                    geneInstance.parseBSON(genData)
                    self.addInputGeneData(geneInstance)
            elif not isinstance(value, dict) :
                setattr(self, attr, value)

    def toBSON(self, recursive= True):
        """
        This function...

        @param {type}
        @returns
        """
        bson = {}
        for attr, value in self.__dict__.iteritems():
            if not isinstance(value, dict) and ( ["svgDir", "inputDir", "outputDir", "temporalDir"].count(attr) == 0) :
                bson[attr] = value

            elif(recursive == True):
                if(attr == "matchedPathways"):
                    matchedPathways = {}
                    for (pathwayID, pathwayInstance) in value.iteritems():
                        matchedPathways[pathwayID] = pathwayInstance.toBSON()
                    value = matchedPathways
                elif(attr == "inputCompoundsData"):
                    compounds = {}
                    for (compoundID, compoundInstance) in value.iteritems():
                        compounds[compoundID] = compoundInstance.toBSON()
                    value = compounds
                elif(attr == "inputGenesData"):
                    genes = {}
                    for (geneID, geneInstance) in value.iteritems():
                        genes[geneID] = geneInstance.toBSON()
                    value = genes
                bson[attr] = value
        return bson
